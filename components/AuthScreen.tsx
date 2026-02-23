import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'reset';

export const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const translateError = (code: string): string => {
        const errors: Record<string, string> = {
            'auth/invalid-email': 'Email non valida.',
            'auth/user-not-found': 'Nessun account trovato con questa email.',
            'auth/wrong-password': 'Password errata. Riprova.',
            'auth/email-already-in-use': 'Email già registrata. Prova ad accedere.',
            'auth/weak-password': 'Password troppo corta (minimo 6 caratteri).',
            'auth/invalid-credential': 'Credenziali non valide. Controlla email e password.',
            'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
            'auth/popup-closed-by-user': 'Accesso annullato.',
        };
        return errors[code] || 'Errore di accesso. Riprova.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else if (mode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else if (mode === 'reset') {
                await sendPasswordResetEmail(auth, email);
                setSuccess('Email di recupero inviata! Controlla la tua casella.');
                setMode('login');
            }
        } catch (err: any) {
            setError(translateError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(translateError(err.code));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#003a8c] via-[#004aad] to-[#005cc5] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-2">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl">
                            <img src="/logo.png" alt="Clean.ing Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h1 className="font-black text-3xl text-white tracking-tighter leading-none">CLEAN.ING</h1>
                            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Management System</p>
                        </div>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-xl font-black text-gray-800 mb-1">
                        {mode === 'login' && 'Bentornato 👋'}
                        {mode === 'register' && 'Crea Account'}
                        {mode === 'reset' && 'Recupera Password'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        {mode === 'login' && 'Accedi per vedere i tuoi dati.'}
                        {mode === 'register' && 'Crea un account per iniziare.'}
                        {mode === 'reset' && 'Inserisci la tua email.'}
                    </p>

                    {/* Google Button */}
                    {(mode === 'login' || mode === 'register') && (
                        <>
                            <button
                                onClick={handleGoogle}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-semibold text-gray-700 hover:border-[#004aad] hover:bg-blue-50 transition-all disabled:opacity-50 mb-4"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {mode === 'login' ? 'Accedi con Google' : 'Registrati con Google'}
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs text-gray-400 font-medium">oppure</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>
                        </>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#004aad] focus:outline-none transition-colors text-sm font-medium"
                            />
                        </div>

                        {mode !== 'reset' && (
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#004aad] focus:outline-none transition-colors text-sm font-medium"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p className="text-xs font-medium">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <p className="text-xs font-medium">{success}</p>
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
                                    {mode === 'login' && 'Accedi'}
                                    {mode === 'register' && 'Crea Account'}
                                    {mode === 'reset' && 'Invia Email'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer links */}
                    <div className="mt-5 flex flex-col items-center gap-2">
                        {mode === 'login' && (
                            <>
                                <button onClick={() => { setMode('reset'); setError(''); }} className="text-xs text-gray-400 hover:text-[#004aad] transition-colors">
                                    Password dimenticata?
                                </button>
                                <button onClick={() => { setMode('register'); setError(''); }} className="text-xs font-semibold text-[#004aad] hover:underline">
                                    Non hai un account? Registrati
                                </button>
                            </>
                        )}
                        {(mode === 'register' || mode === 'reset') && (
                            <button onClick={() => { setMode('login'); setError(''); }} className="text-xs font-semibold text-[#004aad] hover:underline">
                                ← Torna al Login
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center text-blue-200/60 text-xs mt-6">
                    © {new Date().getFullYear()} Clean.ing — I tuoi dati sono al sicuro.
                </p>
            </div>
        </div>
    );
};
