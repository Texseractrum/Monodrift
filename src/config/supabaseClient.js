import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

// Initialize the Supabase client
export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Log connection info in debug mode
if (config.game.debugMode) {
  console.log('Supabase Client Initialized:');
  console.log('- URL:', config.supabase.url);
  console.log('- Using anon key:', config.supabase.anonKey ? '✓ (Key exists)' : '✗ (Key missing)');
} 