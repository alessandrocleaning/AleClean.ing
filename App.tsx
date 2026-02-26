import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode } from './types';
import { EmployeeManager } from './components/EmployeeManager';
import { SiteManager } from './components/SiteManager';
import { MonthlySheet } from './components/MonthlySheet';
import { MonthlyAllowanceSheet } from './components/MonthlyAllowanceSheet';
import { AuthScreen } from './components/AuthScreen';
import { Users, FileText, LayoutDashboard, MapPin, Menu, X, Wallet, Building2, TrendingUp, TrendingDown, BarChart3, Activity, PieChart as PieChartIcon, LogOut, Cloud, CloudOff, Loader } from 'lucide-react';
// (Nessun seed data — ogni utente parte con dati vuoti)
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subMonths, format } from 'date-fns';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useFirestoreData } from './hooks/useFirestoreData';

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


const CHART_COLORS = ['#004aad', '#fbbf24', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];

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

  // --- DASHBOARD STATISTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);

    const todayStr = format(today, 'yyyy-MM-dd');
    const lastMonthStr = format(lastMonth, 'yyyy-MM-dd');

    // Helper function to calculate metrics for a specific point in time
    const calculateMetrics = (dateStr: string) => {
      let hours = 0;
      let contracts = 0;
      let cost = 0;

      employees.forEach(emp => {
        const assignments = emp.defaultAssignments || [];
        assignments.forEach(assign => {
          if (!assign.archived) {
            // Check if assignment was active at that date
            // Active if: StartDate <= TargetDate AND (EndDate is null OR EndDate >= TargetDate)
            const isActive = assign.startDate <= dateStr && (!assign.endDate || assign.endDate >= dateStr);

            if (isActive) {
              contracts++;
              const weeklyHours = Object.values(assign.schedule || {}).reduce((sum: number, h: any) => sum + (Number(h) || 0), 0) as number;
              hours += weeklyHours;

              const monthlyBase = (weeklyHours * 4.33 * (emp.hourlyRate || 0));
              const forfait = assign.type === 'FORFAIT' ? (assign.forfaitAmount || 0) : 0;
              cost += monthlyBase + forfait;
            }
          }
        });
      });
      return { hours, contracts, cost };
    };

    // 1. Calculate Current Metrics
    const current = calculateMetrics(todayStr);

    // 2. Calculate Previous Month Metrics
    const previous = calculateMetrics(lastMonthStr);

    // 3. Calculate Variations
    const getVariation = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const variations = {
      hours: getVariation(current.hours, previous.hours),
      contracts: getVariation(current.contracts, previous.contracts),
      cost: getVariation(current.cost, previous.cost)
    };

    // 4. Site Distribution & Load (Current Data)
    const sitesDistribution: Record<string, number> = {};
    const assignmentsByCity: Record<string, number> = {};
    const sitesHours: Record<string, number> = {};

    sites.forEach(s => {
      const city = s.city ? s.city.trim() : 'Non specificato';
      sitesDistribution[city] = (sitesDistribution[city] || 0) + 1;
      sitesHours[s.id] = 0;
    });

    employees.forEach(emp => {
      const assignments = emp.defaultAssignments || [];
      assignments.forEach(assign => {
        // Use current logic for charts (non-archived)
        if (!assign.archived) {
          const weeklyHours = Object.values(assign.schedule || {}).reduce((sum: number, h: any) => sum + (Number(h) || 0), 0) as number;

          // Site load
          if (sitesHours[assign.siteId] !== undefined) {
            sitesHours[assign.siteId] += weeklyHours;
          }

          // Assignment by City (For Pie Chart)
          const site = sites.find(s => s.id === assign.siteId);
          const city = site?.city ? site.city.trim() : 'Non specificato';
          assignmentsByCity[city] = (assignmentsByCity[city] || 0) + 1;
        }
      });
    });

    const pieData = Object.entries(assignmentsByCity)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sortedSitesLoad = Object.entries(sitesHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, hours]) => ({
        name: sites.find(s => s.id === id)?.name || 'Sconosciuto',
        hours
      }))
      .filter(s => s.hours > 0);

    const sortedCities = Object.entries(sitesDistribution)
      .sort(([, a], [, b]) => b - a);

    return {
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

        {/* AI Agent Data Injector */}
        {/* AI Agent Data Injector Removed */}

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

              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Card 1: Dipendenti */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-[#004aad]">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dipendenti</p>
                    <div className="flex items-baseline">
                      <h3 className="text-2xl font-black text-gray-800">{employees.length}</h3>
                      <TrendIndicator value={stats.variations.hours} />
                    </div>
                    <p className="text-xs text-blue-600 font-bold mt-1">
                      {stats.totalAssignedHours}h / sett. totali
                    </p>
                  </div>
                </div>

                {/* Card 2: Cantieri */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cantieri Totali</p>
                    <h3 className="text-2xl font-black text-gray-800">{sites.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">Sedi operative registrate</p>
                  </div>
                </div>

                {/* Card 3: Appalti Attivi */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Appalti Attivi</p>
                    <div className="flex items-baseline">
                      <h3 className="text-2xl font-black text-gray-800">{stats.activeContractsCount}</h3>
                      <TrendIndicator value={stats.variations.contracts} />
                    </div>
                    <p className="text-xs text-green-600 font-bold mt-1">Assegnazioni correnti</p>
                  </div>
                </div>

                {/* Card 4: Stima Costi */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stima Mensile</p>
                    <div className="flex items-baseline">
                      <h3 className="text-2xl font-black text-gray-800">~{Math.round(stats.estimatedMonthlyCost).toLocaleString('it-IT')} €</h3>
                      <TrendIndicator value={stats.variations.cost} />
                    </div>
                    <p className="text-xs text-purple-400 mt-1 font-medium">Basato su contratti attivi</p>
                  </div>
                </div>
              </div>

              {/* CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CHART: CITY DISTRIBUTION */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col h-[420px]">
                  <div className="flex items-center gap-3 mb-2 flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg"><PieChartIcon className="w-5 h-5 text-gray-600" /></div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">Distribuzione Appalti <br /><span className="text-xs font-normal text-gray-500">per Città (Sedi Lavorative)</span></h3>
                  </div>

                  <div className="flex-1 w-full relative">
                    {stats.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.pieData}
                            cx="50%"
                            cy="45%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.pieData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                            itemStyle={{ color: '#374151' }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingTop: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm">
                        Nessun appalto attivo.
                      </div>
                    )}
                  </div>
                </div>

                {/* CHART: TOP SITES BY EFFORT */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 rounded-lg"><BarChart3 className="w-5 h-5 text-gray-600" /></div>
                    <h3 className="font-bold text-gray-800 text-lg">Top 5 Cantieri per Impegno Orario</h3>
                  </div>

                  <div className="flex-1">
                    {stats.sortedSitesLoad.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {stats.sortedSitesLoad.map((site, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-white transition-all">
                            <div className="w-10 h-10 rounded-full bg-white border-2 border-[#004aad] text-[#004aad] font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-800 truncate">{site.name}</h4>
                              <p className="text-xs text-gray-500">Richiede <strong className="text-gray-900">{site.hours}h</strong> / settimana</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
                        Nessuna assegnazione oraria attiva.
                      </div>
                    )}
                  </div>
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