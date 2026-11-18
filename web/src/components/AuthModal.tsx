import { useState } from 'react';
import { supabase } from '../api/supabaseClient';

interface AuthModalProps {
    onClose: () => void;
}

// Solo inicio de sesión: el dashboard es público y la edición queda reservada al propietario
export function AuthModal({ onClose }: AuthModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setCargando(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Error al iniciar sesión");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full space-y-6 relative">

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="absolute top-4 right-4 w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 font-bold text-sm"
                >
                    ✕
                </button>

                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
                    <p className="text-sm text-gray-500">Acceso del propietario para gestionar las candidaturas</p>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="auth-email" className="text-xs font-semibold text-gray-600 uppercase">Correo electrónico</label>
                        <input
                            id="auth-email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="auth-password" className="text-xs font-semibold text-gray-600 uppercase">Contraseña</label>
                        <input
                            id="auth-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
                    >
                        {cargando ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

            </div>
        </div>
    );
}
