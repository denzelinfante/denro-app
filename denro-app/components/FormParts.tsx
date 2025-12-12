import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

/* ---------- Small helpers ---------- */
export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={{ fontWeight: "700", marginBottom: 8 }}>{title}</Text>
    {children}
  </View>
);

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontWeight: "600", marginBottom: 6 }}>{label}</Text>
    {children}
  </View>
);

export const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor="#94a3b8"
    style={{
      borderWidth: 1,
      borderColor: "#cbd5e1",
      backgroundColor: "#fff",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    }}
    {...props}
  />
);

export const RadioPill = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: selected ? "#0ea5e9" : "#cbd5e1",
      backgroundColor: selected ? "#e0f2fe" : "#fff",
      marginRight: 6,
      marginBottom: 6,
    }}
  >
    <Text style={{ color: selected ? "#075985" : "#0f172a", fontWeight: selected ? "700" : "400" }}>{label}</Text>
  </TouchableOpacity>
);

export const CheckBox = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
  <TouchableOpacity onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
    <View
      style={{
        width: 18,
        height: 18,
        borderWidth: 1,
        borderColor: "#334155",
        marginRight: 8,
        backgroundColor: checked ? "#0ea5e9" : "#fff",
      }}
    />
    <Text>{label}</Text>
  </TouchableOpacity>
);
