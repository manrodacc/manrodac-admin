import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Categorias() {
    const [categorias, setCategorias] = useState([])
    const [nombre, setNombre] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    async function cargarCategorias() {
        const { data } = await supabase.from('categorias').select('*').order('id', { ascending: false })
        setCategorias(data || [])
    }

    useEffect(() => {
        cargarCategorias()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        const { error } = await supabase.from('categorias').insert({ nombre })

        if (error) {
            setMensaje('Error: ' + error.message)
        } else {
            setMensaje('Categoría guardada.')
            setNombre('')
            await cargarCategorias()
        }
        setGuardando(false)
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Categorías</h1>
                <p className="text-sm text-tintaSuave mt-1">Polos, poleras, pantalones, zapatillas...</p>
            </header>

            <form onSubmit={handleSubmit} className="flex gap-3 mb-8 items-end bg-papel border border-arena rounded-xl p-6 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Nombre de la categoría</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
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

            <div className="flex flex-wrap gap-2">
                {categorias.map((c) => (
                    <span key={c.id} className="bg-papel border border-arena rounded-full px-4 py-1.5 text-sm text-tinta shadow-sm">
                        {c.nombre}
                    </span>
                ))}
            </div>
        </div>
    )
}

export default Categorias