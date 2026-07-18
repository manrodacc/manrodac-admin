import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, Package, AlertCircle, BarChart3 } from 'lucide-react'

function Dashboard() {
    const [stockTotal, setStockTotal] = useState(0)
    const [caja, setCaja] = useState({ saldo: 0, ingresosMes: 0, gastosMpMes: 0, gananciaMes: 0 })
    const [historialGanancias, setHistorialGanancias] = useState([])
    const [alertas, setAlertas] = useState([])
    const [topProductos, setTopProductos] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        async function cargarDatos() {
            const { data: stockData } = await supabase.from('stock').select('cantidad_actual')
            const suma = (stockData || []).reduce((total, fila) => total + fila.cantidad_actual, 0)
            setStockTotal(suma)

            // Resumen de caja (nuevo módulo)
            const { data: cajaData } = await supabase.from('vista_caja_resumen').select('*')
            let saldo = 0
            let ingresosMes = 0
            let gastosMpMes = 0
            let gananciaMes = 0

            const hoy = new Date()
            const mesActual = hoy.getMonth()
            const anioActual = hoy.getFullYear()

                ; (cajaData || []).forEach((mov) => {
                    saldo += Number(mov.monto_total || 0)

                    const fecha = new Date(mov.fecha)
                    if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
                        if (mov.tipo === 'venta') {
                            ingresosMes += Number(mov.monto_total || 0)
                            gananciaMes += Number(mov.ganancia_neta || 0)
                        } else if (mov.tipo === 'gasto_mp') {
                            gastosMpMes += Math.abs(Number(mov.monto_total || 0))
                        }
                    }
                })

            setCaja({ saldo, ingresosMes, gastosMpMes, gananciaMes })

            const { data: alertasData } = await supabase.from('vista_stock_bajo').select('*')
            setAlertas(alertasData || [])

            // Historial para el gráfico
            const { data: gananciasData } = await supabase
                .from('vista_ganancias_mensuales')
                .select('*')
                .order('mes', { ascending: true })
                .limit(6)

            const historial = (gananciasData || []).map((fila) => ({
                mes: new Date(fila.mes).toLocaleDateString('es-PE', { month: 'short' }),
                ganancia: Number(fila.ganancia_bruta),
            }))
            setHistorialGanancias(historial)

            const { data: topData } = await supabase.from('vista_top_productos_mes').select('*').limit(5)
            setTopProductos(topData || [])

            setCargando(false)
        }
        cargarDatos()
    }, [])

    return (
        <div>
            <header className="mb-8">
                <h1 className="font-display font-semibold text-3xl text-tinta">Dashboard</h1>
                <p className="text-sm text-tintaSuave mt-1">Resumen general de tu tienda.</p>
            </header>

            {/* Métricas Generales (Caja) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {/* Saldo Total */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Saldo en caja
                        </p>
                        <div className={`p-2 rounded-lg ${caja.saldo >= 0 ? 'bg-oliva/10 text-oliva' : 'bg-red-500/10 text-red-500'}`}>
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className={`font-display font-bold text-3xl tracking-tight ${caja.saldo >= 0 ? 'text-tinta' : 'text-red-500'}`}>
                            {cargando ? '...' : `S/ ${caja.saldo.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5 flex items-center gap-1">
                            Histórico total
                        </p>
                    </div>
                </div>

                {/* Ingresos del mes */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Ingresos
                        </p>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="font-display font-bold text-3xl text-tinta tracking-tight">
                            {cargando ? '...' : `S/ ${caja.ingresosMes.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">Este mes</p>
                    </div>
                </div>

                {/* Gastos del mes */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Gastos MP
                        </p>
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="font-display font-bold text-3xl text-tinta tracking-tight">
                            {cargando ? '...' : `S/ ${caja.gastosMpMes.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">Este mes</p>
                    </div>
                </div>

                {/* Ganancia del mes */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-oliva/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Ganancia Neta
                        </p>
                        <div className={`p-2 rounded-lg ${caja.gananciaMes >= 0 ? 'bg-oliva/10 text-oliva' : 'bg-slate-100 text-slate-400'}`}>
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className={`font-display font-bold text-3xl tracking-tight ${caja.gananciaMes >= 0 ? 'text-oliva' : 'text-tinta'}`}>
                            {cargando ? '...' : `S/ ${caja.gananciaMes.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">Este mes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Stock total */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-center items-center text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-6 h-6" />
                    </div>
                    <p className="font-display font-bold text-4xl text-tinta tracking-tight">
                        {cargando ? '...' : stockTotal}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider text-tintaSuave mt-2">
                        Unidades en Stock
                    </p>
                </div>

                {/* El gráfico se reubica para no tomar todo el ancho y cuadrar con el layout */}
                <div className="md:col-span-2 bg-papel rounded-2xl p-6 shadow-sm border border-arena">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-tintaSuave" />
                        <h2 className="font-display font-semibold text-lg text-tinta">Ganancias — últimos meses</h2>
                    </div>
                    {historialGanancias.length === 0 && !cargando && (
                        <p className="text-sm text-tintaSuave">Aún no hay suficientes ventas para graficar.</p>
                    )}
                    {historialGanancias.length > 0 && (
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historialGanancias}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="mes" stroke="#94A3B8" fontSize={12} />
                                    <YAxis stroke="#94A3B8" fontSize={12} />
                                    <Tooltip
                                        formatter={(valor) => [`S/ ${Number(valor).toFixed(2)}`, 'Ganancia']}
                                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }}
                                    />
                                    <Line type="monotone" dataKey="ganancia" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <section className="bg-papel rounded-2xl p-6 shadow-sm border border-arena">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h2 className="font-display font-semibold text-lg text-tinta">Alertas de stock bajo</h2>
                    </div>
                    {!cargando && alertas.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 bg-oliva/10 text-oliva rounded-full flex items-center justify-center mb-3">
                                <span className="text-xl">✓</span>
                            </div>
                            <p className="text-sm font-medium text-tinta">Todo bajo control</p>
                            <p className="text-xs text-tintaSuave mt-1">Tu stock está en niveles saludables.</p>
                        </div>
                    )}
                    <div className="space-y-0 text-sm">
                        {alertas.map((a, i) => (
                            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                <span className="font-medium text-slate-700">{a.producto} · {a.talla} · {a.color}</span>
                                <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-md text-xs">
                                    quedan {a.cantidad_actual}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-papel rounded-2xl p-6 shadow-sm border border-arena">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h2 className="font-display font-semibold text-lg text-tinta">Top productos — este mes</h2>
                    </div>
                    {!cargando && topProductos.length === 0 && (
                        <p className="text-sm text-tintaSuave py-8 text-center">Aún no hay ventas registradas este mes.</p>
                    )}
                    <div className="space-y-0 text-sm">
                        {topProductos.map((p, i) => (
                            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-5 text-slate-400 font-mono text-xs">{i + 1}.</span>
                                    <span className="font-medium text-slate-700">{p.nombre}</span>
                                </div>
                                <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-md text-xs">
                                    {p.unidades_vendidas} uds
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Dashboard