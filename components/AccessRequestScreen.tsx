import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { submitAccessRequest } from '../lib/firestore';
import { Mail, User as UserIcon, Building2, MessageSquare, ArrowRight, Clock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface AccessRequestScreenProps {
    user: User;
    isPending: boolean; // true = richiesta già inviata, in attesa
}

export const AccessRequestScreen: React.FC<AccessRequestScreenProps> = ({ user, isPending }) => {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !company.trim()) {
            setError('Nome e azienda sono obbligatori.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await submitAccessRequest(
                user.uid,
                user.email || '',
                name.trim(),
                company.trim(),
                message.trim()
            );
            setSubmitted(true);
        } catch (err) {
            console.error('Errore invio richiesta:', err);
            setError('Errore durante l\'invio. Riprova.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const showPending = isPending || submitted;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#003a8c] via-[#004aad] to-[#005cc5] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-2">
                        <img src="/logo.png" alt="Clean.ing Logo" className="w-20 h-20 object-contain drop-shadow-2xl" />
                        <div className="flex flex-col w-min text-left">
                            <h1 className="font-black text-4xl text-white tracking-tighter leading-none">CLEAN.ING</h1>
                            <div className="flex justify-between w-full text-blue-200 text-[9px] font-bold uppercase mt-1">
                                {"MANAGEMENT SYSTEM".split('').map((char, i) => (
                                    <span key={i}>{char === ' ' ? '\u00A0' : char}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {showPending ? (
                        /* STATO: IN ATTESA */
                        <div className="text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-amber-500" />
                            </div>
                            <h2 className="text-xl font-black text-gray-800 mb-2">Richiesta Inviata</h2>
                            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                La tua richiesta di accesso è stata ricevuta.<br />
                                Riceverai l'approvazione a breve.
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                                <p className="text-xs text-amber-700 font-medium">
                                    ⏳ In attesa di approvazione da parte dell'amministratore.
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">Account:</p>
                            <p className="text-sm font-semibold text-gray-700 mb-6 truncate">{user.email}</p>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors mx-auto"
                            >
                                <LogOut className="w-4 h-4" /> Esci dall'account
                            </button>
                        </div>
                    ) : (
                        /* STATO: FORM RICHIESTA */
                        <>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <UserIcon className="w-8 h-8 text-[#004aad]" />
                            </div>
                            <h2 className="text-xl font-black text-gray-800 mb-1 text-center">Accesso Richiesto</h2>
                            <p className="text-sm text-gray-500 mb-6 text-center">
                                Compila il form per richiedere l'accesso all'app.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                {/* Email (read-only) */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="text"
                                        value={user.email || ''}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-400 font-medium cursor-not-allowed"
                                    />
                                </div>

                                {/* Nome */}
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Nome e Cognome *"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#004aad] focus:outline-none transition-colors text-sm font-medium"
                                    />
                                </div>

                                {/* Azienda */}
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Azienda / Organizzazione *"
                                        value={company}
                                        onChange={e => setCompany(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#004aad] focus:outline-none transition-colors text-sm font-medium"
                                    />
                                </div>

                                {/* Messaggio opzionale */}
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <textarea
                                        placeholder="Messaggio opzionale..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#004aad] focus:outline-none transition-colors text-sm font-medium resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p className="text-xs font-medium">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#004aad] text-white rounded-xl py-3 px-4 font-bold flex items-center justify-center gap-2 hover:bg-[#003a8c] transition-colors disabled:opacity-60"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Invia Richiesta <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto mt-4"
                            >
                                <LogOut className="w-3.5 h-3.5" /> Esci dall'account
                            </button>
                        </>
                    )}
                </div>

                <p className="text-center text-blue-200/60 text-xs mt-6">
                    © {new Date().getFullYear()} Clean.ing — I tuoi dati sono al sicuro.
                </p>
            </div>
        </div>
    );
};
