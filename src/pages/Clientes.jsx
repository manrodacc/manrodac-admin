import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Clientes() {
    const [clientes, setClientes] = useState([])
    const [nombre, setNombre] = useState('')
    const [contacto, setContacto] = useState('')
    const [notas, setNotas] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    async function cargarClientes() {
        const { data } = await supabase.from('clientes').select('*').order('id', { ascending: false })
        setClientes(data || [])
    }

    useEffect(() => {
        cargarClientes()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        const { error } = await supabase.from('clientes').insert({ nombre, contacto, notas })

        if (error) {
            setMensaje('Error: ' + error.message)
        } else {
            setMensaje('Cliente guardado.')
            setNombre('')
            setContacto('')
            setNotas('')
            await cargarClientes()
        }
        setGuardando(false)
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Clientes</h1>
                <p className="text-sm text-tintaSuave mt-1">Tu cartera de clientes.</p>
            </header>

            <form onSubmit={handleSubmit} className="flex gap-3 mb-8 flex-wrap items-end bg-papel border border-arena rounded-xl p-6 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Nombre</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Contacto</label>
                    <input
                        type="text"
                        value={contacto}
                        onChange={(e) => setContacto(e.target.value)}
                        placeholder="Teléfono o WhatsApp"
                        className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Notas</label>
                    <input
                        type="text"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <button
                    type="submit"
                    disabled={guardando}
                    className="bg-terracota text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors h-[42px]"
                >
                    {guardando ? 'Guardando...' : 'Agregar'}
                </button>
            </form>

            {mensaje && <p className="text-sm text-tinta mb-4">{mensaje}</p>}

            <div className="bg-papel border border-arena rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-arena/40 text-left text-tintaSuave text-xs uppercase tracking-wide">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Contacto</th>
                            <th className="p-3">Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map((c) => (
                            <tr key={c.id} className="border-t border-arena">
                                <td className="p-3 text-tinta">{c.nombre}</td>
                                <td className="p-3 text-tintaSuave">{c.contacto || '—'}</td>
                                <td className="p-3 text-tintaSuave">{c.notas || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Clientes