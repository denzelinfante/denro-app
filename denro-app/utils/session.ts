// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
<<<<<<< HEAD

export const SESSION_KEY = 'denr_user_session';
export const ENUM_ID_KEY = 'denr_enumerator_id';

export type DenroUser = {
=======
export const USER_KEY = 'denro:user';
export interface DenroUser {
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
  id: number;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
<<<<<<< HEAD
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
=======
  region_id: number | null;
  penro_id: number | null;
  cenro_id: number | null;
}

export const SESSION_KEY = 'denr_user_session';
export const ENUM_ID_KEY = 'denr_enumerator_id';

export async function saveUser(user: any): Promise<void> {
  // Convert all bigint fields to numbers
  const normalizedUser: DenroUser = {
    id: Number(user.id),
    username: user.username,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    region_id: user.region_id ? Number(user.region_id) : null,
    penro_id: user.penro_id ? Number(user.penro_id) : null,
    cenro_id: user.cenro_id ? Number(user.cenro_id) : null,
  };
  
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
>>>>>>> 25d1716bcb0d4f926ecd0234a11e3d7dcf9845a6
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
