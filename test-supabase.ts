import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qxpkavhucbkggduuhfsv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g');

async function test() {
  const { data: products, error } = await supabase.from('products').select('*').limit(1);
  console.log('products:', products, error);
}
test();
