import React, { useState } from 'react';
import { Site, Employee } from '../types';
import { MapPin, Plus, Trash2, GripVertical, Pencil, Check, X, Building2, Map, Search } from 'lucide-react';

interface Props {
    sites: Site[];
    setSites: (s: Site[]) => void;
    employees: Employee[];
    setEmployees: (e: Employee[]) => void;
}

// --- SUB-COMPONENT: ADD SITE MODAL ---
const AddSiteModal = ({
    isOpen,
    onClose,
    onSave
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, address: string, city: string) => void;
}) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(name, address, city);
        setName('');
        setAddress('');
        setCity('');
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

    // Drag State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const addSite = (name: string, address: string, city: string) => {
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
            city: city.trim()
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
    };

    const saveEdit = () => {
        if (!editName.trim()) return;

        // Controllo duplicati escludendo se stesso
        const exists = sites.some(s => s.id !== editingId && s.name.toLowerCase() === editName.trim().toLowerCase());
        if (exists) {
            alert("Attenzione: Esiste già un cantiere con questo nome!");
            return;
        }

        const updatedSites = sites.map(s => s.id === editingId ? {
            ...s,
            name: editName.trim(),
            address: editAddress.trim(),
            city: editCity.trim()
        } : s);

        setSites(updatedSites);
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditAddress('');
        setEditCity('');
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

    const filteredSites = sites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
                        placeholder="Cerca cantiere..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] sm:text-sm transition-colors"
                    />
                </div>
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
                        ${isDragging ? 'bg-blue-50 border-[#004aad] opacity-50' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}
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
                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] gap-3 animate-fade-in">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Nome Cantiere"
                                            className="p-2 border-2 border-[#004aad] rounded-lg bg-white text-gray-900 outline-none text-sm font-bold focus:shadow-md"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={editAddress}
                                            onChange={(e) => setEditAddress(e.target.value)}
                                            placeholder="Indirizzo"
                                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none text-sm focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]"
                                        />
                                        <input
                                            type="text"
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            placeholder="Città"
                                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none text-sm focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                                        <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#004aad] flex-shrink-0"></span>
                                            {site.name}
                                        </div>
                                        {(site.address || site.city) && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 self-start md:self-auto">
                                                <Map className="w-3 h-3 text-gray-400" />
                                                <span>
                                                    {site.address}{site.address && site.city ? ', ' : ''}{site.city}
                                                </span>
                                            </div>
                                        )}
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
                        {searchTerm ? (
                            <button onClick={() => setSearchTerm('')} className="text-[#004aad] text-sm font-bold mt-2 hover:underline">Resetta ricerca</button>
                        ) : (
                            <button onClick={() => setIsAddModalOpen(true)} className="text-[#004aad] text-sm font-bold mt-2 hover:underline">Aggiungine uno ora</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};