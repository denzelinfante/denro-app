// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_KEY = 'denr_user_session';
export const ENUM_ID_KEY = 'denr_enumerator_id';

export type DenroUser = {
  id: number;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  region_id?: number | null;
  penro_id?: number | null;
  cenro_id?: number | null;
  profile_pic?: string | null; // ✅ profile picture support
};

// ✅ Save user to AsyncStorage
export async function saveUser(user: DenroUser) {
  await AsyncStorage.multiSet([
    [SESSION_KEY, JSON.stringify(user)],
    [ENUM_ID_KEY, String(user.id)], // used as enumerator_id
  ]);
}

// ✅ Get current user object
export async function getCurrentUser(): Promise<DenroUser | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as DenroUser) : null;
}

// ✅ Get enumerator ID only
export async function getEnumeratorId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ENUM_ID_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

// ✅ Clear all session keys
export async function clearSession() {
  await AsyncStorage.multiRemove([SESSION_KEY, ENUM_ID_KEY]);
}

// ✅ Sign out (alias for clearSession)
export async function signOutLocal() {
  await clearSession();
}
