import React, { useState, useEffect } from 'react';
import { Employee, Site, Assignment, DayKey, AssignmentType, RecurrenceType } from '../types';
import { Plus, Trash2, User, Briefcase, GripVertical, X, Pencil, Check, Search, ChevronDown, ChevronUp, Clock, FileText, Calculator, Euro, Wallet, Repeat, Calendar, Settings2, ArrowRight, PlayCircle, StopCircle, AlertCircle, Archive, MessageSquare, Copy, UserPlus, Sparkles, Target, Eye, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  employees: Employee[];
  sites: Site[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mer' },
  { key: 'thu', label: 'Gio' },
  { key: 'fri', label: 'Ven' },
  { key: 'sat', label: 'Sab' },
  { key: 'sun', label: 'Dom' },
];

const NO_SPINNER_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// --- SUB-COMPONENT: ADD EMPLOYEE MODAL ---
const AddEmployeeModal = ({ 
    isOpen, 
    onClose, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (first: string, last: string, rate: number) => void;
}) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [hourlyRate, setHourlyRate] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) return;
        onSave(firstName, lastName, parseFloat(hourlyRate) || 0);
        setFirstName('');
        setLastName('');
        setHourlyRate('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="bg-[#004aad] p-6 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-[#ffec09]" /> Nuovo Dipendente
                        </h3>
                        <p className="text-blue-200 text-sm mt-1">Inserisci i dati anagrafici per iniziare.</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nome *</label>
                            <input 
                                type="text" 
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Es. Mario"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Cognome *</label>
                            <input 
                                type="text" 
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Es. Rossi"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tariffa Oraria (€)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                            <input 
                                type="number" 
                                step="0.5"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-8 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium ${NO_SPINNER_CLASS}`}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                            Annulla
                        </button>
                        <button 
                            type="submit" 
                            disabled={!firstName.trim() || !lastName.trim()}
                            className="flex-1 py-3 bg-[#004aad] text-white font-bold rounded-xl hover:bg-[#003580] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            Crea Profilo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: CONFIG POPOVER ---
const AssignmentConfigModal = ({ 
    assign, 
    onClose, 
    onSave 
}: { 
    assign: Assignment; 
    onClose: () => void; 
    onSave: (newAssign: Assignment) => void;
}) => {
    const [localAssign, setLocalAssign] = useState<Assignment>({ ...assign });
    const [endDateType, setEndDateType] = useState(assign.endDate ? 'date' : 'text');

    const updateLocal = (field: string, value: any) => {
        setLocalAssign(prev => ({ ...prev, [field]: value }));
    };

    const toggleWeek = (val: string) => {
        const current = localAssign.weekSelector || [];
        if (current.includes(val)) {
            updateLocal('weekSelector', current.filter(x => x !== val));
        } else {
            updateLocal('weekSelector', [...current, val]);
        }
    };

    const handleSave = () => {
        onSave(localAssign);
        onClose();
    };

    const weekOptions = [
        { id: '1', label: '1ª' },
        { id: '2', label: '2ª' },
        { id: '3', label: '3ª' },
        { id: '4', label: '4ª' },
        { id: 'LAST', label: 'Ultima' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden animate-fade-in-up">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-[#004aad]" /> Configurazione
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500" title="Chiudi senza salvare"><X className="w-4 h-4"/></button>
                </div>
                
                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo Contratto</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => updateLocal('type', 'HOURLY')}
                                className={`flex-1 py-2 text-xs font-bold rounded border transition-colors ${localAssign.type !== 'FORFAIT' ? 'bg-blue-50 border-blue-200 text-[#004aad]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Orario
                            </button>
                            <button 
                                onClick={() => updateLocal('type', 'FORFAIT')}
                                className={`flex-1 py-2 text-xs font-bold rounded border transition-colors ${localAssign.type === 'FORFAIT' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Forfait
                            </button>
                        </div>
                        {localAssign.type === 'FORFAIT' && (
                            <div className="mt-2 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                                <input 
                                    type="number" 
                                    value={localAssign.forfaitAmount || ''}
                                    onChange={(e) => updateLocal('forfaitAmount', parseFloat(e.target.value) || 0)}
                                    className={`w-full pl-6 pr-3 py-2 text-sm border border-purple-200 rounded bg-purple-50/30 outline-none focus:border-purple-400 font-bold text-purple-700 ${NO_SPINNER_CLASS}`}
                                    placeholder="Importo Forfait"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Inizio</label>
                            <input 
                                type="date" 
                                value={localAssign.startDate}
                                onChange={(e) => updateLocal('startDate', e.target.value)}
                                className="w-full text-xs p-2 border border-gray-300 rounded bg-white outline-none focus:border-[#004aad] text-gray-800"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Fine</label>
                            <input 
                                type={endDateType}
                                placeholder="--/--/----"
                                onFocus={() => setEndDateType('date')}
                                onBlur={(e) => {
                                    if (!e.target.value) setEndDateType('text');
                                }}
                                value={localAssign.endDate || ''}
                                onChange={(e) => updateLocal('endDate', e.target.value)}
                                className="w-full text-xs p-2 border border-gray-300 rounded bg-white outline-none focus:border-[#004aad] text-gray-800 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block flex items-center gap-2">
                             <Repeat className="w-3 h-3" /> Ricorrenza
                         </label>
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => updateLocal('recurrence', 'WEEKLY')}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors ${!localAssign.recurrence || localAssign.recurrence === 'WEEKLY' ? 'bg-white border-blue-200 text-[#004aad] shadow-sm' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-200'}`}
                                >
                                    Settimanale
                                </button>
                                <button 
                                    onClick={() => updateLocal('recurrence', 'MONTHLY')}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors ${localAssign.recurrence === 'MONTHLY' ? 'bg-white border-blue-200 text-[#004aad] shadow-sm' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-200'}`}
                                >
                                    Mensile
                                </button>
                             </div>
                             
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">
                                    Filtra Settimane (Opzionale)
                                </label>
                                <div className="flex gap-1">
                                    {weekOptions.map((opt) => {
                                        const isSelected = (localAssign.weekSelector || []).includes(opt.id);
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => toggleWeek(opt.id)}
                                                className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${isSelected ? 'bg-[#004aad] text-white border-[#004aad]' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                             </div>

                             <div className="flex items-center gap-3">
                                 <span className="text-xs text-gray-600 font-medium">Ripeti ogni:</span>
                                 <div className="flex-1 flex items-center">
                                     <input 
                                        type="number" 
                                        min="1" 
                                        max="52"
                                        value={localAssign.interval || 1}
                                        onChange={(e) => updateLocal('interval', parseInt(e.target.value) || 1)}
                                        className={`w-12 text-center text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-l py-1 outline-none focus:border-[#004aad] ${NO_SPINNER_CLASS}`}
                                     />
                                     <div className="bg-gray-200 px-3 py-1 rounded-r border border-l-0 border-gray-300 text-xs text-gray-600 font-medium w-full text-center">
                                         {localAssign.recurrence === 'MONTHLY' ? 'Mesi' : 'Settimane'}
                                     </div>
                                 </div>
                             </div>
                             
                             <p className="text-[10px] text-gray-400 italic">
                                 {localAssign.weekSelector && localAssign.weekSelector.length > 0 
                                    ? `Attivo solo nelle settimane selezionate, rispettando l'intervallo.`
                                    : localAssign.recurrence === 'MONTHLY' 
                                        ? `Programmato la stessa settimana di inizio ogni ${localAssign.interval || 1} mesi.`
                                        : `Programmato ogni ${localAssign.interval || 1} settimane.`
                                 }
                             </p>
                         </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-right">
                    <button onClick={handleSave} className="bg-[#004aad] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#003580] transition-colors">
                        Salva & Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: CONFIRM MODAL ---
const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Elimina",
    isDestructive = true
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    isDestructive?: boolean;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold text-sm transition-colors">
                        Annulla
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg font-bold text-sm shadow-md transition-colors ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-[#004aad] hover:bg-blue-600'}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export const EmployeeManager: React.FC<Props> = ({ employees, sites, setEmployees }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [draggedSiteId, setDraggedSiteId] = useState<string | null>(null);
  const [draggedEmpIndex, setDraggedEmpIndex] = useState<number | null>(null);

  const [openEmpId, setOpenEmpId] = useState<string | null>(null);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');

  const [configModalTarget, setConfigModalTarget] = useState<{ empId: string, siteId: string, index: number } | null>(null);

  const [empToDelete, setEmpToDelete] = useState<string | null>(null);
  const [assignToDelete, setAssignToDelete] = useState<{ empId: string, index: number } | null>(null);
  const [assignToArchive, setAssignToArchive] = useState<{ empId: string, index: number } | null>(null);

  const addEmployee = (firstName: string, lastName: string, hourlyRate: number) => {
    const newEmp: Employee = {
      id: crypto.randomUUID(),
      firstName: firstName,
      lastName: lastName,
      defaultAssignments: [],
      contractHours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      hourlyRate: hourlyRate,
      splitConfig: {
          travelMode: 'NONE', travelValue: 0,
          fuelMode: 'NONE', fuelValue: 0,
          expensesMode: 'NONE', expensesValue: 0
      },
      showInAllowances: true
    };
    setEmployees(prev => [...prev, newEmp]);
    setOpenEmpId(newEmp.id);
    setIsPaletteOpen(false);
  };

  const confirmDeleteEmployee = () => {
      if (!empToDelete) return;
      setEmployees(prev => prev.filter(emp => emp.id !== empToDelete));
      if (openEmpId === empToDelete) setOpenEmpId(null);
      setEmpToDelete(null);
  };

  const toggleEmployee = (id: string) => {
      if (openEmpId === id) {
          setOpenEmpId(null);
      } else {
          setOpenEmpId(id);
          setIsPaletteOpen(false);
      }
  };

  const startEditing = (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();
    setEditingEmpId(emp.id);
    setEditFirstName(emp.firstName);
    setEditLastName(emp.lastName);
  };

  const saveEdit = (id: string) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, firstName: editFirstName, lastName: editLastName } : emp
    ));
    setEditingEmpId(null);
  };

  const cancelEdit = () => {
    setEditingEmpId(null);
  };

  const updateContractHours = (empId: string, day: DayKey, value: string) => {
    const hours = parseFloat(value) || 0;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        contractHours: {
          ...(emp.contractHours || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }),
          [day]: hours
        }
      };
    }));
  };

  const updateHourlyRate = (empId: string, value: string) => {
    const rate = parseFloat(value) || 0;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      return { ...emp, hourlyRate: rate };
    }));
  };

  const updateTargetSalary = (empId: string, value: string) => {
      const target = parseFloat(value) || 0;
      setEmployees(prev => prev.map(emp => {
          if (emp.id !== empId) return emp;
          return { ...emp, targetSalary: target };
      }));
  };

  const toggleTargetMode = (empId: string) => {
      setEmployees(prev => prev.map(emp => {
          if (emp.id !== empId) return emp;
          const newMode = emp.targetMode === 'GROSS' ? 'NET' : 'GROSS';
          return { ...emp, targetMode: newMode };
      }));
  };

  const toggleShowInAllowances = (empId: string) => {
      setEmployees(prev => prev.map(emp => {
          if (emp.id !== empId) return emp;
          return { ...emp, showInAllowances: !emp.showInAllowances };
      }));
  };

  const saveAssignmentConfig = (empId: string, index: number, newAssign: Assignment) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const assignments = emp.defaultAssignments || [];
      if (!assignments[index]) return emp;
      const newAssignments = [...assignments];
      newAssignments[index] = newAssign;
      return { ...emp, defaultAssignments: newAssignments };
    }));
  };

  const updateAssignmentField = (empId: string, index: number, field: string, value: any) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const assignments = emp.defaultAssignments || [];
      if (!assignments[index]) return emp;
      const newAssignments = [...assignments];
      newAssignments[index] = { ...newAssignments[index], [field]: value };
      return { ...emp, defaultAssignments: newAssignments };
    }));
  };

  const duplicateAssignment = (empId: string, index: number) => {
    setEmployees(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        const newAssignments = [...(emp.defaultAssignments || [])];
        const source = newAssignments[index];
        const copy: Assignment = {
            ...source,
            schedule: { ...source.schedule },
            weekSelector: source.weekSelector ? [...source.weekSelector] : [],
            note: source.note ? `${source.note} (Copia)` : '(Copia)'
        };
        newAssignments.splice(index + 1, 0, copy);
        return { ...emp, defaultAssignments: newAssignments };
    }));
  };

  const confirmArchiveAssignment = () => {
    if (!assignToArchive) return;
    const { empId, index } = assignToArchive;
    setEmployees(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        const newAssignments = [...(emp.defaultAssignments || [])];
        if (!newAssignments[index]) return emp;
        newAssignments[index] = { ...newAssignments[index], archived: true };
        return { ...emp, defaultAssignments: newAssignments };
    }));
    setAssignToArchive(null);
  };

  const updateHours = (empId: string, index: number, day: DayKey, value: string) => {
    const hours = parseFloat(value) || 0;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const newAssignments = [...(emp.defaultAssignments || [])];
      if (!newAssignments[index]) return emp;
      newAssignments[index] = {
          ...newAssignments[index],
          schedule: { ...newAssignments[index].schedule, [day]: hours }
      };
      return { ...emp, defaultAssignments: newAssignments };
    }));
  };

  const confirmRemoveAssignment = () => {
    if (!assignToDelete) return;
    const { empId, index } = assignToDelete;
    setEmployees(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        const newAssignments = [...(emp.defaultAssignments || [])];
        newAssignments.splice(index, 1);
        return { ...emp, defaultAssignments: newAssignments };
    }));
    setAssignToDelete(null);
  };

  const getSiteName = (id: string) => sites.find(s => s.id === id)?.name || 'Sconosciuto';
  
  const moveAssignment = (empId: string, currentIndex: number, direction: 'up' | 'down') => {
      setEmployees(prev => prev.map(emp => {
          if (emp.id !== empId) return emp;
          const newAssignments = [...(emp.defaultAssignments || [])];
          let targetIndex = -1;
          if (direction === 'up') {
              for (let i = currentIndex - 1; i >= 0; i--) {
                  if (!newAssignments[i].archived) {
                      targetIndex = i;
                      break;
                  }
              }
          } else {
              for (let i = currentIndex + 1; i < newAssignments.length; i++) {
                  if (!newAssignments[i].archived) {
                      targetIndex = i;
                      break;
                  }
              }
          }
          if (targetIndex !== -1) {
              [newAssignments[currentIndex], newAssignments[targetIndex]] = [newAssignments[targetIndex], newAssignments[currentIndex]];
          }
          return { ...emp, defaultAssignments: newAssignments };
      }));
  };

  const handleSiteDragStart = (e: React.DragEvent, siteId: string) => {
    setDraggedSiteId(siteId);
    e.dataTransfer.effectAllowed = "copy";
  };
  
  const handleSiteDragEnd = () => {
    setTimeout(() => {
        setDraggedSiteId(null);
    }, 50);
  };

  const handleDrop = (e: React.DragEvent, targetEmpId: string, targetIndex?: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedSiteId) {
          setEmployees(prev => {
              const empIndex = prev.findIndex(e => e.id === targetEmpId);
              if (empIndex === -1) return prev;
              
              const emp = prev[empIndex];
              const safeAssignments = emp.defaultAssignments || [];
              
              if (safeAssignments.some(a => a.siteId === draggedSiteId)) {
                  alert("Questo cantiere è già assegnato. Usa 'Duplica' se vuoi aggiungere un'altra riga per lo stesso cantiere.");
                  return prev;
              }

              const newAssign: Assignment = {
                  siteId: draggedSiteId,
                  startDate: new Date().toISOString().split('T')[0],
                  schedule: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                  type: 'HOURLY',
                  forfaitAmount: 0,
                  recurrence: 'WEEKLY',
                  interval: 1,
                  weekSelector: [],
                  archived: false,
                  note: ''
              };

              const newAssignments = [...safeAssignments];
              if (targetIndex !== undefined) newAssignments.splice(targetIndex, 0, newAssign);
              else newAssignments.push(newAssign);

              const newEmp = { ...emp, defaultAssignments: newAssignments };
              const newAll = [...prev];
              newAll[empIndex] = newEmp;
              return newAll;
          });
          setDraggedSiteId(null);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedSiteId) e.dataTransfer.dropEffect = "copy";
  };

  const handleEmpDragStart = (e: React.DragEvent, index: number) => {
      if (editingEmpId) { e.preventDefault(); return; }
      setDraggedEmpIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleEmpDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedEmpIndex === null || draggedEmpIndex === index) return;
      setEmployees(prev => {
          const newArr = [...prev];
          const item = newArr[draggedEmpIndex];
          newArr.splice(draggedEmpIndex, 1);
          newArr.splice(index, 0, item);
          return newArr;
      });
      setDraggedEmpIndex(index);
  };

  const handleEmpDragEnd = () => { setDraggedEmpIndex(null); };

  const ASSIGNMENT_GRID = "grid grid-cols-[30px_220px_minmax(100px,1fr)_70px_repeat(7,42px)_minmax(100px,auto)_36px_36px_36px] gap-2 items-center";

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      <AddEmployeeModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addEmployee}
      />

      <ConfirmModal 
        isOpen={!!empToDelete}
        title="Elimina Dipendente"
        message="Sei sicuro di voler eliminare questo dipendente? Verranno rimossi anche tutti i suoi dati."
        onConfirm={confirmDeleteEmployee}
        onCancel={() => setEmpToDelete(null)}
      />
      
      <ConfirmModal 
        isOpen={!!assignToDelete}
        title="Rimuovi Assegnazione"
        message="Sei sicuro di voler rimuovere questo cantiere dal dipendente? Le ore assegnate verranno perse."
        onConfirm={confirmRemoveAssignment}
        onCancel={() => setAssignToDelete(null)}
      />

      <ConfirmModal 
        isOpen={!!assignToArchive}
        title="Archivia Cantiere"
        message="Vuoi archiviare questo cantiere terminato? Non sarà più visibile in questa lista, ma rimarrà nei calcoli storici."
        onConfirm={confirmArchiveAssignment}
        onCancel={() => setAssignToArchive(null)}
        confirmLabel="Archivia"
        isDestructive={false}
      />

      {configModalTarget && (() => {
          const emp = employees.find(e => e.id === configModalTarget.empId);
          const assign = emp?.defaultAssignments[configModalTarget.index];
          if (!emp || !assign) return null;
          return (
            <AssignmentConfigModal 
                assign={assign}
                onClose={() => setConfigModalTarget(null)}
                onSave={(newAssign) => saveAssignmentConfig(emp.id, configModalTarget.index, newAssign)}
            />
          );
      })()}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
         <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
               <User className="w-8 h-8 text-[#004aad]" /> Il Tuo Team
            </h2>
            <p className="text-gray-500 font-medium mt-1">Gestisci contratti, orari e assegnazioni.</p>
         </div>
         <button 
           onClick={() => setIsAddModalOpen(true)}
           className="bg-[#004aad] text-white pl-4 pr-6 py-3 rounded-xl hover:bg-[#003580] font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 group"
         >
           <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
              <Plus className="w-5 h-5" />
           </div>
           Aggiungi Dipendente
         </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 text-sm font-medium text-gray-500">
          <Sparkles className="w-4 h-4 text-[#ffec09] fill-[#ffec09]" />
          <span>Totale Dipendenti: <strong className="text-gray-900">{employees.length}</strong></span>
      </div>

      <div className="space-y-4">
        {employees.map((emp, index) => {
          const isOpen = openEmpId === emp.id;
          const isEditing = editingEmpId === emp.id;
          const isDraggable = !isOpen && !isEditing;
          const assignments = emp.defaultAssignments || [];
          
          const activeAssignments = assignments.filter(a => !a.archived);
          
          const visibleAssignments = assignments
                .map((a, i) => ({ ...a, originalIndex: i }))
                .filter(a => !a.archived);

          const totalAssignedHours: number = activeAssignments
            .filter(a => a.type !== 'FORFAIT')
            .reduce((acc: number, curr) => {
                const dayValues = Object.values(curr.schedule || {}) as number[];
                return acc + dayValues.reduce((a: number, b) => a + (Number(b) || 0), 0);
            }, 0);
          
          const totalContractHours: number = (Object.values(emp.contractHours || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
          
          const isAllForfait = activeAssignments.length > 0 && activeAssignments.every(a => a.type === 'FORFAIT');
          const diffHours = isAllForfait ? 0 : totalAssignedHours - totalContractHours;
          const totalForfaitAmount = activeAssignments.filter(a => a.type === 'FORFAIT').reduce((acc: number, curr) => acc + (curr.forfaitAmount || 0), 0);
          
          const rate = Number(emp.hourlyRate) || 0;
          const totalEuroDifference = (diffHours * rate) + totalForfaitAmount;

          const targetMode = emp.targetMode || 'NET';
          const targetSalary = emp.targetSalary || 0;
          const showInAllowances = emp.showInAllowances !== false; // Default true

          return (
            <div 
              key={emp.id} 
              draggable={isDraggable}
              onDragStart={(e) => handleEmpDragStart(e, index)}
              onDragOver={(e) => handleEmpDragOver(e, index)}
              onDragEnd={handleEmpDragEnd}
              className={`rounded-xl overflow-hidden transition-all duration-300 group
                ${isOpen ? 'ring-2 ring-[#004aad] shadow-xl bg-white scale-[1.005]' : 'bg-white border border-gray-200 hover:shadow-md hover:border-blue-200'}
                ${draggedEmpIndex === index ? 'opacity-40 border-dashed border-2 border-blue-400' : ''}
              `}
            >
              <div 
                className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isOpen ? 'bg-gray-50/50' : 'bg-white'}`}
                onClick={() => !isEditing && toggleEmployee(emp.id)}
              >
                {isDraggable && <div className="mr-3 text-gray-300 group-hover:text-[#004aad] cursor-grab active:cursor-grabbing transition-colors"><GripVertical className="w-5 h-5" /></div>}

                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 shadow-sm transition-all ${isOpen ? 'bg-[#004aad] text-white rotate-3 scale-110' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-[#004aad]'}`}>
                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                  </div>
                  
                  {isEditing ? (
                    <div className="flex gap-2 flex-1 max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                       <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-black bg-white outline-none border-2 border-blue-200 focus:border-[#004aad]" placeholder="Nome" autoFocus />
                       <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-black bg-white outline-none border-2 border-blue-200 focus:border-[#004aad]" placeholder="Cognome" />
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-[#004aad] transition-colors">{emp.firstName} {emp.lastName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Contratto: 
                            <span className={`font-bold px-1.5 py-0.5 rounded ${isOpen ? 'bg-[#ffec09] text-black' : 'bg-gray-100 text-gray-600'}`}>{totalContractHours}h</span>
                         </span>
                         {totalEuroDifference !== 0 && (
                             <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalEuroDifference > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {totalEuroDifference > 0 ? '+' : ''}{totalEuroDifference.toFixed(2)}€
                             </span>
                         )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                   {isEditing ? (
                     <>
                        <button onClick={() => saveEdit(emp.id)} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"><Check className="w-5 h-5" /></button>
                        <button onClick={() => cancelEdit()} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"><X className="w-5 h-5" /></button>
                     </>
                   ) : (
                     <>
                        <button onClick={(e) => startEditing(e, emp)} className="p-2 rounded-lg text-gray-400 hover:text-[#004aad] hover:bg-blue-50 transition-colors"><Pencil className="w-5 h-5" /></button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEmpToDelete(emp.id); }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <div className={`ml-2 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                             <ChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                     </>
                   )}
                </div>
              </div>

              {isOpen && (
                <div className="p-4 md:p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col xl:flex-row gap-6 animate-fade-in-up">
                  <div className="flex-1 flex flex-col gap-6">
                      <div 
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-h-[200px] transition-colors flex flex-col relative"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, emp.id)}
                        style={{ borderColor: draggedSiteId ? '#004aad' : undefined, backgroundColor: draggedSiteId ? '#f0f9ff' : 'white' }}
                      >
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span>Piano di Lavoro Settimanale</span>
                            {activeAssignments.length === 0 && !isPaletteOpen && (<span className="text-xs text-[#004aad] bg-blue-50 px-2 py-1 rounded normal-case animate-pulse flex items-center gap-1"><ArrowRight className="w-3 h-3"/> Trascina qui i cantieri</span>)}
                         </h4>

                         <div className="overflow-x-auto pb-4 custom-scrollbar">
                            <div className="min-w-[1180px]">
                               <div className={`${ASSIGNMENT_GRID} mb-2 bg-gray-50/80 p-3 rounded-lg border border-gray-200/60`}>
                                  <div></div> 
                                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cantiere</div>
                                  <div className="text-xs font-bold text-gray-500 pl-1 uppercase tracking-wider">Note</div>
                                  <div className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">Importo</div>
                                  {DAYS.map(day => <div key={day.key} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day.label}</div>)}
                                  <div className="text-xs font-bold text-gray-500 text-center uppercase tracking-wider">Stato</div>
                                  <div></div>
                                  <div></div>
                                  <div></div>
                               </div>
                               
                               {activeAssignments.length === 0 ? (
                                 <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 mb-4 transition-colors hover:border-blue-300 hover:bg-blue-50/30">
                                   <Briefcase className="w-8 h-8 mb-2 opacity-20" />
                                   <p className="text-sm font-medium">Nessun cantiere assegnato.</p>
                                   <p className="text-xs opacity-70">Usa il menu a destra per aggiungere attività.</p>
                                 </div>
                               ) : (
                                 <div className="space-y-2 mb-6">
                                   {visibleAssignments.map((assign, visibleIndex) => {
                                      const index = assign.originalIndex;
                                      
                                      const hasCustomRecurrence = (assign.recurrence && assign.recurrence !== 'WEEKLY') || (assign.interval && assign.interval > 1) || (assign.weekSelector && assign.weekSelector.length > 0);
                                      const isForfait = assign.type === 'FORFAIT';

                                      const isFuture = assign.startDate > todayStr;
                                      const isExpired = assign.endDate && assign.endDate < todayStr;
                                      const isActive = !isFuture && !isExpired;

                                      const isFirst = visibleIndex === 0;
                                      const isLast = visibleIndex === visibleAssignments.length - 1;

                                      return (
                                        <div 
                                            key={`${assign.siteId}-${index}`} 
                                            className={`${ASSIGNMENT_GRID} p-2 rounded-xl border transition-all duration-200 group bg-white border-gray-100 hover:shadow-md hover:border-blue-200`}
                                        >
                                            <div className="flex flex-col gap-0.5 items-center justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); moveAssignment(emp.id, index, 'up'); }}
                                                    disabled={isFirst}
                                                    className="text-gray-300 hover:text-[#004aad] disabled:opacity-0 transition-colors p-0.5 rounded hover:bg-blue-50"
                                                    title="Sposta Su"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); moveAssignment(emp.id, index, 'down'); }}
                                                    disabled={isLast}
                                                    className="text-gray-300 hover:text-[#004aad] disabled:opacity-0 transition-colors p-0.5 rounded hover:bg-blue-50"
                                                    title="Sposta Giù"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            
                                            <div className="flex flex-col truncate pr-2">
                                                <span className="font-bold text-sm text-gray-700 truncate group-hover:text-[#004aad] transition-colors" title={getSiteName(assign.siteId)}>{getSiteName(assign.siteId)}</span>
                                            </div>

                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={assign.note || ''}
                                                    onChange={(e) => updateAssignmentField(emp.id, index, 'note', e.target.value)}
                                                    placeholder="Scrivi appunti..."
                                                    className="w-full text-xs border-b border-transparent focus:border-blue-300 outline-none bg-transparent text-gray-600 truncate placeholder-gray-300 focus:bg-white transition-colors py-1"
                                                />
                                            </div>

                                            <div className="flex justify-center items-center">
                                                 {isForfait && <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{assign.forfaitAmount}€</span>}
                                            </div>

                                            {DAYS.map((day, dIndex) => {
                                                const val = assign.schedule?.[day.key] || 0;
                                                return (
                                                    <div key={day.key} className="flex justify-center relative">
                                                        <input 
                                                            type="number" min="0" step="0.5" value={val === 0 ? '' : val}
                                                            onChange={(e) => updateHours(emp.id, index, day.key, e.target.value)}
                                                            className={`w-full h-9 text-center text-sm border-y border-r focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all ${NO_SPINNER_CLASS} 
                                                                ${dIndex === 0 ? 'border-l rounded-l-md' : ''} ${dIndex === 6 ? 'rounded-r-md' : ''}
                                                                ${val > 0 ? (isForfait ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold' : 'bg-white font-bold text-gray-900 border-gray-300') : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-white'}
                                                            `}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <div className="flex flex-col gap-1 items-center justify-center">
                                                {hasCustomRecurrence && (
                                                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 w-full justify-center truncate border border-blue-200" title="Recurrence Active">
                                                        <Repeat className="w-2 h-2" /> 
                                                        {assign.recurrence === 'MONTHLY' ? 'Mese' : `${assign.interval} Set.`}
                                                        {assign.weekSelector && assign.weekSelector.length > 0 && '*'}
                                                    </span>
                                                )}
                                                
                                                {isActive && (
                                                    <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full w-full text-center block border border-green-200" title="Attivo">
                                                        Attivo
                                                    </span>
                                                )}
                                                {isFuture && (
                                                    <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full w-full text-center block border border-orange-200" title="Futuro">
                                                        Futuro
                                                    </span>
                                                )}
                                                {isExpired && (
                                                    <div className="flex items-center gap-1 w-full justify-center">
                                                        <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full w-full text-center block truncate border border-red-200" title="Terminato">
                                                            Terminato
                                                        </span>
                                                        <button 
                                                           onClick={(e) => { e.stopPropagation(); setAssignToArchive({ empId: emp.id, index }); }}
                                                           className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                           title="Archivia (Nascondi)"
                                                        >
                                                            <Archive className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); duplicateAssignment(emp.id, index); }}
                                                    className="p-2 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Duplica Cantiere"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setConfigModalTarget({ empId: emp.id, siteId: assign.siteId, index }); }}
                                                    className={`p-2 rounded-lg transition-colors ${hasCustomRecurrence || isForfait ? 'bg-gray-100 text-gray-800 border border-gray-300' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
                                                    title="Configura Date e Ricorrenza"
                                                >
                                                    <Settings2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => setAssignToDelete({ empId: emp.id, index })}
                                                className="flex justify-center text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                   })}
                                 </div>
                               )}
                               
                               <div className="border-t border-gray-200 pt-6 space-y-3 px-2">
                                   <div className={ASSIGNMENT_GRID}>
                                      <div></div>
                                      <div className="col-span-3 text-right text-xs font-bold text-gray-500 uppercase flex items-center justify-end gap-1 pr-2 tracking-wider"><Clock className="w-3 h-3" /> Totale Assegnato</div>
                                      {DAYS.map(day => {
                                        const dayTotal = activeAssignments.filter(a => a.type !== 'FORFAIT').reduce((acc: number, curr) => acc + (Number(curr.schedule?.[day.key]) || 0), 0);
                                        return <div key={day.key} className={`text-center text-sm font-bold rounded py-1 ${dayTotal > 0 ? 'bg-gray-100 text-gray-800' : 'text-gray-300'}`}>{dayTotal > 0 ? dayTotal : '-'}</div>
                                      })}
                                      <div className="col-span-4 text-center text-sm font-black text-gray-800 bg-gray-100 rounded-lg py-1">{totalAssignedHours} h</div>
                                   </div>
                                    
                                   <div className={ASSIGNMENT_GRID}>
                                      <div></div>
                                      <div className="col-span-3 flex items-center justify-end gap-4 pr-2">
                                          <button 
                                                onClick={(e) => { e.stopPropagation(); toggleShowInAllowances(emp.id); }}
                                                className={`
                                                    flex items-center gap-1.5 px-2 py-1 rounded border transition-all
                                                    ${showInAllowances 
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}
                                                `}
                                                title="Visibilità in Cedolini"
                                            >
                                                {showInAllowances ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                <span className="text-[10px] font-bold uppercase">Cedolini</span>
                                            </button>

                                          <div className="text-xs font-bold text-[#004aad] uppercase flex items-center gap-1 tracking-wider"><FileText className="w-3 h-3" /> Contratto</div>
                                      </div>
                                      {DAYS.map(day => {
                                        const val = emp.contractHours?.[day.key] || 0;
                                        return <div key={day.key} className="flex justify-center"><input type="number" min="0" step="0.5" value={val === 0 ? '' : val} onChange={(e) => updateContractHours(emp.id, day.key, e.target.value)} className={`w-full h-8 text-center text-sm border rounded outline-none transition-all ${NO_SPINNER_CLASS} ${val > 0 ? 'bg-blue-50 border-blue-300 text-[#004aad] font-bold' : 'bg-gray-50/50 border-gray-200 text-gray-400 hover:bg-white'}`} /></div>
                                      })}
                                      <div className="col-span-4 text-center text-sm font-bold text-[#004aad] bg-blue-50 rounded-lg py-1 border border-blue-100">{totalContractHours} h</div>
                                   </div>
                                    
                                   <div className={`${ASSIGNMENT_GRID} mt-2`}>
                                      <div></div>
                                      <div className="col-span-3 text-right text-[10px] font-bold text-gray-400 uppercase flex items-center justify-end gap-1 pr-2 tracking-wider"><Calculator className="w-3 h-3" /> Differenza</div>
                                      {DAYS.map(day => {
                                          const assigned = activeAssignments.filter(a => a.type !== 'FORFAIT').reduce((acc: number, curr) => acc + (Number(curr.schedule?.[day.key]) || 0), 0);
                                          const contract = Number(emp.contractHours?.[day.key] || 0);
                                          const diff = isAllForfait ? 0 : assigned - contract;
                                          if (contract === 0 && assigned === 0 && !isAllForfait) return <div key={day.key}></div>;
                                          if (isAllForfait && diff === 0) return <div key={day.key} className="text-center text-xs text-gray-300">-</div>;
                                          return <div key={day.key} className={`text-center text-xs ${diff > 0 ? 'text-green-600 font-bold' : diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{diff > 0 ? `+${diff}` : diff}</div>
                                      })}
                                      <div className={`col-span-4 text-center text-xs font-bold py-1 ${diffHours > 0 ? 'text-green-600' : diffHours < 0 ? 'text-red-500' : 'text-gray-400'}`}>{diffHours > 0 ? '+' : ''}{diffHours} h</div>
                                   </div>

                                   <div className={`${ASSIGNMENT_GRID} mt-2 pt-2 border-t border-dashed border-gray-200 items-center`}>
                                      <div></div>
                                      
                                      <div className="col-span-3 text-right text-[10px] font-bold text-gray-400 uppercase flex items-center justify-end gap-1 pr-2 tracking-wider">
                                          <Euro className="w-3 h-3" /> Tariffa / Obiettivo
                                      </div>
                                      
                                      <div className="col-span-2 flex justify-start items-center pl-1">
                                           <div className="relative w-full max-w-[70px] flex items-center border-b border-gray-300 focus-within:border-emerald-500 transition-colors">
                                              <input 
                                                  type="number" 
                                                  min="0" 
                                                  step="0.5" 
                                                  value={emp.hourlyRate || ''} 
                                                  onChange={(e) => updateHourlyRate(emp.id, e.target.value)} 
                                                  className={`w-full text-right text-sm font-bold text-emerald-700 outline-none bg-transparent pr-4 py-1 ${NO_SPINNER_CLASS}`} 
                                                  placeholder="0" 
                                              />
                                              <span className="absolute right-0 text-xs font-bold text-gray-400">€</span>
                                           </div>
                                      </div>
                                      
                                      <div className="col-span-5 flex items-center justify-start pl-2 gap-2">
                                         
                                         <div className="flex items-center bg-white border border-gray-300 rounded-md shadow-sm h-7 overflow-hidden w-auto flex-shrink-0">
                                             <div className="pl-2 text-cyan-600 flex-shrink-0">
                                                <Target className="w-3 h-3" />
                                             </div>
                                             <input 
                                                type="number" 
                                                min="0" 
                                                step="50" 
                                                value={targetSalary === 0 ? '' : targetSalary} 
                                                onChange={(e) => updateTargetSalary(emp.id, e.target.value)}
                                                className={`w-[50px] text-right text-sm font-bold text-gray-700 placeholder-gray-300 outline-none bg-transparent px-1 ${NO_SPINNER_CLASS}`} 
                                                placeholder="0" 
                                             />
                                             <span className="text-xs font-bold text-gray-400 mr-1 flex-shrink-0">€</span>
                                             <button 
                                                onClick={() => toggleTargetMode(emp.id)}
                                                className={`
                                                  h-full px-2 min-w-[45px] whitespace-nowrap text-[9px] font-bold uppercase tracking-wide border-l transition-colors flex items-center justify-center
                                                  ${targetMode === 'NET' ? 'bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'}
                                                `}
                                                title="Clicca per cambiare (Netto / Lordo)"
                                             >
                                                {targetMode === 'NET' ? 'Netto' : 'Lordo'}
                                             </button>
                                         </div>

                                         {totalForfaitAmount > 0 && (
                                              <div className="flex items-center gap-1 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded text-[10px] text-purple-700 font-bold whitespace-nowrap">
                                                 <span className="uppercase text-purple-400 text-[9px] tracking-wider font-semibold">Forfait:</span>
                                                 <span>{totalForfaitAmount} €</span>
                                              </div>
                                         )}
                                      </div>
                                      
                                      <div className={`col-span-4 text-center text-xs font-black py-2 rounded border shadow-sm ${totalEuroDifference > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : totalEuroDifference < 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-gray-400 bg-gray-50 border-gray-200'}`}>
                                          {totalEuroDifference > 0 ? '+' : ''}{totalEuroDifference.toFixed(2)} €
                                      </div>
                                   </div>
                               </div>
                            </div>
                         </div>
                      </div>
                  </div>

                  <div className="w-full xl:w-72 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4 overflow-hidden transition-all duration-300">
                      <button onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors group">
                         <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 group-hover:text-[#004aad] transition-colors uppercase tracking-wide"><Briefcase className="w-4 h-4 text-[#ffec09] fill-[#ffec09]" /> Aggiungi Cantiere</h4>
                         {isPaletteOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                      
                      {isPaletteOpen && (
                        <div className="p-4 pt-0 border-t border-gray-100 animate-fade-in bg-white">
                          <p className="text-xs text-gray-400 mb-3 mt-3">Trascina il cantiere nella griglia.</p>
                          <div className="relative mb-3">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                             <input type="text" placeholder="Cerca..." value={siteSearchTerm} onChange={(e) => setSiteSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] sm:text-sm transition-colors" />
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {sites.length > 0 ? (
                               <>
                                 {sites.filter(s => s.name.toLowerCase().includes(siteSearchTerm.toLowerCase())).map(site => {
                                      const isAssigned = assignments.some(a => a.siteId === site.id);
                                      return (
                                        <div 
                                          key={site.id}
                                          draggable={!isAssigned}
                                          onDragStart={(e) => handleSiteDragStart(e, site.id)}
                                          onDragEnd={handleSiteDragEnd}
                                          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium border transition-all ${isAssigned ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-60' : 'bg-white text-gray-700 border-gray-200 cursor-grab hover:border-[#004aad] hover:shadow-md active:cursor-grabbing hover:bg-blue-50/50'}`}
                                        >
                                          <div className="bg-gray-100 p-1.5 rounded text-gray-400"><GripVertical className="w-3 h-3" /></div>
                                          <span className="truncate font-semibold">{site.name}</span>
                                          {isAssigned && <span className="ml-auto text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-500">Preso</span>}
                                        </div>
                                      );
                                   })}
                               </>
                            ) : <div className="text-center py-4 text-xs text-red-400 bg-red-50 rounded">Nessun cantiere creato.</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {employees.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                    <User className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Il tuo team è vuoto</h3>
                <p className="text-gray-500 font-medium mb-6">Aggiungi il tuo primo dipendente per iniziare.</p>
                <button 
                   onClick={() => setIsAddModalOpen(true)}
                   className="bg-[#004aad] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#003580] transition-colors shadow-lg"
                >
                    + Aggiungi Dipendente
                </button>
            </div>
        )}
      </div>
    </div>
  );
};