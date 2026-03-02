import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewMode } from './types';
import { EmployeeManager } from './components/EmployeeManager';
import { SiteManager } from './components/SiteManager';
import { MonthlySheet } from './components/MonthlySheet';
import { MonthlyAllowanceSheet } from './components/MonthlyAllowanceSheet';
import { AuthScreen } from './components/AuthScreen';
import { Users, FileText, LayoutDashboard, MapPin, Menu, X, Wallet, Building2, TrendingUp, TrendingDown, BarChart3, Activity, PieChart as PieChartIcon, LogOut, Cloud, CloudOff, Loader, Euro, Percent, Zap, Landmark, ChevronUp, ChevronDown, Minus, Edit2, Check } from 'lucide-react';
// (Nessun seed data — ogni utente parte con dati vuoti)
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subMonths, format } from 'date-fns';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useFirestoreData } from './hooks/useFirestoreData';
import { AgentDataInjector } from './components/AgentDataInjector';

// ─── EMAIL UNICA AUTORIZZATA ───────────────────────────────────────────────
const AUTHORIZED_EMAIL = 'alessandro.clean.ing@gmail.com';

// ─── AUTH WRAPPER ──────────────────────────────────────────────────────────
const AuthWrapper: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#004aad] flex items-center justify-center">
        <div className="text-center text-white">
          <img src="/logo.png" alt="Clean.ing Logo" className="w-20 h-20 object-contain drop-shadow-xl mx-auto mb-4 animate-pulse" />
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // Blocca tutti tranne l'email autorizzata
  if (user.email?.toLowerCase() !== AUTHORIZED_EMAIL) {
    return (
      <div className="min-h-screen bg-[#004aad] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Accesso Negato</h2>
          <p className="text-sm text-gray-500 mb-6">
            Questa applicazione è riservata esclusivamente all'account autorizzato.
          </p>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-6 font-mono break-all">{user.email}</p>
          <button
            onClick={() => signOut(auth)}
            className="w-full bg-[#004aad] text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Esci e cambia account
          </button>
        </div>
      </div>
    );
  }

  // Solo l'admin autorizzato
  return <App user={user} isAdmin={true} />;
};


const CHART_COLORS = [
  '#004aad', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#0ea5e9',
  '#a855f7', '#14b8a6'
];

const App: React.FC<{ user: User; isAdmin: boolean }> = ({ user, isAdmin }) => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // ─── Firestore Data Hook ───────────────────────────────────────────────────
  const {
    employees,
    setEmployees,
    sites,
    setSites,
    syncStatus,
  } = useFirestoreData(user, isAdmin);

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Indicatore stato sincronizzazione
  const SyncIndicator = () => {
    if (syncStatus === 'loading') return (
      <div className="flex items-center gap-1.5 text-blue-200 text-xs">
        <Loader className="w-3 h-3 animate-spin" /> Caricamento...
      </div>
    );
    if (syncStatus === 'saving') return (
      <div className="flex items-center gap-1.5 text-yellow-300 text-xs">
        <Loader className="w-3 h-3 animate-spin" /> Salvataggio...
      </div>
    );
    if (syncStatus === 'migrating') return (
      <div className="flex items-center gap-1.5 text-blue-200 text-xs">
        <Loader className="w-3 h-3 animate-spin" /> Migrazione...
      </div>
    );
    if (syncStatus === 'error') return (
      <div className="flex items-center gap-1.5 text-red-300 text-xs">
        <CloudOff className="w-3 h-3" /> Errore sync
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 text-green-300 text-xs">
        <Cloud className="w-3 h-3" /> Sincronizzato
      </div>
    );
  };

  // --- SALDO CASSA (manuale, salvato in localStorage) ---
  const [saldoCassa, setSaldoCassa] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_saldo_cassa');
    return saved ? parseFloat(saved) : 0;
  });
  const [editingSaldo, setEditingSaldo] = useState(false);
  const [saldoInput, setSaldoInput] = useState('');
  const saldoRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'revenue' | 'hours'>('revenue');

  const saveSaldo = () => {
    const val = parseFloat(saldoInput.replace(',', '.'));
    if (!isNaN(val)) {
      setSaldoCassa(val);
      localStorage.setItem('dashboard_saldo_cassa', String(val));
    }
    setEditingSaldo(false);
  };

  // --- DASHBOARD STATISTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const lastMonthStr = format(lastMonth, 'yyyy-MM-dd');
    const COSTO_ORA_CONTRATTO = 16; // €/ora fisso per ore da contratto

    // Helper: verifica se un assignment era attivo a una data
    const isAssignmentActive = (assign: any, dateStr: string) =>
      !assign.archived &&
      assign.startDate <= dateStr &&
      (!assign.endDate || assign.endDate >= dateStr);

    // Helper: ore settimanali di un assignment
    const weeklyHoursOf = (assign: any): number =>
      Object.values(assign.schedule || {}).reduce((s: number, h: any) => s + (Number(h) || 0), 0) as number;

    // --- ESCLUDI CANTIERE INTERNO "CLEAN.ING" da tutti i calcoli ---
    const internalSiteIds = new Set(
      sites.filter(s => s.name.trim().toLowerCase() === 'clean.ing').map(s => s.id)
    );
    const activeSites = sites.filter(s => !internalSiteIds.has(s.id));

    // --- FATTURATO: somma netMonthlyRevenue di tutti i siti attivi (escluso interno) ---
    const fatturatoMese = activeSites.reduce((sum, s) => sum + (s.netMonthlyRevenue || 0), 0);

    // Fatturato stesso mese anno scorso: dato non storicizzato → stesso valore (n/d)
    const fatturatoAnnoScorso: number | null = null; // non disponibile

    // --- COSTO PERSONALE (mese corrente) ---
    // Ogni dipendente: ore da contratto × 4.33 sett/mese × 16€/ora
    // + ore extra (FORFait) × hourlyRate dipendente
    let costoPersonaleMese = 0;
    let oreContrattoTotali = 0;
    let oreExtraTotali = 0;

    employees.forEach(emp => {
      (emp.defaultAssignments || []).forEach(assign => {
        if (isAssignmentActive(assign, todayStr)) {
          const wh = weeklyHoursOf(assign);
          const oreMesaliContratto = wh * 4.33;
          oreContrattoTotali += oreMesaliContratto;
          costoPersonaleMese += oreMesaliContratto * COSTO_ORA_CONTRATTO;

          if (assign.type === 'FORFAIT' && assign.forfaitAmount) {
            // forfait: costo aggiuntivo → stimiamo ore extra come forfait / hourlyRate
            const rate = emp.hourlyRate || COSTO_ORA_CONTRATTO;
            const oreExtra = assign.forfaitAmount / rate;
            oreExtraTotali += oreExtra;
            costoPersonaleMese += assign.forfaitAmount;
          }
        }
      });
    });

    // --- MARGINE LORDO ---
    const margineAssoluto = fatturatoMese - costoPersonaleMese;
    const marginePerc = fatturatoMese > 0
      ? (margineAssoluto / fatturatoMese) * 100
      : 0;

    // Soglie margine: verde ≥ 30%, arancione 15–30%, rosso < 15%
    const margineStatus: 'green' | 'orange' | 'red' =
      marginePerc >= 30 ? 'green' : marginePerc >= 15 ? 'orange' : 'red';

    // --- EFFICIENZA ECONOMICA ---
    // Ricavo per euro di costo (fatturatoMese / costoPersonaleMese)
    const efficienzaRatio = costoPersonaleMese > 0
      ? fatturatoMese / costoPersonaleMese
      : null;
    const oreContratteMese = oreContrattoTotali; // già × 4.33

    // --- CLIENTI ATTIVI: cantieri attivi (escluso interno) con revenue > 0 ---
    const clientiAttivi = activeSites.filter(s => (s.netMonthlyRevenue || 0) > 0).length;

    // --- METRICHE OPERAZIONALI (per grafici esistenti) ---
    const calculateOps = (dateStr: string) => {
      let hours = 0, contracts = 0, cost = 0;
      employees.forEach(emp => {
        (emp.defaultAssignments || []).forEach(assign => {
          if (isAssignmentActive(assign, dateStr)) {
            contracts++;
            const wh = weeklyHoursOf(assign);
            hours += wh;
            cost += wh * 4.33 * (emp.hourlyRate || 0);
            if (assign.type === 'FORFAIT') cost += assign.forfaitAmount || 0;
          }
        });
      });
      return { hours, contracts, cost };
    };

    const current = calculateOps(todayStr);
    const previous = calculateOps(lastMonthStr);

    const getVariation = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    const variations = {
      hours: getVariation(current.hours, previous.hours),
      contracts: getVariation(current.contracts, previous.contracts),
      cost: getVariation(current.cost, previous.cost)
    };

    // --- PIE & SITE LOAD (escluso cantiere interno) ---
    const sitesDistribution: Record<string, number> = {};
    const assignmentsByCity: Record<string, number> = {};
    const sitesHours: Record<string, number> = {};

    activeSites.forEach(s => {
      const city = s.city ? s.city.trim() : 'Non specificato';
      sitesDistribution[city] = (sitesDistribution[city] || 0) + 1;
      sitesHours[s.id] = 0;
    });

    employees.forEach(emp => {
      (emp.defaultAssignments || []).forEach(assign => {
        if (!assign.archived && !internalSiteIds.has(assign.siteId)) {
          const wh = weeklyHoursOf(assign);
          if (sitesHours[assign.siteId] !== undefined) sitesHours[assign.siteId] += wh;
          const site = activeSites.find(s => s.id === assign.siteId);
          const city = site?.city ? site.city.trim() : 'Non specificato';
          assignmentsByCity[city] = (assignmentsByCity[city] || 0) + 1;
        }
      });
    });

    const totalSitesForPie = Object.values(sitesDistribution).reduce((s, v) => s + v, 0);
    const pieData = Object.entries(sitesDistribution)
      .map(([name, value]) => ({
        name,
        value,
        pct: totalSitesForPie > 0 ? Math.round((value / totalSitesForPie) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);

    const sortedSitesLoad = Object.entries(sitesHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, hours]) => ({ name: activeSites.find(s => s.id === id)?.name || 'Sconosciuto', hours }))
      .filter(s => s.hours > 0);

    const sortedCities = Object.entries(sitesDistribution).sort(([, a], [, b]) => b - a);

    // --- TOP CLIENTI PER FATTURATO ---
    // Per ogni cantiere attivo: revenue, categoria, costo ore assegnate, margine %
    const siteHourCost: Record<string, number> = {};
    employees.forEach(emp => {
      (emp.defaultAssignments || []).forEach(assign => {
        if (isAssignmentActive(assign, todayStr) && !internalSiteIds.has(assign.siteId)) {
          const wh = weeklyHoursOf(assign);
          siteHourCost[assign.siteId] = (siteHourCost[assign.siteId] || 0) + wh * 4.33 * COSTO_ORA_CONTRATTO;
          if (assign.type === 'FORFAIT' && assign.forfaitAmount) {
            siteHourCost[assign.siteId] = (siteHourCost[assign.siteId] || 0) + assign.forfaitAmount;
          }
        }
      });
    });

    const topClientsByRevenue = activeSites
      .filter(s => (s.netMonthlyRevenue || 0) > 0)
      .map(s => {
        const rev = s.netMonthlyRevenue || 0;
        const cost = siteHourCost[s.id] || 0;
        const margin = rev > 0 ? ((rev - cost) / rev) * 100 : null;
        return { id: s.id, name: s.name, category: s.category || '—', revenue: rev, cost, margin };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      // --- NUOVI KPI EXECUTIVE ---
      fatturatoMese,
      fatturatoAnnoScorso,
      costoPersonaleMese,
      margineAssoluto,
      marginePerc,
      margineStatus,
      efficienzaRatio,
      oreContratteMese,
      oreExtraTotali,
      clientiAttivi,
      totalActiveSites: activeSites.length,
      topClientsByRevenue,
      // --- METRICHE OPERATIVE (usate dagli altri grafici) ---
      totalAssignedHours: current.hours,
      activeContractsCount: current.contracts,
      estimatedMonthlyCost: current.cost,
      variations,
      sortedCities,
      pieData,
      sortedSitesLoad
    };
  }, [employees, sites]);

  // Helper to render trend
  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;

    if (isNeutral) return <span className="text-gray-400 text-[10px] font-medium bg-gray-50 px-1.5 py-0.5 rounded ml-2">0% vs mese scorso</span>;

    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 flex items-center gap-0.5 ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col md:flex-row overflow-hidden">

      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#004aad] text-white p-4 flex justify-between items-center shadow-md flex-shrink-0 z-50 print:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <span className="font-bold text-lg">CLEAN.ING</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR / NAV */}
      <nav className={`
          bg-[#004aad] text-white w-64 flex-shrink-0 flex flex-col 
          fixed md:relative inset-y-0 left-0 z-40 shadow-xl transition-transform duration-300 md:translate-x-0 print:hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-2 border-b border-white/10 hidden md:flex">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain drop-shadow-md" />
          <div className="flex flex-col w-min">
            <h1 className="font-black text-2xl tracking-tighter leading-none">CLEAN.ING</h1>
            <div className="flex justify-between w-full text-blue-200 text-[8px] font-bold uppercase mt-0.5 opacity-80">
              {"MANAGEMENT SYSTEM".split('').map((char, i) => (
                <span key={i}>{char === ' ' ? '\u00A0' : char}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold transition-all ${view === 'dashboard' ? 'bg-[#ffec09] text-black shadow-lg translate-x-1' : 'hover:bg-white/10 text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>

          <div className="pt-4 pb-1 px-4 text-xs font-bold text-blue-300 uppercase tracking-wider">Gestione</div>

          <button
            onClick={() => { setView('employees'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold transition-all ${view === 'employees' ? 'bg-[#ffec09] text-black shadow-lg translate-x-1' : 'hover:bg-white/10 text-white'}`}
          >
            <Users className="w-5 h-5" /> Dipendenti
          </button>

          <button
            onClick={() => { setView('sites'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold transition-all ${view === 'sites' ? 'bg-[#ffec09] text-black shadow-lg translate-x-1' : 'hover:bg-white/10 text-white'}`}
          >
            <MapPin className="w-5 h-5" /> Cantieri
          </button>

          <div className="pt-4 pb-1 px-4 text-xs font-bold text-blue-300 uppercase tracking-wider">Strumenti</div>

          <button
            onClick={() => { setView('generator'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold transition-all ${view === 'generator' ? 'bg-[#ffec09] text-black shadow-lg translate-x-1' : 'hover:bg-white/10 text-white'}`}
          >
            <FileText className="w-5 h-5" /> Generatore Mensile
          </button>

          <div className="pt-4 pb-1 px-4 text-xs font-bold text-blue-300 uppercase tracking-wider">Amministrazione</div>

          <button
            onClick={() => { setView('allowances'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-semibold transition-all ${view === 'allowances' ? 'bg-[#ffec09] text-black shadow-lg translate-x-1' : 'hover:bg-white/10 text-white'}`}
          >
            <Wallet className="w-5 h-5" /> Cedolini
          </button>

        </div>

        <div className="p-4 border-t border-white/10 hidden md:flex flex-col gap-2">
          <SyncIndicator />
          <div className="text-xs text-blue-200/60">
            <p className="font-medium truncate">{user.email}</p>
            <p className="opacity-60">v2.1.0 Cloud</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-red-300 hover:text-red-200 transition-colors mt-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci dall'account
          </button>
        </div>
      </nav>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 relative w-full">

        {/* LOADING OVERLAY */}
        {syncStatus === 'loading' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-[#004aad]/20 border-t-[#004aad] rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px' }} />
              <p className="text-sm font-semibold text-gray-600">Caricamento dati...</p>
            </div>
          </div>
        )}

        {/* AI Agent Data Injector - Enabled for Revenue Injection */}
        {/* <AgentDataInjector employees={employees} setEmployees={setEmployees} sites={sites} setSites={setSites} /> */}

        <div className="p-4 md:p-8 w-full min-h-full animate-fade-in-up">

          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-800 tracking-tight">Dashboard</h2>
                  <p className="text-gray-500 mt-1 font-medium">Panoramica operativa e statistica.</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-[#004aad] uppercase tracking-wider">Data Odierna</p>
                  <p className="text-xl font-black text-gray-800 capitalize">
                    {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </header>

              {/* ── KPI CARDS EXECUTIVE ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                {/* Card 1 – CardFatturatoMese */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#004aad]">
                      <Euro className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">
                      {format(new Date(), 'MMM yyyy',)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fatturato mese corrente</p>
                  <p className="text-2xl font-black text-gray-800">
                    {stats.fatturatoMese.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-lg">€</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Somma imponibili cantieri attivi
                  </p>
                  {stats.fatturatoMese === 0 && (
                    <p className="text-[10px] text-amber-500 font-semibold mt-1">⚠ Nessun ricavo configurato nei cantieri</p>
                  )}
                </div>

                {/* Card 2 – CardMarginePerc */}
                <div className={`bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border-l-4 ${stats.margineStatus === 'green' ? 'border-emerald-400 border border-gray-100' :
                  stats.margineStatus === 'orange' ? 'border-amber-400 border border-gray-100' :
                    'border-red-400 border border-gray-100'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stats.margineStatus === 'green' ? 'bg-emerald-50 text-emerald-600' :
                      stats.margineStatus === 'orange' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                      <Percent className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${stats.margineStatus === 'green' ? 'bg-emerald-50 text-emerald-700' :
                      stats.margineStatus === 'orange' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                      {stats.margineStatus === 'green' ? 'Ottimo' : stats.margineStatus === 'orange' ? 'Attenzione' : 'Critico'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Margine lordo % mese</p>
                  <p className="text-2xl font-black text-gray-800">
                    {stats.fatturatoMese > 0 ? stats.marginePerc.toFixed(1) : '—'}<span className="text-lg">%</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Margine lordo: <strong>{stats.margineAssoluto.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €</strong>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Costo pers.: {stats.costoPersonaleMese.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €</p>
                </div>

                {/* Card 3 – CardEfficienzaEconomica */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">Efficienza</span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Efficienza economica</p>
                  <p className="text-2xl font-black text-gray-800">
                    {stats.efficienzaRatio !== null
                      ? `${stats.efficienzaRatio.toFixed(2)}×`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Ricavo / costo personale
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Ore contratto: <strong>{Math.round(stats.oreContratteMese)}h</strong> · Extra: <strong>{Math.round(stats.oreExtraTotali)}h</strong>
                  </p>
                </div>

                {/* Card 4 – CardCassaClienti */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">Cassa</span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cassa e clienti attivi</p>

                  {/* Saldo cassa modificabile */}
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    {editingSaldo ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          ref={saldoRef}
                          type="text"
                          inputMode="decimal"
                          defaultValue={saldoCassa.toFixed(2)}
                          onChange={e => setSaldoInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveSaldo(); if (e.key === 'Escape') setEditingSaldo(false); }}
                          className="w-full text-xl font-black text-gray-800 bg-gray-50 border border-[#004aad] rounded-lg px-2 py-0.5 outline-none"
                          autoFocus
                        />
                        <button onClick={saveSaldo} className="text-emerald-500 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xl font-black text-gray-800">
                          {saldoCassa.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                        <button
                          onClick={() => { setSaldoInput(saldoCassa.toFixed(2)); setEditingSaldo(true); }}
                          className="text-gray-300 hover:text-[#004aad] transition-colors ml-1"
                          title="Modifica saldo cassa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2">Saldo cassa/banca · clicca ✏ per aggiornare</p>

                  <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{stats.clientiAttivi} clienti attivi</p>
                      <p className="text-[10px] text-gray-400">Cantieri con ricavo &gt; 0</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500 font-black text-sm">
                      {stats.clientiAttivi}
                    </div>
                  </div>
                </div>

              </div>

              {/* CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CHART: CITY DISTRIBUTION */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-2 flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg"><PieChartIcon className="w-5 h-5 text-gray-600" /></div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">Distribuzione Appalti <br /><span className="text-xs font-normal text-gray-500">per Città (Sedi Lavorative)</span></h3>
                  </div>

                  {stats.pieData.length > 0 ? (
                    <>
                      {/* Donut con label % e totale al centro */}
                      <div className="w-full flex-shrink-0 relative" style={{ height: 200 }}>
                        {/* Totale cantieri nel foro del donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                          <span className="text-2xl font-black text-gray-800 leading-none">{stats.totalActiveSites}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">cantieri</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={78}
                              paddingAngle={3}
                              dataKey="value"
                              labelLine={false}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) => {
                                if (pct < 6) return null;
                                const RADIAN = Math.PI / 180;
                                const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                                const x = cx + r * Math.cos(-midAngle * RADIAN);
                                const y = cy + r * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                                    {pct}%
                                  </text>
                                );
                              }}
                            >
                              {stats.pieData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                              itemStyle={{ color: '#374151' }}
                              formatter={(value: any, _name: any, props: any) => [`${props.payload.pct}%`, props.payload.name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Lista città — stesso ordine di pieData per allineare i colori al donut */}
                      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cantieri per città</p>
                        {(() => {
                          const cityCount = new Map(stats.sortedCities);
                          return stats.pieData.map((entry, i) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                />
                                <span className="text-gray-700 font-medium truncate">{entry.name}</span>
                              </div>
                              <span className="font-black text-gray-800 ml-2 flex-shrink-0 tabular-nums">
                                {cityCount.get(entry.name) ?? 0}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-sm">
                      Nessun appalto attivo.
                    </div>
                  )}
                </div>

                {/* PANNELLO TABBATO: Clienti e cantieri principali */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
                  {/* Header + Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg"><BarChart3 className="w-5 h-5 text-gray-600" /></div>
                      <h3 className="font-bold text-gray-800 text-lg">Clienti e cantieri principali</h3>
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
                      <button
                        onClick={() => setActiveTab('revenue')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'revenue'
                          ? 'bg-white text-[#004aad] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Top clienti per fatturato
                      </button>
                      <button
                        onClick={() => setActiveTab('hours')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'hours'
                          ? 'bg-white text-[#004aad] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Top cantieri per ore
                      </button>
                    </div>
                  </div>

                  {/* TAB 1 – Top clienti per fatturato */}
                  {activeTab === 'revenue' && (
                    <div className="flex-1 overflow-y-auto">
                      {stats.topClientsByRevenue.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 w-7">#</th>
                              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Cliente</th>
                              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 hidden sm:table-cell">Tipologia</th>
                              <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Fatturato / mese</th>
                              <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 hidden md:table-cell">Margine %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {stats.topClientsByRevenue.map((client, idx) => (
                              <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="py-2.5 pr-2">
                                  <span className="w-6 h-6 rounded-full bg-[#004aad]/10 text-[#004aad] font-black text-[10px] flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <span className="font-semibold text-gray-800 truncate block max-w-[120px] md:max-w-none">{client.name}</span>
                                </td>
                                <td className="py-2.5 pr-3 hidden sm:table-cell">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{client.category}</span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <span className="font-black text-gray-800 tabular-nums">
                                    {client.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €
                                  </span>
                                </td>
                                <td className="py-2.5 text-right hidden md:table-cell">
                                  {client.margin !== null ? (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${client.margin >= 30 ? 'bg-emerald-50 text-emerald-700' :
                                      client.margin >= 15 ? 'bg-amber-50 text-amber-700' :
                                        'bg-red-50 text-red-700'
                                      }`}>
                                      {client.margin.toFixed(1)}%
                                    </span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
                          Nessun cantiere con fatturato configurato.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2 – Top cantieri per ore */}
                  {activeTab === 'hours' && (
                    <div className="flex-1">
                      {stats.sortedSitesLoad.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 w-7">#</th>
                              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Cantiere</th>
                              <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Ore / settimana</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {stats.sortedSitesLoad.map((site, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                <td className="py-3 pr-2">
                                  <span className="w-7 h-7 rounded-full bg-white border-2 border-[#004aad] text-[#004aad] font-black text-xs flex items-center justify-center shadow-sm">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-3 pr-3">
                                  <span className="font-semibold text-gray-800">{site.name}</span>
                                </td>
                                <td className="py-3 text-right">
                                  <span className="font-black text-gray-800 tabular-nums">{site.hours}h</span>
                                  <span className="text-xs text-gray-400 ml-1">/ sett.</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
                          Nessuna assegnazione oraria attiva.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK ACTIONS ROW */}
              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Accesso Rapido</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => setView('employees')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#004aad] hover:shadow-md transition-all text-left group">
                    <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center text-[#004aad] mb-3 group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
                    <span className="font-bold text-gray-700 group-hover:text-[#004aad]">Gestisci Team</span>
                  </button>
                  <button onClick={() => setView('sites')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#004aad] hover:shadow-md transition-all text-left group">
                    <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center text-yellow-600 mb-3 group-hover:scale-110 transition-transform"><MapPin className="w-5 h-5" /></div>
                    <span className="font-bold text-gray-700 group-hover:text-[#004aad]">Anagrafica Cantieri</span>
                  </button>
                  <button onClick={() => setView('generator')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#004aad] hover:shadow-md transition-all text-left group">
                    <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
                    <span className="font-bold text-gray-700 group-hover:text-[#004aad]">Foglio Presenze</span>
                  </button>
                  <button onClick={() => setView('allowances')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#004aad] hover:shadow-md transition-all text-left group">
                    <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center text-green-600 mb-3 group-hover:scale-110 transition-transform"><Wallet className="w-5 h-5" /></div>
                    <span className="font-bold text-gray-700 group-hover:text-[#004aad]">Cedolini & Extra</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* VIEW: EMPLOYEES */}
          {view === 'employees' && (
            <EmployeeManager
              employees={employees}
              sites={sites}
              setEmployees={setEmployees}
            />
          )}

          {/* VIEW: SITES */}
          {view === 'sites' && (
            <SiteManager
              sites={sites}
              setSites={setSites}
              employees={employees}
              setEmployees={setEmployees}
            />
          )}

          {/* VIEW: GENERATOR */}
          {view === 'generator' && (
            <MonthlySheet
              employees={employees}
              sites={sites}
              setEmployees={setEmployees}
            />
          )}

          {/* VIEW: ALLOWANCES */}
          {view === 'allowances' && (
            <MonthlyAllowanceSheet
              employees={employees}
              sites={sites}
            />
          )}

        </div>
      </main>
    </div>
  );
};

export default AuthWrapper;