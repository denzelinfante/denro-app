// screens/Enumerators/EnumRep1.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useRouter } from "expo-router";
import { Section, Field, Input, RadioPill } from "../../components/FormParts";

const ZONES = ["MUZ", "SPZ"];
const STATUS_OPTIONS = [
  "functional",
  "under renovation",
  "under construction",
  "dilapidated",
  "abandoned",
];

interface FormData {
  paId: number | null;
  proponentName: string;
  proponentContact: string;
  proponentEmail: string;
  proponentAddress: string;
  location: string;
  lotStatus: string;
  landClassification: string;
  titleNo: string;
  lotNo: string;
  lotOwner: string;
  areaCovered: string;
  managementZone: "MUZ" | "SPZ" | "";
  withinEasement: boolean;
  establishmentStatus: string;
  latitude: string;
  longitude: string;
  primaryGeoImageId: number | null;
  allImageIds: number[];
  [key: string]: any;
}

interface EnumRep1Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  paItems: { label: string; value: number }[];
  paOpen: boolean;
  setPaOpen: React.Dispatch<React.SetStateAction<boolean>>; // ✅ FIXED
  setCurrentPage: (page: number) => void;
}

export default function EnumRep1({
  formData,
  updateFormData,
  paItems,
  paOpen,
  setPaOpen,
  setCurrentPage,
}: EnumRep1Props) {
  const todayLabel = new Date().toISOString().slice(0, 10);
  const router = useRouter();

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
        <Section title="Protected Area">
          <DropDownPicker
            placeholder="Select Protected Area"
            items={paItems}
            open={paOpen}
            value={formData.paId}
            setOpen={setPaOpen} // ✅ Works now
            setValue={(callback) => {
              const value = typeof callback === "function" ? callback(formData.paId) : callback;
              updateFormData({ paId: value });
            }}
            setItems={() => {}}
            style={{ borderColor: "#cbd5e1", backgroundColor: "#fff" }}
            containerStyle={{ zIndex: 100 }}
            listMode="MODAL"
            modalProps={{ animationType: "slide" }}
          />

        </Section>

        <Section title="Report Details">
          <Field label="Date">
            <View
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#0f172a" }}>{todayLabel}</Text>
            </View>
          </Field>
        </Section>

        <Section title="Proponent / Owner">
          <Field label="Name *">
            <Input 
              value={formData.proponentName} 
              onChangeText={(text) => updateFormData({ proponentName: text })} 
            />
          </Field>
          <Field label="Contact No.">
            <Input 
              value={formData.proponentContact} 
              onChangeText={(text) => updateFormData({ proponentContact: text })} 
              keyboardType="phone-pad" 
            />
          </Field>
          <Field label="Email (Optional)">
            <Input 
              value={formData.proponentEmail} 
              onChangeText={(text) => updateFormData({ proponentEmail: text })} 
              keyboardType="email-address" 
            />
          </Field>
          <Field label="Address (Optional)">
            <Input 
              value={formData.proponentAddress} 
              onChangeText={(text) => updateFormData({ proponentAddress: text })} 
              multiline
              style={{ height: 60 }}
            />
          </Field>
        </Section>

        <Section title="Location & Tenure">
          <Field label="Location *">
            <Input 
              value={formData.location} 
              onChangeText={(text) => updateFormData({ location: text })} 
            />
          </Field>
          <Field label="Lot Status">
            <Input 
              value={formData.lotStatus} 
              onChangeText={(text) => updateFormData({ lotStatus: text })} 
            />
          </Field>
          <Field label="Land Classification">
            <Input 
              value={formData.landClassification} 
              onChangeText={(text) => updateFormData({ landClassification: text })} 
            />
          </Field>
          <Field label="Title No.">
            <Input 
              value={formData.titleNo} 
              onChangeText={(text) => updateFormData({ titleNo: text })} 
            />
          </Field>
          <Field label="Lot No.">
            <Input 
              value={formData.lotNo} 
              onChangeText={(text) => updateFormData({ lotNo: text })} 
            />
          </Field>
          <Field label="Lot Owner">
            <Input 
              value={formData.lotOwner} 
              onChangeText={(text) => updateFormData({ lotOwner: text })} 
            />
          </Field>
          <Field label="Area covered (sqm)">
            <Input 
              value={formData.areaCovered} 
              onChangeText={(text) => updateFormData({ areaCovered: text })} 
              keyboardType="decimal-pad" 
            />
          </Field>
          <Field label="Latitude">
            <Input 
              value={formData.latitude} 
              onChangeText={(text) => updateFormData({ latitude: text })} 
              keyboardType="decimal-pad" 
            />
          </Field>
          <Field label="Longitude">
            <Input 
              value={formData.longitude} 
              onChangeText={(text) => updateFormData({ longitude: text })} 
              keyboardType="decimal-pad" 
            />
          </Field>

          <Field label="Capture Geo-tagged Images">
            <TouchableOpacity
              style={{
                backgroundColor: "#0ea5e9",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => router.push({
                pathname: "/CameraScreen",
                params: { returnTo: "/screens/Enumerators/EnumeratorsReport" }
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Open Camera</Text>
            </TouchableOpacity>
            {formData.primaryGeoImageId && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 6 }}>
                <Text style={{ color: "#059669", fontSize: 12, fontWeight: "600" }}>
                  ✓ Images captured: {formData.allImageIds.length} photo{formData.allImageIds.length !== 1 ? 's' : ''}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                  Primary coordinates set from first image
                </Text>
              </View>
            )}
          </Field>
        </Section>

        <Section title="Location relative to PA Management Zone">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {ZONES.map((zone) => (
              <RadioPill 
                key={zone} 
                label={zone} 
                selected={formData.managementZone === zone} 
                onPress={() => updateFormData({ managementZone: zone as "MUZ" | "SPZ" })} 
              />
            ))}
          </View>
        </Section>

        <Section title="Within Easement">
          <View style={{ flexDirection: "row", gap: 8 }}>
            <RadioPill 
              label="Yes" 
              selected={formData.withinEasement} 
              onPress={() => updateFormData({ withinEasement: true })} 
            />
            <RadioPill 
              label="No" 
              selected={!formData.withinEasement} 
              onPress={() => updateFormData({ withinEasement: false })} 
            />
          </View>
        </Section>

        <Section title="Status of establishment/facility/structure">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {STATUS_OPTIONS.map((status) => (
              <RadioPill 
                key={status} 
                label={status} 
                selected={formData.establishmentStatus === status} 
                onPress={() => updateFormData({ establishmentStatus: status })} 
              />
            ))}
          </View>
        </Section>

        <TouchableOpacity
          style={{
            backgroundColor: "#0ea5e9",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
          }}
          onPress={() => setCurrentPage(2)}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}