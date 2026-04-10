import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxpkavhucbkggduuhfsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Inserting employee...');
  const { data: empData, error: empError } = await supabase
    .from('employees')
    .insert([{
      full_name: 'Test User',
      role: 'Tester',
      basic_salary: 10000
    }])
    .select()
    .single();

  if (empError) {
    console.error('Employee Error:', empError);
    return;
  }
  console.log('Employee inserted:', empData);

  console.log('Inserting payroll...');
  const { data: payData, error: payError } = await supabase
    .from('payroll')
    .insert([{
      employee_id: empData.id,
      basic_salary: 10000,
      allowances: 0,
      deductions: 0,
      net_pay: 10000,
      status: 'pending',
      payment_date: null
    }])
    .select();

  if (payError) {
    console.error('Payroll Error:', payError);
  } else {
    console.log('Payroll inserted:', payData);
  }
}

testInsert();
