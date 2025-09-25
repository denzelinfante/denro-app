import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, STORAGE_BUCKET } from './supabase';

export async function uploadImageFromUri(uri: string, userId: string) {
  const fileName = `geo-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  // Convert local file:// URI → blob
  const res = await fetch(uri);
  const buffer = await res.arrayBuffer();

  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // If public bucket:
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return { path: filePath, publicUrl: urlData.publicUrl };
}


const KEY = 'submissions';

export type Submission = {
  id: number;
  form: string;       // e.g. 'D. Residential'
  note?: string;
  createdAt: string;  // ISO
};

export async function getSubmissions(): Promise<Submission[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addSubmission(entry: Omit<Submission, 'id'|'createdAt'>) {
  const list = await getSubmissions();
  const newItem: Submission = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  list.unshift(newItem);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return newItem;
}

export async function clearSubmissions() {
  await AsyncStorage.removeItem(KEY);
}
