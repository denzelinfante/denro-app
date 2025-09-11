// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
export const USER_KEY = 'denro:user';
export type DenroUser = {
  id: number;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  region_id: number | null;
  penro_id: number | null;
  cenro_id: number | null;
};

export const SESSION_KEY = 'denr_user_session';
export const ENUM_ID_KEY = 'denr_enumerator_id';

export async function saveUser(user: DenroUser) {
  await AsyncStorage.multiSet([
    [SESSION_KEY, JSON.stringify(user)],
    [ENUM_ID_KEY, String(user.id)], // used by Templates_Screen as enumerator_id
  ]);
}

export async function getCurrentUser(): Promise<DenroUser | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as DenroUser) : null;
}


export async function getEnumeratorId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ENUM_ID_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([SESSION_KEY, ENUM_ID_KEY]);
}


export async function signOutLocal() {
  await AsyncStorage.removeItem(USER_KEY);
}