const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ldqyvxcrtqxcahjevcad.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcXl2eGNydHF4Y2FoamV2Y2FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE2MDczOCwiZXhwIjoyMDkyNzM2NzM4fQ.E8XxI7EaKJsybVrMT4mrkP2sTm7N-8qlDQX4WCZx4y4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const usersToUpdate = [
  { email: 'wulan@sipas.go.id', role: 'admin', password: 'wulan123', full_name: 'Wulan (Admin)', username: 'wulan' },
  { email: 'iqbal@sipas.go.id', role: 'pimpinan', password: 'iqbal123', full_name: 'Iqbal (Pimpinan)', username: 'iqbal' },
  { email: 'zidan@sipas.go.id', role: 'user', password: 'zidan123', full_name: 'Zidan (Staf)', username: 'zidan' }
];

async function updateUsers() {
  console.log('--- Starting User Update ---');
  
  // 1. Get all users from auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  for (const updateInfo of usersToUpdate) {
    const authUser = users.find(u => u.email === updateInfo.email);
    
    if (authUser) {
      console.log(`Updating user: ${updateInfo.email}...`);
      
      // Update Auth User (Metadata and Password)
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: updateInfo.password,
          user_metadata: {
            role: updateInfo.role,
            full_name: updateInfo.full_name,
            username: updateInfo.username
          }
        }
      );

      if (authUpdateError) {
        console.error(`Error updating Auth for ${updateInfo.email}:`, authUpdateError.message);
      } else {
        console.log(`Auth updated for ${updateInfo.email}`);
      }

      // Update Public Users Table
      const { error: publicUpdateError } = await supabase
        .from('users')
        .update({
          role: updateInfo.role,
          full_name: updateInfo.full_name,
          username: updateInfo.username,
          status: 'aktif'
        })
        .eq('id', authUser.id);

      if (publicUpdateError) {
        console.error(`Error updating Public table for ${updateInfo.email}:`, publicUpdateError.message);
      } else {
        console.log(`Public table updated for ${updateInfo.email}`);
      }
    } else {
      console.log(`User ${updateInfo.email} not found in Auth. Skipping.`);
    }
  }
  
  console.log('--- Update Finished ---');
}

updateUsers();
