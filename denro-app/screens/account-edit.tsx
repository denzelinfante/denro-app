// screens/AccountEditScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import "react-native-url-polyfill/auto";
import { useRouter } from "expo-router";
import { supabase, STORAGE_BUCKET } from "@/utils/supabase";
import { getCurrentUser, DenroUser, saveUser } from "@/utils/session";

(global as any).Buffer = (global as any).Buffer || require("buffer").Buffer;

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  profile_pic: string | null;
  role: string;
  username: string;
};

export default function AccountEditScreen() {
  const router = useRouter();
  const [me, setMe] = useState<DenroUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Load current user info
  const loadProfile = async () => {
    try {
      const local = await getCurrentUser();
      if (!local || !local.id) {
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/login");
        return;
      }
      setMe(local);

      const { data, error } = await supabase.rpc("get_user_by_id", { p_id: local.id });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Profile not found.");

      const user = data[0] as UserRow;
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone_number ?? "");
      setAvatarUrl(user.profile_pic ?? "");
      await saveUser(user);
    } catch (e: any) {
      console.error("❌ Load error:", e);
      Alert.alert("Error", e.message ?? "Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ✅ Upload or update profile picture
  const pickImage = async () => {
    if (!me?.id) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to set picture.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled || !res.assets?.length) return;

    setUploading(true);
    try {
      const fileUri = res.assets[0].uri;
      const ext = fileUri.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
      let mime = "image/jpeg";
      if (ext === "png") mime = "image/png";
      if (ext === "gif") mime = "image/gif";
      if (ext === "webp") mime = "image/webp";

      const uid = me.id; // no auth.uid() needed
      const path = `profiles/user_${uid}/avatar.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileData = decode(base64);

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, fileData, { contentType: mime, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl ?? "";

      const { error: updErr, data } = await supabase.rpc("update_user_profile_pic", {
        p_id: me.id,
        p_url: publicUrl,
      });
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      if (data && data.length > 0) await saveUser(data[0]);
      Alert.alert("Success", "Profile picture uploaded!");
    } catch (e: any) {
      console.error("❌ Upload error:", e);
      Alert.alert("Upload failed", e?.message ?? "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Remove profile picture
  const removePhoto = async () => {
    if (!me?.id) return;

    Alert.alert("Confirm", "Remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const { error, data } = await supabase.rpc("delete_user_profile_pic", {
              p_id: me.id,
            });
            if (error) throw error;

            setAvatarUrl("");
            if (data && data.length > 0) await saveUser(data[0]);
            Alert.alert("Removed", "Profile photo removed.");
          } catch (e: any) {
            console.error("❌ Remove error:", e);
            Alert.alert("Failed", e?.message ?? "Could not remove photo.");
          }
        },
      },
    ]);
  };

  // ✅ Validate profile fields
  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing info", "Enter both first and last name.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Missing email", "Enter email.");
      return false;
    }
    const emailPattern = /^[^\s@]+@(gmail\.com|denr\.gov\.ph)$/;
    if (!emailPattern.test(email)) {
      Alert.alert("Invalid email", "Only @gmail.com or @denr.gov.ph allowed.");
      return false;
    }

    if (phone.trim() && phone.trim().length !== 11) {
  Alert.alert("Invalid phone number", "Phone number must be exactly 11 digits.");
  return false;
}
    return true;

    
  };

  // ✅ Save profile info
  const saveProfile = async () => {
    if (!me?.id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("update_user_profile", {
        p_id: me.id,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_email: email.trim(),
        p_phone: phone.trim(),
      });
      if (error) throw error;

      if (data && data.length > 0) await saveUser(data[0]);
      setIsEditing(false);
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (e: any) {
      console.error("❌ Save error:", e);
      Alert.alert("Error", e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onPrimaryPress = () => {
    if (!isEditing) setIsEditing(true);
    else saveProfile();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View style={styles.topBar}>
        <Image source={require("../assets/images/denr-logo.png")} style={styles.logo} />
        <Text style={styles.appName}>DENR GeoCam</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.logoutBtn}>
          <Ionicons name="chevron-back" size={24} color="#008B8B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Personal Information</Text>

      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person-circle-outline" size={90} color="#008B8B" />
              </View>
            )}

            <View style={styles.avatarActions}>
  {isEditing ? (
    <>
      <TouchableOpacity
        style={[styles.iconAction, uploading && styles.uploadBtnDisabled]}
        onPress={pickImage}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="camera" size={18} color="#fff" />
        )}
      </TouchableOpacity>

      {avatarUrl ? (
        <TouchableOpacity
          style={[styles.iconAction, { backgroundColor: "#c00" }]}
          onPress={removePhoto}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </>
  ) : (
    <TouchableOpacity
      style={[styles.uploadBtn, styles.uploadBtnDisabled]}
      disabled={true}
    >
      <Text style={styles.uploadBtnText}>Upload Disabled (Edit mode off)</Text>
    </TouchableOpacity>
  )}
</View>

          </View>
        </View>

        <Text style={styles.label}>First Name</Text>
        <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={firstName} onChangeText={setFirstName} editable={isEditing} />

        <Text style={styles.label}>Last Name</Text>
        <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={lastName} onChangeText={setLastName} editable={isEditing} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={isEditing} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={phone} onChangeText={setPhone} keyboardType={Platform.select({ ios: "number-pad", android: "phone-pad" })} editable={isEditing} />

        <TouchableOpacity style={styles.primaryBtn} onPress={onPrimaryPress} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isEditing ? "Save Changes" : "Edit"}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },

  // === HEADER ===
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: { width: 40, height: 40, resizeMode: "contain" },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginLeft: -40,
  },
  logoutBtn: { padding: 6 },

  // === SECTIONS ===
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#004d40",
  },

  // === CARD ===
  card: {
    backgroundColor: "#DFFFD8",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 12,
    padding: 14,
    elevation: 3,
  },

  // === AVATAR ===
  avatarRow: { alignItems: "center", marginBottom: 12 },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#4CAF50",
    backgroundColor: "#fff",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#4CAF50",
    backgroundColor: "#f0fdf4",
  },

  // === ACTION BUTTONS BELOW PHOTO ===
  avatarActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  iconAction: {
    backgroundColor: "#008B8B",
    padding: 10,
    borderRadius: 25,
  },
  uploadBtn: {
    backgroundColor: "#008B8B",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadBtnDisabled: {
    backgroundColor: "#a0a0a0",
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // === INPUT FIELDS ===
  label: { fontWeight: "700", color: "#2b2b2b", marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#2b2b2b",
  },
  inputDisabled: {
    backgroundColor: "#f2f2f2",
    color: "#777",
  },

  // === SAVE/EDIT BUTTON ===
  primaryBtn: {
    backgroundColor: "#008B8B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnDisabled: { backgroundColor: "#a0a0a0" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
