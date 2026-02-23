import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Site, DayKey, AttendanceType, AttendanceRecord, MonthlyData, MonthlySplit, SplitMode, SplitConfig, Assignment, ExtraJob } from '../types';
import { format, getDaysInMonth, getDay, addMonths, subMonths, setMonth, setYear, isSameDay, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { checkIsHoliday } from '../services/holidayService';
import { Printer, Calendar as CalendarIcon, Loader2, Clock, Umbrella, Stethoscope, AlertCircle, XCircle, Save, PaintBucket, MousePointer2, ChevronLeft, ChevronRight, X, Zap, Download, FileSpreadsheet, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
    employees: Employee[];
    sites: Site[];
}

// --- CONSTANTS ---
const STORAGE_PREFIX = 'cleaning_sheet_';
const NO_SPINNER_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Column Widths matching MonthlySheet for consistency
const COL_W_TARGET = "w-[120px] min-w-[120px]";
// Reduced from 110px to 85px as requested
const COL_W_MONEY = "w-[85px] min-w-[85px]";

const TOOLS: { id: AttendanceType; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
    { id: 'WORK', label: 'Ore Contratto', icon: <Clock className="w-4 h-4" />, color: 'text-gray-700', bg: 'bg-white', border: 'border-gray-200' },
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

export const MonthlyAllowanceSheet: React.FC<Props> = ({ employees }) => {
    // Use Date object state instead of string
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    // Persistent Data State
    const [monthlyData, setMonthlyData] = useState<MonthlyData>({
        overrides: {},
        notes: {},
        splits: {},
        extraJobs: {},
        salaryTarget: {},
        salaryMode: {}
    });

    const [activeTool, setActiveTool] = useState<AttendanceType>('WORK');
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [configModalEmp, setConfigModalEmp] = useState<Employee | null>(null);
    const [timeEntryModalEmpId, setTimeEntryModalEmpId] = useState<string | null>(null);

    // Derived Key for Storage
    const storageKeyRaw = format(currentDate, 'yyyy-MM');

    // --- PERSISTENCE: LOAD ---
    useEffect(() => {
        setIsGenerating(true);
        const key = `${STORAGE_PREFIX}${storageKeyRaw}`;
        const saved = localStorage.getItem(key);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure all fields exist
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

        const timer = setTimeout(() => setIsGenerating(false), 300);
        return () => clearTimeout(timer);
    }, [storageKeyRaw]);

    // --- PERSISTENCE: SAVE HELPER ---
    const saveToStorage = (newData: MonthlyData) => {
        setMonthlyData(newData);
        setSaveStatus('saving');
        const key = `${STORAGE_PREFIX}${storageKeyRaw}`;
        localStorage.setItem(key, JSON.stringify(newData));
        setTimeout(() => setSaveStatus('saved'), 500);
    };

    // --- MEMOIZED DATE LOGIC ---
    const { year, monthIndex, daysInMonthObj, monthLabel } = useMemo(() => {
        return {
            year: currentDate.getFullYear(),
            monthIndex: currentDate.getMonth(),
            daysInMonthObj: getDaysInMonth(currentDate),
            monthLabel: format(currentDate, 'MMMM yyyy', { locale: it }).toUpperCase()
        };
    }, [currentDate]);

    // --- MEMOIZED COLUMNS ---
    const daysColumns = useMemo(() => {
        const cols = [];
        for (let i = 1; i <= daysInMonthObj; i++) {
            const currentDay = new Date(year, monthIndex, i);
            const dayOfWeekIndex = getDay(currentDay);
            const { isHoliday } = checkIsHoliday(currentDay);

            cols.push({
                dayNum: i,
                dayName: format(currentDay, 'EEEEE', { locale: it }), // 1-letter abbreviation
                isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6,
                isSunday: dayOfWeekIndex === 0,
                isHoliday: isHoliday,
                dayKey: getDayKey(dayOfWeekIndex),
                fullDate: currentDay
            });
        }
        return cols;
    }, [year, monthIndex, daysInMonthObj]);

    // Filter employees based on the new toggle property
    // If property is undefined, default to true for backward compatibility
    const visibleEmployees = useMemo(() => {
        return employees.filter(e => e.showInAllowances !== false);
    }, [employees]);

    // --- CALCULATION LOGIC ---

    // NOTE: For Allowance Sheet (Cedolini), we use strictly CONTRACT HOURS for the daily grid.
    const getStandardHours = (emp: Employee, day: typeof daysColumns[0]) => {
        if (day.isHoliday) return 0;
        return emp.contractHours?.[day.dayKey] || 0;
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

    // --- INTERACTION HANDLERS ---
    const safeHandleInteract = (empId: string, dayNum: number, type: AttendanceType, value: number) => {
        // Intentionally empty or read-only behavior for Cedolini to prevent affecting Generator data
        // If we want to allow editing "Cedolini specific overrides" we would need a separate storage key
        // But per user request, this table depends ONLY on Contract Hours.
        // So interactions here are disabled/ignored.
    };

    const handleUpdateMonthlySalary = (empId: string, value: number) => {
        const newData = {
            ...monthlyData,
            salaryTarget: { ...monthlyData.salaryTarget, [empId]: value }
        };
        saveToStorage(newData);
    };

    const handleUpdateMonthlySalaryMode = (empId: string) => {
        const currentMode = monthlyData.salaryMode?.[empId];
        // Default fallback
        const empDefaultMode = employees.find(e => e.id === empId)?.targetMode || 'NET';
        const effectiveMode = currentMode || empDefaultMode;

        const newMode: 'NET' | 'GROSS' = effectiveMode === 'NET' ? 'GROSS' : 'NET';

        const newData = {
            ...monthlyData,
            salaryMode: { ...monthlyData.salaryMode, [empId]: newMode }
        };
        saveToStorage(newData);
    };

    // Only for state updates compatible with MonthlySheet if needed, though this modal is not fully used here
    const handleUpdateTimeEntries = (newRecords: Record<string, AttendanceRecord>) => {
        const newOverrides = { ...monthlyData.overrides, ...newRecords };
        saveToStorage({ ...monthlyData, overrides: newOverrides });
    };

    const handleSaveSplitConfig = (newConfig: SplitConfig) => {
        // NOTE: This updates the local state/props, but in a real app should propagate to parent state
        // For now we just close the modal as the functionality is mainly in EmployeeManager
        setConfigModalEmp(null);
    };

    const goToPrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    // --- DOWNLOAD FUNCTIONALITIES ---

    const handleDownloadExcel = () => {
        const table = document.getElementById('allowance-sheet-table');
        if (!table) return;

        const clone = table.cloneNode(true) as HTMLElement;

        // Clean up inputs and labels in the cloned table for Excel
        const inputs = clone.querySelectorAll('input');
        inputs.forEach(input => {
            const val = input.value;
            const cell = input.closest('td');
            if (cell) {
                const modeButton = cell.querySelector('button');
                if (modeButton && (modeButton.textContent === 'Netto' || modeButton.textContent === 'Lordo')) {
                    if (!val || val === '0') {
                        cell.innerHTML = '';
                    } else {
                        cell.innerHTML = `<span style="font-weight:bold">${val}</span> ${modeButton.textContent}`;
                    }
                } else {
                    const parent = input.parentElement;
                    if (parent && (input.type === 'number' || input.type === 'time' || input.type === 'text')) {
                        parent.innerHTML = `<span style="font-weight:bold">${val || ''}</span>`;
                    }
                }
            }
        });

        // Ensure employee names have a space between first and last name
        const nameCells = clone.querySelectorAll('tbody tr td:first-child');
        nameCells.forEach(cell => {
            const nameContainer = cell.querySelector('.flex-col');
            if (nameContainer) {
                const spans = nameContainer.querySelectorAll('span');
                if (spans.length >= 2) {
                    nameContainer.innerHTML = `${spans[0].textContent} ${spans[1].textContent}`;
                }
            }
        });

        // Ensure the table has border attribute for Excel to recognize it easily
        const tableEl = clone.querySelector('table') || clone;
        if (tableEl.tagName === 'TABLE') {
            tableEl.setAttribute('border', '1');
        }

        // Construct HTML file for Excel with specific styles for borders
        const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #000000; padding: 8px; text-align: center; vertical-align: middle; }
                th { background-color: #15803d; color: white; font-weight: bold; }
                .text-green-700 { color: #15803d; }
                .text-red-700 { color: #b91c1c; }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
        </body>
        </html>
      `;

        // Add BOM to Blob
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Cedolini_${format(currentDate, 'MMMM_yyyy', { locale: it })}.xls`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = async () => {
        const table = document.getElementById('allowance-sheet-table');
        if (!table) return;

        const clone = table.cloneNode(true) as HTMLTableElement;

        // Clean up inputs (replace with text)
        const inputs = clone.querySelectorAll('input');
        inputs.forEach(input => {
            const val = input.value;
            const cell = input.closest('td');
            if (cell) {
                const modeButton = cell.querySelector('button');
                if (modeButton && (modeButton.textContent === 'Netto' || modeButton.textContent === 'Lordo')) {
                    if (!val || val === '0') {
                        cell.innerHTML = '';
                    } else {
                        cell.innerHTML = `${val} ${modeButton.textContent}`;
                    }
                } else {
                    const parent = input.parentElement;
                    if (parent && (input.type === 'number' || input.type === 'time' || input.type === 'text')) {
                        parent.innerHTML = val || '';
                    }
                }
            }
        });

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        autoTable(doc, {
            html: clone,
            theme: 'grid',
            startY: 20, // Leave space for header
            styles: {
                fontSize: 7,
                cellPadding: { top: 3, right: 0.5, bottom: 3, left: 0.5 },
                valign: 'middle',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [220, 220, 220]
            },
            headStyles: {
                fillColor: [21, 128, 61], // #15803d (bg-green-700)
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [245, 250, 245] // Light green/gray alternating row
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 45, cellPadding: { left: 4, top: 3, bottom: 3, right: 0.5 } }
            },
            margin: { top: 20, right: 5, bottom: 10, left: 5 },
            tableWidth: 'auto',
            didDrawPage: function (data) {
                // Header Text
                doc.setFontSize(16);
                doc.setTextColor(21, 128, 61); // Green branding for Cedolini
                doc.setFont("helvetica", "bold");
                doc.text("CLEAN.ING", data.settings.margin.left, 12);

                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.setFont("helvetica", "normal");
                const rightAlignedX = doc.internal.pageSize.getWidth() - data.settings.margin.right;
                doc.text(
                    format(currentDate, 'MMMM yyyy', { locale: it }).toUpperCase(),
                    rightAlignedX,
                    12,
                    { align: 'right' }
                );
            },
            didParseCell: function (data) {
                // Fix header layout for Day columns (D\n1)
                if (data.section === 'head' && data.cell.text && data.cell.text.length > 0) {
                    const rawText = data.cell.text.join(' ').trim();
                    // Regex to find a single letter followed by one or two digits
                    const match = rawText.match(/^([a-zA-Z])\s*(\d{1,2})$/);
                    if (match) {
                        // Put Number on top, Letter on bottom
                        data.cell.text = [match[2], match[1]];
                    }
                }

                // Keep name and surname cleanly spaced
                if (data.section === 'body' && data.column.index === 0 && data.cell.text) {
                    if (Array.isArray(data.cell.text)) {
                        const joined = data.cell.text.map(t => t.trim()).filter(t => t.length > 0).join(' ');
                        data.cell.text = [joined];
                    }
                }

                // Generic cleanup for other cells
                if (data.section === 'body' && data.column.index !== 0 && data.cell.text) {
                    if (Array.isArray(data.cell.text)) {
                        data.cell.text = [data.cell.text.map(t => t.trim()).filter(t => t.length > 0).join(' ')];
                    }
                }
            }
        });

        doc.save(`Cedolini_${format(currentDate, 'MMMM_yyyy', { locale: it })}.pdf`);
    };

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Caricamento dati...</p>
            </div>
        );
    }

    const isPaintMode = activeTool !== 'WORK';
    const SUMMARY_HEADER_CLASS = "p-3 text-center border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-white align-middle";

    return (
        <div className="space-y-6 animate-fade-in relative">

            <div className="no-print space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-6 relative">
                        <div className="p-3 bg-green-50 rounded-lg text-green-700">
                            <CalendarIcon className="w-6 h-6" />
                        </div>

                        {/* CUSTOM MONTH NAVIGATOR */}
                        <div className="flex items-center gap-2 select-none relative">
                            <button
                                onClick={goToPrevMonth}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-green-700 transition-colors"
                                title="Mese Precedente"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <h2
                                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                className="text-2xl font-black text-gray-800 uppercase w-[220px] text-center cursor-pointer hover:text-green-700 transition-colors"
                            >
                                {monthLabel}
                            </h2>

                            <button
                                onClick={goToNextMonth}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-green-700 transition-colors"
                                title="Mese Successivo"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {isMonthPickerOpen && (
                                <MonthPickerOverlay
                                    currentDate={currentDate}
                                    onClose={() => setIsMonthPickerOpen(false)}
                                    onSelect={(d) => {
                                        setCurrentDate(d);
                                        setIsMonthPickerOpen(false);
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            <Save className="w-3 h-3" />
                            {saveStatus === 'saving' ? 'Salvataggio...' : 'Salvato'}
                        </div>
                        {/* SPLIT BUTTONS */}
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
                                title="Scarica il PDF orizzontale della tabella."
                            >
                                <FileText className="w-4 h-4" /> PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* TOOLS PALETTE */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wide mr-4">
                            {isPaintMode ? <PaintBucket className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
                            <span>Strumenti:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TOOLS.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(tool.id)}
                                    className={`
                           flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all
                           ${activeTool === tool.id
                                            ? `ring-2 ring-offset-1 ring-green-600 ${tool.bg} ${tool.color} ${tool.border}`
                                            : `hover:bg-gray-50 bg-white text-gray-600 border-gray-200`
                                        }
                        `}
                                >
                                    {tool.icon} {tool.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* THE TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                <div className="overflow-x-auto pb-6 print:pb-0">
                    <table id="allowance-sheet-table" className="w-full min-w-[1200px] border-collapse">
                        <thead>
                            <tr className="bg-green-700 text-white">
                                <th className="sticky left-0 z-20 bg-green-700 p-3 text-left w-64 border-b border-white/10 font-bold uppercase text-xs tracking-wider">Dipendente</th>
                                {daysColumns.map(day => (
                                    <th key={day.dayNum} className={`p-2 min-w-[3.5rem] text-center border-b border-white/10 border-l border-white/5 ${day.isSunday ? 'bg-white/10' : ''}`}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] opacity-80 uppercase">{day.dayName}</span>
                                            <span className={`text-lg font-black ${day.isHoliday ? 'text-[#ffec09]' : ''}`}>{day.dayNum}</span>
                                        </div>
                                    </th>
                                ))}

                                {/* COLUMNS SWAPPED & REDUCED */}
                                <th className={`${SUMMARY_HEADER_CLASS} w-20 bg-green-800 border-l border-white/10`}>Totale</th>
                                <th className={`${SUMMARY_HEADER_CLASS} w-[80px] min-w-[80px] bg-green-800`}>P / S</th>

                                {/* ADDED COLUMNS */}
                                <th className={`${SUMMARY_HEADER_CLASS} ${COL_W_TARGET} bg-cyan-600 border-l border-white/10`}>Netto/Lordo</th>
                                <th className={`${SUMMARY_HEADER_CLASS} ${COL_W_MONEY} bg-blue-500`}>Trasferta</th>
                                <th className={`${SUMMARY_HEADER_CLASS} ${COL_W_MONEY} bg-orange-500`}>Benzina</th>
                                <th className={`${SUMMARY_HEADER_CLASS} ${COL_W_MONEY} bg-purple-500`}>Spese</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleEmployees.map((emp, index) => {
                                const isEven = index % 2 === 0;
                                let totalWork = 0;
                                let totalPermit = 0;
                                let totalOvertime = 0;

                                // --- DATA AGGREGATION ---
                                daysColumns.forEach(day => {
                                    const key = `${emp.id}-${day.dayNum}`;

                                    // 1. Always Calculate Standard Contract Hours
                                    const calculatedContract = getStandardHours(emp, day);

                                    // 2. Fetch Override from Generator
                                    const override = monthlyData.overrides[key];

                                    // 3. Determine Effective Data for Allowance Sheet
                                    // Logic: Use override ONLY if it's NOT 'WORK'. 
                                    // If it's 'WORK' (manual edit in Generator), ignore it and use Contract.
                                    // If it's FERIE, MALATTIA, PERMESSO, etc., use the override.

                                    let type: AttendanceType = 'WORK';
                                    let val = calculatedContract;

                                    if (override && override.type !== 'WORK') {
                                        type = override.type;
                                        val = override.value;
                                    }

                                    // 4. Accumulate Totals based on Effective Data
                                    if (type === 'WORK') {
                                        totalWork += val;
                                    } else if (type === 'PERMESSO') {
                                        totalPermit += val;
                                        // If I take a permit, the remaining hours of my contract are considered worked
                                        // e.g. Contract 8h, Permit 2h -> Worked 6h + Permit 2h.
                                        // So we add (Contract - Permit) to totalWork
                                        totalWork += Math.max(0, calculatedContract - val);
                                    } else if (type === 'STRAORDINARIO') {
                                        totalOvertime += val;
                                        // Overtime is *extra*, so we assume the full contract was worked
                                        totalWork += calculatedContract;
                                    } else if (['FERIE', 'MALATTIA', 'ASSENZA'].includes(type)) {
                                        // Zero work hours for these types
                                    }
                                });

                                // IGNORE EXTRA JOBS (Actuals)
                                /* 
                                const extraJobs = monthlyData.extraJobs?.[emp.id] || [];
                                extraJobs.forEach(job => {
                                    const jobHours = Object.values(job.hours).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                    totalWork += jobHours;
                                });
                                */

                                // ROUNDING TOTALS
                                totalWork = Math.round(totalWork * 100) / 100;
                                totalPermit = Math.round(totalPermit * 100) / 100;
                                totalOvertime = Math.round(totalOvertime * 100) / 100;

                                // --- VALUE CALCULATION FOR SPLITS ---
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

                                // ROUNDING DIFF
                                diff = Math.round(diff * 100) / 100;

                                const rate = emp.hourlyRate || 0;

                                // Only consider Forfait amounts in this view, ignoring extra jobs value
                                const extraJobsValue = 0;
                                const diffValue = (diff * rate) + (totalOvertime * rate) + totalForfaitAmount + extraJobsValue;

                                // --- SPLIT CALCULATION ---
                                const splits = calculateAutoSplits(diffValue, emp.splitConfig);

                                // --- TARGET SALARY STATE ---
                                const target = monthlyData.salaryTarget?.[emp.id] !== undefined
                                    ? monthlyData.salaryTarget[emp.id]
                                    : (emp.targetSalary || 0);

                                const targetMode = monthlyData.salaryMode?.[emp.id]
                                    ? monthlyData.salaryMode[emp.id]
                                    : (emp.targetMode || 'NET');

                                return (
                                    <React.Fragment key={emp.id}>
                                        <tr className={`group ${isEven ? 'bg-green-50/30' : 'bg-white'}`}>
                                            {/* EMPLOYEE NAME */}
                                            <td className={`sticky left-0 z-10 p-0 border-r border-b border-gray-200 font-bold text-sm text-gray-800 ${isEven ? 'bg-green-50' : 'bg-white'}`}>
                                                <div className="flex items-center justify-between gap-2 p-3 w-full h-full">
                                                    <span className="truncate">{emp.firstName} {emp.lastName}</span>
                                                </div>
                                            </td>

                                            {/* DAY CELLS */}
                                            {daysColumns.map(day => {
                                                const key = `${emp.id}-${day.dayNum}`;
                                                const calculated = getStandardHours(emp, day);
                                                const override = monthlyData.overrides[key];

                                                // Determine what to pass to the cell:
                                                // If override is WORK -> Ignore (pass undefined so cell uses calculated)
                                                // If override is Special -> Pass it
                                                // If no override -> Pass undefined

                                                const cellData = (override && override.type !== 'WORK') ? override : undefined;

                                                return (
                                                    <DayInputCell
                                                        key={day.dayNum}
                                                        empId={emp.id}
                                                        dayNum={day.dayNum}
                                                        data={cellData}
                                                        calculatedStandardHours={calculated}
                                                        isRedColumn={day.isSunday || !!day.isHoliday}
                                                        isEvenRow={isEven}
                                                        activeTool={activeTool}
                                                        onInteract={safeHandleInteract}
                                                    />
                                                );
                                            })}

                                            {/* TOTAL COLUMN (SWAPPED) */}
                                            <td className="p-2 border-b border-l border-gray-200 text-center font-black text-sm bg-gray-50 text-green-700">
                                                {totalWork}
                                            </td>

                                            {/* P/S SUMMARY COLUMN (SWAPPED) */}
                                            <td className="p-2 border-b border-l border-gray-200 text-center text-xs bg-gray-50/50">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {totalPermit > 0 ? (
                                                        <span className="font-bold text-purple-700 bg-purple-50 px-1.5 rounded border border-purple-100">P: {totalPermit}</span>
                                                    ) : null}
                                                    {totalOvertime > 0 ? (
                                                        <span className="font-bold text-orange-600 bg-orange-50 px-1.5 rounded border border-orange-100">S: {totalOvertime}</span>
                                                    ) : null}
                                                    {totalPermit === 0 && totalOvertime === 0 && <span className="text-gray-300">-</span>}
                                                </div>
                                            </td>

                                            {/* --- NEW COLUMNS --- */}

                                            {/* NETTO/LORDO */}
                                            <td className={`p-1 border-b border-gray-200 text-center relative group/target ${COL_W_TARGET} border-l border-gray-100`}>
                                                <div className="flex flex-col items-center justify-center h-full w-full gap-1 py-1">
                                                    <div className="relative w-full px-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="10"
                                                            value={target === 0 ? '' : target}
                                                            onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); handleUpdateMonthlySalary(emp.id, val); }}
                                                            className={`w-full text-center bg-transparent text-sm font-bold text-cyan-900 outline-none border-b border-gray-200 focus:border-cyan-500 transition-all pb-0.5 ${NO_SPINNER_CLASS}`}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-0 top-0 text-cyan-300 text-[9px] pointer-events-none opacity-0 group-hover/target:opacity-100 font-bold">€</span>
                                                    </div>

                                                    <button
                                                        onClick={() => handleUpdateMonthlySalaryMode(emp.id)}
                                                        className={`
                                                  text-[9px] font-bold uppercase tracking-wide px-2 py-[2px] rounded cursor-pointer transition-all select-none border w-16
                                                  ${targetMode === 'NET'
                                                                ? 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'
                                                                : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                                            }
                                              `}
                                                        title="Clicca per cambiare solo per questo mese"
                                                    >
                                                        {targetMode === 'NET' ? 'Netto' : 'Lordo'}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* TRASFERTA */}
                                            <td className={`p-3 border-b border-gray-200 text-center text-sm font-bold text-blue-700 ${COL_W_MONEY}`}>
                                                {splits.travel > 0 ? formatCurrency(splits.travel) : <span className="text-gray-200">-</span>}
                                            </td>

                                            {/* BENZINA */}
                                            <td className={`p-3 border-b border-gray-200 text-center text-sm font-bold text-orange-700 ${COL_W_MONEY}`}>
                                                {splits.fuel > 0 ? formatCurrency(splits.fuel) : <span className="text-gray-200">-</span>}
                                            </td>

                                            {/* SPESE */}
                                            <td className={`p-3 border-b border-gray-200 text-center text-sm font-bold text-purple-700 ${COL_W_MONEY}`}>
                                                {splits.expenses > 0 ? formatCurrency(splits.expenses) : <span className="text-gray-200">-</span>}
                                            </td>

                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            {visibleEmployees.length === 0 && (
                                <tr>
                                    <td colSpan={daysColumns.length + 7} className="p-8 text-center text-gray-400 italic">
                                        Nessun dipendente presente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FOOTER LEGEND */}
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