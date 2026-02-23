import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Site, DayKey, AttendanceType, AttendanceRecord, MonthlyData, MonthlySplit, SplitMode, SplitConfig, Assignment, ExtraJob, TimeDetails } from '../types';
import { format, getDaysInMonth, getDay, addMonths, subMonths, setMonth, setYear, isSameDay, startOfMonth, parseISO, differenceInCalendarWeeks, differenceInCalendarMonths, getWeekOfMonth, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { checkIsHoliday } from '../services/holidayService';
import { Printer, Calendar as CalendarIcon, Loader2, Clock, Umbrella, Stethoscope, AlertCircle, XCircle, Save, PaintBucket, MousePointer2, ChevronLeft, ChevronRight, X, Zap, Euro, Split, Car, Briefcase, Receipt, Sliders, Wand2, Percent, Pencil, Maximize2, Minimize2, Plus, Trash2, ChevronDown, ChevronUp, FileSpreadsheet, FileText, Calculator, Coffee, Lock, Unlock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
    employees: Employee[];
    sites: Site[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// --- CONSTANTS ---
const STORAGE_PREFIX = 'cleaning_sheet_';
const RECURRING_JOBS_KEY = 'cleaning_recurring_extra_jobs';
const NO_SPINNER_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const TOOLS: { id: AttendanceType; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
    { id: 'WORK', label: 'Ore Lavoro', icon: <Clock className="w-4 h-4" />, color: 'text-gray-700', bg: 'bg-white', border: 'border-gray-200' },
    { id: 'FERIE', label: 'Ferie (F)', icon: <Umbrella className="w-4 h-4" />, color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300' },
    { id: 'MALATTIA', label: 'Malattia (M)', icon: <Stethoscope className="w-4 h-4" />, color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
    { id: 'PERMESSO', label: 'Permesso (P)', icon: <AlertCircle className="w-4 h-4" />, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-300' },
    { id: 'STRAORDINARIO', label: 'Straordinario (S)', icon: <Zap className="w-4 h-4" />, color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300' },
    { id: 'ASSENZA', label: 'Assenza (A)', icon: <XCircle className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-200', border: 'border-gray-400' },
];

// --- SUB-COMPONENT: MONTH PICKER OVERLAY ---
const MonthPickerOverlay = ({
    currentDate,
    onClose,
    onSelect
}: {
    currentDate: Date;
    onClose: () => void;
    onSelect: (d: Date) => void;
}) => {
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
                        <button
                            key={m}
                            onClick={() => onSelect(date)}
                            className={`
                                py-2 px-1 rounded text-sm font-medium capitalize transition-colors
                                ${isSelected ? 'bg-[#ffec09] text-black font-bold shadow-sm' : 'hover:bg-blue-50 text-gray-600'}
                            `}
                        >
                            {format(date, 'MMM', { locale: it })}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: TIME ENTRY MODAL ---
interface TimeEntryModalProps {
    employee: Employee;
    year: number;
    month: number;
    daysInMonth: number;
    currentOverrides: Record<string, AttendanceRecord>;
    onSave: (records: Record<string, AttendanceRecord>) => void;
    onClose: () => void;
}

const TimeEntryModal = ({ employee, year, month, daysInMonth, currentOverrides, onSave, onClose }: TimeEntryModalProps) => {
    const [localOverrides, setLocalOverrides] = useState<Record<string, AttendanceRecord>>({});

    useEffect(() => {
        const empOverrides: Record<string, AttendanceRecord> = {};
        Object.keys(currentOverrides).forEach(key => {
            if (key.startsWith(`${employee.id}-`)) {
                empOverrides[key] = JSON.parse(JSON.stringify(currentOverrides[key]));
            }
        });
        setLocalOverrides(empOverrides);
    }, [employee.id, currentOverrides]);

    const getMinutesFromTime = (timeStr?: string) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    };

    // Helper to display minutes as HH:mm
    const formatDuration = (totalMinutes: number) => {
        if (totalMinutes <= 0) return "-";
        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleTimeChange = (dayNum: number, field: keyof TimeDetails, value: string) => {
        const key = `${employee.id}-${dayNum}`;
        const currentRecord = localOverrides[key] || { type: 'WORK', value: 0, timeDetails: { start: '', end: '', breakStart: '', breakEnd: '' } };
        const currentDetails = currentRecord.timeDetails || { start: '', end: '', breakStart: '', breakEnd: '' };

        const newDetails = { ...currentDetails, [field]: value };

        let newValue = 0;

        const workStart = getMinutesFromTime(newDetails.start);
        const workEnd = getMinutesFromTime(newDetails.end);

        if (workStart !== null && workEnd !== null && workEnd > workStart) {
            let totalMinutes = workEnd - workStart;

            const breakStart = getMinutesFromTime(newDetails.breakStart);
            const breakEnd = getMinutesFromTime(newDetails.breakEnd);

            if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
                const breakDuration = breakEnd - breakStart;
                totalMinutes -= breakDuration;
            }

            // We store the decimal value for payroll compatibility (e.g. 1h 30m = 1.5)
            // But we display HH:mm in the UI
            newValue = Math.max(0, totalMinutes / 60);
            newValue = Math.round(newValue * 100) / 100;
        }

        setLocalOverrides(prev => ({
            ...prev,
            [key]: {
                ...currentRecord,
                type: 'WORK',
                value: newValue,
                timeDetails: newDetails
            }
        }));
    };

    const handleSave = () => {
        onSave(localOverrides);
        onClose();
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Balanced grid for alignment: Date | In | Out | BrkIn | BrkOut | Total
    const GRID_COLS_CLASS = "grid grid-cols-[50px_1fr_1fr_1fr_1fr_80px]";

    const renderTimeInput = (day: number, field: keyof TimeDetails, value: string, placeholder: string = "--:--") => (
        <div className="flex justify-center w-full items-center">
            <input
                type={value ? "time" : "text"}
                value={value}
                onChange={(e) => handleTimeChange(day, field, e.target.value)}
                onFocus={(e) => (e.target.type = "time")}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                placeholder={placeholder}
                className="w-full max-w-[75px] p-1 border-b border-gray-200 bg-transparent text-center text-sm text-gray-800 font-bold focus:border-indigo-500 outline-none transition-all placeholder-gray-300 focus:placeholder-transparent"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[650px] max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="bg-indigo-600 p-5 text-white flex justify-between items-start flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-200" />
                            Calcolatore Orari
                        </h3>
                        <p className="text-indigo-100 text-xs mt-1 uppercase font-semibold tracking-wide">
                            {format(new Date(year, month), 'MMMM yyyy', { locale: it })}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0 bg-white">
                    <div className={`${GRID_COLS_CLASS} px-4 py-3 bg-gray-50 border-b border-gray-200 font-bold text-[10px] text-gray-500 uppercase tracking-tight sticky top-0 z-10 gap-2 shadow-sm items-center`}>
                        <div className="text-center">Giorno</div>
                        <div className="text-center">Entrata</div>
                        <div className="text-center">Uscita</div>
                        <div className="text-center text-orange-600">Inizio Pausa</div>
                        <div className="text-center text-orange-600">Fine Pausa</div>
                        <div className="text-center">Totale</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {days.map(d => {
                            const date = new Date(year, month, d);
                            const { isHoliday } = checkIsHoliday(date);
                            const isSunday = getDay(date) === 0;
                            const key = `${employee.id}-${d}`;
                            const record = localOverrides[key];
                            const details = record?.timeDetails || { start: '', end: '', breakStart: '', breakEnd: '' };

                            // Recalculate precise minutes for display
                            let displayDuration = "-";
                            const ws = getMinutesFromTime(details.start);
                            const we = getMinutesFromTime(details.end);
                            if (ws !== null && we !== null && we > ws) {
                                let mins = we - ws;
                                const bs = getMinutesFromTime(details.breakStart);
                                const be = getMinutesFromTime(details.breakEnd);
                                if (bs !== null && be !== null && be > bs) {
                                    mins -= (be - bs);
                                }
                                displayDuration = formatDuration(Math.max(0, mins));
                            } else if (record?.value > 0) {
                                // Fallback if only value exists (manual entry elsewhere)
                                const mins = Math.round(record.value * 60);
                                displayDuration = formatDuration(mins);
                            }

                            return (
                                <div key={d} className={`${GRID_COLS_CLASS} px-4 py-1.5 hover:bg-gray-50 transition-colors gap-2 items-center ${isSunday ? 'bg-red-50/30' : ''}`}>

                                    {/* Date Column */}
                                    <div className="flex flex-col items-center justify-center">
                                        <span className={`text-sm font-black ${isHoliday || isSunday ? 'text-red-500' : 'text-gray-700'}`}>{d}</span>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">{format(date, 'EEE', { locale: it })}</span>
                                    </div>

                                    {/* Work Start */}
                                    {renderTimeInput(d, 'start', details.start)}

                                    {/* Work End */}
                                    {renderTimeInput(d, 'end', details.end)}

                                    {/* Break Start */}
                                    {renderTimeInput(d, 'breakStart', details.breakStart || '')}

                                    {/* Break End */}
                                    {renderTimeInput(d, 'breakEnd', details.breakEnd || '')}

                                    {/* Total Display (HH:mm) */}
                                    <div className="text-center flex justify-center items-center">
                                        {displayDuration !== "-" ? (
                                            <span className="inline-flex items-center justify-center h-6 px-2 rounded bg-indigo-100 text-indigo-700 font-black text-xs border border-indigo-200 shadow-sm min-w-[3.5rem] tracking-tight">
                                                {displayDuration}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg transition-colors text-xs uppercase tracking-wide">Annulla</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors text-xs uppercase tracking-wide">Salva</button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: SPLIT CONFIG MODAL ---
interface SplitConfigModalProps {
    employee: Employee;
    onSave: (config: SplitConfig) => void;
    onClose: () => void;
}

const SplitConfigModal = ({ employee, onSave, onClose }: SplitConfigModalProps) => {
    // Local state for manual saving
    const [localConfig, setLocalConfig] = useState<SplitConfig>(employee.splitConfig || {
        travelMode: 'NONE', travelValue: 0,
        fuelMode: 'NONE', fuelValue: 0,
        expensesMode: 'NONE', expensesValue: 0
    });

    const updateLocal = (field: keyof SplitConfig, value: any) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(localConfig);
    };

    const renderCard = (
        icon: React.ReactNode,
        label: string,
        mode: SplitMode,
        value: number,
        modeField: keyof SplitConfig,
        valueField: keyof SplitConfig,
        colorTheme: 'blue' | 'orange' | 'purple'
    ) => {

        const themeClasses = {
            blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', ring: 'focus:ring-blue-500', activeTab: 'bg-blue-600 text-white' },
            orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', ring: 'focus:ring-orange-500', activeTab: 'bg-orange-600 text-white' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', ring: 'focus:ring-purple-500', activeTab: 'bg-purple-600 text-white' }
        }[colorTheme];

        return (
            <div className={`rounded-xl border ${mode === 'NONE' ? 'border-gray-200 bg-white' : `${themeClasses.border} ${themeClasses.bg}`} p-4 transition-all duration-300`}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${mode === 'NONE' ? 'bg-gray-100 text-gray-400' : 'bg-white shadow-sm ' + themeClasses.text}`}>
                        {icon}
                    </div>
                    <span className={`font-bold uppercase text-sm ${mode === 'NONE' ? 'text-gray-400' : themeClasses.text}`}>
                        {label}
                    </span>
                </div>

                {/* Content Container */}
                <div className="flex flex-col gap-3">

                    {/* Segmented Control (Tabs) */}
                    <div className="bg-white/60 p-1 rounded-lg flex shadow-sm border border-gray-200/50">
                        {[
                            { id: 'NONE', label: 'Nessuno' },
                            { id: 'FIXED', label: 'Fisso' },
                            { id: 'PERCENT', label: '%' },
                            { id: 'REMAINDER', label: 'Residuo' }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => updateLocal(modeField, opt.id)}
                                className={`
                                flex-1 py-1.5 text-xs font-bold rounded-md transition-all
                                ${mode === opt.id
                                        ? `${themeClasses.activeTab} shadow-sm`
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
                            `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    {mode !== 'NONE' && (
                        <div className="animate-fade-in-up">
                            {mode === 'REMAINDER' ? (
                                <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-center gap-2 text-gray-500 text-xs font-medium italic">
                                    <Wand2 className="w-4 h-4" />
                                    Calcolato automaticamente sul rimanente.
                                </div>
                            ) : (
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {mode === 'PERCENT' ? (
                                            <Percent className={`w-5 h-5 ${themeClasses.text} opacity-50`} />
                                        ) : (
                                            <Euro className={`w-5 h-5 ${themeClasses.text} opacity-50`} />
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={value === 0 ? '' : value}
                                        onChange={(e) => updateLocal(valueField, parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className={`
                                        w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl outline-none
                                        text-xl font-bold text-gray-800 placeholder-gray-300
                                        focus:border-transparent ${themeClasses.ring} focus:ring-2 transition-all
                                        ${NO_SPINNER_CLASS}
                                    `}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 text-xs font-bold">
                                            {mode === 'PERCENT' ? '%' : 'EUR'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#004aad] text-white p-6 relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors" title="Annulla modifiche">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <Split className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight leading-none">
                                Ripartizione
                            </h3>
                            <p className="text-blue-100 text-sm font-medium mt-1 opacity-90">{employee.firstName} {employee.lastName}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-gray-50/50 space-y-4">
                    {renderCard(
                        <Briefcase className="w-5 h-5" />,
                        "Trasferta",
                        localConfig.travelMode,
                        localConfig.travelValue,
                        'travelMode', 'travelValue',
                        'blue'
                    )}
                    {renderCard(
                        <Car className="w-5 h-5" />,
                        "Benzina",
                        localConfig.fuelMode,
                        localConfig.fuelValue,
                        'fuelMode', 'fuelValue',
                        'orange'
                    )}
                    {renderCard(
                        <Receipt className="w-5 h-5" />,
                        "Spese",
                        localConfig.expensesMode,
                        localConfig.expensesValue,
                        'expensesMode', 'expensesValue',
                        'purple'
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end items-center flex-shrink-0 gap-3">
                    <button onClick={onClose} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                        Annulla
                    </button>
                    <button onClick={handleSave} className="bg-[#004aad] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#003580] shadow-lg transform active:scale-95 transition-all text-sm flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Salva e Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- SUB-COMPONENT FOR CELLS ---
interface DayInputCellProps {
    empId: string;
    dayNum: number;
    data: AttendanceRecord | undefined;
    calculatedStandardHours: number;
    isRedColumn: boolean;
    isEvenRow: boolean;
    activeTool: AttendanceType;
    onInteract: (empId: string, dayNum: number, type: AttendanceType, value: number) => void;
}

const DayInputCell = React.memo(({ empId, dayNum, data, calculatedStandardHours, isRedColumn, isEvenRow, activeTool, onInteract }: DayInputCellProps) => {
    const currentType = data?.type || 'WORK';
    const displayValue = data !== undefined ? data.value : calculatedStandardHours;

    // Calculate standard background to maintain consistency in split view
    let standardBg = 'bg-white';
    if (isRedColumn) standardBg = 'bg-red-50/50';
    else if (isEvenRow) standardBg = 'bg-slate-50';

    // Logic for background styling
    let bgClass = '';
    let cellContent = null;

    if (currentType === 'FERIE') {
        bgClass = 'bg-green-100 hover:bg-green-200';
        cellContent = <span className="flex items-center justify-center w-full h-full text-green-700 font-black text-xl select-none pointer-events-none tracking-tight">F</span>;
    } else if (currentType === 'MALATTIA') {
        bgClass = 'bg-red-100 hover:bg-red-200';
        cellContent = <span className="flex items-center justify-center w-full h-full text-red-700 font-black text-xl select-none pointer-events-none tracking-tight">M</span>;
    } else if (currentType === 'ASSENZA') {
        bgClass = 'bg-gray-200 hover:bg-gray-300';
        cellContent = <span className="flex items-center justify-center w-full h-full text-gray-500 font-black text-xl select-none pointer-events-none tracking-tight">A</span>;
    } else if (currentType === 'PERMESSO') {
        bgClass = 'bg-white p-0';
        const permitHours = displayValue;
        const remainingWorkHours = Math.max(0, calculatedStandardHours - permitHours);

        cellContent = (
            <div className="flex flex-col h-full w-full">
                {/* Standard Hours (Top Half) - Matches standard styling */}
                <div className={`h-1/2 flex items-center justify-center ${standardBg} border-b border-gray-200 font-bold text-base text-gray-800`}>
                    {remainingWorkHours}
                </div>
                {/* Permit Input (Bottom Half) */}
                <div className="h-1/2 relative flex items-center justify-center bg-purple-100">
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={permitHours === 0 ? '' : permitHours}
                        onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            onInteract(empId, dayNum, currentType, val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full h-full text-center bg-transparent outline-none text-sm font-bold text-purple-900 ${NO_SPINNER_CLASS}`}
                        placeholder="0"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-black text-purple-900/60 pointer-events-none">P</span>
                </div>
            </div>
        );
    } else if (currentType === 'STRAORDINARIO') {
        bgClass = 'bg-white p-0';
        const extraHours = displayValue;

        cellContent = (
            <div className="flex flex-col h-full w-full">
                {/* Standard Hours (Top Half) - Matches standard styling */}
                <div className={`h-1/2 flex items-center justify-center ${standardBg} border-b border-gray-200 font-bold text-base text-gray-800`}>
                    {calculatedStandardHours}
                </div>
                {/* Overtime Input (Bottom Half) */}
                <div className="h-1/2 relative flex items-center justify-center bg-orange-100">
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={extraHours === 0 ? '' : extraHours}
                        onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            onInteract(empId, dayNum, currentType, val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full h-full text-center bg-transparent outline-none text-sm font-bold text-orange-900 ${NO_SPINNER_CLASS}`}
                        placeholder="0"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-black text-orange-900/60 pointer-events-none">S</span>
                </div>
            </div>
        );
    } else {
        if (isRedColumn) {
            bgClass = 'bg-red-50/50 hover:bg-red-50';
        } else if (isEvenRow) {
            bgClass = 'bg-slate-50 hover:bg-gray-100';
        } else {
            bgClass = 'bg-white hover:bg-gray-50';
        }
    }

    const handleClick = () => {
        if (activeTool !== 'WORK') {
            if (currentType === activeTool && activeTool !== 'PERMESSO' && activeTool !== 'STRAORDINARIO') {
                onInteract(empId, dayNum, 'WORK', 0);
            } else {
                onInteract(empId, dayNum, activeTool, 0);
            }
        } else {
            if (currentType !== 'WORK') {
                onInteract(empId, dayNum, 'WORK', 0);
            }
        }
    };

    const handleInputChange = (val: string) => {
        const num = val === '' ? 0 : parseFloat(val);
        onInteract(empId, dayNum, currentType, num);
    };

    const handleInputClick = (e: React.MouseEvent) => {
        if (activeTool !== currentType && activeTool !== 'WORK') {
        } else if (activeTool === 'WORK' && currentType !== 'WORK') {
        } else {
            e.stopPropagation();
        }
    };

    return (
        <td
            className={`border-b border-r border-gray-200 p-0 text-center align-middle h-14 ${bgClass} relative transition-colors ${activeTool !== 'WORK' ? 'cursor-cell' : ''}`}
            onClick={handleClick}
        >
            {cellContent ? (
                cellContent
            ) : (
                <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={displayValue === 0 ? '' : displayValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onClick={handleInputClick}
                    className={`w-full h-full text-center bg-transparent outline-none p-0 m-0 text-gray-800 ${displayValue > 0 ? 'font-bold text-base' : 'text-sm'} ${NO_SPINNER_CLASS}`}
                    placeholder={currentType === 'PERMESSO' || currentType === 'STRAORDINARIO' ? 'Ore' : ''}
                    style={{ cursor: activeTool !== 'WORK' ? 'cell' : 'text' }}
                    readOnly={activeTool !== 'WORK' && activeTool !== currentType}
                />
            )}
        </td>
    );
}, (prev, next) => {
    return (
        prev.data === next.data &&
        prev.calculatedStandardHours === next.calculatedStandardHours &&
        prev.activeTool === next.activeTool &&
        prev.isRedColumn === next.isRedColumn &&
        prev.isEvenRow === next.isEvenRow
    );
});

DayInputCell.displayName = 'DayInputCell';

// --- MAIN COMPONENT ---

const getDayKey = (dayIndex: number): DayKey => {
    const map: Record<number, DayKey> = {
        0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
    };
    return map[dayIndex];
};

export const MonthlySheet: React.FC<Props> = ({ employees, sites, setEmployees }) => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [monthlyData, setMonthlyData] = useState<MonthlyData>({ overrides: {}, notes: {}, splits: {}, extraJobs: {}, salaryTarget: {}, salaryMode: {} });
    const [recurringJobs, setRecurringJobs] = useState<Record<string, ExtraJob[]>>({});
    const [activeTool, setActiveTool] = useState<AttendanceType>('WORK');
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [configModalEmp, setConfigModalEmp] = useState<Employee | null>(null);
    const [isDaysCollapsed, setIsDaysCollapsed] = useState(false);

    // State for expanded rows (extra jobs)
    const [expandedEmpIds, setExpandedEmpIds] = useState<Set<string>>(new Set());
    // State for Time Entry Modal
    const [timeEntryModalEmpId, setTimeEntryModalEmpId] = useState<string | null>(null);

    const storageKeyRaw = format(currentDate, 'yyyy-MM');

    // Load Monthly Data
    useEffect(() => {
        setIsGenerating(true);
        const key = `${STORAGE_PREFIX}${storageKeyRaw}`;
        const saved = localStorage.getItem(key);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.splits) parsed.splits = {};
                if (!parsed.extraJobs) parsed.extraJobs = {};
                if (!parsed.salaryTarget) parsed.salaryTarget = {};
                if (!parsed.salaryMode) parsed.salaryMode = {};
                setMonthlyData(parsed);
            } catch (e) {
                console.error("Failed to parse monthly data", e);
                setMonthlyData({ overrides: {}, notes: {}, splits: {}, extraJobs: {}, salaryTarget: {}, salaryMode: {} });
            }
        } else {
            setMonthlyData({ overrides: {}, notes: {}, splits: {}, extraJobs: {}, salaryTarget: {}, salaryMode: {} });
        }

        // Load Recurring Jobs (Global)
        const savedRecurring = localStorage.getItem(RECURRING_JOBS_KEY);
        if (savedRecurring) {
            try {
                setRecurringJobs(JSON.parse(savedRecurring));
            } catch (e) {
                console.error("Failed to parse recurring jobs", e);
                setRecurringJobs({});
            }
        }

        const timer = setTimeout(() => setIsGenerating(false), 300);
        return () => clearTimeout(timer);
    }, [storageKeyRaw]);

    const { year, monthIndex, daysInMonthObj, monthLabel } = useMemo(() => {
        return {
            year: currentDate.getFullYear(),
            monthIndex: currentDate.getMonth(),
            daysInMonthObj: getDaysInMonth(currentDate),
            monthLabel: format(currentDate, 'MMMM yyyy', { locale: it }).toUpperCase()
        };
    }, [currentDate]);

    const daysColumns = useMemo(() => {
        const cols = [];
        for (let i = 1; i <= daysInMonthObj; i++) {
            const currentDay = new Date(year, monthIndex, i);
            const dayOfWeekIndex = getDay(currentDay);
            const { isHoliday } = checkIsHoliday(currentDay);

            cols.push({
                dayNum: i,
                dayName: format(currentDay, 'EEE', { locale: it }),
                isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6,
                isSunday: dayOfWeekIndex === 0,
                isHoliday: isHoliday,
                dayKey: getDayKey(dayOfWeekIndex),
                fullDate: currentDay
            });
        }
        return cols;
    }, [year, monthIndex, daysInMonthObj]);

    // --- HANDLERS FOR EXTRA JOBS ---
    const toggleRowExpansion = (empId: string) => {
        const newSet = new Set(expandedEmpIds);
        if (newSet.has(empId)) {
            newSet.delete(empId);
        } else {
            newSet.add(empId);
        }
        setExpandedEmpIds(newSet);
    };

    const handleAddExtraJob = (empId: string) => {
        // Always adds to monthly data initially (not locked)
        setMonthlyData(prev => {
            const currentExtras = prev.extraJobs?.[empId] || [];
            const newJob: ExtraJob = {
                id: crypto.randomUUID(),
                description: 'Nuovo lavoro extra',
                value: 0,
                hours: {},
                isLocked: false
            };
            const newData = {
                ...prev,
                extraJobs: {
                    ...prev.extraJobs,
                    [empId]: [...currentExtras, newJob]
                }
            };
            // Persist Monthly
            const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
            localStorage.setItem(storageKey, JSON.stringify(newData));

            // Auto-expand
            if (!expandedEmpIds.has(empId)) {
                toggleRowExpansion(empId);
            }

            return newData;
        });
    };

    const toggleJobLock = (empId: string, job: ExtraJob) => {
        if (job.isLocked) {
            // UNLOCK: Move from Recurring to Monthly (for this month)

            // 1. Remove from Recurring
            const newRecurring = { ...recurringJobs };
            newRecurring[empId] = (newRecurring[empId] || []).filter(j => j.id !== job.id);
            setRecurringJobs(newRecurring);
            localStorage.setItem(RECURRING_JOBS_KEY, JSON.stringify(newRecurring));

            // 2. Add to Monthly
            setMonthlyData(prev => {
                const currentExtras = prev.extraJobs?.[empId] || [];
                const unlockedJob = { ...job, isLocked: false, startMonth: undefined };
                const newData = {
                    ...prev,
                    extraJobs: { ...prev.extraJobs, [empId]: [...currentExtras, unlockedJob] }
                };
                localStorage.setItem(`${STORAGE_PREFIX}${storageKeyRaw}`, JSON.stringify(newData));
                return newData;
            });

        } else {
            // LOCK: Move from Monthly to Recurring

            // 1. Add to Recurring
            const newRecurring = { ...recurringJobs };
            const lockedJob = { ...job, isLocked: true, startMonth: storageKeyRaw };
            newRecurring[empId] = [...(newRecurring[empId] || []), lockedJob];
            setRecurringJobs(newRecurring);
            localStorage.setItem(RECURRING_JOBS_KEY, JSON.stringify(newRecurring));

            // 2. Remove from Monthly
            setMonthlyData(prev => {
                const currentExtras = prev.extraJobs?.[empId] || [];
                const filteredExtras = currentExtras.filter(j => j.id !== job.id);
                const newData = {
                    ...prev,
                    extraJobs: { ...prev.extraJobs, [empId]: filteredExtras }
                };
                localStorage.setItem(`${STORAGE_PREFIX}${storageKeyRaw}`, JSON.stringify(newData));
                return newData;
            });
        }
    };

    const handleUpdateExtraJob = (empId: string, jobId: string, field: keyof ExtraJob | 'hour', value: any, dayNum?: number) => {
        // Check if job is recurring
        const isRecurring = recurringJobs[empId]?.some(j => j.id === jobId);

        if (isRecurring) {
            // Update Recurring State
            setRecurringJobs(prev => {
                const currentExtras = prev[empId] || [];
                const updatedExtras = currentExtras.map(job => {
                    if (job.id !== jobId) return job;
                    if (field === 'hour' && dayNum !== undefined) {
                        const newHours = { ...job.hours };
                        if (value === 0 || value === '') delete newHours[dayNum];
                        else newHours[dayNum] = parseFloat(value);
                        return { ...job, hours: newHours };
                    } else if (field === 'description') {
                        return { ...job, description: value };
                    } else if (field === 'value') {
                        return { ...job, value: parseFloat(value) || 0 };
                    }
                    return job;
                });
                const newRecurring = { ...prev, [empId]: updatedExtras };
                localStorage.setItem(RECURRING_JOBS_KEY, JSON.stringify(newRecurring));
                return newRecurring;
            });
        } else {
            // Update Monthly State
            setMonthlyData(prev => {
                const currentExtras = prev.extraJobs?.[empId] || [];
                const updatedExtras = currentExtras.map(job => {
                    if (job.id !== jobId) return job;

                    if (field === 'hour' && dayNum !== undefined) {
                        const newHours = { ...job.hours };
                        if (value === 0 || value === '') {
                            delete newHours[dayNum];
                        } else {
                            newHours[dayNum] = parseFloat(value);
                        }
                        return { ...job, hours: newHours };
                    } else if (field === 'description') {
                        return { ...job, description: value };
                    } else if (field === 'value') {
                        return { ...job, value: parseFloat(value) || 0 };
                    }
                    return job;
                });

                const newData = {
                    ...prev,
                    extraJobs: { ...prev.extraJobs, [empId]: updatedExtras }
                };
                const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
                localStorage.setItem(storageKey, JSON.stringify(newData));
                return newData;
            });
        }
    };

    const handleDeleteExtraJob = (empId: string, jobId: string) => {
        // Check if recurring
        const isRecurring = recurringJobs[empId]?.some(j => j.id === jobId);

        if (isRecurring) {
            setRecurringJobs(prev => {
                const currentExtras = prev[empId] || [];
                const updatedExtras = currentExtras.filter(j => j.id !== jobId);
                const newRecurring = { ...prev, [empId]: updatedExtras };
                localStorage.setItem(RECURRING_JOBS_KEY, JSON.stringify(newRecurring));
                return newRecurring;
            });
        } else {
            setMonthlyData(prev => {
                const currentExtras = prev.extraJobs?.[empId] || [];
                const updatedExtras = currentExtras.filter(j => j.id !== jobId);
                const newData = {
                    ...prev,
                    extraJobs: { ...prev.extraJobs, [empId]: updatedExtras }
                };
                const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
                localStorage.setItem(storageKey, JSON.stringify(newData));
                return newData;
            });
        }
    };

    // --- HANDLER FOR TIME ENTRY UPDATE ---
    const handleUpdateTimeEntries = (newRecords: Record<string, AttendanceRecord>) => {
        setMonthlyData(prev => {
            const newOverrides = { ...prev.overrides, ...newRecords };
            const newData = { ...prev, overrides: newOverrides };
            const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
            localStorage.setItem(storageKey, JSON.stringify(newData));
            return newData;
        });
    };

    // --- HANDLER FOR MONTHLY SALARY TARGET ---
    const handleUpdateMonthlySalary = (empId: string, value: number) => {
        setMonthlyData(prev => {
            const newData = {
                ...prev,
                salaryTarget: { ...prev.salaryTarget, [empId]: value }
            };
            const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
            localStorage.setItem(storageKey, JSON.stringify(newData));
            return newData;
        });
    };

    const handleUpdateMonthlySalaryMode = (empId: string) => {
        setMonthlyData(prev => {
            const currentMode = prev.salaryMode?.[empId];
            const newMode: 'NET' | 'GROSS' = (currentMode === 'NET' || (!currentMode && employees.find(e => e.id === empId)?.targetMode === 'NET')) ? 'GROSS' : 'NET';

            const newData = {
                ...prev,
                salaryMode: { ...prev.salaryMode, [empId]: newMode }
            };
            const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
            localStorage.setItem(storageKey, JSON.stringify(newData));
            return newData;
        });
    };


    const safeHandleInteract = (empId: string, dayNum: number, type: AttendanceType, value: number) => {
        const key = `${empId}-${dayNum}`;
        setMonthlyData(prev => {
            const newOverrides = { ...prev.overrides };
            const current = newOverrides[key];
            if (activeTool !== 'WORK' && current?.type === activeTool && activeTool !== 'PERMESSO' && activeTool !== 'STRAORDINARIO') {
                delete newOverrides[key];
            } else if (type === 'WORK' && value === 0 && activeTool !== 'WORK') {
                delete newOverrides[key];
            } else {
                // Preserve existing timeDetails if we are just updating the numeric value or changing tool
                // (Though usually tools like 'FERIE' will overwrite time details, which is correct behavior)
                newOverrides[key] = { type, value };
            }
            const nextData = { ...prev, overrides: newOverrides };
            const storageKey = `${STORAGE_PREFIX}${storageKeyRaw}`;
            localStorage.setItem(storageKey, JSON.stringify(nextData));
            return nextData;
        });
    };

    const goToPrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    // Saving the full split config manually
    const handleSaveSplitConfig = (newConfig: SplitConfig) => {
        if (!configModalEmp) return;
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== configModalEmp.id) return emp;
            return {
                ...emp,
                splitConfig: newConfig
            };
        }));
        setConfigModalEmp(null);
    };

    // --- DOWNLOAD FUNCTIONALITIES ---

    const handleDownloadExcel = () => {
        const table = document.getElementById('monthly-sheet-table');
        if (!table) return;

        const clone = table.cloneNode(true) as HTMLElement;
        const originalInputs = table.querySelectorAll('input');
        const clonedInputs = clone.querySelectorAll('input');
        originalInputs.forEach((input, index) => {
            if (clonedInputs[index]) {
                const val = input.value;
                const span = document.createElement('span');
                span.textContent = val;
                span.style.fontWeight = 'bold';
                clonedInputs[index].parentNode?.replaceChild(span, clonedInputs[index]);
            }
        });
        const buttons = clone.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());

        const tableEl = clone.querySelector('table') || clone;
        if (tableEl.tagName === 'TABLE') tableEl.setAttribute('border', '1');

        const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #000000; padding: 8px; text-align: center; vertical-align: middle; }
                th { background-color: #004aad; color: white; font-weight: bold; }
                .text-green-700 { color: #15803d; }
                .text-red-700 { color: #b91c1c; }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
        </body>
        </html>
      `;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Presenze_${format(currentDate, 'MMMM_yyyy', { locale: it })}.xls`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = () => {
        const table = document.getElementById('monthly-sheet-table');
        if (!table) return;

        // Clone the table to manipulate for export without affecting the UI
        const clone = table.cloneNode(true) as HTMLTableElement;

        // Clean up inputs in the cloned table
        const inputs = clone.querySelectorAll('input');
        inputs.forEach(input => {
            const val = input.value;
            const parent = input.parentElement;
            if (parent) {
                // If it's a time/number input, replace it with text
                if (input.type === 'number' || input.type === 'time' || input.type === 'text') {
                    parent.innerHTML = val || '';
                }
            }
        });

        // Remove the extra job buttons and expansion controls
        const cleanupSelectors = ['.lucide-plus', '.lucide-chevron-down', '.lucide-chevron-up', '.lucide-clock', '.lucide-lock', '.lucide-unlock', '.lucide-trash-2'];
        cleanupSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => {
                const btnContainer = el.closest('button');
                if (btnContainer) btnContainer.remove();
                else el.remove();
            });
        });

        // Initialize jsPDF in landscape mode
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Use autoTable to convert the HTML table to PDF
        autoTable(doc, {
            html: clone,
            theme: 'grid',
            styles: {
                fontSize: 7, // slightly larger font
                cellPadding: 3, // more padding for taller rows
                valign: 'middle',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            headStyles: {
                fillColor: [0, 74, 173], // #004aad
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 45 } // Employee Name column much wider
            },
            margin: { top: 10, right: 5, bottom: 10, left: 5 },
            tableWidth: 'auto',
            didParseCell: function (data) {
                // Clean up string splitting generated by HTML tags
                if (data.cell.text && Array.isArray(data.cell.text)) {
                    data.cell.text = data.cell.text.map(t => t.trim()).filter(t => t.length > 0);
                    // Standardize display by joining them cleanly
                    data.cell.text = [data.cell.text.join(' ')];
                }
            }
        });

        doc.save(`Presenze_${format(currentDate, 'MMMM_yyyy', { locale: it })}.pdf`);
    };

    // ... (Recurrence logic remains unchanged)
    // ... (Auto split logic remains unchanged)

    // --- RECURRENCE & HOURS LOGIC ---
    const checkRecurrence = (assign: Assignment, targetDate: Date): boolean => {
        const start = parseISO(assign.startDate);
        if (targetDate < start) return false;
        if (assign.endDate && targetDate > parseISO(assign.endDate)) return false;

        if (assign.weekSelector && assign.weekSelector.length > 0) {
            const dayOfMonth = targetDate.getDate();
            const currentWeekIndex = Math.ceil(dayOfMonth / 7);
            let matchesSelector = false;

            if (assign.weekSelector.includes(String(currentWeekIndex))) {
                matchesSelector = true;
            }

            if (assign.weekSelector.includes('LAST')) {
                const nextWeekSameDay = addDays(targetDate, 7);
                if (nextWeekSameDay.getMonth() !== targetDate.getMonth()) {
                    matchesSelector = true;
                }
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

    const getStandardHours = (emp: Employee, day: typeof daysColumns[0]) => {
        if (day.isHoliday) return 0;
        const dayKey = day.dayKey;

        const activeAssignments = (emp.defaultAssignments || []).filter(a => !a.archived);

        if (activeAssignments.length > 0) {
            const total = activeAssignments
                .filter(a => a.type !== 'FORFAIT')
                .reduce((acc, curr) => {
                    if (!checkRecurrence(curr, day.fullDate)) return acc;
                    return acc + (curr.schedule?.[dayKey] || 0);
                }, 0);
            return total;
        }

        // Fallback to contract hours if no active assignments
        return emp.contractHours?.[dayKey] || 0;
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

    const formatCurrency = (val: number) => {
        if (val === 0) return '-';
        if (val % 1 === 0) return `${val}€`;
        return `${val.toFixed(2)}€`;
    };

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Caricamento dati...</p>
            </div>
        );
    }

    // --- STYLING CONSTANTS FOR COLUMNS (OPTIMIZED SIZES) ---
    const COL_W_HOUR = "w-[70px] min-w-[70px]";
    const COL_W_RATE = "w-[80px] min-w-[80px]";
    const COL_W_TARGET = "w-[120px] min-w-[120px]";
    const COL_W_MONEY = "w-[85px] min-w-[85px]";

    // Common styles for TH cells
    const TH_BASE = "p-3 text-center border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-white align-middle shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)]";

    return (
        <div className="space-y-6 animate-fade-in relative">
            {configModalEmp && (
                <SplitConfigModal
                    employee={configModalEmp}
                    onSave={handleSaveSplitConfig}
                    onClose={() => setConfigModalEmp(null)}
                />
            )}

            {timeEntryModalEmpId && (() => {
                const emp = employees.find(e => e.id === timeEntryModalEmpId);
                if (!emp) return null;
                return (
                    <TimeEntryModal
                        employee={emp}
                        year={year}
                        month={monthIndex}
                        daysInMonth={daysInMonthObj}
                        currentOverrides={monthlyData.overrides}
                        onSave={handleUpdateTimeEntries}
                        onClose={() => setTimeEntryModalEmpId(null)}
                    />
                );
            })()}

            <div className="no-print space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-6 relative">
                        <div className="p-3 bg-blue-50 rounded-lg text-[#004aad]"><CalendarIcon className="w-6 h-6" /></div>
                        <div className="flex items-center gap-2 select-none relative">
                            <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-700 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                            <h2 onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="text-2xl font-black text-gray-800 uppercase w-[220px] text-center cursor-pointer hover:text-blue-700 transition-colors">{monthLabel}</h2>
                            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-700 transition-colors"><ChevronRight className="w-6 h-6" /></button>
                            {isMonthPickerOpen && (<MonthPickerOverlay currentDate={currentDate} onClose={() => setIsMonthPickerOpen(false)} onSelect={(d) => { setCurrentDate(d); setIsMonthPickerOpen(false); }} />)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDaysCollapsed(!isDaysCollapsed)}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 border border-transparent hover:border-gray-200 ${isDaysCollapsed ? 'bg-blue-100 text-[#004aad]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {isDaysCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            {isDaysCollapsed ? 'Espandi' : 'Compatta'}
                        </button>
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}><Save className="w-3 h-3" />{saveStatus === 'saving' ? 'Salvataggio...' : 'Salvato'}</div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleDownloadExcel}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                                title="Scarica come Excel"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className={`bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2`}
                                title="Apre la finestra di stampa. Seleziona 'Salva come PDF' come destinazione."
                            >
                                <FileText className="w-4 h-4" /> PDF
                            </button>
                        </div>
                    </div>
                </div>
                {!isDaysCollapsed && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wide mr-4">{activeTool !== 'WORK' ? <PaintBucket className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}<span>Strumenti:</span></div>
                            <div className="flex flex-wrap gap-2">
                                {TOOLS.map(tool => (
                                    <button key={tool.id} onClick={() => setActiveTool(tool.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${activeTool === tool.id ? `ring-2 ring-offset-1 ring-blue-600 ${tool.bg} ${tool.color} ${tool.border}` : `hover:bg-gray-50 bg-white text-gray-600 border-gray-200`}`}>{tool.icon} {tool.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                <div className="overflow-x-auto pb-6 print:pb-0">
                    <table id="monthly-sheet-table" className="w-full border-collapse">
                        <thead>
                            <tr className="text-white">
                                <th className={`sticky left-0 z-20 bg-[#004aad] p-4 text-left w-[220px] min-w-[220px] border-b border-white/10 border-r border-white/10 font-bold uppercase text-xs tracking-wider shadow-[4px_0_12px_-2px_rgba(0,0,0,0.3)]`}>Dipendente</th>
                                {!isDaysCollapsed && daysColumns.map(day => (
                                    <th key={day.dayNum} className={`p-2 min-w-[3.5rem] text-center bg-[#004aad] border-b border-white/10 border-l border-white/5 ${day.isSunday ? 'bg-blue-800/50' : ''}`}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] opacity-70 uppercase font-medium text-blue-100">{day.dayName}</span>
                                            <span className={`text-xl font-black ${day.isHoliday ? 'text-[#ffec09]' : 'text-white'}`}>{day.dayNum}</span>
                                        </div>
                                    </th>
                                ))}

                                {/* Time Group - Blueish/Neutral */}
                                <th className={`${TH_BASE} w-[60px] min-w-[60px] bg-blue-600`}>P / S</th> {/* Changed width and color */}
                                <th className={`${TH_BASE} ${COL_W_HOUR} bg-blue-600`}>Tot.</th>
                                <th className={`${TH_BASE} ${COL_W_HOUR} bg-blue-500 text-blue-100`}>Contr.</th>
                                <th className={`${TH_BASE} ${COL_W_HOUR} bg-blue-700 border-l border-white/10`}>Diff.</th>

                                {/* Financial Config Group - Purple/Cyan */}
                                <th className={`${TH_BASE} ${COL_W_RATE} bg-indigo-600 border-l-4 border-white/20`}>Tariffa</th>
                                <th className={`${TH_BASE} ${COL_W_TARGET} bg-cyan-600`}>Netto/Lordo</th>

                                {/* Result Group - Green */}
                                <th className={`${TH_BASE} ${COL_W_MONEY} bg-emerald-600 border-l-4 border-white/20`}>Valore</th>

                                {/* Extras Group - Distinct */}
                                <th className={`${TH_BASE} ${COL_W_MONEY} bg-sky-500 border-l-4 border-white/20`}>Trasf.</th>
                                <th className={`${TH_BASE} ${COL_W_MONEY} bg-amber-500`}>Benzina</th>
                                <th className={`${TH_BASE} ${COL_W_MONEY} bg-fuchsia-500`}>Spese</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, index) => {
                                const isEven = index % 2 === 0;

                                const empRecurring = recurringJobs[emp.id] || [];
                                const empMonthly = monthlyData.extraJobs?.[emp.id] || [];
                                const visibleRecurring = empRecurring.filter(job => !job.startMonth || job.startMonth <= storageKeyRaw);
                                const extraJobs = [...empMonthly, ...visibleRecurring];
                                const isExpanded = expandedEmpIds.has(emp.id);

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

                                extraJobs.forEach(job => {
                                    const jobHours = Object.values(job.hours).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                    totalWork += jobHours;
                                });

                                totalWork = Math.round(totalWork * 100) / 100;
                                totalPermit = Math.round(totalPermit * 100) / 100;
                                totalOvertime = Math.round(totalOvertime * 100) / 100;

                                const totalContract = daysColumns.reduce((acc, day) => {
                                    if (day.isHoliday) return acc;
                                    return acc + (emp.contractHours?.[day.dayKey] || 0);
                                }, 0);

                                const hasAssignments = emp.defaultAssignments.length > 0;
                                const isAllForfait = hasAssignments && emp.defaultAssignments.every(a => a.type === 'FORFAIT');
                                const totalForfaitAmount = emp.defaultAssignments.filter(a => a.type === 'FORFAIT').reduce((acc, curr) => acc + (curr.forfaitAmount || 0), 0);

                                const effectiveHoursForDiff = totalWork + totalPermit;
                                let diff = effectiveHoursForDiff - totalContract;

                                if (isAllForfait) { diff = 0; }
                                diff = Math.round(diff * 100) / 100;

                                const rate = emp.hourlyRate || 0;

                                const target = monthlyData.salaryTarget?.[emp.id] !== undefined ? monthlyData.salaryTarget[emp.id] : (emp.targetSalary || 0);
                                const targetMode = monthlyData.salaryMode?.[emp.id] ? monthlyData.salaryMode[emp.id] : (emp.targetMode || 'NET');

                                const extraJobsValue = extraJobs.reduce((acc, job) => acc + (job.value || 0), 0);
                                const diffValue = (diff * rate) + (totalOvertime * rate) + totalForfaitAmount + extraJobsValue;
                                const splits = calculateAutoSplits(diffValue, emp.splitConfig);
                                const rowBg = isEven ? 'bg-slate-50' : 'bg-white';

                                return (
                                    <React.Fragment key={emp.id}>
                                        <tr className={`group ${rowBg} hover:bg-blue-50/30 transition-colors border-b border-gray-100`}>
                                            <td className={`sticky left-0 z-10 p-0 border-r border-gray-200 font-bold text-sm text-gray-800 ${rowBg} shadow-[4px_0_12px_-2px_rgba(0,0,0,0.05)]`}>
                                                <div className="flex items-center justify-between px-3 py-2 w-full h-full border-l-4 border-transparent hover:border-[#004aad] transition-colors relative">
                                                    <div className="flex flex-col truncate mr-2">
                                                        <span className="text-gray-900 font-black text-base truncate leading-tight mb-0.5">{emp.firstName}</span>
                                                        <span className="text-gray-500 text-xs font-medium truncate uppercase tracking-wide">{emp.lastName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setTimeEntryModalEmpId(emp.id)} className="p-1 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors" title="Calcolatore Orari"><Clock className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleAddExtraJob(emp.id)} className="p-1 rounded-full bg-blue-100 text-[#004aad] hover:bg-[#004aad] hover:text-white transition-colors" title="Aggiungi lavoro extra una tantum"><Plus className="w-3.5 h-3.5" /></button>
                                                        {extraJobs.length > 0 && (
                                                            <button onClick={() => toggleRowExpansion(emp.id)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {!isDaysCollapsed && daysColumns.map(day => {
                                                const key = `${emp.id}-${day.dayNum}`;
                                                const override = monthlyData.overrides[key];
                                                const calculated = getStandardHours(emp, day);
                                                return (
                                                    <DayInputCell key={day.dayNum} empId={emp.id} dayNum={day.dayNum} data={override} calculatedStandardHours={calculated} isRedColumn={day.isSunday || !!day.isHoliday} isEvenRow={isEven} activeTool={activeTool} onInteract={safeHandleInteract} />
                                                );
                                            })}

                                            {/* P / S Column */}
                                            <td className="p-2 border-l border-gray-200 text-center text-xs align-middle w-[60px] min-w-[60px]"> {/* Added width class */}
                                                <div className="flex flex-col items-center justify-center gap-1.5">
                                                    {totalPermit > 0 && <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">P: {totalPermit}</span>}
                                                    {totalOvertime > 0 && <span className="font-bold text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">S: {totalOvertime}</span>}
                                                    {totalPermit === 0 && totalOvertime === 0 && <span className="text-gray-200">-</span>}
                                                </div>
                                            </td>

                                            {/* Totale */}
                                            <td className={`p-3 border-l border-gray-200 text-center font-black text-gray-800 ${COL_W_HOUR}`}>{totalWork}</td>

                                            {/* Contratto */}
                                            <td className={`p-3 border-gray-200 text-center font-medium text-gray-400 ${COL_W_HOUR}`}>{totalContract}</td>

                                            {/* Differenza (Badge Style) */}
                                            <td className={`p-2 border-l border-gray-100 text-center align-middle ${COL_W_HOUR}`}>
                                                <div className={`
                                        flex items-center justify-center font-bold text-sm px-2 py-1 rounded-full shadow-sm border
                                        ${diff > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                        diff < 0 ? 'bg-red-100 text-red-700 border-red-200' :
                                                            'bg-gray-100 text-gray-400 border-gray-200'}
                                     `}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </div>
                                            </td>

                                            {/* Tariffa */}
                                            <td className={`p-2 border-l-4 border-gray-50 text-center relative group/rate ${COL_W_RATE}`}>
                                                <div className="relative flex items-center justify-center h-full w-full">
                                                    <input type="number" min="0" step="0.5" value={rate === 0 ? '' : rate} onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); setEmployees(prev => prev.map(ev => ev.id === emp.id ? { ...ev, hourlyRate: val } : ev)); }} className={`w-full text-center bg-transparent text-sm font-bold text-indigo-700 focus:text-indigo-900 outline-none border-b-2 border-transparent hover:border-gray-200 focus:border-indigo-500 transition-all py-1 px-1 ${NO_SPINNER_CLASS}`} placeholder="0" />
                                                    <span className="absolute right-2 text-indigo-300 text-[9px] pointer-events-none opacity-0 group-hover/rate:opacity-100 font-bold">€</span>
                                                </div>
                                            </td>

                                            {/* Netto/Lordo */}
                                            <td className={`p-1 border-gray-200 text-center relative group/target ${COL_W_TARGET}`}>
                                                <div className="flex flex-col items-center justify-center h-full w-full gap-1 py-1">
                                                    <div className="relative w-full px-2">
                                                        <input type="number" min="0" step="10" value={target === 0 ? '' : target} onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); handleUpdateMonthlySalary(emp.id, val); }} className={`w-full text-center bg-transparent text-sm font-bold text-cyan-900 outline-none border-b border-gray-200 focus:border-cyan-500 transition-all pb-0.5 ${NO_SPINNER_CLASS}`} placeholder="0" />
                                                        <span className="absolute right-0 top-0 text-cyan-300 text-[9px] pointer-events-none opacity-0 group-hover/target:opacity-100 font-bold">€</span>
                                                    </div>
                                                    <button onClick={() => handleUpdateMonthlySalaryMode(emp.id)} className={`text-[9px] font-bold uppercase tracking-wide px-2 py-[2px] rounded cursor-pointer transition-all select-none border w-16 ${targetMode === 'NET' ? 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`} title="Clicca per cambiare solo per questo mese">{targetMode === 'NET' ? 'Netto' : 'Lordo'}</button>
                                                </div>
                                            </td>

                                            {/* Valore (Main Result) */}
                                            <td className={`p-3 border-l-4 border-gray-50 text-center bg-emerald-50/30 ${COL_W_MONEY}`}>
                                                <span className={`block font-black text-sm ${diffValue > 0 ? 'text-emerald-700' : diffValue < 0 ? 'text-red-600' : 'text-gray-300'}`}>
                                                    {formatCurrency(diffValue)}
                                                </span>
                                            </td>

                                            {/* Trasferta */}
                                            <td onClick={() => setConfigModalEmp(emp)} className={`p-3 border-l-4 border-gray-50 text-center text-sm font-bold cursor-pointer hover:bg-sky-50 transition-colors bg-sky-50/10 ${COL_W_MONEY} text-sky-700`}>{splits.travel > 0 ? formatCurrency(splits.travel) : <span className="text-gray-200">-</span>}</td>

                                            {/* Benzina */}
                                            <td onClick={() => setConfigModalEmp(emp)} className={`p-3 border-gray-200 text-center text-sm font-bold cursor-pointer hover:bg-amber-50 transition-colors bg-amber-50/10 ${COL_W_MONEY} text-amber-700`}>{splits.fuel > 0 ? formatCurrency(splits.fuel) : <span className="text-gray-200">-</span>}</td>

                                            {/* Spese */}
                                            <td onClick={() => setConfigModalEmp(emp)} className={`p-3 border-gray-200 text-center text-sm font-bold cursor-pointer hover:bg-fuchsia-50 transition-colors bg-fuchsia-50/10 ${COL_W_MONEY} text-fuchsia-700`}>{splits.expenses > 0 ? formatCurrency(splits.expenses) : <span className="text-gray-200">-</span>}</td>
                                        </tr>

                                        {/* Extra Jobs Rows */}
                                        {isExpanded && extraJobs.map(job => {
                                            const jobTotalHours = Object.values(job.hours).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                            const isLocked = !!job.isLocked;

                                            return (
                                                <tr key={job.id} className="bg-yellow-50/50 hover:bg-yellow-50 transition-colors border-b border-gray-100/50">
                                                    <td className="sticky left-0 z-10 p-0 border-r border-gray-200 bg-yellow-50/80 backdrop-blur-[2px] shadow-[4px_0_12px_-2px_rgba(0,0,0,0.02)]">
                                                        <div className="flex items-center px-3 py-1.5 w-full h-full border-l-4 border-yellow-300 gap-2">
                                                            <input type="text" value={job.description} onChange={(e) => handleUpdateExtraJob(emp.id, job.id, 'description', e.target.value)} className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-gray-700 outline-none placeholder-gray-400" placeholder="Descrizione lavoro extra..." />

                                                            {/* LOCK TOGGLE */}
                                                            <button
                                                                onClick={() => toggleJobLock(emp.id, job)}
                                                                className={`p-1 rounded-md transition-colors ${isLocked ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                                                                title={isLocked ? "Sblocca (Diventa modificabile solo per questo mese)" : "Blocca e Ripeti (Diventa fisso da questo mese in avanti)"}
                                                            >
                                                                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                            </button>

                                                            <button onClick={() => handleDeleteExtraJob(emp.id, job.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50" title="Rimuovi riga"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </td>
                                                    {!isDaysCollapsed && daysColumns.map(day => {
                                                        const val = job.hours[day.dayNum] || 0;
                                                        return (
                                                            <td key={day.dayNum} className="border-r border-gray-100 p-0 h-[2.5rem] text-center align-middle">
                                                                <input type="number" min="0" step="0.5" value={val === 0 ? '' : val} onChange={(e) => handleUpdateExtraJob(emp.id, job.id, 'hour', e.target.value, day.dayNum)} className={`w-full h-full text-center bg-transparent outline-none text-xs text-gray-600 font-medium ${NO_SPINNER_CLASS} focus:bg-yellow-100 transition-colors`} placeholder="-" />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-gray-200"></td>
                                                    <td className={`text-center text-xs font-bold text-gray-600 border-l border-gray-200 bg-yellow-50/30 ${COL_W_HOUR}`}>{jobTotalHours > 0 ? jobTotalHours : '-'}</td>
                                                    <td className={`text-center text-xs text-gray-300 ${COL_W_HOUR}`}>-</td>
                                                    <td className={`text-center text-xs text-gray-300 ${COL_W_HOUR}`}>-</td>
                                                    <td className={`text-center text-xs text-gray-300 ${COL_W_RATE}`}>-</td>
                                                    <td className={`text-center text-xs text-gray-300 ${COL_W_TARGET}`}>-</td>
                                                    <td className={`p-1 text-center ${COL_W_MONEY}`}>
                                                        <div className="relative flex items-center justify-center">
                                                            <input type="number" min="0" step="1" value={job.value === 0 ? '' : job.value} onChange={(e) => handleUpdateExtraJob(emp.id, job.id, 'value', e.target.value)} className={`w-20 text-center bg-white border border-yellow-200 rounded px-1 py-0.5 text-xs font-bold text-gray-700 outline-none focus:border-yellow-400 ${NO_SPINNER_CLASS}`} placeholder="Valore €" />
                                                        </div>
                                                    </td>
                                                    <td colSpan={3} className="text-center text-[10px] text-gray-400 border-l border-gray-100 italic pt-2">
                                                        {isLocked ? <span className="flex items-center justify-center gap-1 text-blue-500 font-bold not-italic"><Lock className="w-2.5 h-2.5" /> Fisso</span> : 'Una Tantum'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            {employees.length === 0 && (
                                <tr><td colSpan={daysColumns.length + 7} className="p-8 text-center text-gray-400 italic">Nessun dipendente presente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-500 print:hidden">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Ferie</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> Malattia</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span> Permesso</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span> Straordinario</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 border border-gray-400 rounded"></span> Assenza</div>
            </div>
        </div>
    );
};