import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/dashboard'
import Stock from './pages/Stock'
import NuevoProducto from './pages/NuevoProducto'
import ReponerStock from './pages/ReponerStock'
import MateriaPrima from './pages/MateriaPrima'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Categorias from './pages/Categorias.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Gastos from './pages/Gastos.jsx'
import Caja from './pages/Caja.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/nuevo-producto" element={<NuevoProducto />} />
        <Route path="/reponer-stock" element={<ReponerStock />} />
        <Route path="/materia-prima" element={<MateriaPrima />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/caja" element={<Caja />} />
      </Routes>
    </Layout>
  )
}

export default App