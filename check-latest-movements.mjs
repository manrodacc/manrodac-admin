import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gefqmvmaukoqbethbvyd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFtdm1hdWtvcWJldGhidnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjAxNTksImV4cCI6MjA5OTI5NjE1OX0.oN6FgPFwA4nsiTFjibI9fvhSPo06rUXEy28ErVnFWLY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMovements() {
    // Ultimos movimientos de stock
    const { data: movStock } = await supabase
        .from('movimientos_stock')
        .select('*')
        .order('id', { ascending: false })
        .limit(3);
        
    console.log("Ultimos 3 movimientos de stock (producto):");
    console.log(movStock);

    // Ultimos movimientos de materia prima
    const { data: movMp } = await supabase
        .from('materia_prima_movimientos')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);

    console.log("\nUltimos 5 movimientos de materia prima:");
    console.log(movMp);
}

checkMovements();
