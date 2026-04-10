import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxpkavhucbkggduuhfsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('daily_payroll').select('*, employees(full_name, role)').limit(1);
  console.log('daily_payroll with employees:', data, error);
  
  const { data: data2, error: error2 } = await supabase.from('daily_payroll').select('*, payroll(employee_id)').limit(1);
  console.log('daily_payroll with payroll:', data2, error2);
}

checkSchema();
