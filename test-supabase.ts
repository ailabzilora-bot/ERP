import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qxpkavhucbkggduuhfsv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g');

async function test() {
  const { data, error } = await supabase.from('supplier_transactions').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error(error);
}
test();
