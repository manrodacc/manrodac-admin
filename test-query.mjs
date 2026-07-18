import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gefqmvmaukoqbethbvyd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFtdm1hdWtvcWJldGhidnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjAxNTksImV4cCI6MjA5OTI5NjE1OX0.oN6FgPFwA4nsiTFjibI9fvhSPo06rUXEy28ErVnFWLY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testQuery() {
    const { data } = await supabase
        .from('productos')
        .select(`
            id,
            nombre,
            variantes (
                id,
                talla,
                color,
                stock ( cantidad_actual, minimo_alerta )
            )
        `)
        .eq('id', 8); // Since variante_id 23 has producto_id 8

    console.log(JSON.stringify(data, null, 2));
}

testQuery();
