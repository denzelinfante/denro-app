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

  export const STORAGE_BUCKET = "denro_app";
   export const STORAGE_BUCKET1 = "geo-tagged-photos";