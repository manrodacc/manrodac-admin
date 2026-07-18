/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── Tema Claro Premium ──
        crema: "#F8FAFC",        // fondo principal (slate-50)
        papel: "#FFFFFF",        // tarjetas / paneles
        
        // ── Textos ──
        tinta: "#0F172A",        // texto principal muy oscuro (slate-900)
        tintaSuave: "#64748B",   // texto secundario (slate-500)
        
        // ── Acentos (Azules de MANRODAC + Estados) ──
        terracota: "#3B82F6",    // acento primario (blue-500) - reutilizamos la clase existente
        oliva: "#10B981",        // positivo / éxito (emerald-500)
        arena: "#E2E8F0",        // bordes / líneas suaves (slate-200)
        mostaza: "#F59E0B",      // advertencias (amber-500)
        
        // ── Extras del rediseño (Sidebar) ──
        navy: "#1B365D",         // azul marino corporativo del logo
        steel: "#6B93C0",        // azul medio
        skylight: "#F1F5F9",     // hover sutil
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        glow: "0 0 20px rgba(59,130,246,0.3)",
      },
    },
  },
  plugins: [],
}