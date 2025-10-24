// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
export const USER_KEY = 'denro:user';
export interface DenroUser {
  id: number;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
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