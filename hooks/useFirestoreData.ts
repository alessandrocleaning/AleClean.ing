// Hook: useFirestoreData
// Sostituisce useState+localStorage con dati sincronizzati su Firebase Firestore.
// Gestisce: caricamento iniziale, salvataggio automatico, migrazione dati locali.

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Employee, Site, MonthlyData } from '../types';
import {
    loadEmployees,
    saveEmployees,
    loadSites,
    saveSites,
    loadMonthlyData,
    saveMonthlyData,
    migrateFromLocalStorage,
    checkAndWipeOldData,
} from '../lib/firestore';
// Nessun seed data: gli utenti nuovi partono con liste vuote

// Helper: sanitize employees (copiato da App.tsx per indipendenza del hook)
const sanitize = (emp: any): Employee => ({
    ...emp,
    defaultAssignments: Array.isArray(emp.defaultAssignments)
        ? emp.defaultAssignments.map((a: any) => ({
            ...a,
            recurrence: a.recurrence || 'WEEKLY',
            interval: a.interval || 1,
            weekSelector: Array.isArray(a.weekSelector)
                ? a.weekSelector
                : a.weekSelector ? [a.weekSelector] : [],
        }))
        : [],
    contractHours: emp.contractHours || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    splitConfig: emp.splitConfig || {
        travelMode: 'NONE', travelValue: 0,
        fuelMode: 'NONE', fuelValue: 0,
        expensesMode: 'NONE', expensesValue: 0,
    },
    hourlyRate: typeof emp.hourlyRate === 'number' ? emp.hourlyRate : 0,
    targetSalary: typeof emp.targetSalary === 'number' ? emp.targetSalary : 0,
    targetMode: (emp.targetMode === 'GROSS' || emp.targetMode === 'NET') ? emp.targetMode : 'NET',
    showInAllowances: emp.showInAllowances !== false,
});

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'error' | 'migrating';

interface UseFirestoreDataResult {
    employees: Employee[];
    setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
    sites: Site[];
    setSites: (sites: Site[] | ((prev: Site[]) => Site[])) => void;
    getMonthlyData: (monthKey: string) => Promise<MonthlyData | null>;
    setMonthlyData: (monthKey: string, data: MonthlyData) => Promise<void>;
    syncStatus: SyncStatus;
    hasMigratableData: boolean;
    triggerMigration: () => Promise<void>;
}

export const useFirestoreData = (user: User, isAdmin: boolean): UseFirestoreDataResult => {
    const [employees, setEmployeesState] = useState<Employee[]>([]);
    const [sites, setSitesState] = useState<Site[]>([]);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
    const [hasMigratableData, setHasMigratableData] = useState(false);

    const saveEmployeesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveSitesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadingRef = useRef(true);

    // Controlla se ci sono dati locali
    useEffect(() => {
        const hasLocal =
            !!localStorage.getItem('cleaning_employees') ||
            !!localStorage.getItem('cleaning_sites');
        setHasMigratableData(hasLocal);
    }, []);

    // Caricamento iniziale dati da Firestore
    useEffect(() => {
        if (!user) return;
        isLoadingRef.current = true;
        setSyncStatus('loading');

        const load = async () => {
            try {
                if (!isAdmin) {
                    await checkAndWipeOldData(user.uid);
                }

                const [emps, stes] = await Promise.all([
                    loadEmployees(user.uid),
                    loadSites(user.uid),
                ]);

                // Ogni utente parte con i propri dati (vuoti per i nuovi account)
                setEmployeesState(emps.map(sanitize));
                setSitesState(stes);
                setSyncStatus('synced');
            } catch (e) {
                console.error('Errore caricamento dati:', e);
                setSyncStatus('error');
            } finally {
                isLoadingRef.current = false;
            }
        };

        load();
    }, [user.uid]);

    // Debounced auto-save employees
    const setEmployees = useCallback((value: Employee[] | ((prev: Employee[]) => Employee[])) => {
        setEmployeesState(prev => {
            const next = typeof value === 'function' ? value(prev) : value;
            if (!isLoadingRef.current) {
                setSyncStatus('saving');
                if (saveEmployeesTimerRef.current) clearTimeout(saveEmployeesTimerRef.current);
                saveEmployeesTimerRef.current = setTimeout(async () => {
                    try {
                        await saveEmployees(user.uid, next);
                        setSyncStatus('synced');
                    } catch (e) {
                        console.error('Errore salvataggio dipendenti:', e);
                        setSyncStatus('error');
                    }
                }, 1200);
            }
            return next;
        });
    }, [user.uid]);

    // Debounced auto-save sites
    const setSites = useCallback((value: Site[] | ((prev: Site[]) => Site[])) => {
        setSitesState(prev => {
            const next = typeof value === 'function' ? value(prev) : value;
            if (!isLoadingRef.current) {
                setSyncStatus('saving');
                if (saveSitesTimerRef.current) clearTimeout(saveSitesTimerRef.current);
                saveSitesTimerRef.current = setTimeout(async () => {
                    try {
                        await saveSites(user.uid, next);
                        setSyncStatus('synced');
                    } catch (e) {
                        console.error('Errore salvataggio cantieri:', e);
                        setSyncStatus('error');
                    }
                }, 1200);
            }
            return next;
        });
    }, [user.uid]);

    // Monthly data (lazy, on demand)
    const getMonthlyData = useCallback(async (monthKey: string) => {
        return loadMonthlyData(user.uid, monthKey);
    }, [user.uid]);

    const setMonthlyDataFn = useCallback(async (monthKey: string, data: MonthlyData) => {
        setSyncStatus('saving');
        try {
            await saveMonthlyData(user.uid, monthKey, data);
            setSyncStatus('synced');
        } catch (e) {
            console.error('Errore salvataggio dati mensili:', e);
            setSyncStatus('error');
        }
    }, [user.uid]);

    // Migrazione da localStorage
    const triggerMigration = useCallback(async () => {
        setSyncStatus('migrating');
        try {
            const ok = await migrateFromLocalStorage(user.uid);
            if (ok) {
                // Ricarica i dati migrati
                const [emps, stes] = await Promise.all([
                    loadEmployees(user.uid),
                    loadSites(user.uid),
                ]);
                setEmployeesState(emps.map(sanitize));
                setSitesState(stes);
                setHasMigratableData(false);
            }
            setSyncStatus('synced');
        } catch (e) {
            console.error('Errore migrazione:', e);
            setSyncStatus('error');
        }
    }, [user.uid]);

    return {
        employees,
        setEmployees,
        sites,
        setSites,
        getMonthlyData,
        setMonthlyData: setMonthlyDataFn,
        syncStatus,
        hasMigratableData,
        triggerMigration,
    };
};
