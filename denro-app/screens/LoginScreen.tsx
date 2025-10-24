import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { saveUser, DenroUser } from '../utils/session';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter username and password.');
      return;
    }

    try {
      setLoading(true);

      // Call your RPC
      const { data, error } = await supabase.rpc('auth_login', {
        p_username: username.trim(),
        p_password: password,
      });

      if (error) throw error;

      const row = (data as any[] | null)?.[0];
      if (!row) {
        Alert.alert('Login failed', 'Invalid username or password.');
        return;
      }

      // Save to local session (saveUser will handle bigint conversion)
      await saveUser(row);

      // Go to your app (home or dashboard)
      router.replace('/home');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Login error', e?.message ?? 'Could not login.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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
              returnKeyType="next"
            />

            <View style={styles.inputRow}>
              <TextInput
                placeholder="Enter your password"
                style={[styles.input, styles.inputWithIcon]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#666"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.iconButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#005288"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Forgot password', 'Please contact an administrator to reset your password.')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  background: { flex: 1, position: 'relative', backgroundColor: '#fff' },
  logo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, resizeMode: 'contain', opacity: 0.9 },
  container: {
    marginTop: 'auto',
    marginBottom: 100,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#005288', fontSize: 16, color: '#333',
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotText: {
    color: '#005288',
    fontSize: 14,
    fontWeight: '600',
  },
  button: { backgroundColor: '#005288', paddingVertical: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 1 },
});