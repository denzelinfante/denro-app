// screens/Enumerators/EnumRep1.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Keyboard,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useRouter } from "expo-router";
import { Section, Field, Input, RadioPill } from "../../components/FormParts";
import { supabase } from "../../utils/supabase";

// ProponentSearch Component (inline)
interface Proponent {
  id: number;
  name: string;
  contact_number?: string;
}

interface ProponentSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectProponent: (proponent: Proponent) => void;
  placeholder?: string;
}

function ProponentSearch({
  value,
  onChangeText,
  onSelectProponent,
  placeholder = "Search or add proponent..."
}: ProponentSearchProps) {
  const [suggestions, setSuggestions] = useState<Proponent[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.trim().length > 0) {
        searchProponents(value.trim());
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const searchProponents = async (searchText: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proponents')
        .select('id, name, contact_number')
        .ilike('name', `%${searchText}%`)
        .order('name')
        .limit(10);

      if (error) throw error;

      setSuggestions(data || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching proponents:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProponent = (proponent: Proponent) => {
    onChangeText(proponent.name);
    onSelectProponent(proponent);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleAddNewProponent = async () => {
    if (!value.trim()) return;

    // Check if proponent already exists (case-insensitive)
    try {
      const { data: existingProponent } = await supabase
        .from('proponents')
        .select('id, name, contact_number')
        .ilike('name', value.trim())
        .single();

      if (existingProponent) {
        // Proponent exists, select it
        handleSelectProponent(existingProponent);
        return;
      }

      // Create new proponent
      const { data: newProponent, error } = await supabase
        .from('proponents')
        .insert([{ name: value.trim() }])
        .select('id, name, contact_number')
        .single();

      if (error) throw error;

      if (newProponent) {
        handleSelectProponent(newProponent);
      }
    } catch (error) {
      console.error('Error adding proponent:', error);
    }
  };

  const exactMatch = suggestions.find(
    (s) => s.name.toLowerCase() === value.toLowerCase()
  );

  return (
    <View style={searchStyles.container}>
      <TextInput
        ref={inputRef}
        style={searchStyles.input}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (text.trim().length === 0) {
            setShowDropdown(false);
          }
        }}
        placeholder={placeholder}
        onFocus={() => {
          if (value.trim().length > 0 && suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow selection
          setTimeout(() => setShowDropdown(false), 200);
        }}
      />

      {showDropdown && (
        <View style={searchStyles.dropdown}>
          {loading ? (
            <View style={searchStyles.loadingContainer}>
              <Text style={searchStyles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <ScrollView 
              style={searchStyles.suggestionsList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={searchStyles.suggestionItem}
                  onPress={() => handleSelectProponent(item)}
                >
                  <Text style={searchStyles.suggestionName}>{item.name}</Text>
                  {item.contact_number && (
                    <Text style={searchStyles.suggestionContact}>{item.contact_number}</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Add new proponent option */}
              {!exactMatch && value.trim().length > 0 && (
                <TouchableOpacity
                  style={searchStyles.addNewItem}
                  onPress={handleAddNewProponent}
                >
                  <Text style={searchStyles.addNewText}>
                    + Add "{value.trim()}" as new proponent
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// Search component styles
const searchStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderTopWidth: 0,
    borderRadius: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  suggestionsList: {
    maxHeight: 180,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionName: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  suggestionContact: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addNewItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addNewText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
});

// Main component interfaces and constants
const ZONES = ["MUZ", "SPZ"];
const STATUS_OPTIONS = [
  "functional",
  "under renovation",
  "under construction",
  "dilapidated",
  "abandoned",
];

const LOT_STATUS_OPTIONS = [
  { label: "Titled", value: "titled" },
  { label: "Untitled", value: "untitled" },
  { label: "Tax Declaration", value: "tax declaration" },
];

const LAND_CLASSIFICATION_OPTIONS = [
  { label: "Timberland", value: "timberland" },
  { label: "Forestland", value: "forestland" },
  { label: "A&D", value: "a&d" },
  { label: "National Park", value: "national park" },
];

interface FormData {
  paId: number | null;
  proponentId: number | null;
  proponentName: string;
  proponentContact: string;
  proponentEmail: string;
  proponentAddress: string;
  location: string;
  lotStatus: string;
  taxDeclarationNo: string;
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
  coordinateSource: "camera" | "manual" | "gps";
  primaryGeoImageId: number | null;
  allImageIds: number[];
  [key: string]: any;
}

interface EnumRep1Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  paItems: { label: string; value: number }[];
  paOpen: boolean;
  setPaOpen: React.Dispatch<React.SetStateAction<boolean>>;
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

  // Dropdown states
  const [lotStatusOpen, setLotStatusOpen] = useState(false);
  const [landClassificationOpen, setLandClassificationOpen] = useState(false);

  // Format coordinates for display with proper precision
  const formatCoordinate = (coord: string): string => {
    const num = parseFloat(coord);
    return isNaN(num) ? coord : num.toFixed(6);
  };

  // Handle proponent selection from search
  const handleProponentSelect = (proponent: Proponent) => {
    updateFormData({
      proponentId: proponent.id,
      proponentName: proponent.name,
      proponentContact: proponent.contact_number || "",
    });
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
        <Section title="Protected Area">
          <Field label="">
            <DropDownPicker
              placeholder="Select Protected Area"
              items={paItems}
              open={paOpen}
              value={formData.paId}
              setOpen={setPaOpen}
              setValue={(callback) => {
                const value = typeof callback === "function" ? callback(formData.paId) : callback;
                updateFormData({ paId: value });
              }}
              setItems={() => {}}
              style={{ borderColor: "#cbd5e1", backgroundColor: "#fff" }}
              containerStyle={{ zIndex: 100 }}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              dropDownContainerStyle={{
                borderColor: "#cbd5e1",
              }}
              maxHeight={200}
            />
          </Field>
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
          <Field label="Name / Establishment *">
            <ProponentSearch
              value={formData.proponentName}
              onChangeText={(text) => updateFormData({ 
                proponentName: text,
                proponentId: text !== formData.proponentName ? null : formData.proponentId
              })}
              onSelectProponent={handleProponentSelect}
              placeholder="Search existing or add new proponent..."
            />
            {formData.proponentId && (
              <View style={{ 
                marginTop: 4, 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                backgroundColor: "#f0f9ff", 
                borderRadius: 6 
              }}>
                <Text style={{ fontSize: 11, color: "#0369a1" }}>
                  Selected existing proponent (ID: {formData.proponentId})
                </Text>
              </View>
            )}
          </Field>
          <Field label="Contact No.">
            <Input 
              value={formData.proponentContact} 
              onChangeText={(text) => updateFormData({ proponentContact: text })} 
              keyboardType="phone-pad" 
              placeholder="Contact number"
            />
          </Field>
        </Section>

        <Section title="Location & Tenure">
          <Field label="Location (Sitio, Barangay, Municipality, Province) *">
            <View
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 60,
              }}
            >
              <Text style={{ color: formData.location ? "#0f172a" : "#9ca3af" }}>
                {formData.location || "Will be filled from camera"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Auto-filled from geo-tagged camera
            </Text>
          </Field>
          
          <Field label="Lot Status">
            <DropDownPicker
              placeholder="Select Lot Status"
              items={LOT_STATUS_OPTIONS}
              open={lotStatusOpen}
              value={formData.lotStatus}
              setOpen={setLotStatusOpen}
              setValue={(callback) => {
                const value = typeof callback === "function" ? callback(formData.lotStatus) : callback;
                updateFormData({ lotStatus: value });
                // Clear tax declaration number if not tax declaration
                if (value !== "tax declaration") {
                  updateFormData({ taxDeclarationNo: "" });
                }
              }}
              setItems={() => {}}
              style={{ borderColor: "#cbd5e1", backgroundColor: "#fff" }}
              containerStyle={{ zIndex: 90 }}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              dropDownContainerStyle={{
                borderColor: "#cbd5e1",
              }}
              maxHeight={200}
            />
          </Field>

          {/* Conditional Tax Declaration No. field */}
          {formData.lotStatus === "tax declaration" && (
            <Field label="Tax Declaration No.">
              <Input 
                value={formData.taxDeclarationNo || ""} 
                onChangeText={(text) => updateFormData({ taxDeclarationNo: text })} 
                placeholder="Enter tax declaration number"
              />
            </Field>
          )}

          <Field label="Latitude *">
            <View
              style={{
                borderWidth: 1,
                borderColor: formData.coordinateSource === "camera" ? "#0ea5e9" : "#cbd5e1",
                backgroundColor: formData.coordinateSource === "camera" ? "#f0f9ff" : "#f8fafc",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: formData.latitude ? "#0f172a" : "#9ca3af" }}>
                {formData.latitude || "Will be filled from camera"}
              </Text>
            </View>
            {formData.coordinateSource === "camera" && formData.latitude ? (
              <Text style={{ fontSize: 10, color: "#059669", marginTop: 2 }}>
                ✓ Auto-captured from camera
              </Text>
            ) : (
              <Text style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                Capture geo-tagged photo to fill this field
              </Text>
            )}
          </Field>

          <Field label="Longitude *">
            <View
              style={{
                borderWidth: 1,
                borderColor: formData.coordinateSource === "camera" ? "#0ea5e9" : "#cbd5e1",
                backgroundColor: formData.coordinateSource === "camera" ? "#f0f9ff" : "#f8fafc",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: formData.longitude ? "#0f172a" : "#9ca3af" }}>
                {formData.longitude || "Will be filled from camera"}
              </Text>
            </View>
            {formData.coordinateSource === "camera" && formData.longitude ? (
              <Text style={{ fontSize: 10, color: "#059669", marginTop: 2 }}>
                ✓ Auto-captured from camera
              </Text>
            ) : (
              <Text style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                Capture geo-tagged photo to fill this field
              </Text>
            )}
          </Field>

          <Field label="Land Classification">
            <DropDownPicker
              placeholder="Select Land Classification"
              items={LAND_CLASSIFICATION_OPTIONS}
              open={landClassificationOpen}
              value={formData.landClassification}
              setOpen={setLandClassificationOpen}
              setValue={(callback) => {
                const value = typeof callback === "function" ? callback(formData.landClassification) : callback;
                updateFormData({ landClassification: value });
              }}
              setItems={() => {}}
              style={{ borderColor: "#cbd5e1", backgroundColor: "#fff" }}
              containerStyle={{ zIndex: 80 }}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              dropDownContainerStyle={{
                borderColor: "#cbd5e1",
              }}
              maxHeight={200}
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

          <Field label="Capture Geo-tagged Images *">
            <TouchableOpacity
              style={{
                backgroundColor: "#0ea5e9",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => router.push({
                pathname: "/CameraScreen",
                params: { 
                  returnTo: "/Enumerators/EnumeratorsReport",
                  requireGeoTag: "true",
                  captureCoordinates: "true"
                }
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {formData.primaryGeoImageId ? "📷 Retake Photos" : "📷 Capture Geo-tagged Photos"}
              </Text>
            </TouchableOpacity>
            
            {formData.primaryGeoImageId && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 6 }}>
                <Text style={{ color: "#059669", fontSize: 12, fontWeight: "600" }}>
                  ✓ Images captured: {formData.allImageIds.length} photo{formData.allImageIds.length !== 1 ? 's' : ''}
                </Text>
                {formData.latitude && formData.longitude && (
                  <Text style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                    Coordinates: {formatCoordinate(formData.latitude)}, {formatCoordinate(formData.longitude)}
                  </Text>
                )}
                {formData.location && (
                  <Text style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                    Location: {formData.location}
                  </Text>
                )}
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