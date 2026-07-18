import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

function Ventas() {
    const [ventas, setVentas] = useState([])
    const [clientes, setClientes] = useState([])
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros
    const [categoriaId, setCategoriaId] = useState('')
    const [corteFiltro, setCorteFiltro] = useState('')
    const [busqueda, setBusqueda] = useState('')

    // Carrito de ventas
    const [carrito, setCarrito] = useState([])

    // Info del Cliente y Venta
    const [clienteId, setClienteId] = useState('')
    const [metodoPago, setMetodoPago] = useState('efectivo')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    // Producto actualmente expandido en la lista
    const [productoAbiertoId, setProductoAbiertoId] = useState(null)

    async function cargarDatos() {
        setCargando(true)
        // 1. Cargar productos con variantes e imágenes y stock real
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

        // 2. Cargar clientes
        const { data: cli } = await supabase.from('clientes').select('*')
        setClientes(cli || [])

        // 3. Cargar categorías
        const { data: cats } = await supabase.from('categorias').select('*')
        setCategorias(cats || [])

        // 4. Cargar ventas recientes
        const { data: vts } = await supabase
            .from('ventas')
            .select('id, fecha, metodo_pago, clientes(nombre), venta_detalle(cantidad, precio_unitario)')
            .order('id', { ascending: false })
            .limit(10)
        setVentas(vts || [])

        setCargando(false)
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Agregar variantes al carrito
    function agregarAlCarrito(variante, producto) {
        const stockDisponible = (variante.stock?.[0] || variante.stock)?.cantidad_actual ?? 0
        if (stockDisponible <= 0) {
            alert(`No hay stock disponible para la variante ${variante.talla} - ${variante.color}`)
            return
        }

        setCarrito((prev) => {
            const index = prev.findIndex((item) => item.varianteId === variante.id)
            if (index !== -1) {
                // Si ya está, aumentamos la cantidad si no supera el stock
                const nuevaCantidad = prev[index].cantidad + 1
                if (nuevaCantidad > stockDisponible) {
                    alert(`Solo hay ${stockDisponible} unidades disponibles en stock.`)
                    return prev
                }
                const copia = [...prev]
                copia[index] = { ...copia[index], cantidad: nuevaCantidad }
                return copia
            } else {
                // Nuevo elemento
                return [
                    ...prev,
                    {
                        varianteId: variante.id,
                        talla: variante.talla,
                        color: variante.color,
                        nombre: producto.nombre,
                        precio_venta: producto.precio_venta,
                        stockDisponible: stockDisponible,
                        cantidad: 1,
                    },
                ]
            }
        })
    }

    // Actualizar cantidad en carrito manualmente
    function actualizarCantidadCarrito(varianteId, cant) {
        const cantidadNum = Math.max(1, parseInt(cant) || 1)
        setCarrito((prev) =>
            prev.map((item) => {
                if (item.varianteId === varianteId) {
                    if (cantidadNum > item.stockDisponible) {
                        alert(`Solo hay ${item.stockDisponible} unidades disponibles en stock.`)
                        return { ...item, cantidad: item.stockDisponible }
                    }
                    return { ...item, cantidad: cantidadNum }
                }
                return item
            })
        )
    }

    // Quitar del carrito
    function quitarDelCarrito(varianteId) {
        setCarrito((prev) => prev.filter((item) => item.varianteId !== varianteId))
    }

    // Calcular el total
    const totalVenta = useMemo(() => {
        return carrito.reduce((sum, item) => sum + item.cantidad * item.precio_venta, 0)
    }, [carrito])

    // Registrar la venta en Supabase
    async function registrarVenta(e) {
        e.preventDefault()
        if (carrito.length === 0) {
            alert('Agrega al menos un producto al carrito.')
            return
        }

        setGuardando(true)
        setMensaje(null)

        try {
            // 1. Verificar nuevamente el stock actual de todas las variantes antes de procesar
            for (const item of carrito) {
                const { data: stockRow } = await supabase
                    .from('stock')
                    .select('cantidad_actual')
                    .eq('variante_id', item.varianteId)
                    .single()

                const stockActual = stockRow?.cantidad_actual ?? 0
                if (stockActual < item.cantidad) {
                    throw new Error(`El stock del producto "${item.nombre} (${item.talla} - ${item.color})" cambió. Stock disponible: ${stockActual} uds.`)
                }
            }

            // 2. Insertar venta
            const { data: venta, error: errorVenta } = await supabase
                .from('ventas')
                .insert({ cliente_id: clienteId || null, metodo_pago: metodoPago })
                .select()
                .single()

            if (errorVenta) throw errorVenta

            // 3. Insertar venta_detalle y movimientos_stock
            for (const item of carrito) {
                const { error: errorDetalle } = await supabase.from('venta_detalle').insert({
                    venta_id: venta.id,
                    variante_id: item.varianteId,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_venta,
                })
                if (errorDetalle) throw errorDetalle

                // Registrar el movimiento de salida del stock
                const { error: errorMov } = await supabase.from('movimientos_stock').insert({
                    variante_id: item.varianteId,
                    tipo: 'salida',
                    cantidad: item.cantidad,
                    motivo: 'venta',
                    costo_unitario: 0, // Costo de venta
                })
                if (errorMov) throw errorMov
            }

            setMensaje('¡Venta registrada con éxito!')
            setCarrito([])
            setClienteId('')
            setMetodoPago('efectivo')
            await cargarDatos()
        } catch (err) {
            console.error(err)
            alert(err.message)
        } finally {
            setGuardando(false)
        }
    }

    // Listas únicas de filtros
    const cortesDisponibles = useMemo(() => {
        const cortes = new Set()
        productos.forEach((p) => {
            if (p.corte) cortes.add(p.corte)
        })
        return [...cortes]
    }, [productos])

    // Filtrar catálogo de productos
    const productosFiltrados = productos.filter((prod) => {
        const nombre = prod.nombre?.toLowerCase() || ''
        const coincideBusqueda = nombre.includes(busqueda.toLowerCase())
        const coincideCategoria = categoriaId === '' || String(prod.categoria_id) === String(categoriaId)
        const coincideCorte = corteFiltro === '' || prod.corte === corteFiltro
        return coincideBusqueda && coincideCategoria && coincideCorte
    })

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Ventas</h1>
                <p className="text-sm text-tintaSuave mt-1">
                    Selecciona los productos para armar el carrito de venta y descontar stock automáticamente.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Catálogo de productos (Columna Izquierda / Ancho 2/3) */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filtros rápidos */}
                    <div className="bg-papel border border-arena rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-medium text-tintaSuave mb-1">Buscar</label>
                            <input
                                type="text"
                                placeholder="Modelo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full p-2 rounded-lg bg-crema border border-arena text-sm focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-tintaSuave mb-1">Categoría</label>
                            <select
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                className="p-2 rounded-lg bg-crema border border-arena text-sm focus:outline-none"
                            >
                                <option value="">Todas</option>
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-tintaSuave mb-1">Corte</label>
                            <select
                                value={corteFiltro}
                                onChange={(e) => setCorteFiltro(e.target.value)}
                                className="p-2 rounded-lg bg-crema border border-arena text-sm focus:outline-none"
                            >
                                <option value="">Todos</option>
                                {cortesDisponibles.map((c) => (
                                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Listado */}
                    {cargando && <p className="text-tintaSuave text-sm">Cargando catálogo...</p>}
                    {!cargando && productosFiltrados.length === 0 && (
                        <p className="text-tintaSuave text-sm">No hay productos con esos filtros.</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {productosFiltrados.map((producto) => {
                            const fotos = (producto.producto_imagenes || []).sort((a, b) => a.orden - b.orden)
                            const fotoPortada = fotos[0]?.url
                            const abierto = productoAbiertoId === producto.id
                            const variantes = producto.variantes || []

                            return (
                                <div
                                    key={producto.id}
                                    className={`bg-papel border rounded-xl overflow-hidden shadow-sm transition-all ${
                                        abierto ? 'border-terracota/50 ring-1 ring-terracota/20 col-span-1 sm:col-span-2' : 'border-arena hover:shadow-md'
                                    }`}
                                >
                                    {/* Header tarjeta */}
                                    <button
                                        onClick={() => setProductoAbiertoId(abierto ? null : producto.id)}
                                        className="w-full text-left flex items-stretch"
                                    >
                                        <div className={`${abierto ? 'w-20 h-20' : 'w-full h-32'} bg-arena/40 flex items-center justify-center flex-shrink-0`}>
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
                                                    <p className="text-xs text-tintaSuave mt-0.5">S/ {Number(producto.precio_venta).toFixed(2)}</p>
                                                </div>
                                                <span className="text-xs text-tintaSuave border border-arena px-2.5 py-1 rounded">✕ Cerrar</span>
                                            </div>
                                        )}
                                    </button>

                                    {/* Contenido cerrado */}
                                    {!abierto && (
                                        <div className="p-3">
                                            <p className="font-display font-semibold text-tinta text-sm">{producto.nombre}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-tinta font-semibold">S/ {Number(producto.precio_venta).toFixed(2)}</span>
                                                <span className="text-xs text-tintaSuave font-medium">{variantes.length} variantes</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contenido desplegado: lista de variantes */}
                                    {abierto && (
                                        <div className="p-4 border-t border-arena bg-crema/10">
                                            <p className="text-xs font-semibold text-tintaSuave mb-2 uppercase tracking-wide">Selecciona variante para vender:</p>
                                            {variantes.length === 0 ? (
                                                <p className="text-xs text-tintaSuave">Sin variantes configuradas.</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {variantes.map((v) => {
                                                        const stock = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
                                                        const sinStock = stock <= 0
                                                        return (
                                                            <button
                                                                key={v.id}
                                                                disabled={sinStock}
                                                                onClick={() => agregarAlCarrito(v, producto)}
                                                                className={`p-2 rounded-lg border text-left flex justify-between items-center transition-all ${
                                                                    sinStock
                                                                        ? 'bg-arena/20 border-arena text-tintaSuave/40 cursor-not-allowed'
                                                                        : 'bg-papel border-arena hover:border-terracota'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <p className="text-xs font-semibold text-tinta">{v.talla}</p>
                                                                    <p className="text-[10px] text-tintaSuave">{v.color}</p>
                                                                </div>
                                                                <span className={`text-xs font-mono font-medium ${sinStock ? 'text-rose-400' : 'text-tintaSuave'}`}>
                                                                    {sinStock ? 'Agotado' : `${stock} uds`}
                                                                </span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Carrito y Confirmación de Venta (Columna Derecha / Ancho 1/3) */}
                <div className="space-y-4">
                    <div className="bg-papel border border-arena rounded-xl p-5 shadow-sm sticky top-4">
                        <h2 className="font-display font-semibold text-lg text-tinta mb-4 flex items-center justify-between">
                            <span>Carrito de venta</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-terracota/10 text-terracota font-mono">{carrito.length} items</span>
                        </h2>

                        {carrito.length === 0 ? (
                            <p className="text-tintaSuave text-sm text-center py-6 border border-dashed border-arena rounded-lg">
                                El carrito está vacío. Selecciona un producto para añadir variantes.
                            </p>
                        ) : (
                            <form onSubmit={registrarVenta} className="space-y-4">
                                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                    {carrito.map((item) => (
                                        <div key={item.varianteId} className="bg-crema p-2.5 rounded-lg border border-arena flex gap-2.5 items-start justify-between text-xs">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-tinta truncate">{item.nombre}</p>
                                                <p className="text-tintaSuave mt-0.5 text-[10px]">{item.talla} · {item.color}</p>
                                                <p className="font-semibold mt-1">S/ {Number(item.precio_venta).toFixed(2)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={item.cantidad}
                                                        onChange={(e) => actualizarCantidadCarrito(item.varianteId, e.target.value)}
                                                        className="w-12 p-1 border border-arena rounded bg-papel text-center font-semibold text-xs focus:outline-none"
                                                    />
                                                    <span className="text-[10px] text-tintaSuave">/ {item.stockDisponible}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => quitarDelCarrito(item.varianteId)}
                                                    className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-arena pt-3 space-y-3">
                                    {/* Cliente */}
                                    <div>
                                        <label className="block text-xs font-medium text-tinta mb-1">Cliente (opcional)</label>
                                        <select
                                            value={clienteId}
                                            onChange={(e) => setClienteId(e.target.value)}
                                            className="w-full p-2 rounded-lg bg-crema border border-arena text-xs focus:outline-none"
                                        >
                                            <option value="">-- Sin especificar --</option>
                                            {clientes.map((c) => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Método de pago */}
                                    <div>
                                        <label className="block text-xs font-medium text-tinta mb-1">Método de Pago</label>
                                        <select
                                            value={metodoPago}
                                            onChange={(e) => setMetodoPago(e.target.value)}
                                            className="w-full p-2 rounded-lg bg-crema border border-arena text-xs focus:outline-none"
                                        >
                                            <option value="efectivo">Efectivo</option>
                                            <option value="yape">Yape</option>
                                            <option value="plin">Plin</option>
                                            <option value="transferencia">Transferencia</option>
                                        </select>
                                    </div>

                                    {/* Resumen Total */}
                                    <div className="flex justify-between items-center font-display font-semibold text-base pt-2 text-tinta">
                                        <span>Total:</span>
                                        <span>S/ {totalVenta.toFixed(2)}</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={guardando}
                                        className="w-full bg-terracota text-white py-2.5 rounded-lg font-semibold hover:bg-terracota/90 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {guardando ? 'Procesando...' : 'Confirmar y Vender'}
                                    </button>
                                </div>
                            </form>
                        )}
                        {mensaje && <p className="text-xs text-center text-oliva font-medium mt-3 bg-oliva/10 p-2 rounded-lg">{mensaje}</p>}
                    </div>
                </div>
            </div>

            {/* Listado de Ventas Recientes */}
            <h2 className="font-display font-semibold text-lg text-tinta mt-8 mb-3">Ventas recientes</h2>
            <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Cliente</th>
                            <th className="p-3">Método</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.map((v) => {
                            const total = (v.venta_detalle || []).reduce(
                                (acc, d) => acc + d.cantidad * d.precio_unitario, 0
                            )
                            return (
                                <tr key={v.id} className="border-t border-arena">
                                    <td className="p-3 text-tintaSuave">{new Date(v.fecha).toLocaleDateString('es-PE')}</td>
                                    <td className="p-3 text-tinta">{v.clientes?.nombre || 'Sin especificar'}</td>
                                    <td className="p-3 text-tintaSuave capitalize">{v.metodo_pago}</td>
                                    <td className="p-3 text-right font-mono text-tinta">S/ {total.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Ventas