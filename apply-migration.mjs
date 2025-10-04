import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSql(sql) {
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    if (error) {
      console.error('SQL Error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Execution error:', err);
    return false;
  }
}

async function main() {
  console.log('Reading migration file...');
  const sql = readFileSync('./complete_migration_keep_storage.sql', 'utf8');

  console.log('Applying migration...');
  const success = await executeSql(sql);

  if (success) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log('❌ Migration failed');
    process.exit(1);
  }
}

main();
