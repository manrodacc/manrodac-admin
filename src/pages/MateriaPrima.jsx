import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function MateriaPrima() {
    const [items, setItems] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [filtroTipo, setFiltroTipo] = useState('polo')
    const [color, setColor] = useState('')
    const [corte, setCorte] = useState('')
    const [talla, setTalla] = useState('')

    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('polo')
    const [proveedorId, setProveedorId] = useState('')
    const [unidad, setUnidad] = useState('unidad')
    const [cantidad, setCantidad] = useState('')
    const [costoUnitario, setCostoUnitario] = useState('')

    const [editandoId, setEditandoId] = useState(null)
    const [edicion, setEdicion] = useState({ nombre: '', tipo: '', proveedor_id: '', unidad: '', talla: '' })

    const [reponiendoId, setReponiendoId] = useState(null)
    const [reposicion, setReposicion] = useState({ cantidad: '', costo_unitario: '' })

    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [mostrarFormulario, setMostrarFormulario] = useState(false)

    async function cargarDatos() {
        const { data: mp } = await supabase
            .from('materia_prima')
            .select('id, nombre, tipo, unidad, talla, color, corte, proveedor_id, proveedores(nombre), materia_prima_stock(cantidad_actual)')
            
        const ordenados = (mp || []).sort((a, b) => {
            const stockA = a.materia_prima_stock?.cantidad_actual ?? 0;
            const stockB = b.materia_prima_stock?.cantidad_actual ?? 0;
            return stockA - stockB;
        });

        setItems(ordenados)

        const { data: prov } = await supabase.from('proveedores').select('*')
        setProveedores(prov || [])
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    const filtrados = items.filter((item) => filtroTipo === 'todos' || item.tipo === filtroTipo)

    async function handleSubmit(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        try {
            const { data: insumo, error: errorInsumo } = await supabase
                .from('materia_prima')
                .insert({ nombre, tipo, proveedor_id: proveedorId || null, unidad, color: color || null, corte: corte || null, talla: talla || null })
                .select()
                .single()

            if (errorInsumo) throw errorInsumo

            const { error: errorMovimiento } = await supabase.from('materia_prima_movimientos').insert({
                materia_prima_id: insumo.id,
                tipo: 'entrada',
                cantidad: Number(cantidad),
                costo_unitario: Number(costoUnitario) || null,
                motivo: 'compra',
            })

            if (errorMovimiento) throw errorMovimiento

            setMensaje('Insumo registrado.')
            setNombre('')
            setProveedorId('')
            setTalla('')
            setCantidad('')
            setCostoUnitario('')
            setMostrarFormulario(false)
            await cargarDatos()
        } catch (err) {
            console.error(err)
            setMensaje('Error: ' + err.message)
        } finally {
            setGuardando(false)
        }
    }

    function empezarEdicion(item) {
        setReponiendoId(null)
        setEditandoId(item.id)
        setEdicion({
            nombre: item.nombre,
            tipo: item.tipo,
            proveedor_id: item.proveedor_id || '',
            unidad: item.unidad,
            talla: item.talla || '',
        })
    }

    function cancelarEdicion() {
        setEditandoId(null)
    }

    function empezarReposicion(item) {
        setEditandoId(null)
        setReponiendoId(item.id)
        setReposicion({ cantidad: '', costo_unitario: '' })
    }

    function cancelarReposicion() {
        setReponiendoId(null)
    }

    async function guardarReposicion(id) {
        setMensaje(null)
        if (!reposicion.cantidad || Number(reposicion.cantidad) <= 0) {
            setMensaje('Ingrese una cantidad válida para reponer.')
            return
        }

        const { error } = await supabase.from('materia_prima_movimientos').insert({
            materia_prima_id: id,
            tipo: 'entrada',
            cantidad: Number(reposicion.cantidad),
            costo_unitario: reposicion.costo_unitario ? Number(reposicion.costo_unitario) : null,
            motivo: 'compra',
        })

        if (error) {
            setMensaje('Error al reponer: ' + error.message)
        } else {
            setMensaje('Stock repuesto exitosamente.')
            setReponiendoId(null)
            await cargarDatos()
        }
    }

    async function guardarEdicion(id) {
        const { error } = await supabase
            .from('materia_prima')
            .update({
                nombre: edicion.nombre,
                tipo: edicion.tipo,
                proveedor_id: edicion.proveedor_id || null,
                unidad: edicion.unidad,
                talla: edicion.talla || null,
            })
            .eq('id', id)

        if (error) {
            setMensaje('Error al editar: ' + error.message)
        } else {
            setEditandoId(null)
            await cargarDatos()
        }
    }

    async function eliminar(id, nombreItem) {
        const confirmado = window.confirm(`¿Eliminar "${nombreItem}"? Esto borra también su historial de movimientos.`)
        if (!confirmado) return

        const { error } = await supabase.from('materia_prima').delete().eq('id', id)

        if (error) {
            setMensaje('Error al eliminar: ' + error.message)
        } else {
            await cargarDatos()
        }
    }

    return (
        <div>
            <header className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="font-display font-semibold text-3xl text-tinta">Materia prima</h1>
                    <p className="text-sm text-tintaSuave mt-1">
                        Registro informativo de insumos. No afecta tu catálogo de venta.
                    </p>
                </div>
                <button
                    onClick={() => setMostrarFormulario(!mostrarFormulario)}
                    className="bg-terracota text-white px-4 py-2.5 rounded-lg font-medium hover:bg-terracota/90 transition-colors text-sm"
                >
                    {mostrarFormulario ? 'Cancelar' : '+ Agregar materia prima'}
                </button>
            </header>

            {mensaje && (
                <div className="mb-6 p-4 rounded-lg bg-arena/20 text-tinta font-medium border border-arena">
                    {mensaje}
                </div>
            )}

            {mostrarFormulario && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-papel rounded-xl p-6 shadow-xl w-full max-w-2xl border border-arena m-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-4">
                            <h2 className="font-display font-semibold text-xl text-tinta">Agregar nueva materia prima</h2>
                            <button onClick={() => setMostrarFormulario(false)} type="button" className="text-tintaSuave hover:text-tinta text-sm">✕ Cerrar</button>
                        </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-tinta mb-1">Nombre del insumo</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                placeholder="Ej. Polo blanco Boxy Fit M perla, DTF Dragón"
                                className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Tipo</label>
                                <select
                                    value={tipo}
                                    onChange={(e) => {
                                        const nuevoTipo = e.target.value
                                        setTipo(nuevoTipo)
                                        if (nuevoTipo === 'dtf') setUnidad('metro')
                                        if (nuevoTipo === 'polo') setUnidad('unidad')
                                    }}
                                    className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                >
                                    <option value="polo">Polo</option>
                                    <option value="dtf">DTF</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-tinta mb-1">Proveedor</label>
                                <select
                                    value={proveedorId}
                                    onChange={(e) => setProveedorId(e.target.value)}
                                    className="w-full p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                >
                                    <option value="">-- Ninguno --</option>
                                    {proveedores.map((p) => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Unidad</label>
                                <select
                                    value={unidad}
                                    onChange={(e) => setUnidad(e.target.value)}
                                    className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                >
                                    <option value="unidad">Unidad</option>
                                    <option value="metro">Metro</option>
                                </select>
                            </div>
                        </div>

                        {tipo === 'polo' && (
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Color</label>
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    placeholder="Ej. negro"
                                    className="w-28 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                />
                            </div>
                        )}
                        {tipo === 'polo' && (
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
                                    <label className="block text-sm font-medium text-tinta mb-1">Talla</label>
                                    <select
                                        value={talla}
                                        onChange={(e) => setTalla(e.target.value)}
                                        className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                    >
                                        <option value="">-- Ninguna --</option>
                                        <option value="S">S</option>
                                        <option value="M">M</option>
                                        <option value="L">L</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Cantidad que entra</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    required
                                    className="w-32 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-tinta mb-1">Costo unitario (S/)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={costoUnitario}
                                    onChange={(e) => setCostoUnitario(e.target.value)}
                                    className="w-32 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="bg-terracota text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors"
                        >
                            {guardando ? 'Guardando...' : 'Registrar insumo'}
                        </button>

                    </form>
                    </div>
                </div>
            )}

            {/* Modal de reposición */}
            {reponiendoId && (() => {
                const item = items.find(i => i.id === reponiendoId)
                if (!item) return null
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-papel rounded-xl p-6 shadow-xl w-full max-w-sm border border-arena m-auto">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-tintaSuave">Reponiendo stock</p>
                                    <p className="font-display font-semibold text-lg text-tinta">{item.nombre}</p>
                                </div>
                                <button onClick={cancelarReposicion} className="text-tintaSuave hover:text-tinta text-sm">✕</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-tinta font-medium block mb-1">Cantidad a ingresar (+)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej. 50"
                                        value={reposicion.cantidad}
                                        onChange={(e) => setReposicion({ ...reposicion, cantidad: e.target.value })}
                                        className="w-full p-2.5 rounded-md bg-crema border border-arena text-sm focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-tinta font-medium block mb-1">Costo unitario (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Opcional"
                                        value={reposicion.costo_unitario}
                                        onChange={(e) => setReposicion({ ...reposicion, costo_unitario: e.target.value })}
                                        className="w-full p-2.5 rounded-md bg-crema border border-arena text-sm focus:outline-none focus:ring-2 focus:ring-terracota/40"
                                    />
                                </div>
                                <button
                                    onClick={() => guardarReposicion(item.id)}
                                    className="w-full bg-terracota text-white py-2.5 rounded-lg font-medium hover:bg-terracota/90 transition-colors"
                                >
                                    Confirmar ingreso
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-xl text-tinta">Inventario de insumos</h2>
                <div className="flex gap-1 bg-papel border border-arena rounded-lg p-1">
                    {[
                        { key: 'polo', label: 'Polos' },
                        { key: 'dtf', label: 'DTF' },
                        { key: 'todos', label: 'Todos' },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFiltroTipo(f.key)}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filtroTipo === f.key ? 'bg-terracota text-white' : 'text-tintaSuave hover:bg-arena/50'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm mb-12">
                <table className="w-full text-sm">
                    <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Talla</th>
                            <th className="p-3">Proveedor</th>
                            <th className="p-3">Unidad</th>
                            <th className="p-3 text-right">Stock actual</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((item) => {
                            const enEdicion = editandoId === item.id
                            const enReposicion = reponiendoId === item.id

                            if (enEdicion) {
                                return (
                                    <tr key={item.id} className="border-t border-arena bg-crema">
                                        <td className="p-2">
                                            <input
                                                value={edicion.nombre}
                                                onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                                                className="w-full p-1.5 rounded-md bg-papel border border-arena"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={edicion.proveedor_id}
                                                onChange={(e) => setEdicion({ ...edicion, proveedor_id: e.target.value })}
                                                className="w-full p-1.5 rounded-md bg-papel border border-arena"
                                            >
                                                <option value="">-- Ninguno --</option>
                                                {proveedores.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={edicion.unidad}
                                                onChange={(e) => setEdicion({ ...edicion, unidad: e.target.value })}
                                                className="w-full p-1.5 rounded-md bg-papel border border-arena"
                                            >
                                                <option value="unidad">Unidad</option>
                                                <option value="metro">Metro</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={edicion.talla}
                                                onChange={(e) => setEdicion({ ...edicion, talla: e.target.value })}
                                                className="w-full p-1.5 rounded-md bg-papel border border-arena"
                                            >
                                                <option value="">--</option>
                                                <option value="S">S</option>
                                                <option value="M">M</option>
                                                <option value="L">L</option>
                                            </select>
                                        </td>
                                        <td className="p-2 text-right text-tintaSuave">
                                            {item.materia_prima_stock?.cantidad_actual ?? 0}
                                        </td>
                                        <td className="p-2 text-right space-x-2">
                                            <button onClick={() => guardarEdicion(item.id)} className="text-oliva font-medium">Guardar</button>
                                            <button onClick={cancelarEdicion} className="text-tintaSuave">Cancelar</button>
                                        </td>
                                    </tr>
                                )
                            }

                            /* enReposicion form moved to modal */

                            return (
                                <tr key={item.id} className="border-t border-arena hover:bg-arena/10 transition-colors">
                                    <td className="p-3 text-tinta">{item.nombre}</td>
                                    <td className="p-3 text-tintaSuave">{item.talla || '—'}</td>
                                    <td className="p-3 text-tintaSuave">{item.proveedores?.nombre || '—'}</td>
                                    <td className="p-3 text-tintaSuave">{item.unidad}</td>
                                    <td className="p-3 text-right font-mono text-tinta font-medium">
                                        {item.materia_prima_stock?.cantidad_actual ?? 0}
                                    </td>
                                    <td className="p-3 text-right space-x-3">
                                        <button onClick={() => empezarReposicion(item)} className="text-oliva text-sm font-medium hover:underline">
                                            Reponer
                                        </button>
                                        <button onClick={() => empezarEdicion(item)} className="text-terracota text-sm font-medium hover:underline">
                                            Editar
                                        </button>
                                        <button onClick={() => eliminar(item.id, item.nombre)} className="text-tintaSuave text-sm hover:underline">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtrados.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-tintaSuave">
                                    No hay insumos registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default MateriaPrima