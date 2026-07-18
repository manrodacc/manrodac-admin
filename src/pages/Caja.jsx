import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

function Caja() {
    const [movimientos, setMovimientos] = useState([])
    const [ajustes, setAjustes] = useState([])
    const [cargando, setCargando] = useState(true)
    const [periodo, setPeriodo] = useState('mes') // 'mes' | 'anio' | 'todo'

    // Ajuste manual
    const [mostrarAjuste, setMostrarAjuste] = useState(false)
    const [ajusteConcepto, setAjusteConcepto] = useState('')
    const [ajusteMonto, setAjusteMonto] = useState('')
    const [ajusteTipo, setAjusteTipo] = useState('entrada')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    async function cargarDatos() {
        setCargando(true)

        // Ventas con detalle
        const { data: ventas } = await supabase
            .from('ventas')
            .select(`
                id,
                fecha,
                metodo_pago,
                clientes(nombre),
                venta_detalle(
                    cantidad,
                    precio_unitario,
                    variante_id
                )
            `)
            .order('fecha', { ascending: false })

        // Para cada variante vendida, buscar el último costo_unitario registrado en movimientos_stock
        const ventasConCosto = await Promise.all(
            (ventas || []).map(async (venta) => {
                const detalleConCosto = await Promise.all(
                    (venta.venta_detalle || []).map(async (det) => {
                        const { data: movStock } = await supabase
                            .from('movimientos_stock')
                            .select('costo_unitario, costo_polo_unit, costo_dtf_unit')
                            .eq('variante_id', det.variante_id)
                            .eq('tipo', 'entrada')
                            .not('costo_unitario', 'is', null)
                            .order('id', { ascending: false })
                            .limit(1)
                            .maybeSingle()

                        return {
                            ...det,
                            costo_unitario: movStock?.costo_unitario ?? 0,
                        }
                    })
                )
                return { ...venta, venta_detalle: detalleConCosto }
            })
        )

        // Gastos de materia prima (reposiciones con costo)
        const { data: mpMovs } = await supabase
            .from('materia_prima_movimientos')
            .select('id, fecha, cantidad, costo_unitario, materia_prima_id, materia_prima(nombre, tipo)')
            .eq('tipo', 'entrada')
            .not('costo_unitario', 'is', null)
            .gt('costo_unitario', 0)
            .order('fecha', { ascending: false })

        // Ajustes manuales
        const { data: ajustesData } = await supabase
            .from('ajustes_caja')
            .select('*')
            .order('fecha', { ascending: false })

        setMovimientos({ ventas: ventasConCosto, gastosMp: mpMovs || [] })
        setAjustes(ajustesData || [])
        setCargando(false)
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Filtrado por periodo
    function estaEnPeriodo(fechaStr) {
        const fecha = new Date(fechaStr)
        const hoy = new Date()
        if (periodo === 'mes') {
            return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
        }
        if (periodo === 'anio') {
            return fecha.getFullYear() === hoy.getFullYear()
        }
        return true
    }

    const ventasFiltradas = useMemo(() => {
        return (movimientos.ventas || []).filter((v) => estaEnPeriodo(v.fecha))
    }, [movimientos, periodo])

    const gastosMpFiltrados = useMemo(() => {
        return (movimientos.gastosMp || []).filter((g) => estaEnPeriodo(g.fecha))
    }, [movimientos, periodo])

    const ajustesFiltrados = useMemo(() => {
        return ajustes.filter((a) => estaEnPeriodo(a.fecha))
    }, [ajustes, periodo])

    // Cálculos de resumen
    const totalIngresos = useMemo(() => {
        return ventasFiltradas.reduce((sum, v) => {
            return sum + (v.venta_detalle || []).reduce((s, d) => s + d.cantidad * d.precio_unitario, 0)
        }, 0)
    }, [ventasFiltradas])

    const totalCostoProduccion = useMemo(() => {
        return ventasFiltradas.reduce((sum, v) => {
            return sum + (v.venta_detalle || []).reduce((s, d) => s + d.cantidad * d.costo_unitario, 0)
        }, 0)
    }, [ventasFiltradas])

    const totalGananciaNeta = totalIngresos - totalCostoProduccion

    const totalGastoMp = useMemo(() => {
        return gastosMpFiltrados.reduce((sum, g) => sum + g.cantidad * g.costo_unitario, 0)
    }, [gastosMpFiltrados])

    const totalAjustes = useMemo(() => {
        return ajustesFiltrados.reduce((sum, a) => {
            return sum + (a.tipo === 'entrada' ? a.monto : -a.monto)
        }, 0)
    }, [ajustesFiltrados])

    const saldoCaja = totalIngresos - totalGastoMp + totalAjustes

    async function guardarAjuste(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        const { error } = await supabase.from('ajustes_caja').insert({
            concepto: ajusteConcepto,
            monto: Number(ajusteMonto),
            tipo: ajusteTipo,
            categoria: 'ajuste',
        })

        if (error) {
            setMensaje('Error: ' + error.message)
        } else {
            setMensaje('Ajuste registrado.')
            setAjusteConcepto('')
            setAjusteMonto('')
            setMostrarAjuste(false)
            await cargarDatos()
        }
        setGuardando(false)
    }

    const labelPeriodo = { mes: 'este mes', anio: 'este año', todo: 'todo el tiempo' }

    return (
        <div>
            <header className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="font-display font-semibold text-3xl text-tinta">Caja</h1>
                    <p className="text-sm text-tintaSuave mt-1">
                        Flujo de dinero real del negocio — ingresos, costos y ganancias.
                    </p>
                </div>
                <button
                    onClick={() => setMostrarAjuste(!mostrarAjuste)}
                    className="bg-terracota text-white px-4 py-2.5 rounded-lg font-medium hover:bg-terracota/90 transition-colors text-sm"
                >
                    {mostrarAjuste ? 'Cancelar' : '+ Ajuste manual'}
                </button>
            </header>

            {/* Ajuste manual */}
            {mostrarAjuste && (
                <form onSubmit={guardarAjuste} className="mb-6 bg-papel border border-arena rounded-xl p-5 shadow-sm max-w-xl flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-sm font-medium text-tinta mb-1">Concepto</label>
                        <input
                            type="text"
                            value={ajusteConcepto}
                            onChange={(e) => setAjusteConcepto(e.target.value)}
                            required
                            placeholder="Ej. Saldo inicial, retiro"
                            className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-tinta mb-1">Monto (S/)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={ajusteMonto}
                            onChange={(e) => setAjusteMonto(e.target.value)}
                            required
                            className="w-28 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-tinta mb-1">Tipo</label>
                        <select
                            value={ajusteTipo}
                            onChange={(e) => setAjusteTipo(e.target.value)}
                            className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                        >
                            <option value="entrada">Entrada (+)</option>
                            <option value="salida">Salida (−)</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={guardando}
                        className="bg-terracota text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors"
                    >
                        {guardando ? 'Guardando...' : 'Registrar'}
                    </button>
                    {mensaje && <p className="w-full text-sm text-tinta">{mensaje}</p>}
                </form>
            )}

            {/* Filtro de periodo */}
            <div className="flex gap-1 bg-papel border border-arena rounded-lg p-1 w-fit mb-6">
                {[
                    { key: 'mes', label: 'Este mes' },
                    { key: 'anio', label: 'Este año' },
                    { key: 'todo', label: 'Todo' },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setPeriodo(f.key)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === f.key ? 'bg-terracota text-white' : 'text-tintaSuave hover:bg-arena/50'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Saldo en caja */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Saldo en caja
                        </p>
                        <div className={`p-2 rounded-lg ${saldoCaja >= 0 ? 'bg-oliva/10 text-oliva' : 'bg-red-500/10 text-red-500'}`}>
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className={`font-display font-bold text-3xl tracking-tight ${saldoCaja >= 0 ? 'text-tinta' : 'text-red-500'}`}>
                            {cargando ? '...' : `S/ ${saldoCaja.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">{labelPeriodo[periodo]}</p>
                    </div>
                </div>

                {/* Ingresos por ventas */}
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
                            {cargando ? '...' : `S/ ${totalIngresos.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">por ventas</p>
                    </div>
                </div>

                {/* Gastos en materia prima */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Gastado en MP
                        </p>
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="font-display font-bold text-3xl text-tinta tracking-tight">
                            {cargando ? '...' : `S/ ${totalGastoMp.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">reposición de insumos</p>
                    </div>
                </div>

                {/* Ganancia neta */}
                <div className="bg-papel rounded-2xl p-6 shadow-sm border border-arena flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-oliva/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tintaSuave">
                            Ganancia neta
                        </p>
                        <div className={`p-2 rounded-lg ${totalGananciaNeta >= 0 ? 'bg-oliva/10 text-oliva' : 'bg-red-500/10 text-red-500'}`}>
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className={`font-display font-bold text-3xl tracking-tight ${totalGananciaNeta >= 0 ? 'text-oliva' : 'text-red-500'}`}>
                            {cargando ? '...' : `S/ ${totalGananciaNeta.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-medium text-tintaSuave mt-1.5">ventas − costo de producción</p>
                    </div>
                </div>
            </div>

            {/* Desglose de ventas */}
            <h2 className="font-display font-semibold text-xl text-tinta mb-3">Ventas — desglose</h2>
            <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm mb-8">
                <table className="w-full text-sm">
                    <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Cliente</th>
                            <th className="p-3">Método</th>
                            <th className="p-3 text-right">Cobrado</th>
                            <th className="p-3 text-right">Costo producción</th>
                            <th className="p-3 text-right">Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-tintaSuave">Cargando...</td>
                            </tr>
                        )}
                        {!cargando && ventasFiltradas.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-tintaSuave">
                                    No hay ventas en {labelPeriodo[periodo]}.
                                </td>
                            </tr>
                        )}
                        {ventasFiltradas.map((v) => {
                            const cobrado = (v.venta_detalle || []).reduce((s, d) => s + d.cantidad * d.precio_unitario, 0)
                            const costoProd = (v.venta_detalle || []).reduce((s, d) => s + d.cantidad * d.costo_unitario, 0)
                            const ganancia = cobrado - costoProd
                            return (
                                <tr key={v.id} className="border-t border-arena hover:bg-arena/10 transition-colors">
                                    <td className="p-3 text-tintaSuave">
                                        {new Date(v.fecha).toLocaleDateString('es-PE')}
                                    </td>
                                    <td className="p-3 text-tinta">{v.clientes?.nombre || 'Sin especificar'}</td>
                                    <td className="p-3 text-tintaSuave capitalize">{v.metodo_pago}</td>
                                    <td className="p-3 text-right font-mono text-tinta font-medium">
                                        S/ {cobrado.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right font-mono text-tintaSuave">
                                        {costoProd > 0 ? `S/ ${costoProd.toFixed(2)}` : (
                                            <span className="text-xs italic">Sin costo reg.</span>
                                        )}
                                    </td>
                                    <td className={`p-3 text-right font-mono font-semibold ${ganancia >= 0 ? 'text-oliva' : 'text-red-500'}`}>
                                        S/ {ganancia.toFixed(2)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Gastos en materia prima */}
            <h2 className="font-display font-semibold text-xl text-tinta mb-3">Gastos en materia prima</h2>
            <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm mb-8">
                <table className="w-full text-sm">
                    <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Insumo</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Cantidad</th>
                            <th className="p-3 text-right">Costo unit.</th>
                            <th className="p-3 text-right">Total gastado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!cargando && gastosMpFiltrados.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-tintaSuave">
                                    No hay gastos de materia prima en {labelPeriodo[periodo]}.
                                </td>
                            </tr>
                        )}
                        {gastosMpFiltrados.map((g) => (
                            <tr key={g.id} className="border-t border-arena hover:bg-arena/10 transition-colors">
                                <td className="p-3 text-tintaSuave">
                                    {new Date(g.fecha).toLocaleDateString('es-PE')}
                                </td>
                                <td className="p-3 text-tinta">{g.materia_prima?.nombre}</td>
                                <td className="p-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.materia_prima?.tipo === 'dtf' ? 'bg-arena/60 text-tintaSuave' : 'bg-terracota/10 text-terracota'}`}>
                                        {g.materia_prima?.tipo?.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-mono text-tintaSuave">{g.cantidad}</td>
                                <td className="p-3 text-right font-mono text-tintaSuave">S/ {Number(g.costo_unitario).toFixed(2)}</td>
                                <td className="p-3 text-right font-mono text-terracota font-semibold">
                                    − S/ {(g.cantidad * g.costo_unitario).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Ajustes manuales */}
            {ajustesFiltrados.length > 0 && (
                <>
                    <h2 className="font-display font-semibold text-xl text-tinta mb-3">Ajustes manuales</h2>
                    <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Concepto</th>
                                    <th className="p-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ajustesFiltrados.map((a) => (
                                    <tr key={a.id} className="border-t border-arena">
                                        <td className="p-3 text-tintaSuave">{new Date(a.fecha).toLocaleDateString('es-PE')}</td>
                                        <td className="p-3 text-tinta">{a.concepto}</td>
                                        <td className={`p-3 text-right font-mono font-semibold ${a.tipo === 'entrada' ? 'text-oliva' : 'text-terracota'}`}>
                                            {a.tipo === 'entrada' ? '+' : '−'} S/ {Number(a.monto).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

export default Caja
