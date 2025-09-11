// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase'; // adjust if your path is '@/utils/supabase'

type AuthRow = {
  id: number;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  region_id: number | null;
  penro_id: number | null;
  cenro_id: number | null;
};

const SESSION_KEY = 'denr_user_session';
const ENUM_ID_KEY = 'denr_enumerator_id';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const u = username.trim();
    if (!u || !password) {
      Alert.alert('Missing fields', 'Please enter username and password.');
      return;
    }

    try {
      setLoading(true);

      // ❗ No generics here — let’s cast after the call
      const { data, error } = await supabase.rpc('auth_login', {
        p_username: u,
        p_password: password,
      });

      if (error) throw error;

      const row = ((data as AuthRow[] | null) ?? [])[0] || null;
      if (!row) {
        Alert.alert('Login failed', 'Invalid username or password.');
        return;
      }

      // Cache for other screens (Template_Screen reads ENUM_ID_KEY)
      await AsyncStorage.multiSet([
        [SESSION_KEY, JSON.stringify(row)],
        [ENUM_ID_KEY, String(row.id)],
      ]);

      router.replace('/home');
    } catch (e: any) {
      console.error(e);
      const msg =
        typeof e?.message === 'string' ? e.message : 'Could not login. Please try again.';
      // Helpful hint if permissions are the culprit
      if (/permission denied|execute/i.test(msg)) {
        Alert.alert(
          'Login error',
          'Permission denied for auth_login(). In SQL, run:\nGRANT EXECUTE ON FUNCTION auth_login(text, text) TO anon, authenticated;'
        );
      } else {
        Alert.alert('Login error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      <Image source={require('../assets/images/DENR.png')} style={styles.logo} />
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          placeholder="Enter your username"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />

        <TextInput
          placeholder="Enter your password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#666"
          textContentType="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  background: { flex: 1, width, height, position: 'relative', backgroundColor: '#fff', overflow: 'hidden' },
  logo: { position: 'absolute', width, height, resizeMode: 'contain', opacity: 0.9, bottom: 160 },
  container: {
    position: 'absolute', bottom: 50, left: 0, right: 0, height: 363, padding: 25, borderRadius: 20,
    overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.5)', shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#ccc', fontSize: 16, color: '#333',
  },
  button: { backgroundColor: '#005288', paddingVertical: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 1 },
});
