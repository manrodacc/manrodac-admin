import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gefqmvmaukoqbethbvyd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFtdm1hdWtvcWJldGhidnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjAxNTksImV4cCI6MjA5OTI5NjE1OX0.oN6FgPFwA4nsiTFjibI9fvhSPo06rUXEy28ErVnFWLY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateAlerts() {
    console.log("Updating stock table...");
    const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .update({ minimo_alerta: 1 })
        .eq('minimo_alerta', 5);

    if (stockError) {
        console.error("Error updating stock:", stockError);
    } else {
        console.log("Successfully updated stock alerts.");
    }
}

updateAlerts();
