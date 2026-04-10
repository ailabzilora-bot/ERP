import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxpkavhucbkggduuhfsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: ie } = await supabase.from('income_expense').select('*').limit(1);
  console.log('income_expense:', ie);

  const { data: inv } = await supabase.from('invoices').select('*, customers(customer_name)').limit(1);
  console.log('invoices:', inv);
}

checkSchema();
