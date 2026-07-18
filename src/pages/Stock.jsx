import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

function Stock() {
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [categoriaId, setCategoriaId] = useState('')
    const [colorFiltro, setColorFiltro] = useState('')
    const [corteFiltro, setCorteFiltro] = useState('')
    const [productoAbierto, setProductoAbierto] = useState(null) // ID del producto expandido

    async function cargar() {
        setLoading(true)
        const { data } = await supabase
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

        setProductos(data || [])

        const { data: cats } = await supabase.from('categorias').select('*')
        setCategorias(cats || [])

        setLoading(false)
    }

    useEffect(() => {
        cargar()
    }, [])

    // Listas únicas para los filtros
    const coloresDisponibles = useMemo(() => {
        const colores = new Set()
        productos.forEach((p) => {
            ;(p.variantes || []).forEach((v) => {
                if (v.color) colores.add(v.color)
            })
        })
        return [...colores]
    }, [productos])

    const cortesDisponibles = useMemo(() => {
        const cortes = new Set()
        productos.forEach((p) => {
            if (p.corte) cortes.add(p.corte)
        })
        return [...cortes]
    }, [productos])

    // Filtrar a nivel de producto
    const productosFiltrados = productos.filter((prod) => {
        const nombre = prod.nombre?.toLowerCase() || ''
        const corte = prod.corte || ''

        const coincideBusqueda = nombre.includes(busqueda.toLowerCase())
        const coincideCategoria = categoriaId === '' || String(prod.categoria_id) === String(categoriaId)
        const coincideCorte = corteFiltro === '' || corte === corteFiltro
        // Para color, verificamos si ALGUNA variante tiene ese color
        const coincideColor = colorFiltro === '' || (prod.variantes || []).some((v) => v.color === colorFiltro)

        return coincideBusqueda && coincideCategoria && coincideCorte && coincideColor
    })

    function limpiarFiltros() {
        setBusqueda('')
        setCategoriaId('')
        setColorFiltro('')
        setCorteFiltro('')
    }

    const hayFiltrosActivos = busqueda || categoriaId || colorFiltro || corteFiltro

    // Calcular stock total y si alguna variante está baja
    function resumenProducto(variantes = []) {
        let total = 0
        let tieneAlerta = false
        for (const v of variantes) {
            const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
            const min = (v.stock?.[0] || v.stock)?.minimo_alerta ?? 1
            total += cant
            if (cant <= min) tieneAlerta = true
        }
        return { total, tieneAlerta }
    }

    // Ordenar las tallas de forma lógica (XS, S, M, L, XL, XXL, luego numéricas)
    const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']
    function sortVariantes(variantes = []) {
        return [...variantes].sort((a, b) => {
            const idxA = ordenTallas.indexOf(a.talla)
            const idxB = ordenTallas.indexOf(b.talla)
            if (idxA !== -1 && idxB !== -1) return idxA - idxB
            if (idxA !== -1) return -1
            if (idxB !== -1) return 1
            // numéricas
            const numA = parseFloat(a.talla)
            const numB = parseFloat(b.talla)
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB
            return (a.talla || '').localeCompare(b.talla || '')
        })
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Stock</h1>
                <p className="text-sm text-tintaSuave mt-1">Tu inventario de producto terminado.</p>
            </header>

            {/* Barra de filtros */}
            <div className="bg-papel border border-arena rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Buscar modelo</label>
                    <input
                        type="text"
                        placeholder="Ej. Dragón..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full p-2 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Categoría</label>
                    <select
                        value={categoriaId}
                        onChange={(e) => setCategoriaId(e.target.value)}
                        className="p-2 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    >
                        <option value="">Todas</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Color</label>
                    <select
                        value={colorFiltro}
                        onChange={(e) => setColorFiltro(e.target.value)}
                        className="p-2 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    >
                        <option value="">Todos</option>
                        {coloresDisponibles.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-tintaSuave mb-1">Corte</label>
                    <select
                        value={corteFiltro}
                        onChange={(e) => setCorteFiltro(e.target.value)}
                        className="p-2 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    >
                        <option value="">Todos</option>
                        {cortesDisponibles.map((c) => (
                            <option key={c} value={c}>{c.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                {hayFiltrosActivos && (
                    <button
                        onClick={limpiarFiltros}
                        className="text-sm text-terracota font-medium hover:underline mb-2"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {loading && <p className="text-tintaSuave">Cargando...</p>}
            {!loading && productosFiltrados.length === 0 && (
                <p className="text-tintaSuave">No hay productos que coincidan con estos filtros.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosFiltrados.map((producto) => {
                    const fotos = (producto.producto_imagenes || []).sort((a, b) => a.orden - b.orden)
                    const fotoPortada = fotos[0]?.url
                    const { total, tieneAlerta } = resumenProducto(producto.variantes)
                    const abierto = productoAbierto === producto.id

                    const variantesMostradas = colorFiltro
                        ? (producto.variantes || []).filter((v) => v.color === colorFiltro)
                        : producto.variantes || []
                    const variantesOrdenadas = sortVariantes(variantesMostradas)

                    // Agrupar variantes por color para mostrar sub-secciones
                    const coloresUnicos = [...new Set(variantesOrdenadas.map((v) => v.color))]

                    return (
                        <div key={producto.id} className={`bg-papel border rounded-xl overflow-hidden shadow-sm transition-all ${abierto ? 'border-terracota/50 ring-1 ring-terracota/20 col-span-1 sm:col-span-2 lg:col-span-3' : 'border-arena hover:shadow-md'}`}>
                            {/* Cabecera del producto — clic para expandir */}
                            <button
                                onClick={() => setProductoAbierto(abierto ? null : producto.id)}
                                className="w-full text-left flex items-stretch"
                            >
                                <div className={`${abierto ? 'w-28 h-28' : 'w-full h-40'} bg-arena/40 flex items-center justify-center flex-shrink-0 ${abierto ? '' : 'block'}`}>
                                    {fotoPortada ? (
                                        <img src={fotoPortada} alt={producto.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-tintaSuave text-sm">Sin foto</span>
                                    )}
                                </div>
                                {abierto ? (
                                    <div className="p-4 flex-1 flex items-center justify-between">
                                        <div>
                                            <p className="font-display font-semibold text-lg text-tinta">{producto.nombre}</p>
                                            <p className="text-xs text-tintaSuave mt-0.5">
                                                {producto.corte && producto.corte.replace('_', ' ')}
                                                {' · '}{variantesMostradas.length} variante{variantesMostradas.length !== 1 ? 's' : ''}
                                                {' · '}S/ {Number(producto.precio_venta).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-mono ${tieneAlerta ? 'text-terracota font-semibold' : 'text-tintaSuave'}`}>
                                                {total} uds total
                                            </span>
                                            <span className="text-tintaSuave text-lg">✕</span>
                                        </div>
                                    </div>
                                ) : (
                                    /* Vista cerrada: solo tarjeta compacta */
                                    null
                                )}
                            </button>

                            {/* Vista cerrada: info debajo de la imagen */}
                            {!abierto && (
                                <div className="p-4">
                                    <p className="font-display font-semibold text-tinta">{producto.nombre}</p>
                                    <p className="text-xs text-tintaSuave mt-0.5">
                                        {producto.corte && producto.corte.replace('_', ' ')}
                                        {' · '}{(producto.variantes || []).length} variante{(producto.variantes || []).length !== 1 ? 's' : ''}
                                    </p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-sm text-tinta font-medium">S/ {Number(producto.precio_venta).toFixed(2)}</span>
                                        <span className={`text-sm font-mono ${tieneAlerta ? 'text-terracota font-semibold' : 'text-tintaSuave'}`}>
                                            {total} uds
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Panel expandido: variantes por talla */}
                            {abierto && (
                                <div className="border-t border-arena px-4 pb-4">
                                    {coloresUnicos.length === 0 ? (
                                        <p className="text-tintaSuave text-xs mt-4">Este producto no tiene variantes registradas.</p>
                                    ) : (
                                        coloresUnicos.map((color) => {
                                            const variantesColor = variantesOrdenadas.filter((v) => v.color === color)
                                            return (
                                                <div key={color} className="mt-4">
                                                    <p className="text-xs font-medium text-tintaSuave uppercase tracking-wide mb-2">
                                                        {color}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {variantesColor.map((v) => {
                                                            const cant = (v.stock?.[0] || v.stock)?.cantidad_actual ?? 0
                                                            const min = (v.stock?.[0] || v.stock)?.minimo_alerta ?? 1
                                                            const bajo = cant <= min
                                                            return (
                                                                <div
                                                                    key={v.id}
                                                                    className={`px-4 py-2.5 rounded-lg border text-center min-w-[70px] ${bajo
                                                                        ? 'border-terracota/40 bg-terracota/5'
                                                                        : 'border-arena bg-crema/50'
                                                                        }`}
                                                                >
                                                                    <p className="text-xs font-medium text-tintaSuave">{v.talla}</p>
                                                                    <p className={`text-base font-mono font-semibold mt-0.5 ${bajo ? 'text-terracota' : 'text-tinta'}`}>
                                                                        {cant}
                                                                    </p>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Stock