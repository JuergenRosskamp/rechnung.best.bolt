import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUser() {
  const email = 'juergen.rosskamp@gmail.com';

  console.log(`\n🔍 Checking user: ${email}\n`);

  try {
    // 1. Get auth user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      console.log('✅ No auth user found. You can now register with this email.');
      return;
    }

    console.log('📧 Auth user found:', authUser.id);

    // 2. Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking profile:', profileError);
    }

    if (profile) {
      console.log('👤 User profile exists:', profile);
      console.log('✅ User is complete. You should be able to login.');
      return;
    }

    console.log('⚠️  Auth user exists but profile is missing.');
    console.log('🗑️  Deleting incomplete auth user...');

    // 3. Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return;
    }

    console.log('✅ Auth user deleted successfully!');
    console.log('\n✨ You can now register again with this email.\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixUser();
