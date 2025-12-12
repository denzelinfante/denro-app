// screens/Enumerators/EnumRep2.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Section, Input, CheckBox } from "../../components/FormParts";

const TYPE_OPTIONS = [
  "Hotel",
  "Water refilling station",
  "Pharmacy/Drug Store",
  "Garden/Farm",
  "Room accommodation/lodging/rest house",
  "Merchandising/enterprise",
  "Resort",
  "Internet shop",
  "Coffee shop",
  "Motor shop",
  "Recreational",
  "Telecommunication",
  "Restaurant",
  "Gasoline Station",
  "Nature Camp",
  "Others",
];

interface FormData {
  establishmentTypes: Record<string, boolean>;
  establishmentOther: string;
  establishmentNotes: string;
  [key: string]: any;
}

interface EnumRep2Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  setCurrentPage: (page: number) => void;
}

export default function EnumRep2({
  formData,
  updateFormData,
  setCurrentPage,
}: EnumRep2Props) {
  const toggleType = (type: string) => {
    const newTypes = { ...formData.establishmentTypes };
    newTypes[type] = !newTypes[type];
    updateFormData({ establishmentTypes: newTypes });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        style={{ backgroundColor: "#fff" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Type of commercial establishment/facility/structure">
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {TYPE_OPTIONS.map((type) => (
              <View key={type} style={{ width: "50%", padding: 4 }}>
                <CheckBox 
                  label={type} 
                  checked={!!formData.establishmentTypes[type]} 
                  onToggle={() => toggleType(type)} 
                />
              </View>
            ))}
          </View>
          
          {formData.establishmentTypes["Others"] && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, marginBottom: 6, fontWeight: "500" }}>
                Specify Others
              </Text>
              <Input 
                value={formData.establishmentOther} 
                onChangeText={(text) => updateFormData({ establishmentOther: text })} 
                placeholder="Please specify..."
              />
            </View>
          )}
        </Section>

        <Section title="Additional Notes">
          <Input 
            value={formData.establishmentNotes} 
            onChangeText={(text) => updateFormData({ establishmentNotes: text })} 
            multiline 
            style={{ height: 90 }}
            placeholder="Any additional notes about the establishment..."
          />
        </Section>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#6b7280",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={() => setCurrentPage(1)}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#0ea5e9",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={() => setCurrentPage(3)}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}