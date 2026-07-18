import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Gastos() {
    const [gastos, setGastos] = useState([])
    const [concepto, setConcepto] = useState('')
    const [monto, setMonto] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    async function cargarGastos() {
        const { data } = await supabase.from('gastos').select('*').order('fecha', { ascending: false })
        setGastos(data || [])
    }

    useEffect(() => {
        cargarGastos()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setGuardando(true)
        setMensaje(null)

        const { error } = await supabase.from('gastos').insert({ concepto, monto: Number(monto) })

        if (error) {
            setMensaje('Error: ' + error.message)
        } else {
            setMensaje('Gasto registrado.')
            setConcepto('')
            setMonto('')
            await cargarGastos()
        }
        setGuardando(false)
    }

    const totalMes = gastos
        .filter((g) => {
            const fecha = new Date(g.fecha)
            const hoy = new Date()
            return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
        })
        .reduce((total, g) => total + Number(g.monto), 0)

    return (
        <div>
            <header className="mb-6">
                <h1 className="font-display font-semibold text-3xl text-tinta">Gastos</h1>
                <p className="text-sm text-tintaSuave mt-1">
                    Gastos operativos (alquiler, transporte, etc.), se restan en tus ganancias.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="flex gap-3 mb-6 items-end bg-papel border border-arena rounded-xl p-6 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Concepto</label>
                    <input
                        type="text"
                        value={concepto}
                        onChange={(e) => setConcepto(e.target.value)}
                        required
                        placeholder="Ej. Transporte, alquiler"
                        className="p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-tinta mb-1">Monto (S/)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        required
                        className="w-32 p-2.5 rounded-lg bg-crema border border-arena focus:outline-none focus:ring-2 focus:ring-terracota/40"
                    />
                </div>
                <button
                    type="submit"
                    disabled={guardando}
                    className="bg-terracota text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-terracota/90 transition-colors h-[42px]"
                >
                    {guardando ? 'Guardando...' : 'Registrar'}
                </button>
            </form>

            {mensaje && <p className="text-sm text-tinta mb-4">{mensaje}</p>}

            <p className="text-sm text-tintaSuave mb-3">
                Total gastado este mes: <span className="text-terracota font-semibold">S/ {totalMes.toFixed(2)}</span>
            </p>

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
                        {gastos.map((g) => (
                            <tr key={g.id} className="border-t border-arena">
                                <td className="p-3 text-tintaSuave">{new Date(g.fecha).toLocaleDateString('es-PE')}</td>
                                <td className="p-3 text-tinta">{g.concepto}</td>
                                <td className="p-3 text-right font-mono text-tinta">S/ {Number(g.monto).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Gastos