// screens/account-edit.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  Alert, Platform, ActivityIndicator, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import "react-native-url-polyfill/auto";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { getCurrentUser, DenroUser, signOutLocal, saveUser } from "@/utils/session";

// Ensure Buffer exists if some dependency needs it
(global as any).Buffer = (global as any).Buffer || require("buffer").Buffer;

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  profile_pic: string | null;
  role: string;
};

export default function AccountEditScreen() {
  const router = useRouter();
  const [me, setMe] = useState<DenroUser | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("Juan");
  const [lastName, setLastName]   = useState("Dela Cruz");
  const [email, setEmail]         = useState("juan.delacruz@example.com");
  const [phone, setPhone]         = useState("09XXXXXXXXX");
  const [avatarUrl, setAvatarUrl] = useState("");

  // UI state
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // single toggle

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) {
          Alert.alert("Session expired", "Please log in again.");
          router.replace("/login");
          return;
        }
        setMe(u);

        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, phone_number, profile_pic, role")
          .eq("id", u.id)
          .single<UserRow>();

        if (error) throw error;

        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone_number ?? "");
        setAvatarUrl(data.profile_pic ?? "");
      } catch (e: any) {
        Alert.alert("Load failed", e?.message ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Pick & upload avatar (only when editing)
  const pickImage = async () => {
    if (!isEditing) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to set picture.");
      return;
    }

    const hasNewAPI = "MediaType" in (ImagePicker as any);
    const pickerOpts: any = hasNewAPI
      ? { mediaTypes: [(ImagePicker as any).MediaType.Images], allowsEditing: true, aspect: [1, 1], quality: 0.85 }
      : { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 };

    const res = await ImagePicker.launchImageLibraryAsync(pickerOpts);
    if (res.canceled || !me?.id) return;

    setUploading(true);
    try {
      const fileUri = res.assets[0].uri;
      const ext  = fileUri.split("?")[0].split(".").pop() || "jpg";
      const mime = ext.toLowerCase() === "png" ? "image/png" : "image/jpeg";
      const path = `avatars/${me.id}/${Date.now()}.${ext}`;

      // Read local file as base64 -> ArrayBuffer (most reliable on devices)
      const base64   = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      const fileData = decode(base64);

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, fileData, { contentType: mime, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl ?? "";

      // Save URL to users.profile_pic
      const { error: updErr } = await supabase
        .from("users")
        .update({ profile_pic: publicUrl })
        .eq("id", me.id);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      Alert.alert("Updated", "Profile picture updated.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing name", "Enter both first and last name.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Missing email", "Enter email.");
      return false;
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return false;
    }
    return true;
  };

  const saveProfileServer = async () => {
    if (!me?.id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          email:      email.trim(),
          phone_number: phone.trim(),
        })
        .eq("id", me.id);

      if (error) throw error;

      // Update local session immediately (Home will read this)
      await saveUser({ ...me, first_name: firstName.trim(), last_name: lastName.trim() });

      // Lock fields again & flip button back to "Edit"
      setIsEditing(false);

      Alert.alert("Saved", "Profile updated successfully.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Single button handler (Edit <-> Save Changes)
  const onPrimaryPress = () => {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      // currently editing -> save
      if (!saving) saveProfileServer();
    }
  };

  const handleLogout = async () => {
    await signOutLocal();
    router.replace("/login");
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View style={styles.topBar}>
        <Image source={require("../assets/images/denr-logo.png")} style={styles.logo} />
        <Text style={styles.appName}>DENR GeoCam</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { alignSelf: "flex-start" }]}>Personal Information</Text>

      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color="#008B8B" />
              </View>
            )}
            <TouchableOpacity
              style={[styles.editBadge, !isEditing && { opacity: 0.5 }]}
              onPress={pickImage}
              disabled={!isEditing || uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Fields — read-only until "Edit" */}
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={firstName}
          onChangeText={setFirstName}
          editable={isEditing}
          placeholder="Enter first name"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={lastName}
          onChangeText={setLastName}
          editable={isEditing}
          placeholder="Enter last name"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={isEditing}
          placeholder="Enter email"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={phone}
          onChangeText={setPhone}
          keyboardType={Platform.select({ ios: "number-pad", android: "phone-pad" })}
          editable={isEditing}
          placeholder="Enter phone number"
          placeholderTextColor="#666"
        />

        {/* Single toggle button */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            saving && { opacity: 0.6 },
          ]}
          onPress={onPrimaryPress}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isEditing ? "Save Changes" : "Edit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  logo: { width: 40, height: 40, resizeMode: "contain" },
  appName: { fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center", marginLeft: -40 },
  logoutBtn: { padding: 6 },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  card: { backgroundColor: "#DFFFD8", borderWidth: 1, borderColor: "#4CAF50", borderRadius: 12, padding: 14 },

  avatarRow: { alignItems: "center", marginBottom: 12 },
  avatarWrap: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 96, backgroundColor: "#fff", borderWidth: 2, borderColor: "#4CAF50" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 32,
    backgroundColor: "#008B8B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#DFFFD8",
  },

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
  inputDisabled: { backgroundColor: "#f2f2f2", color: "#777" },

  primaryBtn: {
    backgroundColor: "#008B8B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
});
