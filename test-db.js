const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  { email: 'wulan@sipas.go.id', pass: 'wulan123' },
  { email: 'iqbal@sipas.go.id', pass: 'iqbal123' },
  { email: 'zidan@sipas.go.id', pass: 'zidan123' },
];

async function testAccounts() {
  for (const acc of accounts) {
    console.log(`\n--- Testing ${acc.email} ---`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass,
    });
    
    if (authError) {
      console.log('Login failed:', authError.message);
      continue;
    }
    
    console.log('Login success. User ID:', authData.user.id);
    
    // Fetch profile
    const { data: profile, error: profError } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    if (profError) {
      console.log('Profile fetch error:', profError.message);
    } else {
      console.log('Profile fetched successfully! Role in DB:', profile.role);
    }
    
    // Fetch surat keluar
    const { data: surat, error: suratError } = await supabase.from('surat_keluar').select('id, nomor_surat, status');
    if (suratError) {
      console.log('Surat keluar fetch error:', suratError.message);
    } else {
      console.log(`Surat keluar visible: ${surat.length}`);
    }
    
    await supabase.auth.signOut();
  }
}

testAccounts();
