import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
    LayoutDashboard,
    Package,
    PlusCircle,
    Tags,
    RefreshCw,
    ShoppingCart,
    Scissors,
    Users,
    Truck,
    Receipt,
    Wallet,
    Menu,
    X,
    LogOut
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const secciones = [
    {
        titulo: 'General',
        links: [
            { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
            { to: '/stock', label: 'Stock', icon: Package },
        ],
    },
    {
        titulo: 'Catálogo',
        links: [
            { to: '/nuevo-producto', label: 'Nuevo producto', icon: PlusCircle },
            { to: '/categorias', label: 'Categorías', icon: Tags },
        ],
    },
    {
        titulo: 'Operación',
        links: [
            { to: '/reponer-stock', label: 'Reponer stock', icon: RefreshCw },
            { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
            { to: '/materia-prima', label: 'Materia prima', icon: Scissors },
        ],
    },
    {
        titulo: 'Negocio',
        links: [
            { to: '/clientes', label: 'Clientes', icon: Users },
            { to: '/proveedores', label: 'Proveedores', icon: Truck },
            { to: '/gastos', label: 'Gastos', icon: Receipt },
            { to: '/caja', label: 'Caja', icon: Wallet },
        ],
    },
]

function Layout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false)
    const location = useLocation()

    // Cerrar menú mobile al navegar
    const cerrarMenu = () => setMenuAbierto(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="min-h-screen flex bg-[#F8FAFC]">
            {/* Overlay mobile */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={cerrarMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:sticky top-0 left-0 z-50 h-screen w-72
                bg-[#1B365D] text-slate-100
                flex flex-col
                transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
                ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
                overflow-y-auto
            `}>
                {/* Logo + Brand */}
                <div className="px-6 pt-8 pb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/10 overflow-hidden shrink-0">
                        <img src="/LOGO INSTA.png" alt="MANRODAC Logo" className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-white tracking-tight">MANRODAC</p>
                        <p className="text-[10px] text-blue-200/80 uppercase tracking-[0.2em] font-medium">Gestor de stock</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-6 h-px bg-white/10" />

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-8">
                    {secciones.map((seccion) => (
                        <div key={seccion.titulo}>
                            <p className="text-[11px] uppercase tracking-wider text-blue-200/60 font-semibold mb-3 px-3">
                                {seccion.titulo}
                            </p>
                            <div className="space-y-1">
                                {seccion.links.map((link) => {
                                    const Icon = link.icon
                                    return (
                                        <NavLink
                                            key={link.to}
                                            to={link.to}
                                            end={link.end}
                                            onClick={cerrarMenu}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                                    ? 'bg-blue-600/20 text-blue-400'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                                }`
                                            }
                                        >
                                            <Icon className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                                            {link.label}
                                        </NavLink>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-white/10 space-y-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 font-medium py-2 px-4 rounded-xl transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Cerrar Sesión</span>
                    </button>
                    <p className="text-[10px] text-blue-200/40 text-center uppercase tracking-widest font-medium">
                        Dedication & Persistence
                    </p>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    {menuAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                <div className="flex items-center gap-2">
                    <img src="/LOGO INSTA.png" alt="Logo" className="w-8 h-8 object-contain bg-white rounded-lg p-0.5 border border-slate-100" />
                    <p className="font-display font-bold text-sm text-[#1B365D]">MANRODAC</p>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Main Content */}
            <main className="flex-1 px-4 py-6 md:px-8 lg:px-12 md:py-10 pt-20 md:pt-10 max-w-[1400px]">
                <div className="animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default Layout