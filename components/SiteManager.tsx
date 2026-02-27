import React, { useState, useMemo } from 'react';
import { Site, Employee, SiteCategory } from '../types';
import { MapPin, Plus, Trash2, GripVertical, Pencil, Check, X, Building2, Map, Search, Users, Euro, Tag, Filter, ArrowUpDown } from 'lucide-react';

interface Props {
    sites: Site[];
    setSites: (s: Site[]) => void;
    employees: Employee[];
    setEmployees: (e: Employee[]) => void;
}

const CATEGORY_COLORS: Record<SiteCategory, { bg: string, border: string, text: string, listBg: string, listBorder: string }> = {
    'Condominio': { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-800', listBg: 'bg-orange-50/50', listBorder: 'border-orange-200' },
    'Azienda': { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', listBg: 'bg-blue-50/50', listBorder: 'border-blue-200' },
    'Ristorante': { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-800', listBg: 'bg-red-50/50', listBorder: 'border-red-200' },
    'Scuola': { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', listBg: 'bg-purple-50/50', listBorder: 'border-purple-200' },
    'Farmacia': { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', listBg: 'bg-green-50/50', listBorder: 'border-green-200' },
    'Privato': { bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-sky-800', listBg: 'bg-sky-50/50', listBorder: 'border-sky-200' }
};

const CATEGORY_OPTIONS: SiteCategory[] = ['Condominio', 'Azienda', 'Ristorante', 'Scuola', 'Farmacia', 'Privato'];

// --- SUB-COMPONENT: ADD SITE MODAL ---
const AddSiteModal = ({
    isOpen,
    onClose,
    onSave
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, address: string, city: string, netMonthlyRevenue?: number, category?: SiteCategory) => void;
}) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [netMonthlyRevenue, setNetMonthlyRevenue] = useState('');
    const [category, setCategory] = useState<SiteCategory | ''>('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const parsedRevenue = netMonthlyRevenue ? parseFloat(netMonthlyRevenue.replace(',', '.')) : undefined;

        onSave(name, address, city, !parsedRevenue || isNaN(parsedRevenue) ? undefined : parsedRevenue, category || undefined);
        setName('');
        setAddress('');
        setCity('');
        setNetMonthlyRevenue('');
        setCategory('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="bg-[#004aad] p-6 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-[#ffec09]" /> Nuovo Cantiere
                        </h3>
                        <p className="text-blue-200 text-sm mt-1">Aggiungi una nuova sede di lavoro.</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome Cantiere / Cliente *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Es. Condominio Mimosa"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Indirizzo</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Via Roma 1"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Città</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Milano"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Fatturato Netto Mensile (€)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 font-bold">€</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={netMonthlyRevenue}
                                    onChange={(e) => setNetMonthlyRevenue(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as SiteCategory | '')}
                                className={`w-full p-3 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none transition-all font-bold ${category
                                    ? `border ${CATEGORY_COLORS[category as SiteCategory].bg} ${CATEGORY_COLORS[category as SiteCategory].text} ${CATEGORY_COLORS[category as SiteCategory].border}`
                                    : 'bg-gray-50 border border-gray-200 text-gray-700'
                                    }`}
                            >
                                <option value="">Nessuna Categoria</option>
                                {CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 py-3 bg-[#004aad] text-white font-bold rounded-xl hover:bg-[#003580] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            Crea Cantiere
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const SiteManager: React.FC<Props> = ({ sites, setSites, employees, setEmployees }) => {
    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editCity, setEditCity] = useState('');
    const [editNetMonthlyRevenue, setEditNetMonthlyRevenue] = useState('');
    const [editCategory, setEditCategory] = useState<SiteCategory | ''>('');

    // Drag State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [filterCategory, setFilterCategory] = useState<SiteCategory | ''>('');
    const [filterCity, setFilterCity] = useState('');
    const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [sortPrice, setSortPrice] = useState<'none' | 'asc' | 'desc'>('none');

    // Derived: unique cities for dropdown
    const uniqueCities = useMemo(() => {
        const cities = sites.map(s => s.city).filter(Boolean) as string[];
        return Array.from(new Set(cities)).sort();
    }, [sites]);

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const addSite = (name: string, address: string, city: string, netMonthlyRevenue?: number, category?: SiteCategory) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Controllo duplicati (case-insensitive)
        const exists = sites.some(site => site.name.toLowerCase() === trimmedName.toLowerCase());

        if (exists) {
            alert("Attenzione: Esiste già un cantiere con questo nome!");
            return;
        }

        const newSite: Site = {
            id: crypto.randomUUID(),
            name: trimmedName,
            address: address.trim(),
            city: city.trim(),
            netMonthlyRevenue,
            category
        };

        setSites([...sites, newSite]);
    };

    const confirmDeleteSite = () => {
        if (!deleteId) return;

        setSites(sites.filter(s => s.id !== deleteId));
        // Rimuovi anche le assegnazioni per questo cantiere dai dipendenti
        setEmployees(employees.map(e => ({
            ...e,
            defaultAssignments: e.defaultAssignments.filter(a => a.siteId !== deleteId)
        })));
        setDeleteId(null);
    };

    // --- EDIT LOGIC ---
    const startEditing = (site: Site) => {
        setEditingId(site.id);
        setEditName(site.name);
        setEditAddress(site.address || '');
        setEditCity(site.city || '');
        setEditNetMonthlyRevenue(site.netMonthlyRevenue !== undefined ? site.netMonthlyRevenue.toString() : '');
        setEditCategory(site.category || '');
    };

    const saveEdit = () => {
        if (!editName.trim()) return;

        // Controllo duplicati escludendo se stesso
        const exists = sites.some(s => s.id !== editingId && s.name.toLowerCase() === editName.trim().toLowerCase());
        if (exists) {
            alert("Attenzione: Esiste già un cantiere con questo nome!");
            return;
        }

        const parsedRevenue = editNetMonthlyRevenue ? parseFloat(editNetMonthlyRevenue.replace(',', '.')) : undefined;

        const updatedSites = sites.map(s => s.id === editingId ? {
            ...s,
            name: editName.trim(),
            address: editAddress.trim(),
            city: editCity.trim(),
            netMonthlyRevenue: !parsedRevenue || isNaN(parsedRevenue) ? undefined : parsedRevenue,
            category: editCategory || undefined
        } : s);

        setSites(updatedSites);
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditAddress('');
        setEditCity('');
        setEditNetMonthlyRevenue('');
        setEditCategory('');
    };

    // --- DRAG LOGIC ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newSites = [...sites];
        const draggedItem = newSites[draggedIndex];
        newSites.splice(draggedIndex, 1);
        newSites.splice(index, 0, draggedItem);

        setSites(newSites);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const filteredSites = useMemo(() => {
        let result = sites.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (filterCategory) {
            result = result.filter(s => s.category === filterCategory);
        }
        if (filterCity) {
            result = result.filter(s => s.city?.toLowerCase() === filterCity.toLowerCase());
        }
        if (filterAssigned === 'assigned') {
            result = result.filter(s => employees.some(e => e.defaultAssignments.some(a => a.siteId === s.id)));
        } else if (filterAssigned === 'unassigned') {
            result = result.filter(s => !employees.some(e => e.defaultAssignments.some(a => a.siteId === s.id)));
        }
        if (sortPrice === 'asc') {
            result = [...result].sort((a, b) => (a.netMonthlyRevenue ?? 0) - (b.netMonthlyRevenue ?? 0));
        } else if (sortPrice === 'desc') {
            result = [...result].sort((a, b) => (b.netMonthlyRevenue ?? 0) - (a.netMonthlyRevenue ?? 0));
        }
        return result;
    }, [sites, employees, searchTerm, filterCategory, filterCity, filterAssigned, sortPrice]);

    const hasActiveFilters = !!(filterCategory || filterCity || filterAssigned !== 'all' || sortPrice !== 'none');

    const resetAllFilters = () => {
        setSearchTerm('');
        setFilterCategory('');
        setFilterCity('');
        setFilterAssigned('all');
        setSortPrice('none');
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20 relative">

            <AddSiteModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={addSite}
            />

            {/* DELETE CONFIRMATION MODAL */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Elimina Cantiere</h3>
                        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                            Sei sicuro di voler eliminare definitivamente questo cantiere? Verrà rimosso anche dalle assegnazioni dei dipendenti.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold text-sm transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={confirmDeleteSite}
                                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold text-sm shadow-md transition-colors"
                            >
                                Elimina
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-[#004aad]" /> Cantieri & Clienti
                    </h2>
                    <p className="text-gray-500 font-medium mt-1">Gestisci l'anagrafica delle sedi di lavoro.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#004aad] text-white pl-4 pr-6 py-3 rounded-xl hover:bg-[#003580] font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 group"
                >
                    <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Plus className="w-5 h-5" />
                    </div>
                    Nuovo Cantiere
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                    <Building2 className="w-4 h-4 text-[#ffec09] fill-[#ffec09]" />
                    <span>Totale Cantieri: <strong className="text-gray-900">{sites.length}</strong></span>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                    <input
                        type="text"
                        placeholder="Cerca cantiere o categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] sm:text-sm transition-colors"
                    />
                </div>
            </div>

            {/* CATEGORY LEGEND + FILTERS */}
            <div className="flex flex-col gap-3">
                {/* Row 1: Legenda Categorie */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Legenda Categorie:</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {CATEGORY_OPTIONS.map(cat => (
                            <div key={cat} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border}`}>
                                {cat}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 2: Filtri Avanzati */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mr-1">
                        <Filter className="w-3 h-3" /> Filtri:
                    </span>

                    {/* Categoria */}
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value as SiteCategory | '')}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none transition-colors cursor-pointer ${filterCategory
                                ? `${CATEGORY_COLORS[filterCategory as SiteCategory].bg} ${CATEGORY_COLORS[filterCategory as SiteCategory].text} ${CATEGORY_COLORS[filterCategory as SiteCategory].border}`
                                : 'bg-white text-gray-500 border-gray-200 hover:border-[#004aad]'
                            }`}
                    >
                        <option value="">Tutte le categorie</option>
                        {CATEGORY_OPTIONS.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Città */}
                    <select
                        value={filterCity}
                        onChange={e => setFilterCity(e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none transition-colors cursor-pointer ${filterCity ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:border-[#004aad]'
                            }`}
                    >
                        <option value="">Tutte le città</option>
                        {uniqueCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>

                    {/* Assegnati */}
                    <select
                        value={filterAssigned}
                        onChange={e => setFilterAssigned(e.target.value as 'all' | 'assigned' | 'unassigned')}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none transition-colors cursor-pointer ${filterAssigned !== 'all' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:border-[#004aad]'
                            }`}
                    >
                        <option value="all">Tutti</option>
                        <option value="assigned">✅ Assegnati</option>
                        <option value="unassigned">⬜ Non assegnati</option>
                    </select>

                    {/* Prezzo */}
                    <button
                        onClick={() => setSortPrice(p => p === 'none' ? 'asc' : p === 'asc' ? 'desc' : 'none')}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${sortPrice !== 'none' ? 'bg-blue-50 text-[#004aad] border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-[#004aad]'
                            }`}
                    >
                        <ArrowUpDown className="w-3 h-3" />
                        Prezzo {sortPrice === 'asc' ? '↑' : sortPrice === 'desc' ? '↓' : ''}
                    </button>

                    {/* Reset */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetAllFilters}
                            className="text-xs font-bold px-2 py-1 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors"
                        >
                            ✕ Reset
                        </button>
                    )}
                </div>

                {/* Counter risultati se filtri attivi */}
                {hasActiveFilters && (
                    <p className="text-xs text-gray-400 font-medium">
                        Visualizzando <strong className="text-gray-700">{filteredSites.length}</strong> su {sites.length} cantieri
                    </p>
                )}
            </div>

            {/* LISTA VERTICALE CANTIERI */}
            <div className="flex flex-col gap-3">
                {filteredSites.map((site, index) => {
                    const isEditing = editingId === site.id;
                    const isDragging = draggedIndex === index;

                    return (
                        <div
                            key={site.id}
                            draggable={!isEditing && !searchTerm} // Disable drag when searching
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`
                        flex items-center gap-3 py-2 px-3 rounded-xl border transition-all select-none group
                        ${isDragging ? 'opacity-50 border-dashed scale-[0.98]' : 'hover:shadow-md hover:border-blue-300'}
                        ${site.category && !isDragging ? CATEGORY_COLORS[site.category].listBg : isDragging ? 'bg-blue-50 border-[#004aad]' : 'bg-white border-gray-200'}
                        ${site.category && !isDragging ? CATEGORY_COLORS[site.category].listBorder : ''}
                    `}
                        >
                            {/* Drag Handle */}
                            {!searchTerm && (
                                <div className="text-gray-300 cursor-grab active:cursor-grabbing group-hover:text-[#004aad] self-center transition-colors">
                                    <GripVertical className="w-5 h-5" />
                                </div>
                            )}

                            {/* Numeric Indicator */}
                            <div className="text-xs font-black text-gray-300 w-7 text-center hidden md:flex items-center justify-center bg-gray-50 rounded-md h-7 group-hover:text-[#004aad] group-hover:bg-blue-50 transition-colors">
                                {index + 1}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr] gap-3 animate-fade-in w-full">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Nome Cantiere"
                                            className="p-2 border-2 border-[#004aad] rounded-lg bg-white text-gray-900 outline-none text-sm font-bold focus:shadow-md w-full"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={editAddress}
                                            onChange={(e) => setEditAddress(e.target.value)}
                                            placeholder="Indirizzo"
                                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none text-sm focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] w-full"
                                        />
                                        <input
                                            type="text"
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            placeholder="Città"
                                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none text-sm focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] w-full"
                                        />
                                        <div className="relative w-full">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                <span className="text-gray-500 font-bold text-sm">€</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editNetMonthlyRevenue}
                                                onChange={(e) => setEditNetMonthlyRevenue(e.target.value)}
                                                placeholder="Fatturato"
                                                className="w-full pl-6 p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none text-sm focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]"
                                            />
                                        </div>
                                        <select
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value as SiteCategory | '')}
                                            className={`w-full p-2 rounded-lg focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] outline-none text-sm transition-all font-bold ${editCategory
                                                ? `border ${CATEGORY_COLORS[editCategory as SiteCategory].bg} ${CATEGORY_COLORS[editCategory as SiteCategory].text} ${CATEGORY_COLORS[editCategory as SiteCategory].border}`
                                                : 'bg-white border border-gray-300 text-gray-700'
                                                }`}
                                        >
                                            <option value="">Categoria...</option>
                                            {CATEGORY_OPTIONS.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[1.5fr_1.5fr_1fr_1fr] lg:grid-cols-[2fr_1.5fr_120px_1fr_1fr] gap-1 md:gap-3 items-center w-full">
                                        <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-2 order-1 md:order-1 lg:order-1">
                                            <span className="w-2 h-2 rounded-full bg-[#004aad] flex-shrink-0"></span>
                                            <span className="truncate">{site.name}</span>
                                        </div>

                                        <div className="flex items-center min-w-0 order-3 md:order-2 lg:order-2">
                                            {(site.address || site.city) && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 md:py-1 rounded-md border border-gray-100 max-w-full">
                                                    <Map className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {site.address}{site.address && site.city ? ', ' : ''}{site.city}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="hidden lg:flex items-center lg:order-3 justify-start">
                                            {site.category && (
                                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border ${CATEGORY_COLORS[site.category].bg} ${CATEGORY_COLORS[site.category].text} ${CATEGORY_COLORS[site.category].border} shrink-0`}>
                                                    {site.category}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end md:justify-center order-4 md:order-3 lg:order-4">
                                            {site.netMonthlyRevenue !== undefined && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#004aad] bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                                                    <Euro className="w-3 h-3 flex-shrink-0" />
                                                    <span>{site.netMonthlyRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end order-2 md:order-4 lg:order-5">
                                            {(() => {
                                                const assignedEmployees = employees.filter(e => e.defaultAssignments.some(a => a.siteId === site.id));
                                                if (assignedEmployees.length === 0) return <div className="w-1"></div>;
                                                return (
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-gray-400 mr-1 hidden lg:block" />
                                                        <div className="flex -space-x-1">
                                                            {assignedEmployees.map((emp) => (
                                                                <div
                                                                    key={emp.id}
                                                                    className="w-6 h-6 rounded-full bg-indigo-100 text-[#004aad] font-bold text-[9px] flex items-center justify-center border border-white shadow-sm ring-1 ring-[#004aad]/20"
                                                                    title={`${emp.firstName} ${emp.lastName}`}
                                                                >
                                                                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 self-center">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={saveEdit}
                                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                            title="Salva"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                                            title="Annulla"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => startEditing(site)}
                                            className="p-2 text-gray-400 hover:text-[#004aad] hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Modifica"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(site.id); }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Elimina"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredSites.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                            <MapPin className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">Nessun cantiere trovato.</p>
                        {(searchTerm || hasActiveFilters) ? (
                            <button onClick={resetAllFilters} className="text-[#004aad] text-sm font-bold mt-2 hover:underline">Resetta tutti i filtri</button>
                        ) : (
                            <button onClick={() => setIsAddModalOpen(true)} className="text-[#004aad] text-sm font-bold mt-2 hover:underline">Aggiungine uno ora</button>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};