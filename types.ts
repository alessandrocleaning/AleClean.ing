
export type SiteCategory = 'Condominio' | 'Azienda' | 'Ristorante' | 'Scuola' | 'Farmacia' | 'Privato';

export interface Site {
  id: string;
  name: string;
  address?: string;
  city?: string;
  netMonthlyRevenue?: number;
  category?: SiteCategory;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type AssignmentType = 'HOURLY' | 'FORFAIT';

export type RecurrenceType = 'WEEKLY' | 'MONTHLY';

export interface Assignment {
  siteId: string;
  // ISO Date string (YYYY-MM-DD) indicating when this assignment starts
  startDate: string;
  // ISO Date string (YYYY-MM-DD) indicating when this assignment ends (optional)
  endDate?: string;
  schedule: Record<DayKey, number>;
  type?: AssignmentType; // Defaults to HOURLY if undefined
  forfaitAmount?: number; // Only used if type is FORFAIT
  note?: string; // Appunti specifici per questo dipendente su questo cantiere

  // Recurrence Logic
  recurrence?: RecurrenceType; // Default 'WEEKLY'
  interval?: number; // Default 1
  weekSelector?: string[]; // Array for multiple specific week selection (e.g. ['1', '3', 'LAST'])

  // Archiving
  archived?: boolean; // If true, hides from main view but keeps data
}

export type SplitMode = 'NONE' | 'FIXED' | 'PERCENT' | 'REMAINDER';

export interface SplitConfig {
  travelMode: SplitMode;
  travelValue: number;
  fuelMode: SplitMode;
  fuelValue: number;
  expensesMode: SplitMode;
  expensesValue: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  contractHours?: Record<DayKey, number>;
  hourlyRate?: number; // Single hourly rate
  targetSalary?: number; // Manual entry for Netto/Lordo Monthly Target
  targetMode?: 'NET' | 'GROSS'; // Selector for Netto vs Lordo
  showInAllowances?: boolean; // Toggle visibility in Allowance Sheet (Cedolini)
  defaultAssignments: Assignment[];
  splitConfig?: SplitConfig; // Configuration for auto-splitting
}

export type AttendanceType = 'WORK' | 'FERIE' | 'MALATTIA' | 'PERMESSO' | 'ASSENZA' | 'STRAORDINARIO';

export interface TimeDetails {
  start: string;      // HH:mm (Entrata)
  end: string;        // HH:mm (Uscita)
  breakStart?: string; // HH:mm (Inizio Pausa)
  breakEnd?: string;   // HH:mm (Fine Pausa)
}

export interface AttendanceRecord {
  type: AttendanceType;
  value: number; // Hours worked or hours of leave
  timeDetails?: TimeDetails; // Optional detailed time entry
}

export interface MonthlySplit {
  travel: number;   // Trasferta
  fuel: number;     // Rimborso Benzina
  expenses: number; // Rimborso Spese
}

export interface ExtraJob {
  id: string;
  description: string;
  value: number; // Valore economico fisso per questo lavoro extra
  hours: Record<number, number>; // Mappa: giorno del mese (1-31) -> ore

  // Locking logic for recurring extra jobs
  isLocked?: boolean;
  startMonth?: string; // YYYY-MM when it was locked/started
}

export interface MonthlyData {
  // Key: "{empId}-{dayNum}"
  overrides: Record<string, AttendanceRecord>;
  notes: Record<string, string>;
  // Key: "{empId}" - Monthly split for that employee
  splits?: Record<string, MonthlySplit>;
  // Key: "{empId}" - Array of extra jobs for this month
  extraJobs?: Record<string, ExtraJob[]>;
  // Key: "{empId}" - Override for target salary specifically for this month
  salaryTarget?: Record<string, number>;
  // Key: "{empId}" - Override for target mode specifically for this month
  salaryMode?: Record<string, 'NET' | 'GROSS'>;
}

export interface DailyRecord {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  hours: number;
  notes: string;
  details?: { siteId: string; hours: number }[]; // Snapshot details
}

export type ViewMode = 'dashboard' | 'employees' | 'sites' | 'generator' | 'allowances';