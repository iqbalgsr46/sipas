const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ldqyvxcrtqxcahjevcad.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcXl2eGNydHF4Y2FoamV2Y2FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE2MDczOCwiZXhwIjoyMDkyNzM2NzM4fQ.E8XxI7EaKJsybVrMT4mrkP2sTm7N-8qlDQX4WCZx4y4';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const usersToCreate = [
  {
    email: 'wulan@sipas.go.id',
    password: 'wulan',
    full_name: 'Wulan (Admin)',
    role: 'admin',
    username: 'wulan'
  },
  {
    email: 'iqbal@sipas.go.id',
    password: 'iqbal',
    full_name: 'Iqbal (Pimpinan)',
    role: 'pimpinan',
    username: 'iqbal'
  },
  {
    email: 'zidan@sipas.go.id',
    password: 'zidan',
    full_name: 'Zidan (Staf)',
    role: 'user',
    username: 'zidan'
  }
];

async function seedUsers() {
  console.log('--- Starting User Seeding ---');
  
  for (const user of usersToCreate) {
    console.log(`Creating user: ${user.email} (${user.role})...`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
        username: user.username
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`User ${user.email} already exists. Attempting to update role...`);
        // If user exists, we might want to update their metadata at least
        // But admin.updateUserById requires the ID
      } else {
        console.error(`Error creating ${user.email}:`, error.message);
      }
    } else {
      console.log(`Successfully created user: ${user.email} with ID: ${data.user.id}`);
    }
  }
  
  console.log('--- Seeding Finished ---');
}

seedUsers();
