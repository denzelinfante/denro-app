// services/SupabaseStorageService.ts

import * as Mime from "mime";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

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
      // If it's a file path (e.g., from Expo ImagePicker)
      else if (typeof file === "string") {
        const response = await fetch(file);
        fileData = await response.blob();
        contentType = Mime.getType(destinationPath) || fileData.type;
      }
      // Otherwise assume Blob
      else {
        fileData = file;
        contentType = (file as any).type || Mime.getType(destinationPath) || undefined;
      }

      const options = {
        contentType,
        upsert: false,
      };

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(destinationPath, fileData, options);

      if (error && error.statusCode !== "409") {
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