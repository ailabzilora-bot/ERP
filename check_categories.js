import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxpkavhucbkggduuhfsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', data);
  }
}

checkCategories();
