import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Site, DayKey, MonthlyData, MonthlySplit, SplitConfig, Assignment, ExtraJob } from '../types';
import { format, getDaysInMonth, getDay, addMonths, subMonths, parseISO, differenceInCalendarWeeks, differenceInCalendarMonths, getWeekOfMonth, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { checkIsHoliday } from '../services/holidayService';
import { ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Loader2, Calculator, Users, Briefcase, Clock, Euro, TrendingUp } from 'lucide-react';
import { loadMonthlyData, loadRecurringJobs } from '../lib/firestore';

interface Props {
    userId: string;
    employees: Employee[];
    sites: Site[];
}

// ─── Month Picker (shared pattern) ─────────────────────────────────────────
const MonthPickerOverlay = ({
    currentDate, onClose, onSelect
}: { currentDate: Date; onClose: () => void; onSelect: (d: Date) => void; }) => {
    const [viewYear, setViewYear] = useState(currentDate.getFullYear());
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
        <div className="absolute top-14 left-0 z-50 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-[300px] animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <button onClick={() => setViewYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-bold text-lg text-[#004aad]">{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={onClose} className="ml-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {months.map(m => {
                    const date = new Date(viewYear, m, 1);
                    const isSelected = m === currentDate.getMonth() && viewYear === currentDate.getFullYear();
                    return (
                        <button key={m} onClick={() => onSelect(date)}
                            className={`py-2 px-1 rounded text-sm font-medium capitalize transition-colors ${isSelected ? 'bg-[#ffec09] text-black font-bold shadow-sm' : 'hover:bg-blue-50 text-gray-600'}`}>
                            {format(date, 'MMM', { locale: it })}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const getDayKey = (dayIndex: number): DayKey => {
    const map: Record<number, DayKey> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
    return map[dayIndex];
};

const formatCurrency = (val: number) => {
    if (val === 0) return '0 €';
    if (val % 1 === 0) return `${val.toLocaleString('it-IT')} €`;
    return `${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
};

const checkRecurrence = (assign: Assignment, targetDate: Date): boolean => {
    const start = parseISO(assign.startDate);
    if (targetDate < start) return false;
    if (assign.endDate && targetDate > parseISO(assign.endDate)) return false;

    if (assign.weekSelector && assign.weekSelector.length > 0) {
        const dayOfMonth = targetDate.getDate();
        const currentWeekIndex = Math.ceil(dayOfMonth / 7);
        let matchesSelector = false;
        if (assign.weekSelector.includes(String(currentWeekIndex))) matchesSelector = true;
        if (assign.weekSelector.includes('LAST')) {
            const nextWeekSameDay = addDays(targetDate, 7);
            if (nextWeekSameDay.getMonth() !== targetDate.getMonth()) matchesSelector = true;
        }
        if (!matchesSelector) return false;
    }

    const interval = assign.interval || 1;
    const recurrence = assign.recurrence || 'WEEKLY';
    if (recurrence === 'WEEKLY') {
        const diffWeeks = differenceInCalendarWeeks(targetDate, start, { weekStartsOn: 1 });
        if (diffWeeks < 0) return false;
        return diffWeeks % interval === 0;
    }
    if (recurrence === 'MONTHLY') {
        const diffMonths = differenceInCalendarMonths(targetDate, start);
        if (diffMonths < 0) return false;
        if (diffMonths % interval !== 0) return false;
        if (!assign.weekSelector || assign.weekSelector.length === 0) {
            const startWeekIndex = getWeekOfMonth(start, { weekStartsOn: 1 });
            const targetWeekIndex = getWeekOfMonth(targetDate, { weekStartsOn: 1 });
            return startWeekIndex === targetWeekIndex;
        }
        return true;
    }
    return true;
};

const calculateAutoSplits = (totalValue: number, config?: SplitConfig): MonthlySplit => {
    if (!config || totalValue <= 0) return { travel: 0, fuel: 0, expenses: 0 };
    let remaining = totalValue;
    let travel = 0, fuel = 0, expenses = 0;
    if (config.travelMode === 'FIXED') { travel = Math.min(config.travelValue, remaining); remaining -= travel; }
    if (config.fuelMode === 'FIXED') { fuel = Math.min(config.fuelValue, remaining); remaining -= fuel; }
    if (config.expensesMode === 'FIXED') { expenses = Math.min(config.expensesValue, remaining); remaining -= expenses; }
    if (remaining > 0) {
        if (config.travelMode === 'PERCENT') { const val = (totalValue * config.travelValue) / 100; const actual = Math.min(val, remaining); travel += actual; remaining -= actual; }
        if (config.fuelMode === 'PERCENT' && remaining > 0) { const val = (totalValue * config.fuelValue) / 100; const actual = Math.min(val, remaining); fuel += actual; remaining -= actual; }
        if (config.expensesMode === 'PERCENT' && remaining > 0) { const val = (totalValue * config.expensesValue) / 100; const actual = Math.min(val, remaining); expenses += actual; remaining -= actual; }
    }
    if (remaining > 0) {
        if (config.travelMode === 'REMAINDER') travel += remaining;
        else if (config.fuelMode === 'REMAINDER') fuel += remaining;
        else if (config.expensesMode === 'REMAINDER') expenses += remaining;
    }
    return { travel, fuel, expenses };
};


// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export const CostAnalysis: React.FC<Props> = ({ userId, employees, sites }) => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [monthlyData, setMonthlyData] = useState<MonthlyData>({ overrides: {}, notes: {}, splits: {}, extraJobs: {}, splitConfigs: {}, salaryTarget: {}, salaryMode: {}, sickLeaveCodes: {} });
    const [recurringJobs, setRecurringJobs] = useState<Record<string, ExtraJob[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [expandedEmpIds, setExpandedEmpIds] = useState<Set<string>>(new Set());

    const storageKeyRaw = format(currentDate, 'yyyy-MM');

    // ── Load data ─────────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            if (isMounted) setIsLoading(true);
            try {
                const [fetched, recJobs] = await Promise.all([
                    loadMonthlyData(userId, storageKeyRaw),
                    loadRecurringJobs(userId),
                ]);
                if (isMounted) {
                    if (fetched) {
                        if (!fetched.splits) fetched.splits = {};
                        if (!fetched.extraJobs) fetched.extraJobs = {};
                        if (!fetched.salaryTarget) fetched.salaryTarget = {};
                        if (!fetched.salaryMode) fetched.salaryMode = {};
                        if (!fetched.splitConfigs) fetched.splitConfigs = {};
                        if (!fetched.sickLeaveCodes) fetched.sickLeaveCodes = {};
                        setMonthlyData(fetched);
                    } else {
                        setMonthlyData({ overrides: {}, notes: {}, splits: {}, extraJobs: {}, splitConfigs: {}, salaryTarget: {}, salaryMode: {}, sickLeaveCodes: {} });
                    }
                    setRecurringJobs(recJobs || {});
                }
            } catch (e) { console.error("Failed to load data for analysis", e); }
            finally { if (isMounted) setIsLoading(false); }
        };
        loadData();
        return () => { isMounted = false; };
    }, [userId, storageKeyRaw]);

    // ── Memoised columns ─────────────────────────────────────────────────
    const { year, monthIndex, daysInMonthObj } = useMemo(() => ({
        year: currentDate.getFullYear(),
        monthIndex: currentDate.getMonth(),
        daysInMonthObj: getDaysInMonth(currentDate),
    }), [currentDate]);

    const daysColumns = useMemo(() => {
        const cols = [];
        for (let i = 1; i <= daysInMonthObj; i++) {
            const d = new Date(year, monthIndex, i);
            const dow = getDay(d);
            const { isHoliday } = checkIsHoliday(d);
            cols.push({
                dayNum: i,
                isSunday: dow === 0,
                isHoliday,
                dayKey: getDayKey(dow),
                fullDate: d,
            });
        }
        return cols;
    }, [year, monthIndex, daysInMonthObj]);

    // ── Standard hours from assignments (same logic as MonthlySheet) ─────
    const getStandardHours = (emp: Employee, day: typeof daysColumns[0]) => {
        if (day.isHoliday) return 0;
        const dayKey = day.dayKey;
        const activeAssignments = (emp.defaultAssignments || []).filter(a => !a.archived);
        if (activeAssignments.length > 0) {
            return activeAssignments
                .filter(a => a.type !== 'FORFAIT')
                .reduce((acc, curr) => {
                    if (!checkRecurrence(curr, day.fullDate)) return acc;
                    return acc + (curr.schedule?.[dayKey] || 0);
                }, 0);
        }
        return emp.contractHours?.[dayKey] || 0;
    };

    // ── Per-employee calculations ────────────────────────────────────────
    const analysis = useMemo(() => {
        const COSTO_ORA_CONTRATTO = 15;

        return employees.map(emp => {
            const isCedolino = emp.showInAllowances !== false;

            // --- work hours (same as MonthlySheet) ---
            let totalWork = 0;
            let totalPermit = 0;
            let totalOvertime = 0;

            daysColumns.forEach(day => {
                const key = `${emp.id}-${day.dayNum}`;
                const override = monthlyData.overrides[key];
                const calculated = getStandardHours(emp, day);
                const val = override ? override.value : calculated;
                const type = override ? override.type : 'WORK';
                if (type === 'WORK') totalWork += val;
                else if (type === 'PERMESSO') totalPermit += val;
                else if (type === 'STRAORDINARIO') totalOvertime += val;
            });

            // Extra jobs (same merging logic)
            const empRecurring = recurringJobs[emp.id] || [];
            const empMonthly = monthlyData.extraJobs?.[emp.id] || [];
            const visibleRecurring = empRecurring.filter(job =>
                (!job.startMonth || job.startMonth <= storageKeyRaw) &&
                (!job.endMonth || job.endMonth >= storageKeyRaw)
            );
            const localOverrideIds = new Set(empMonthly.map(j => j.id));
            const extraJobs = [...empMonthly, ...visibleRecurring.filter(j => !localOverrideIds.has(j.id))];
            const extraJobsHours = extraJobs.reduce((acc, job) =>
                acc + Object.values(job.hours).reduce<number>((a, b) => a + (Number(b) || 0), 0), 0);
            totalWork += extraJobsHours;
            totalWork = Math.round(totalWork * 100) / 100;
            totalPermit = Math.round(totalPermit * 100) / 100;
            totalOvertime = Math.round(totalOvertime * 100) / 100;

            // --- Contract hours (ALL scheduled days, no subtraction for absences) ---
            const totalContract = daysColumns.reduce((acc, day) => {
                if (day.isHoliday) return acc;
                return acc + (emp.contractHours?.[day.dayKey] || 0);
            }, 0);
            const totalContractRounded = Math.round(totalContract * 100) / 100;

            // --- Forfait ---
            const hasAssignments = emp.defaultAssignments.length > 0;
            const isAllForfait = hasAssignments && emp.defaultAssignments.every(a => a.type === 'FORFAIT');
            const totalForfaitAmount = emp.defaultAssignments
                .filter(a => a.type === 'FORFAIT' && !a.archived)
                .reduce((acc, curr) => acc + (curr.forfaitAmount || 0), 0);

            // --- diff & Valore (same as Generatore) ---
            const effectiveHoursForDiff = totalWork + totalPermit;
            let diff = effectiveHoursForDiff - totalContractRounded;
            if (isAllForfait) diff = 0;
            diff = Math.round(diff * 100) / 100;

            const rate = emp.hourlyRate || 0;
            const extraJobsValue = extraJobs.reduce((acc, job) => acc + (job.value || 0), 0);
            const diffValue = (diff * rate) + (totalOvertime * rate) + totalForfaitAmount + extraJobsValue;

            // --- splits ---
            const effectiveSplitConfig = monthlyData.splitConfigs?.[emp.id] ?? emp.splitConfig;
            const splits = calculateAutoSplits(diffValue, effectiveSplitConfig);

            // --- Per-appalto breakdown ---
            const assignmentBreakdown = (emp.defaultAssignments || [])
                .filter(a => !a.archived)
                .filter(a => {
                    // Check if active in this month at all
                    const start = parseISO(a.startDate);
                    const monthEnd = new Date(year, monthIndex + 1, 0);
                    const monthStart = new Date(year, monthIndex, 1);
                    if (start > monthEnd) return false;
                    if (a.endDate && parseISO(a.endDate) < monthStart) return false;
                    return true;
                })
                .map(a => {
                    const site = sites.find(s => s.id === a.siteId);
                    const siteName = site?.name || 'Cantiere sconosciuto';

                    if (a.type === 'FORFAIT') {
                        return {
                            siteId: a.siteId,
                            siteName,
                            type: 'FORFAIT' as const,
                            hours: 0,
                            amount: a.forfaitAmount || 0,
                        };
                    }

                    // Calculate hours for this specific assignment
                    let assignHours = 0;
                    daysColumns.forEach(day => {
                        if (checkRecurrence(a, day.fullDate)) {
                            assignHours += (a.schedule?.[day.dayKey] || 0);
                        }
                    });

                    return {
                        siteId: a.siteId,
                        siteName,
                        type: 'HOURLY' as const,
                        hours: Math.round(assignHours * 100) / 100,
                        amount: 0,
                    };
                });

            // --- COSTO ---
            let costoTotale: number;
            if (isCedolino) {
                // ore contratto × 15 + ore extra × tariffa + trasferta + benzina + spese
                const costoContratto = totalContractRounded * COSTO_ORA_CONTRATTO;
                const costoExtra = Math.max(0, diff) * rate;
                const costoStraordinari = totalOvertime * rate;
                costoTotale = costoContratto + costoExtra + costoStraordinari + totalForfaitAmount + extraJobsValue + splits.travel + splits.fuel + splits.expenses;
            } else {
                // Non in cedolini: solo il Valore del Generatore
                costoTotale = diffValue;
            }
            costoTotale = Math.round(costoTotale * 100) / 100;

            return {
                emp,
                isCedolino,
                totalWork,
                totalPermit,
                totalOvertime,
                totalContract: totalContractRounded,
                diff,
                rate,
                diffValue: Math.round(diffValue * 100) / 100,
                totalForfaitAmount,
                splits,
                assignmentBreakdown,
                costoTotale,
                extraJobs,
                extraJobsHours,
                extraJobsValue,
            };
        });
    }, [employees, sites, daysColumns, monthlyData, recurringJobs, storageKeyRaw, year, monthIndex]);

    const cedolinoEmps = analysis.filter(a => a.isCedolino);
    const nonCedolinoEmps = analysis.filter(a => !a.isCedolino);
    const totaleCostoCedolino = cedolinoEmps.reduce((s, a) => s + a.costoTotale, 0);
    const totaleCostoNonCedolino = nonCedolinoEmps.reduce((s, a) => s + a.costoTotale, 0);
    const totaleCosto = totaleCostoCedolino + totaleCostoNonCedolino;

    const toggleExpand = (id: string) => {
        setExpandedEmpIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const goToPrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    // ── Loading ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Caricamento analisi costi…</p>
            </div>
        );
    }

    // ── Employee Card ────────────────────────────────────────────────────
    const renderEmployeeCard = (a: typeof analysis[0], idx: number) => {
        const isExpanded = expandedEmpIds.has(a.emp.id);
        return (
            <div key={a.emp.id} className="border border-gray-200 rounded-2xl bg-white hover:shadow-md transition-all overflow-hidden">
                {/* Header */}
                <button
                    onClick={() => toggleExpand(a.emp.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#004aad] to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                            {a.emp.firstName.charAt(0)}{a.emp.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-gray-800 truncate">{a.emp.firstName} {a.emp.lastName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {a.isCedolino ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Cedolino</span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">Non cedolino</span>
                                )}
                                {a.rate > 0 && (
                                    <span className="text-[10px] font-bold text-indigo-500">{a.rate} €/h</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo totale</p>
                            <p className={`text-lg font-black tabular-nums ${a.costoTotale > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                                {formatCurrency(a.costoTotale)}
                            </p>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </button>

                {/* Mobile cost */}
                <div className="sm:hidden px-5 -mt-2 pb-3">
                    <p className={`text-lg font-black tabular-nums ${a.costoTotale > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                        {formatCurrency(a.costoTotale)}
                    </p>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                    <div className="border-t border-gray-100 animate-fade-in-up">
                        {/* KPI Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-gray-50/50">
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ore effettuate</p>
                                <p className="text-xl font-black text-gray-800">{a.totalWork}<span className="text-sm text-gray-400 ml-0.5">h</span></p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ore contratto</p>
                                <p className="text-xl font-black text-gray-800">{a.totalContract}<span className="text-sm text-gray-400 ml-0.5">h</span></p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Differenza</p>
                                <p className={`text-xl font-black ${a.diff > 0 ? 'text-emerald-600' : a.diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                    {a.diff > 0 ? '+' : ''}{a.diff}<span className="text-sm ml-0.5">h</span>
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valore Gen.</p>
                                <p className={`text-xl font-black ${a.diffValue > 0 ? 'text-emerald-600' : a.diffValue < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                    {formatCurrency(a.diffValue)}
                                </p>
                            </div>
                        </div>

                        {/* Appalti breakdown */}
                        <div className="px-5 pb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3" /> Appalti nel mese
                            </p>
                            {a.assignmentBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                    {a.assignmentBreakdown.map((ab, i) => (
                                        <div key={`${ab.siteId}-${i}`} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/80 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ab.type === 'FORFAIT' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                                <span className="font-semibold text-sm text-gray-800 truncate">{ab.siteName}</span>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${ab.type === 'FORFAIT' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                    {ab.type === 'FORFAIT' ? 'Forfait' : 'Ore'}
                                                </span>
                                            </div>
                                            <span className="font-black text-sm text-gray-800 flex-shrink-0 tabular-nums ml-3">
                                                {ab.type === 'FORFAIT' ? formatCurrency(ab.amount) : `${ab.hours}h`}
                                            </span>
                                        </div>
                                    ))}
                                    {/* Extra jobs */}
                                    {a.extraJobs.length > 0 && a.extraJobs.map((job, i) => {
                                        const jobHours = Object.values(job.hours).reduce<number>((acc, b) => acc + (Number(b) || 0), 0);
                                        return (
                                            <div key={job.id} className="flex items-center justify-between py-2.5 px-4 bg-yellow-50/50 rounded-xl border border-yellow-100 hover:bg-yellow-50 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-yellow-400" />
                                                    <span className="font-semibold text-sm text-gray-700 truncate">{job.description || 'Lavoro extra'}</span>
                                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Extra</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                    {jobHours > 0 && <span className="text-xs font-bold text-gray-500">{jobHours}h</span>}
                                                    {job.value > 0 && <span className="font-black text-sm text-gray-800 tabular-nums">{formatCurrency(job.value)}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic py-2">Nessun appalto attivo in questo mese.</p>
                            )}
                        </div>

                        {/* Cost breakdown for cedolino employees */}
                        {a.isCedolino && (
                            <div className="px-5 pb-5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Calculator className="w-3 h-3" /> Dettaglio costo cedolino
                                </p>
                                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-sm text-gray-600">Ore contratto × 15 €</span>
                                        <span className="font-bold text-sm text-gray-800 tabular-nums">{formatCurrency(a.totalContract * 15)}</span>
                                    </div>
                                    {a.diff > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Ore extra ({a.diff}h) × {a.rate} €</span>
                                            <span className="font-bold text-sm text-emerald-700 tabular-nums">{formatCurrency(a.diff * a.rate)}</span>
                                        </div>
                                    )}
                                    {a.totalOvertime > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Straordinari ({a.totalOvertime}h) × {a.rate} €</span>
                                            <span className="font-bold text-sm text-orange-700 tabular-nums">{formatCurrency(a.totalOvertime * a.rate)}</span>
                                        </div>
                                    )}
                                    {a.totalForfaitAmount > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Forfait</span>
                                            <span className="font-bold text-sm text-amber-700 tabular-nums">{formatCurrency(a.totalForfaitAmount)}</span>
                                        </div>
                                    )}
                                    {a.extraJobsValue > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Lavori extra</span>
                                            <span className="font-bold text-sm text-yellow-700 tabular-nums">{formatCurrency(a.extraJobsValue)}</span>
                                        </div>
                                    )}
                                    {a.splits.travel > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Trasferta</span>
                                            <span className="font-bold text-sm text-sky-700 tabular-nums">{formatCurrency(a.splits.travel)}</span>
                                        </div>
                                    )}
                                    {a.splits.fuel > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Benzina</span>
                                            <span className="font-bold text-sm text-amber-700 tabular-nums">{formatCurrency(a.splits.fuel)}</span>
                                        </div>
                                    )}
                                    {a.splits.expenses > 0 && (
                                        <div className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm text-gray-600">Spese</span>
                                            <span className="font-bold text-sm text-fuchsia-700 tabular-nums">{formatCurrency(a.splits.expenses)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between px-4 py-3 bg-white">
                                        <span className="font-black text-sm text-gray-800 uppercase tracking-wider">Totale costo</span>
                                        <span className="font-black text-lg text-gray-900 tabular-nums">{formatCurrency(a.costoTotale)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Non-cedolino: just show Valore */}
                        {!a.isCedolino && (
                            <div className="px-5 pb-5">
                                <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-600">Costo (Valore Gen. Mensile)</span>
                                    <span className="font-black text-lg text-gray-900 tabular-nums">{formatCurrency(a.costoTotale)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ── RENDER ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-[#004aad] to-blue-600 rounded-xl text-white shadow-lg">
                            <Calculator className="w-6 h-6" />
                        </div>
                        Analisi Costi
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium">Calcolo dettagliato dei costi del personale per mese.</p>
                </div>
            </header>

            {/* Month Navigator */}
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-3 relative">
                <button onClick={goToPrevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    className="text-lg font-black text-[#004aad] uppercase tracking-wider hover:bg-blue-50 px-4 py-1.5 rounded-xl transition-colors"
                >
                    {format(currentDate, 'MMMM yyyy', { locale: it })}
                </button>
                <button onClick={goToNextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronRight className="w-5 h-5" />
                </button>
                {isMonthPickerOpen && (
                    <MonthPickerOverlay
                        currentDate={currentDate}
                        onClose={() => setIsMonthPickerOpen(false)}
                        onSelect={(d) => { setCurrentDate(d); setIsMonthPickerOpen(false); }}
                    />
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Euro className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo cedolini</span>
                    </div>
                    <p className="text-2xl font-black text-gray-800 tabular-nums">{formatCurrency(totaleCostoCedolino)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{cedolinoEmps.length} dipendenti</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo non cedolini</span>
                    </div>
                    <p className="text-2xl font-black text-gray-800 tabular-nums">{formatCurrency(totaleCostoNonCedolino)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{nonCedolinoEmps.length} dipendenti</p>
                </div>
                <div className="bg-gradient-to-br from-[#004aad] to-blue-600 rounded-2xl shadow-lg p-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Costo totale personale</span>
                    </div>
                    <p className="text-2xl font-black tabular-nums">{formatCurrency(totaleCosto)}</p>
                    <p className="text-[10px] text-blue-200 mt-1">{employees.length} dipendenti</p>
                </div>
            </div>

            {/* Cedolino Employees */}
            {cedolinoEmps.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-0.5 bg-emerald-400 rounded-full" />
                        Dipendenti in cedolini ({cedolinoEmps.length})
                    </h3>
                    <div className="space-y-3">
                        {cedolinoEmps.map((a, i) => renderEmployeeCard(a, i))}
                    </div>
                </div>
            )}

            {/* Non-Cedolino Employees */}
            {nonCedolinoEmps.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-0.5 bg-slate-400 rounded-full" />
                        Non inclusi in cedolini ({nonCedolinoEmps.length})
                    </h3>
                    <div className="space-y-3">
                        {nonCedolinoEmps.map((a, i) => renderEmployeeCard(a, i))}
                    </div>
                </div>
            )}

            {employees.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mb-3 opacity-40" />
                    <p className="font-bold text-lg">Nessun dipendente</p>
                    <p className="text-sm">Aggiungi dipendenti dalla sezione Gestione.</p>
                </div>
            )}
        </div>
    );
};
