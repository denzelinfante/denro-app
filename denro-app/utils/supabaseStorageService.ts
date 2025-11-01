// services/SupabaseStorageService.ts

// Lightweight MIME type resolver for React Native (avoid node-only 'mime' package)
function getMimeTypeFromPath(path?: string): string | null {
  if (!path) return null;
  const parts = path.split('.');
  if (parts.length === 0) return null;
  const ext = parts.pop()!.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
  };
  return map[ext] || null;
}
import { decode } from "base64-arraybuffer";
import * as FileSystem from 'expo-file-system';
import { supabase } from "./supabase";
import { SUPABASE_URL } from './supabase';

export class SupabaseStorageService {
  /**
   * Upload a file (local URI or base64 data) to Supabase Storage.
   *
   * @param file - Can be a local URI, base64 string, or Blob.
   * @param destinationPath - Path in the bucket (e.g. "uploads/image.png").
   * @param bucketName - Supabase storage bucket name.
   */
  static async saveFile(
    file: string | Blob,
    destinationPath: string,
    bucketName: string
  ): Promise<{
    path: string;
    publicUrl: string | null;
    raw: any;
  }> {
    try {
      let fileData: ArrayBuffer | Blob;
      let contentType: string | undefined;

      // If it's a base64 string
      if (typeof file === "string" && file.startsWith("data:")) {
        const matches = file.match(/^data:(.+);base64,(.*)$/);
        if (!matches) throw new Error("Invalid base64 data URI");
        contentType = matches[1];
        fileData = decode(matches[2]);
      }
      // If it's a file path or URL (e.g., from Expo ImagePicker or remote URL)
      else if (typeof file === "string") {
        // Remote http(s) URL: use fetch
        if (file.startsWith('http://') || file.startsWith('https://')) {
          const response = await fetch(file);
          if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
          fileData = await response.blob();
          contentType = getMimeTypeFromPath(destinationPath) || (fileData as any).type;
        } else {
          // Local file URI (file:// or content:// or absolute path) — fetch may fail on native runtimes.
          // Use Expo FileSystem to read as base64, then convert to ArrayBuffer for upload.
          try {
            const b64 = await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.Base64 });
            fileData = decode(b64);
            contentType = getMimeTypeFromPath(destinationPath) || undefined;
          } catch (fsErr) {
            // Last resort: try fetch (sometimes works on some platforms)
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Fetch failed for local file: ${response.status} ${response.statusText}`);
            fileData = await response.blob();
            contentType = getMimeTypeFromPath(destinationPath) || (fileData as any).type;
          }
        }
      }
      // Otherwise assume Blob
      else {
        fileData = file;
  contentType = (file as any).type || getMimeTypeFromPath(destinationPath) || undefined;
      }

      const options = {
        contentType,
        upsert: false,
      };

      // Ensure we pass a Blob or supported binary type to the Supabase client.
      let uploadPayload: any = fileData;
      try {
        if (fileData instanceof ArrayBuffer) {
          // Convert ArrayBuffer -> Blob for browser/RN environments
          uploadPayload = new Blob([fileData], { type: contentType || 'application/octet-stream' });
        }
      } catch (convErr) {
        // If Blob constructor isn't available, try Uint8Array fallback
        try {
          if (fileData instanceof ArrayBuffer) {
            uploadPayload = new Uint8Array(fileData);
          }
        } catch (fErr) {
          // leave uploadPayload as-is
          console.warn('Could not convert fileData to Blob/Uint8Array, proceeding with original payload', fErr);
        }
      }

      console.log(`SupabaseStorageService: attempting connectivity check to Supabase URL before upload...`);
      try {
        // quick HEAD to Supabase URL to detect network reachability
        const probe = await fetch(SUPABASE_URL, { method: 'HEAD' });
        console.log('Supabase connectivity probe status:', probe.status);
      } catch (probeErr) {
        console.error('Supabase connectivity probe failed:', probeErr);
        // Continue to upload attempt, but surface the probe failure in logs.
      }

      console.log(`SupabaseStorageService: uploading to bucket='${bucketName}' path='${destinationPath}' contentType='${contentType}'`);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(destinationPath, uploadPayload, options);

      // Some Supabase SDK error shapes don't expose a typed statusCode in this environment.
      // Use a loose any-check so TypeScript doesn't complain, but still allow 409/duplicate handling.
      if (error && (error as any).statusCode !== 409 && (error as any).statusCode !== '409') {
        throw new Error(`Error uploading file: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(destinationPath);

      return {
        path: destinationPath,
        publicUrl: publicUrlData?.publicUrl || null,
        raw: data,
      };
    } catch (e: any) {
      throw new Error(`Failed to upload file: ${e.message}`);
    }
  }

  /**
   * Remove a file from Supabase Storage.
   *
   * @param destinationPath - Path to file (e.g. "uploads/image.png").
   * @param bucketName - Supabase storage bucket name.
   */
  static async removeFile(
    destinationPath: string,
    bucketName: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([destinationPath]);

      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error("Failed to remove file:", e.message);
      throw e;
    }
  }
}