// Firestore Data Service
// Funzioni per leggere e scrivere i dati dell'app nel database cloud.
// Ogni utente ha la propria "cartella" nel database identificata dal suo userId.

import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee, Site, MonthlyData, ExtraJob } from '../types';

// ─── EMAIL ACCOUNT PRINCIPALE ────────────────────────────────────────────────
export const ADMIN_EMAIL = 'alessandro.clean.ing@gmail.com';

// ─── TIPI RICHIESTA ACCESSO ──────────────────────────────────────────────────
export type AccessStatus = 'admin' | 'approved' | 'pending' | 'none';

export interface AccessRequest {
    userId: string;
    email: string;
    name: string;
    company: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

// ─── ACCESS CONTROL ──────────────────────────────────────────────────────────

/**
 * Controlla se un utente ha accesso all'app.
 * Ritorna: 'admin' | 'approved' | 'pending' | 'none'
 */
export const checkUserAccess = async (userId: string, email: string): Promise<AccessStatus> => {
    if (email.toLowerCase() === ADMIN_EMAIL) return 'admin';
    const snap = await getDoc(doc(db, 'accessRequests', userId));
    if (!snap.exists()) return 'none';
    const data = snap.data() as AccessRequest;
    if (data.status === 'approved') return 'approved';
    return 'pending';
};

/**
 * Invia una richiesta di accesso all'app.
 */
export const submitAccessRequest = async (
    userId: string,
    email: string,
    name: string,
    company: string,
    message: string
): Promise<void> => {
    await setDoc(doc(db, 'accessRequests', userId), {
        userId,
        email,
        name,
        company,
        message,
        status: 'pending',
        createdAt: serverTimestamp(),
    });
};

/**
 * Sottoscrive in tempo reale al conteggio delle richieste pendenti.
 * Usato dall'admin per le notifiche.
 */
export const subscribeToAccessRequests = (
    onUpdate: (pendingCount: number, requests: AccessRequest[]) => void
): Unsubscribe => {
    const q = query(
        collection(db, 'accessRequests'),
        where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(d => d.data() as AccessRequest);
        onUpdate(requests.length, requests);
    });
};


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

// ─── RECURRING EXTRA JOBS ──────────────────────────────────────────────────

export const loadRecurringJobs = async (userId: string): Promise<Record<string, ExtraJob[]>> => {
    const snap = await getDoc(doc(db, 'users', userId, 'data', 'recurringJobs'));
    if (!snap.exists()) return {};
    const data = snap.data();
    return (data?.jobs as Record<string, ExtraJob[]>) || {};
};

export const saveRecurringJobs = async (userId: string, jobs: Record<string, ExtraJob[]>): Promise<void> => {
    await setDoc(doc(db, 'users', userId, 'data', 'recurringJobs'), { jobs });
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

        // Migra i dati mensili (chiavi come "cleaning_sheet_YYYY-MM")
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cleaning_sheet_')) {
                const monthKey = key.replace('cleaning_sheet_', '');
                const raw = localStorage.getItem(key);
                if (raw) {
                    const data = JSON.parse(raw) as MonthlyData;
                    await saveMonthlyData(userId, monthKey, data);
                    migrated = true;
                }
            }
        }

        // Migra i recurring jobs globali ("cleaning_recurring_extra_jobs")
        const rawRecurring = localStorage.getItem('cleaning_recurring_extra_jobs');
        if (rawRecurring) {
            const jobs = JSON.parse(rawRecurring) as Record<string, ExtraJob[]>;
            await saveRecurringJobs(userId, jobs);
            migrated = true;
        }

        return migrated;
    } catch (e) {
        console.error('Errore durante la migrazione:', e);
        return false;
    }
};

// Numero versione corrente del wipe — incrementalo per forzare un nuovo wipe su tutti gli account
const WIPE_VERSION = 1;

/**
 * Controlla se l'account non-admin è già stato azzerato con la versione attuale.
 * Se la versione nel DB è inferiore a WIPE_VERSION, svuota dipendenti e cantieri.
 */
export const checkAndWipeOldData = async (userId: string): Promise<boolean> => {
    try {
        const wipeRef = doc(db, 'users', userId, 'data', 'wipe_marker');
        const snap = await getDoc(wipeRef);
        const currentVersion: number = snap.exists() ? (snap.data()?.version ?? 0) : 0;

        if (currentVersion < WIPE_VERSION) {
            // Svuota dipendenti e cantieri
            await setDoc(doc(db, 'users', userId, 'data', 'employees'), { list: [] });
            await setDoc(doc(db, 'users', userId, 'data', 'sites'), { list: [] });
            // Aggiorna il marcatore con la versione corrente
            await setDoc(wipeRef, { version: WIPE_VERSION, wipedAt: serverTimestamp() });
            return true;
        }
        return false;
    } catch (e) {
        console.error('Errore durante il wipe dei dati:', e);
        return false;
    }
};

/**
 * Per lo scope 'future': rimuove splitConfigs[empId] dai documenti mensili
 * di tutti i mesi dal mese corrente incluso in avanti (fino a 24 mesi futuri).
 * Questo fa sì che quei mesi usino il profilo globale aggiornato del dipendente.
 */
export const clearSplitConfigForFutureMonths = async (
    userId: string,
    empId: string,
    fromMonthKey: string, // formato "YYYY-MM"
    monthsAhead: number = 24
): Promise<void> => {
    const [year, month] = fromMonthKey.split('-').map(Number);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < monthsAhead; i++) {
        const d = new Date(year, month - 1 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const ref = doc(db, 'users', userId, 'monthly', key);
        promises.push(
            getDoc(ref).then(snap => {
                if (!snap.exists()) return Promise.resolve();
                const data = snap.data() as MonthlyData;
                if (!data.splitConfigs || !(empId in data.splitConfigs)) return Promise.resolve();
                const newSplitConfigs = { ...data.splitConfigs };
                delete newSplitConfigs[empId];
                return setDoc(ref, { ...data, splitConfigs: newSplitConfigs });
            })
        );
    }

    await Promise.all(promises);
};
