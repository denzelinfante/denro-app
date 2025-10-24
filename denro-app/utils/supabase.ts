import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';




const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log(supabaseUrl);
console.log(supabaseAnonKey);


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});


// UPDATED: Changed from 'geo-images' to 'geo-tagged-photos'
export const STORAGE_BUCKET = 'geo-tagged-photos';

// Optionally ensure an authenticated session for storage uploads.
// If there is no current session and fallback credentials are provided
// via EXPO_PUBLIC_UPLOAD_EMAIL and EXPO_PUBLIC_UPLOAD_PASSWORD, sign in.
export async function ensureAuthForUploads() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    const email = process.env.EXPO_PUBLIC_UPLOAD_EMAIL;
    const password = process.env.EXPO_PUBLIC_UPLOAD_PASSWORD;
    if (email && password) {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return signInData.session ?? null;
    }
  } catch (e) {
    // Swallow to allow callers to decide behavior (e.g., rely on bucket policies)
    console.warn('ensureAuthForUploads failed or not configured:', e);
  }
  return null;
}


export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    console.log('URL:', supabaseUrl)
    console.log('Key exists:', !!supabaseAnonKey)
    
    // Test database connection
    const { data, error } = await supabase.from('geo_tagged_images').select('count').limit(1)
    if (error) {
      console.error('Database test failed:', error)
    } else {
      console.log('Database connection: OK')
    }
    
    // Test storage connection
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    if (storageError) {
      console.error('Storage test failed:', storageError)
    } else {
      console.log('Storage connection: OK')
      console.log('Available buckets:', buckets?.map(b => b.name))
    }
    
    return true
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}