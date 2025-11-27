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

    setLoading(true);
    try {
<<<<<<< HEAD
      // ✅ Call your secure RPC in Supabase
=======
      setLoading(true);

      // Call your RPC
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
      const { data, error } = await supabase.rpc('auth_login', {
        p_username: username.trim(),
        p_password: password,
      });

      if (error) {
        console.error('RPC error:', error);
        Alert.alert('Login failed', 'Something went wrong.');
        return;
      }

<<<<<<< HEAD
      const row = (data as DenroUser[] | null)?.[0];
=======
      const row = (data as any[] | null)?.[0];
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
      if (!row) {
        Alert.alert('Login failed', 'Invalid username or password.');
        return;
      }

<<<<<<< HEAD
      // ✅ Save user to session (local storage)
      await saveUser(row);

      // ✅ Navigate after successful login
      router.replace('/home');
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Error', err.message ?? 'Something went wrong.');
=======
      // Save to local session (saveUser will handle bigint conversion)
      await saveUser(row);

      // Go to your app (home or dashboard)
      router.replace('/home');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Login error', e?.message ?? 'Could not login.');
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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
<<<<<<< HEAD
          <Image
            source={require('../assets/images/DENR.png')}
            style={styles.logo}
          />
=======
          <Image source={require('../assets/images/DENR.png')} style={styles.logo} />
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6

          <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

<<<<<<< HEAD
            {/* Username */}
=======
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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

<<<<<<< HEAD
            {/* Password */}
=======
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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
<<<<<<< HEAD
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
=======
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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

<<<<<<< HEAD
            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() =>
                Alert.alert(
                  'Forgot password',
                  'Please contact an administrator to reset your password.'
                )
              }
=======
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Forgot password', 'Please contact an administrator to reset your password.')}
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

<<<<<<< HEAD
            {/* Login button */}
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
=======
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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
<<<<<<< HEAD
  logo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    resizeMode: 'contain',
    opacity: 0.9,
  },
=======
  logo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, resizeMode: 'contain', opacity: 0.9 },
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
  container: {
    marginTop: 'auto',
    marginBottom: 100,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
<<<<<<< HEAD
=======
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
<<<<<<< HEAD
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
=======
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
  },
  input: {
<<<<<<< HEAD
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#005288',
    fontSize: 16,
    color: '#333',
=======
    backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#005288', fontSize: 16, color: '#333',
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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
<<<<<<< HEAD
=======
  iconText: { fontSize: 18 },
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotText: {
    color: '#005288',
    fontSize: 14,
    fontWeight: '600',
<<<<<<< HEAD
  },
  button: {
    backgroundColor: '#005288',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
=======
  },
  button: { backgroundColor: '#005288', paddingVertical: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 1 },
});
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
