import { useState } from 'react';
import { supabase } from '../api/supabaseClient';

export function AuthModal() {
    const [esLogin, setEsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setMensajeExito(null);
        setCargando(true);

        try {
            if (esLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMensajeExito("Cuenta creada. Si Supabase requiere confirmación, revisa tu correo.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Error al autenticar");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full space-y-6">
                
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {esLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {esLogin ? 'Accede a tu panel de candidaturas' : 'Registra tus datos para guardar tus postulaciones'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                        {errorMsg}
                    </div>
                )}

                {mensajeExito && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl">
                        {mensajeExito}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Contraseña</label>
                        <input
                            type="password"
                            required
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
                        {cargando ? 'Procesando...' : (esLogin ? 'Entrar al Dashboard' : 'Registrarme')}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setEsLogin(!esLogin);
                            setErrorMsg(null);
                            setMensajeExito(null);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                        {esLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>

            </div>
        </div>
    );
}
