import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const variantevacia = { talla: '', color: '' }

function NuevoProducto() {
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [cargando, setCargando] = useState(true)

    // Estados para formulario
    const [mostrarForm, setMostrarForm] = useState(false)
    const [categoriaId, setCategoriaId] = useState('')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [corte, setCorte] = useState('')
    const [precioVenta, setPrecioVenta] = useState('')
    const [archivos, setArchivos] = useState([])
    const [variantesForm, setVariantesForm] = useState([{ ...variantevacia }])
    const [subiendo, setSubiendo] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    // Estado para gestionar variantes de un producto existente
    const [productoGestionarId, setProductoGestionarId] = useState(null)
    const [variantesProducto, setVariantesProducto] = useState([])
    const [cargandoVariantes, setCargandoVariantes] = useState(false)
    const [nuevaVariante, setNuevaVariante] = useState({ talla: '', color: '' })
    const [eliminandoProducto, setEliminandoProducto] = useState(false)

    async function cargarDatos() {
        setCargando(true)
        // Cargar productos con sus variantes e imágenes
        const { data: prods } = await supabase
            .from('productos')
            .select(`
                id, nombre, corte, precio_venta, categoria_id, descripcion,
                categorias(nombre),
                producto_imagenes(url, orden),
                variantes(id, talla, color)
            `)
            .order('id', { ascending: false })
        setProductos(prods || [])

        const { data: cats } = await supabase.from('categorias').select('*')
        setCategorias(cats || [])
        setCargando(false)
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Manejar carga de variantes del producto seleccionado
    async function abrirGestionarVariantes(prodId) {
        setProductoGestionarId(prodId)
        setCargandoVariantes(true)
        const { data: vars } = await supabase
            .from('variantes')
            .select(`
                id, talla, color,
                stock(cantidad_actual)
            `)
            .eq('producto_id', prodId)
        setVariantesProducto(vars || [])
        setCargandoVariantes(false)
    }

    // Agregar variante a producto existente
    async function handleAgregarVarianteExistente(e) {
        e.preventDefault()
        if (!nuevaVariante.talla || !nuevaVariante.color) return
        try {
            const { data: insertada, error } = await supabase
                .from('variantes')
                .insert({
                    producto_id: productoGestionarId,
                    talla: nuevaVariante.talla,
                    color: nuevaVariante.color
                })
                .select()
                .single()

            if (error) throw error

            // Crear fila de stock inicial en 0 para la nueva variante
            await supabase
                .from('stock')
                .insert({
                    variante_id: insertada.id,
                    cantidad_actual: 0,
                    minimo_alerta: 1
                })

            setNuevaVariante({ talla: '', color: '' })
            abrirGestionarVariantes(productoGestionarId)
            cargarDatos()
        } catch (err) {
            console.error(err)
            alert('Error al agregar variante: ' + err.message)
        }
    }

    // Quitar variante de producto existente
    async function handleQuitarVarianteExistente(varianteId) {
        if (!window.confirm('¿Estás seguro de eliminar esta variante? Se borrará también su stock.')) return
        try {
            // Eliminar de venta_detalle, movimientos_stock, stock y luego variante
            await supabase.from('venta_detalle').delete().eq('variante_id', varianteId)
            await supabase.from('movimientos_stock').delete().eq('variante_id', varianteId)
            await supabase.from('stock').delete().eq('variante_id', varianteId)
            
            const { error } = await supabase
                .from('variantes')
                .delete()
                .eq('id', varianteId)

            if (error) throw error

            abrirGestionarVariantes(productoGestionarId)
            cargarDatos()
        } catch (err) {
            console.error(err)
            alert('Error al eliminar variante: ' + err.message)
        }
    }

    // Eliminar producto por completo con variantes, imágenes y stock dependientes
    async function handleEliminarProducto(productoId) {
        if (!window.confirm('¿Estás seguro de eliminar este producto por completo? Esta acción eliminará todas sus variantes, imágenes y existencias permanentemente.')) return
        setEliminandoProducto(true)
        try {
            // 1. Obtener las variantes del producto
            const { data: vars } = await supabase
                .from('variantes')
                .select('id')
                .eq('producto_id', productoId)

            const varianteIds = (vars || []).map((v) => v.id)

            // 2. Eliminar registros en orden de constraints de FK
            if (varianteIds.length > 0) {
                await supabase.from('venta_detalle').delete().in('variante_id', varianteIds)
                await supabase.from('movimientos_stock').delete().in('variante_id', varianteIds)
                await supabase.from('stock').delete().in('variante_id', varianteIds)
                await supabase.from('variantes').delete().in('id', varianteIds)
            }

            // 3. Eliminar imágenes del producto
            await supabase.from('producto_imagenes').delete().eq('producto_id', productoId)

            // 4. Eliminar el producto final
            const { error } = await supabase.from('productos').delete().eq('id', productoId)
            if (error) throw error

            setProductoGestionarId(null)
            await cargarDatos()
        } catch (err) {
            console.error(err)
            alert('Error al eliminar el producto: ' + err.message)
        } finally {
            setEliminandoProducto(false)
        }
    }

    // Funciones del formulario de nuevo producto
    function actualizarVarianteForm(index, campo, valor) {
        const copia = [...variantesForm]
        copia[index] = { ...copia[index], [campo]: valor }
        setVariantesForm(copia)
    }

    function agregarVarianteForm() {
        setVariantesForm([...variantesForm, { ...variantevacia }])
    }

    function quitarVarianteForm(index) {
        setVariantesForm(variantesForm.filter((_, i) => i !== index))
    }

    async function handleSubmitNuevo(e) {
        e.preventDefault()
        setSubiendo(true)
        setMensaje(null)

        try {
            const { data: producto, error: errorProducto } = await supabase
                .from('productos')
                .insert({
                    nombre,
                    categoria_id: categoriaId,
                    descripcion: descripcion || null,
                    corte: corte || null,
                    precio_venta: Number(precioVenta),
                })
                .select()
                .single()

            if (errorProducto) throw errorProducto

            for (let i = 0; i < archivos.length; i++) {
                const archivo = archivos[i]
                const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_')
                const nombreArchivo = `${producto.id}-${Date.now()}-${nombreLimpio}`

                const { error: errorUpload } = await supabase.storage
                    .from('productos-fotos')
                    .upload(nombreArchivo, archivo)
                if (errorUpload) throw errorUpload

                const { data: urlData } = supabase.storage.from('productos-fotos').getPublicUrl(nombreArchivo)

                const { error: errorImagen } = await supabase
                    .from('producto_imagenes')
                    .insert({ producto_id: producto.id, url: urlData.publicUrl, orden: i })
                if (errorImagen) throw errorImagen
            }

            for (const v of variantesForm) {
                if (!v.talla && !v.color) continue
                const { data: insertada, error: errorVariante } = await supabase
                    .from('variantes')
                    .insert({ producto_id: producto.id, talla: v.talla, color: v.color })
                    .select()
                    .single()
                if (errorVariante) throw errorVariante

                // Inicializar stock de variante
                await supabase
                    .from('stock')
                    .insert({
                        variante_id: insertada.id,
                        cantidad_actual: 0,
                        minimo_alerta: 1
                    })
            }

            setMensaje('¡Producto guardado con éxito!')
            setNombre('')
            setDescripcion('')
            setCorte('')
            setPrecioVenta('')
            setArchivos([])
            setVariantesForm([{ ...variantevacia }])
            setMostrarForm(false)
            await cargarDatos()
        } catch (err) {
            console.error(err)
            setMensaje('Error: ' + err.message)
        } finally {
            setSubiendo(false)
        }
    }

    return (
        <div>
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="font-display font-semibold text-3xl text-tinta">Productos</h1>
                    <p className="text-sm text-tintaSuave mt-1">
                        Administra tus productos, imágenes y variantes disponibles.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setMostrarForm(!mostrarForm)
                        setProductoGestionarId(null)
                    }}
                    className="bg-terracota text-white px-4 py-2 rounded-lg font-medium hover:bg-terracota/90 transition-colors"
                >
                    {mostrarForm ? '✕ Cancelar' : '+ Nuevo Producto'}
                </button>
            </header>

            {/* Formulario de agregar nuevo producto */}
            {mostrarForm && (
                <div className="mb-8 max-w-2xl bg-papel border border-arena rounded-xl p-6 shadow-sm">
                    <h2 className="font-display font-semibold text-lg text-tinta mb-4">Agregar nuevo producto</h2>
                    <form onSubmit={handleSubmitNuevo} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Categoría</label>
                            <select
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                required
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            >
                                <option value="">-- Selecciona --</option>
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Nombre del producto</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                placeholder="Ej. Polo Dragón Perla"
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Descripción (opcional)</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                rows={2}
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Corte</label>
                                <select
                                    value={corte}
                                    onChange={(e) => setCorte(e.target.value)}
                                    className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                >
                                    <option value="">-- Ninguno --</option>
                                    <option value="slim_fit">Slim fit</option>
                                    <option value="boxy_fit">Boxy fit</option>
                                    <option value="regular_fit">Regular fit</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Precio de venta (S/)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={precioVenta}
                                    onChange={(e) => setPrecioVenta(e.target.value)}
                                    className="w-32 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Fotos (con el diseño puesto)</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => setArchivos(Array.from(e.target.files))}
                                className="w-full text-sm text-tintaSuave"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-tinta mb-2">Variantes iniciales (talla / color)</label>
                            <div className="space-y-2">
                                {variantesForm.map((v, index) => (
                                    <div key={index} className="flex gap-2 items-center bg-crema border border-arena p-3 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Talla (ej. M)"
                                            value={v.talla}
                                            onChange={(e) => actualizarVarianteForm(index, 'talla', e.target.value)}
                                            className="w-24 p-2 rounded-md bg-papel border border-arena"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Color"
                                            value={v.color}
                                            onChange={(e) => actualizarVarianteForm(index, 'color', e.target.value)}
                                            className="w-32 p-2 rounded-md bg-papel border border-arena"
                                        />
                                        {variantesForm.length > 1 && (
                                            <button type="button" onClick={() => quitarVarianteForm(index)} className="text-terracota text-sm ml-auto">
                                                Quitar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={agregarVarianteForm} className="mt-2 text-sm text-oliva font-medium hover:underline">
                                + Agregar otra variante
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={subiendo}
                            className="bg-terracota text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors"
                        >
                            {subiendo ? 'Guardando...' : 'Guardar producto'}
                        </button>

                        {mensaje && <p className="text-sm text-tinta">{mensaje}</p>}
                    </form>
                </div>
            )}

            {/* Listado de Productos Registrados */}
            <h2 className="font-display font-semibold text-xl text-tinta mb-4">Productos registrados</h2>

            {cargando && <p className="text-tintaSuave">Cargando productos...</p>}
            {!cargando && productos.length === 0 && (
                <p className="text-tintaSuave">No tienes productos registrados aún.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel de productos */}
                <div className="space-y-4">
                    {productos.map((prod) => {
                        const fotos = (prod.producto_imagenes || []).sort((a, b) => a.orden - b.orden)
                        const portada = fotos[0]?.url
                        return (
                            <button
                                key={prod.id}
                                onClick={() => {
                                    setMostrarForm(false)
                                    abrirGestionarVariantes(prod.id)
                                }}
                                className={`w-full text-left p-4 bg-papel border rounded-xl shadow-sm flex gap-4 items-center transition-all ${
                                    productoGestionarId === prod.id ? 'border-terracota ring-2 ring-terracota/20' : 'border-arena hover:shadow-md'
                                }`}
                            >
                                <div className="w-16 h-16 bg-arena/40 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
                                    {portada ? (
                                        <img src={portada} alt={prod.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-tintaSuave text-xs">Sin foto</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-display font-semibold text-tinta truncate">{prod.nombre}</p>
                                    <p className="text-xs text-tintaSuave mt-0.5">
                                        Categoría: {prod.categorias?.nombre || '—'} | Corte: {prod.corte?.replace('_', ' ') || '—'}
                                    </p>
                                    <p className="text-sm text-tinta font-semibold mt-1">S/ {Number(prod.precio_venta).toFixed(2)}</p>
                                </div>
                                <div
                                    className="px-3 py-1.5 rounded-lg border border-arena text-xs font-medium text-tintaSuave hover:text-tinta hover:border-tinta transition-all flex-shrink-0 bg-papel"
                                >
                                    Variantes ({prod.variantes?.length || 0})
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Panel lateral para gestionar variantes del producto seleccionado */}
                <div>
                    {productoGestionarId ? (
                        <div className="bg-papel border border-arena rounded-xl p-5 shadow-sm sticky top-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-display font-semibold text-lg text-tinta">
                                    Variantes de {productos.find((p) => p.id === productoGestionarId)?.nombre}
                                </h3>
                                <button
                                    onClick={() => setProductoGestionarId(null)}
                                    className="text-tintaSuave hover:text-tinta text-sm"
                                >
                                    ✕ Cerrar
                                </button>
                            </div>

                            {cargandoVariantes ? (
                                <p className="text-tintaSuave text-sm">Cargando variantes...</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Listado */}
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {variantesProducto.length === 0 ? (
                                            <p className="text-tintaSuave text-xs">Sin variantes creadas.</p>
                                        ) : (
                                            variantesProducto.map((v) => (
                                                <div key={v.id} className="flex justify-between items-center bg-crema border border-arena p-2.5 rounded-lg text-sm">
                                                    <div>
                                                        <span className="font-medium text-tinta">{v.talla}</span>
                                                        <span className="text-tintaSuave mx-1.5">·</span>
                                                        <span className="text-tintaSuave">{v.color}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-tintaSuave font-mono">
                                                            Stock: {(v.stock?.[0] || v.stock)?.cantidad_actual ?? 0}
                                                        </span>
                                                        <button
                                                            onClick={() => handleQuitarVarianteExistente(v.id)}
                                                            className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Formulario rápido para añadir */}
                                    <form onSubmit={handleAgregarVarianteExistente} className="border-t border-arena pt-4 mt-2">
                                        <h4 className="text-sm font-semibold text-tinta mb-2">Añadir nueva variante</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Talla (ej. M)"
                                                value={nuevaVariante.talla}
                                                onChange={(e) => setNuevaVariante({ ...nuevaVariante, talla: e.target.value })}
                                                className="w-1/2 p-2 rounded-md bg-crema border border-arena text-sm"
                                            />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Color"
                                                value={nuevaVariante.color}
                                                onChange={(e) => setNuevaVariante({ ...nuevaVariante, color: e.target.value })}
                                                className="w-1/2 p-2 rounded-md bg-crema border border-arena text-sm"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full mt-2.5 bg-oliva text-white py-2 rounded-lg font-medium hover:bg-oliva/90 transition-colors text-sm"
                                        >
                                            + Agregar Variante
                                        </button>
                                    </form>

                                    {/* Botón de eliminación completa del producto */}
                                    <div className="border-t border-arena pt-4 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => handleEliminarProducto(productoGestionarId)}
                                            disabled={eliminandoProducto}
                                            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2.5 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {eliminandoProducto ? 'Eliminando...' : '🗑 Eliminar Producto Completo'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-crema/40 border border-dashed border-arena rounded-xl p-8 text-center text-tintaSuave sticky top-4">
                            Selecciona un producto para gestionar, añadir o quitar sus variantes (talla y color).
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NuevoProducto