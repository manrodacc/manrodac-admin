import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogIn, Loader2, Lock, Mail } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 border border-slate-100">
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-[#1B365D] flex items-center justify-center shadow-lg shadow-[#1B365D]/20 mx-auto mb-6 p-2">
                <img src="/LOGO INSTA.png" alt="MANRODAC Logo" className="w-full h-full object-contain filter brightness-0 invert" />
            </div>
            <h1 className="font-display font-bold text-2xl text-[#1B365D] mb-2 tracking-tight">MANRODAC</h1>
            <p className="text-sm text-slate-500 font-medium">Gestor de Stock y Control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center animate-fade-in">
                Credenciales incorrectas. Verifica tu email y contraseña.
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal bg-slate-50 focus:bg-white"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-blue-900 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-70 shadow-lg shadow-[#1B365D]/20 mt-8"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>
          
        </div>
        
        <p className="text-center text-xs text-slate-400 font-medium mt-8 tracking-widest uppercase">
          Dedication & Persistence
        </p>
      </div>
    </div>
  )
}
