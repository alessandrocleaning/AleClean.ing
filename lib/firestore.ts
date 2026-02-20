// Firestore Data Service
// Funzioni per leggere e scrivere i dati dell'app nel database cloud.
// Ogni utente ha la propria "cartella" nel database identificata dal suo userId.

import {
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee, Site, MonthlyData } from '../types';


// ─── EMPLOYEES ─────────────────────────────────────────────────────────────

export const loadEmployees = async (userId: string): Promise<Employee[]> => {
    const snap = await getDoc(doc(db, 'users', userId, 'data', 'employees'));
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data?.list as Employee[]) || [];
};

export const saveEmployees = async (userId: string, employees: Employee[]): Promise<void> => {
    await setDoc(doc(db, 'users', userId, 'data', 'employees'), { list: employees });
};

// ─── SITES ─────────────────────────────────────────────────────────────────

export const loadSites = async (userId: string): Promise<Site[]> => {
    const snap = await getDoc(doc(db, 'users', userId, 'data', 'sites'));
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data?.list as Site[]) || [];
};

export const saveSites = async (userId: string, sites: Site[]): Promise<void> => {
    await setDoc(doc(db, 'users', userId, 'data', 'sites'), { list: sites });
};

// ─── MONTHLY DATA ──────────────────────────────────────────────────────────

export const loadMonthlyData = async (
    userId: string,
    monthKey: string // formato: "YYYY-MM"
): Promise<MonthlyData | null> => {
    const snap = await getDoc(doc(db, 'users', userId, 'monthly', monthKey));
    if (!snap.exists()) return null;
    return snap.data() as MonthlyData;
};

export const saveMonthlyData = async (
    userId: string,
    monthKey: string,
    data: MonthlyData
): Promise<void> => {
    await setDoc(doc(db, 'users', userId, 'monthly', monthKey), data);
};

// ─── MIGRATION: LocalStorage → Firestore ──────────────────────────────────

/**
 * Legge i dati dal localStorage e li carica su Firestore.
 * Da usare UNA SOLA VOLTA per migrare i dati esistenti.
 */
export const migrateFromLocalStorage = async (userId: string): Promise<boolean> => {
    try {
        const rawEmployees = localStorage.getItem('cleaning_employees');
        const rawSites = localStorage.getItem('cleaning_sites');

        let migrated = false;

        if (rawEmployees) {
            const employees = JSON.parse(rawEmployees) as Employee[];
            await saveEmployees(userId, employees);
            migrated = true;
        }
        if (rawSites) {
            const sites = JSON.parse(rawSites) as Site[];
            await saveSites(userId, sites);
            migrated = true;
        }

        // Migra i dati mensili (chiavi come "cleaning_monthly_YYYY-MM")
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cleaning_monthly_')) {
                const monthKey = key.replace('cleaning_monthly_', '');
                const raw = localStorage.getItem(key);
                if (raw) {
                    const data = JSON.parse(raw) as MonthlyData;
                    await saveMonthlyData(userId, monthKey, data);
                    migrated = true;
                }
            }
        }

        return migrated;
    } catch (e) {
        console.error('Errore durante la migrazione:', e);
        return false;
    }
};
