import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

function ReponerStock() {
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [materiaPrimaPolos, setMateriaPrimaPolos] = useState([])
    const [materiaPrimaDtf, setMateriaPrimaDtf] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros
    const [categoriaId, setCategoriaId] = useState('')
    const [corteFiltro, setCorteFiltro] = useState('')
    const [colorFiltro, setColorFiltro] = useState('')
    const [tallaFiltro, setTallaFiltro] = useState('')
    const [busqueda, setBusqueda] = useState('')

    // Producto expandido/seleccionado para ver variantes
    const [productoAbiertoId, setProductoAbiertoId] = useState(null)

    // Selección específica de variante para reponer
    const [seleccion, setSeleccion] = useState(null)
    const [poloMpId, setPoloMpId] = useState('')
    const [dtfMpId, setDtfMpId] = useState('')
    const [costoPoloUnit, setCostoPoloUnit] = useState('')
    const [costoDtfUnit, setCostoDtfUnit] = useState('')
    const [cantidad, setCantidad] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    async function cargarDatos() {
        setCargando(true)

        const { data: prods } = await supabase
            .from('productos')
            .select(`
                id,
                nombre,
                precio_venta,
                corte,
                categoria_id,
                producto_imagenes ( url, orden ),
                variantes (
                    id,
                    talla,
                    color,
                    stock ( cantidad_actual, minimo_alerta )
                )
            `)
            .order('nombre', { ascending: true })

        setProductos(prods || [])

        const { data: cats } = await supabase.from('categorias').select('*')
        setCategorias(cats || [])

        // Cargar polos y DTF por separado
        const { data: mpPolos } = await supabase
            .from('materia_prima')
            .select('id, nombre, color, corte, talla, materia_prima_stock(cantidad_actual)')
            .eq('tipo', 'polo')

        const { data: mpDtf } = await supabase
            .from('materia_prima')
            .select('id, nombre, materia_prima_stock(cantidad_actual)')
            .eq('tipo', 'dtf')

        setMateriaPrimaPolos(mpPolos || [])
        setMateriaPrimaDtf(mpDtf || [])

        // Cargar el último costo conocido de cada insumo
        setCargando(false)
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Opciones de filtro sacadas de todos los productos y variantes cargados
    const cortesDisponibles = useMemo(() => {
        const cortes = new Set()
        productos.forEach((p) => {
            if (p.corte) cortes.add(p.corte)
        })
        return [...cortes]
    }, [productos])

    const coloresDisponibles = useMemo(() => {
        const colores = new Set()
        productos.forEach((p) => {
            ;(p.variantes || []).forEach((v) => {
                if (v.color) colores.add(v.color)
            })
        })
        return [...colores]
    }, [productos])

    const tallasDisponibles = useMemo(() => {
        const tallas = new Set()
        productos.forEach((p) => {
            ;(p.variantes || []).forEach((v) => {
                if (v.talla) tallas.add(v.talla)
            })
        })
        return [...tallas]
    }, [productos])

    // Filtrado de productos
    const productosFiltrados = productos.filter((prod) => {
        const nombre = prod.nombre?.toLowerCase() || ''
        const coincideCategoria = categoriaId === '' || String(prod.categoria_id) === String(categoriaId)
        const coincideCorte = corteFiltro === '' || prod.corte === corteFiltro
        const coincideBusqueda = nombre.includes(busqueda.toLowerCase())

        // Filtro de variantes internas
        const coincideColor = colorFiltro === '' || (prod.variantes || []).some((v) => v.color === colorFiltro)
        const coincideTalla = tallaFiltro === '' || (prod.variantes || []).some((v) => v.talla === tallaFiltro)

        return coincideCategoria && coincideCorte && coincideBusqueda && coincideColor && coincideTalla
    })

    function limpiarFiltros() {
        setCategoriaId('')
        setCorteFiltro('')
        setColorFiltro('')
        setTallaFiltro('')
        setBusqueda('')
    }

    // Al elegir una variante para reponer stock
    async function elegirVariante(v, producto) {
        const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
        const min = (v.stock?.[0] || v.stock)?.minimo_alerta ?? 1
        setSeleccion({
            varianteId: v.id,
            talla: v.talla,
            color: v.color,
            cantidad_actual: cant,
            minimo_alerta: min,
            producto: producto
        })
        setCantidad('')
        setMensaje(null)

        // Sugerir polo por color + corte + talla
        const poloSugerido = materiaPrimaPolos.find(
            (m) => m.color === v.color && m.corte === producto.corte && m.talla === v.talla
        )
        const poloId = poloSugerido ? String(poloSugerido.id) : ''
        setPoloMpId(poloId)

        // Limpiar DTF
        setDtfMpId('')
        setCostoPoloUnit('')
        setCostoDtfUnit('')

        // Cargar último costo del polo sugerido
        if (poloId) {
            const { data: ultMov } = await supabase
                .from('materia_prima_movimientos')
                .select('costo_unitario')
                .eq('materia_prima_id', poloId)
                .eq('tipo', 'entrada')
                .not('costo_unitario', 'is', null)
                .order('id', { ascending: false })
                .limit(1)
                .maybeSingle()
            if (ultMov?.costo_unitario) setCostoPoloUnit(String(ultMov.costo_unitario))
        }
    }

    // Al cambiar el polo seleccionado, cargar su último costo
    async function handleCambioPoloMp(id) {
        setPoloMpId(id)
        if (!id) { setCostoPoloUnit(''); return }
        const { data: ultMov } = await supabase
            .from('materia_prima_movimientos')
            .select('costo_unitario')
            .eq('materia_prima_id', id)
            .eq('tipo', 'entrada')
            .not('costo_unitario', 'is', null)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()
        setCostoPoloUnit(ultMov?.costo_unitario ? String(ultMov.costo_unitario) : '')
    }

    // Al cambiar el DTF seleccionado, cargar su último costo
    async function handleCambioDtfMp(id) {
        setDtfMpId(id)
        if (!id) { setCostoDtfUnit(''); return }
        const { data: ultMov } = await supabase
            .from('materia_prima_movimientos')
            .select('costo_unitario')
            .eq('materia_prima_id', id)
            .eq('tipo', 'entrada')
            .not('costo_unitario', 'is', null)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()
        setCostoDtfUnit(ultMov?.costo_unitario ? String(ultMov.costo_unitario) : '')
    }

    // Costo total por unidad = polo + DTF
    const costoUnitarioTotal = (Number(costoPoloUnit) || 0) + (Number(costoDtfUnit) || 0)

    async function handleSubmit(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        try {
            const { data: stockRow } = await supabase
                .from('stock')
                .select('*')
                .eq('variante_id', seleccion.varianteId)
                .maybeSingle()

            if (!stockRow) {
                await supabase
                    .from('stock')
                    .insert({
                        variante_id: seleccion.varianteId,
                        cantidad_actual: 0,
                        minimo_alerta: 1
                    })
            }

            const { error: errorStock } = await supabase.from('movimientos_stock').insert({
                variante_id: seleccion.varianteId,
                tipo: 'entrada',
                cantidad: Number(cantidad),
                motivo: 'reposicion',
                costo_unitario: costoUnitarioTotal > 0 ? costoUnitarioTotal : null,
                polo_mp_id: poloMpId ? Number(poloMpId) : null,
                dtf_mp_id: dtfMpId ? Number(dtfMpId) : null,
                costo_polo_unit: costoPoloUnit ? Number(costoPoloUnit) : null,
                costo_dtf_unit: costoDtfUnit ? Number(costoDtfUnit) : null,
            })
            if (errorStock) throw errorStock

            // Descontar polo de materia prima
            if (poloMpId) {
                const { error: errorPolo } = await supabase.from('materia_prima_movimientos').insert({
                    materia_prima_id: Number(poloMpId),
                    tipo: 'salida',
                    cantidad: Number(cantidad),
                    motivo: 'uso',
                })
                if (errorPolo) throw errorPolo
            }

            // Descontar DTF de materia prima
            if (dtfMpId) {
                const { error: errorDtf } = await supabase.from('materia_prima_movimientos').insert({
                    materia_prima_id: Number(dtfMpId),
                    tipo: 'salida',
                    cantidad: Number(cantidad),
                    motivo: 'uso',
                })
                if (errorDtf) throw errorDtf
            }

            setMensaje('¡Stock repuesto correctamente!')
            setSeleccion(null)
            setCantidad('')
            setPoloMpId('')
            setDtfMpId('')
            setCostoPoloUnit('')
            setCostoDtfUnit('')
            await cargarDatos()
        } catch (err) {
            console.error(err)
            setMensaje('Error: ' + err.message)
        } finally {
            setGuardando(false)
        }
    }

    const hayFiltrosActivos = categoriaId || corteFiltro || colorFiltro || tallaFiltro || busqueda

    // Ordenar las tallas
    const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']
    function sortVariantes(variantes = []) {
        return [...variantes].sort((a, b) => {
            const idxA = ordenTallas.indexOf(a.talla)
            const idxB = ordenTallas.indexOf(b.talla)
            if (idxA !== -1 && idxB !== -1) return idxA - idxB
            if (idxA !== -1) return -1
            if (idxB !== -1) return 1
            const numA = parseFloat(a.talla)
            const numB = parseFloat(b.talla)
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB
            return (a.talla || '').localeCompare(b.talla || '')
        })
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Reponer stock</h1>
                <p className="text-sm text-tintaSuave mt-1">Elige un producto y selecciona la variante para reponer stock.</p>
            </header>

            {/* Panel de reposición */}
            {seleccion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-papel rounded-xl p-6 shadow-xl w-full max-w-2xl border border-arena m-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-tintaSuave">Reponiendo</p>
                            <p className="font-display font-semibold text-lg text-tinta">
                                {seleccion.producto?.nombre} · {seleccion.talla} · {seleccion.color}
                            </p>
                            <p className="text-xs text-tintaSuave mt-0.5">
                                Stock actual: {seleccion.cantidad_actual} uds
                            </p>
                        </div>
                        <button onClick={() => setSeleccion(null)} className="text-tintaSuave hover:text-tinta text-sm">
                            ✕ Cerrar
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Cantidad a reponer</label>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                required
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        {/* Polo */}
                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">
                                Polo utilizado
                                {poloMpId && <span className="text-oliva font-normal"> — sugerido</span>}
                            </label>
                            <select
                                value={poloMpId}
                                onChange={(e) => handleCambioPoloMp(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            >
                                <option value="">-- Ninguno --</option>
                                {materiaPrimaPolos.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} {m.talla ? `(Talla: ${m.talla})` : ''} - Stock: {m.materia_prima_stock?.cantidad_actual ?? 0}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Costo polo (S/ por unidad)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={costoPoloUnit}
                                onChange={(e) => setCostoPoloUnit(e.target.value)}
                                placeholder="Ej. 16.50"
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        {/* DTF */}
                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">DTF aplicado</label>
                            <select
                                value={dtfMpId}
                                onChange={(e) => handleCambioDtfMp(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            >
                                <option value="">-- Ninguno --</option>
                                {materiaPrimaDtf.map((m) => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Costo DTF (S/ por unidad)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={costoDtfUnit}
                                onChange={(e) => setCostoDtfUnit(e.target.value)}
                                placeholder="Ej. 6.50"
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        {/* Resumen de costo */}
                        {costoUnitarioTotal > 0 && (
                            <div className="sm:col-span-2 bg-arena/20 rounded-lg p-3 flex items-center justify-between">
                                <div className="text-sm text-tintaSuave space-y-0.5">
                                    {costoPoloUnit && <p>Polo: <span className="text-tinta font-medium">S/ {Number(costoPoloUnit).toFixed(2)}</span></p>}
                                    {costoDtfUnit && <p>DTF: <span className="text-tinta font-medium">S/ {Number(costoDtfUnit).toFixed(2)}</span></p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-tintaSuave">Costo total por polo</p>
                                    <p className="font-display font-bold text-xl text-tinta">S/ {costoUnitarioTotal.toFixed(2)}</p>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={guardando}
                            className="sm:col-span-2 bg-terracota text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors"
                        >
                            {guardando ? 'Guardando...' : 'Confirmar reposición'}
                        </button>

                        {mensaje && <p className="text-sm text-tinta sm:col-span-2">{mensaje}</p>}
                    </form>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-papel border border-arena rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Buscar</label>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Nombre del producto..."
                        className="w-full p-2 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Categoría</label>
                    <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="p-2 rounded-lg bg-crema border border-arena">
                        <option value="">Todas</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Corte</label>
                    <select value={corteFiltro} onChange={(e) => setCorteFiltro(e.target.value)} className="p-2 rounded-lg bg-crema border border-arena">
                        <option value="">Todos</option>
                        {cortesDisponibles.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Color</label>
                    <select value={colorFiltro} onChange={(e) => setColorFiltro(e.target.value)} className="p-2 rounded-lg bg-crema border border-arena">
                        <option value="">Todos</option>
                        {coloresDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Talla</label>
                    <select value={tallaFiltro} onChange={(e) => setTallaFiltro(e.target.value)} className="p-2 rounded-lg bg-crema border border-arena">
                        <option value="">Todas</option>
                        {tallasDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                {hayFiltrosActivos && (
                    <button onClick={limpiarFiltros} className="text-sm text-terracota font-medium hover:underline mb-2">
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Lista de inventario agrupado */}
            {cargando && <p className="text-tintaSuave">Cargando...</p>}
            {!cargando && productosFiltrados.length === 0 && (
                <p className="text-tintaSuave">No hay productos que coincidan con estos filtros.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosFiltrados.map((producto) => {
                    const fotos = (producto.producto_imagenes || []).sort((a, b) => a.orden - b.orden)
                    const fotoPortada = fotos[0]?.url
                    const abierto = productoAbiertoId === producto.id

                    // Filtrar variantes internas si hay filtro de color/talla activo
                    const variantesMostradas = (producto.variantes || []).filter((v) => {
                        const coincideColor = colorFiltro === '' || v.color === colorFiltro
                        const coincideTalla = tallaFiltro === '' || v.talla === tallaFiltro
                        return coincideColor && coincideTalla
                    })
                    const variantesOrdenadas = sortVariantes(variantesMostradas)
                    const coloresUnicos = [...new Set(variantesOrdenadas.map((v) => v.color))]

                    // Sumar stock de variantes mostradas
                    const stockTotal = variantesMostradas.reduce((acc, v) => {
                        const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
                        return acc + cant
                    }, 0)
                    const tieneAlerta = variantesMostradas.some((v) => {
                        const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
                        const min = (v.stock?.[0] || v.stock)?.minimo_alerta ?? 1
                        return cant <= min
                    })

                    return (
                        <div
                            key={producto.id}
                            className={`bg-papel border rounded-xl overflow-hidden shadow-sm transition-all ${
                                abierto ? 'border-terracota/50 ring-1 ring-terracota/20 col-span-1 sm:col-span-2 lg:col-span-3' : 'border-arena hover:shadow-md'
                            }`}
                        >
                            {/* Card Header (clic para abrir/cerrar) */}
                            <button
                                onClick={() => setProductoAbiertoId(abierto ? null : producto.id)}
                                className="w-full text-left flex items-stretch"
                            >
                                <div className={`${abierto ? 'w-24 h-24' : 'w-full h-36'} bg-arena/40 flex items-center justify-center flex-shrink-0`}>
                                    {fotoPortada ? (
                                        <img src={fotoPortada} alt={producto.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-tintaSuave text-xs">Sin foto</span>
                                    )}
                                </div>

                                {abierto && (
                                    <div className="p-3 flex-1 flex items-center justify-between">
                                        <div>
                                            <p className="font-display font-semibold text-tinta text-base">{producto.nombre}</p>
                                            <p className="text-xs text-tintaSuave mt-0.5">
                                                {producto.corte && `${producto.corte.replace('_', ' ')} · `}
                                                {variantesMostradas.length} variantes
                                            </p>
                                        </div>
                                        <span className="text-tintaSuave text-xs border border-arena px-2 py-1 rounded">✕ Cerrar</span>
                                    </div>
                                )}
                            </button>

                            {/* Card Content en vista cerrada */}
                            {!abierto && (
                                <div className="p-3">
                                    <p className="font-display font-semibold text-tinta text-sm">{producto.nombre}</p>
                                    <p className="text-xs text-tintaSuave mt-0.5">
                                        {producto.corte && `${producto.corte.replace('_', ' ')} · `}
                                        {(producto.variantes || []).length} variantes
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-tinta font-medium">S/ {Number(producto.precio_venta).toFixed(2)}</span>
                                        <span className={`text-xs font-mono ${tieneAlerta ? 'text-terracota font-semibold' : 'text-tintaSuave'}`}>
                                            {stockTotal} uds
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Panel expandido: listado de variantes para reponer */}
                            {abierto && (
                                <div className="border-t border-arena px-4 pb-4 bg-crema/10">
                                    <p className="text-xs font-semibold text-tintaSuave mt-3 mb-1 uppercase tracking-wider">
                                        Selecciona una variante para reponer stock:
                                    </p>
                                    <div className="space-y-4">
                                        {coloresUnicos.map((color) => {
                                            const varsColor = variantesOrdenadas.filter((v) => v.color === color)
                                            return (
                                                <div key={color} className="space-y-2">
                                                    <p className="text-xs font-bold text-tintaSuave">{color}</p>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {varsColor.map((v) => {
                                                            const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
                                                            const min = (v.stock?.[0] || v.stock)?.minimo_alerta ?? 1
                                                            const bajo = cant <= min
                                                            const esSeleccionado = seleccion?.varianteId === v.id
                                                            return (
                                                                <button
                                                                    key={v.id}
                                                                    onClick={() => elegirVariante(v, producto)}
                                                                    className={`px-3 py-2 rounded-lg border text-left min-w-[100px] transition-all flex flex-col justify-between ${
                                                                        esSeleccionado
                                                                            ? 'border-terracota ring-2 ring-terracota/30 bg-papel'
                                                                            : bajo
                                                                            ? 'border-terracota/30 bg-terracota/5 hover:border-terracota/50'
                                                                            : 'border-arena bg-papel hover:border-tintaSuave'
                                                                    }`}
                                                                >
                                                                    <span className="text-xs font-semibold text-tinta">{v.talla}</span>
                                                                    <span className={`text-xs font-mono mt-1 ${bajo ? 'text-terracota font-bold' : 'text-tintaSuave'}`}>
                                                                        Stock: {cant}
                                                                    </span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ReponerStock