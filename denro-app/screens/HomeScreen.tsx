// screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { Ionicons, Entypo, FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SettingsMenu from '../components/SettingsMenu';
import { getCurrentUser, signOutLocal, DenroUser } from '../utils/session';
import { loadProfile } from '../utils/profile';

export default function HomeScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>(); // cache-buster
  const [menuVisible, setMenuVisible] = useState(false);
  const [fullName, setFullName] = useState('User');
  const [role, setRole] = useState('—');

  const loadHeaderInfo = useCallback(async () => {
    const user: DenroUser | null = await getCurrentUser();

    if (user) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'User';
      setFullName(name);
      setRole(user.role ?? '—');
      return;
    }

    // Fallback if no session user
    const profile = await loadProfile();
    const profileName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    setFullName(profileName || 'User');
    setRole('—');
  }, []);

  useFocusEffect(useCallback(() => { loadHeaderInfo(); }, [loadHeaderInfo]));
  useEffect(() => { loadHeaderInfo(); }, [refresh, loadHeaderInfo]);

  const handleLogout = async () => {
    await signOutLocal();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Image source={require('../assets/images/denr-logo.png')} style={styles.logo} />
        <Text style={styles.appName}>DENR GeoCam</Text>
        <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={styles.settingsIcon}>
          <Ionicons name="settings-sharp" size={24} color="black" />
        </Pressable>
      </View>

      {/* Top nav */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.push('/home')}><Text style={styles.navLink}>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/dashboard')}><Text style={styles.navLink}>Dashboard</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/form')}><Text style={styles.navLink}>Form</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}><Text style={styles.navLink}>Logout</Text></TouchableOpacity>
      </View>

      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>WELCOME!</Text>
        <Text style={styles.username}>{fullName}</Text>
        <Text style={styles.role}>{role}</Text>
      </View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>

        <TouchableOpacity style={styles.navIcon} onPress={() => router.push('../Templates_Screen')}><Entypo name="list" size={24} color="black" /><Text>Template</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.navIcon, styles.activeIcon]} onPress={() => router.push('/camera')}><Ionicons name="camera" size={24} color="black" /><Text>Camera</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/CollectionScreen')}><FontAwesome name="image" size={24} color="black" /><Text>Collection</Text></TouchableOpacity>

        {/* <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/FormStartSubmission')}>
          <Entypo name="list" size={24} color="black" />
          <Text>Template</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navIcon, styles.activeIcon]} onPress={() => router.push('/camera')}>
          <Ionicons name="camera" size={24} color="black" />
          <Text>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/CollectionScreen')}>
          <FontAwesome name="image" size={24} color="black" />
          <Text>Collection</Text>
        </TouchableOpacity> */}

      </View>

      <SettingsMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50', margin: 10
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 40, height: 40 },
  appName: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginLeft: -40 },
  settingsIcon: { alignSelf: 'flex-end' },
  navRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, marginBottom: 20 },
  navLink: { color: '#008B8B', fontSize: 14, fontWeight: '600' },
  welcomeSection: { alignItems: 'center', marginTop: 40 },
  welcomeText: { fontSize: 28, fontWeight: '900' },
  username: { fontSize: 20, fontWeight: 'bold', textDecorationLine: 'underline', marginTop: 6 },
  role: { fontSize: 14, color: '#222', marginTop: 2 },
  bottomNav: {
    position: 'absolute', bottom: 30, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20
  },
  navIcon: {
    alignItems: 'center', backgroundColor: '#fff', padding: 10,
    borderRadius: 12, borderWidth: 2, borderColor: '#4CAF50', width: 90
  },
  activeIcon: { backgroundColor: '#DFFFD8' },
});
