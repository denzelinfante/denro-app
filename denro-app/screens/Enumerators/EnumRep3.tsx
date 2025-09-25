// screens/Enumerators/EnumRep3.tsx
import React from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Section, Field, Input, CheckBox } from "../../components/FormParts";

interface LguPermits {
  mayorsPermit: boolean;
  mpNumber: string;
  mpDateIssued: string;
  mpExpiryDate: string;
  businessPermit: boolean;
  bpNumber: string;
  bpDateIssued: string;
  bpExpiryDate: string;
  buildingPermit: boolean;
  bldgNumber: string;
  bldgDateIssued: string;
  bldgExpiryDate: string;
}

interface DenrPermits {
  pambResolution: boolean;
  pambResolutionNo: string;
  pambDateIssued: string;
  sapa: boolean;
  sapaNo: string;
  sapaDateIssued: string;
  pacbrma: boolean;
  pacbrmaNo: string;
  pacbrmaDateIssued: string;
  ecc: boolean;
  eccNo: string;
  eccDateIssued: string;
  dischargePermit: boolean;
  dpNo: string;
  dpDateIssued: string;
  permitToOperate: boolean;
  ptoNo: string;
  ptoDateIssued: string;
  otherPermits: string;
}

interface FormData {
  lguPermits: LguPermits;
  denrPermits: DenrPermits;
  attestedByName: string;
  attestedByPosition: string;
  attestedBySignature: string;
  notedByName: string;
  notedByPosition: string;
  notedBySignature: string;
  reportNotes: string;
  [key: string]: any;
}

interface EnumRep3Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  setCurrentPage: (page: number) => void;
  saveReport: () => Promise<void>;
  saving: boolean;
}

// Custom permit row components
const LGUPermitRow = ({
  label,
  checked,
  onToggle,
  numberValue,
  onChangeNumber,
  dateIssuedValue,
  onChangeDateIssued,
  expiryDateValue,
  onChangeExpiryDate,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  numberValue: string;
  onChangeNumber: (value: string) => void;
  dateIssuedValue: string;
  onChangeDateIssued: (value: string) => void;
  expiryDateValue: string;
  onChangeExpiryDate: (value: string) => void;
}) => (
  <View style={styles.permitRow}>
    <CheckBox label={label} checked={checked} onToggle={onToggle} />
    {checked && (
      <View style={styles.permitDetails}>
        <View style={styles.permitField}>
          <Text style={styles.permitFieldLabel}>Number:</Text>
          <Input
            value={numberValue}
            onChangeText={onChangeNumber}
            style={styles.permitInput}
            placeholder="Enter number"
          />
        </View>
        <View style={styles.permitField}>
          <Text style={styles.permitFieldLabel}>Date Issued:</Text>
          <Input
            value={dateIssuedValue}
            onChangeText={onChangeDateIssued}
            style={styles.permitInput}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.permitField}>
          <Text style={styles.permitFieldLabel}>Expiry Date:</Text>
          <Input
            value={expiryDateValue}
            onChangeText={onChangeExpiryDate}
            style={styles.permitInput}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>
    )}
  </View>
);

const DENRPermitRow = ({
  label,
  checked,
  onToggle,
  numberLabel = "Number",
  numberValue,
  onChangeNumber,
  dateIssuedValue,
  onChangeDateIssued,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  numberLabel?: string;
  numberValue: string;
  onChangeNumber: (value: string) => void;
  dateIssuedValue: string;
  onChangeDateIssued: (value: string) => void;
}) => (
  <View style={styles.permitRow}>
    <CheckBox label={label} checked={checked} onToggle={onToggle} />
    {checked && (
      <View style={styles.permitDetails}>
        <View style={styles.permitField}>
          <Text style={styles.permitFieldLabel}>{numberLabel}:</Text>
          <Input
            value={numberValue}
            onChangeText={onChangeNumber}
            style={styles.permitInput}
            placeholder="Enter number"
          />
        </View>
        <View style={styles.permitField}>
          <Text style={styles.permitFieldLabel}>Date Issued:</Text>
          <Input
            value={dateIssuedValue}
            onChangeText={onChangeDateIssued}
            style={styles.permitInput}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>
    )}
  </View>
);

export default function EnumRep3({
  formData,
  updateFormData,
  setCurrentPage,
  saveReport,
  saving,
}: EnumRep3Props) {
  const updateLguPermit = (field: keyof LguPermits, value: any) => {
    updateFormData({
      lguPermits: {
        ...formData.lguPermits,
        [field]: value,
      },
    });
  };

  const updateDenrPermit = (field: keyof DenrPermits, value: any) => {
    updateFormData({
      denrPermits: {
        ...formData.denrPermits,
        [field]: value,
      },
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
        <Section title="Permits / Issuances">
          <Text style={styles.sectionHeader}>LGU Permits</Text>

          <LGUPermitRow
            label="Mayor's Permit"
            checked={formData.lguPermits.mayorsPermit}
            onToggle={() => updateLguPermit('mayorsPermit', !formData.lguPermits.mayorsPermit)}
            numberValue={formData.lguPermits.mpNumber}
            onChangeNumber={(value) => updateLguPermit('mpNumber', value)}
            dateIssuedValue={formData.lguPermits.mpDateIssued}
            onChangeDateIssued={(value) => updateLguPermit('mpDateIssued', value)}
            expiryDateValue={formData.lguPermits.mpExpiryDate}
            onChangeExpiryDate={(value) => updateLguPermit('mpExpiryDate', value)}
          />

          <LGUPermitRow
            label="Business Permit"
            checked={formData.lguPermits.businessPermit}
            onToggle={() => updateLguPermit('businessPermit', !formData.lguPermits.businessPermit)}
            numberValue={formData.lguPermits.bpNumber}
            onChangeNumber={(value) => updateLguPermit('bpNumber', value)}
            dateIssuedValue={formData.lguPermits.bpDateIssued}
            onChangeDateIssued={(value) => updateLguPermit('bpDateIssued', value)}
            expiryDateValue={formData.lguPermits.bpExpiryDate}
            onChangeExpiryDate={(value) => updateLguPermit('bpExpiryDate', value)}
          />

          <LGUPermitRow
            label="Building Permit"
            checked={formData.lguPermits.buildingPermit}
            onToggle={() => updateLguPermit('buildingPermit', !formData.lguPermits.buildingPermit)}
            numberValue={formData.lguPermits.bldgNumber}
            onChangeNumber={(value) => updateLguPermit('bldgNumber', value)}
            dateIssuedValue={formData.lguPermits.bldgDateIssued}
            onChangeDateIssued={(value) => updateLguPermit('bldgDateIssued', value)}
            expiryDateValue={formData.lguPermits.bldgExpiryDate}
            onChangeExpiryDate={(value) => updateLguPermit('bldgExpiryDate', value)}
          />

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>DENR / EMB Permits</Text>

          <DENRPermitRow
            label="PAMB Resolution/Clearance"
            checked={formData.denrPermits.pambResolution}
            onToggle={() => updateDenrPermit('pambResolution', !formData.denrPermits.pambResolution)}
            numberLabel="Resolution #"
            numberValue={formData.denrPermits.pambResolutionNo}
            onChangeNumber={(value) => updateDenrPermit('pambResolutionNo', value)}
            dateIssuedValue={formData.denrPermits.pambDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('pambDateIssued', value)}
          />

          <DENRPermitRow
            label="SAPA"
            checked={formData.denrPermits.sapa}
            onToggle={() => updateDenrPermit('sapa', !formData.denrPermits.sapa)}
            numberLabel="SAPA #"
            numberValue={formData.denrPermits.sapaNo}
            onChangeNumber={(value) => updateDenrPermit('sapaNo', value)}
            dateIssuedValue={formData.denrPermits.sapaDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('sapaDateIssued', value)}
          />

          <DENRPermitRow
            label="PACBRMA"
            checked={formData.denrPermits.pacbrma}
            onToggle={() => updateDenrPermit('pacbrma', !formData.denrPermits.pacbrma)}
            numberLabel="PACBRMA #"
            numberValue={formData.denrPermits.pacbrmaNo}
            onChangeNumber={(value) => updateDenrPermit('pacbrmaNo', value)}
            dateIssuedValue={formData.denrPermits.pacbrmaDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('pacbrmaDateIssued', value)}
          />

          <DENRPermitRow
            label="ECC"
            checked={formData.denrPermits.ecc}
            onToggle={() => updateDenrPermit('ecc', !formData.denrPermits.ecc)}
            numberLabel="ECC #"
            numberValue={formData.denrPermits.eccNo}
            onChangeNumber={(value) => updateDenrPermit('eccNo', value)}
            dateIssuedValue={formData.denrPermits.eccDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('eccDateIssued', value)}
          />

          <DENRPermitRow
            label="Discharge Permit"
            checked={formData.denrPermits.dischargePermit}
            onToggle={() => updateDenrPermit('dischargePermit', !formData.denrPermits.dischargePermit)}
            numberLabel="Permit #"
            numberValue={formData.denrPermits.dpNo}
            onChangeNumber={(value) => updateDenrPermit('dpNo', value)}
            dateIssuedValue={formData.denrPermits.dpDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('dpDateIssued', value)}
          />

          <DENRPermitRow
            label="Permit to Operate"
            checked={formData.denrPermits.permitToOperate}
            onToggle={() => updateDenrPermit('permitToOperate', !formData.denrPermits.permitToOperate)}
            numberLabel="Permit #"
            numberValue={formData.denrPermits.ptoNo}
            onChangeNumber={(value) => updateDenrPermit('ptoNo', value)}
            dateIssuedValue={formData.denrPermits.ptoDateIssued}
            onChangeDateIssued={(value) => updateDenrPermit('ptoDateIssued', value)}
          />

          <Field label="Other EMB related permits">
            <Input 
              value={formData.denrPermits.otherPermits} 
              onChangeText={(value) => updateDenrPermit('otherPermits', value)}
              multiline
              style={{ height: 60 }}
              placeholder="Specify other permits..."
            />
          </Field>
        </Section>

        <Section title="Attestation & Notation">
          <Field label="Attested by Name">
            <Input 
              value={formData.attestedByName} 
              onChangeText={(value) => updateFormData({ attestedByName: value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Position">
            <Input 
              value={formData.attestedByPosition} 
              onChangeText={(value) => updateFormData({ attestedByPosition: value })}
              placeholder="Position/Title"
            />
          </Field>
          
          <Field label="Noted by Name">
            <Input 
              value={formData.notedByName} 
              onChangeText={(value) => updateFormData({ notedByName: value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Position">
            <Input 
              value={formData.notedByPosition} 
              onChangeText={(value) => updateFormData({ notedByPosition: value })}
              placeholder="Position/Title"
            />
          </Field>
        </Section>

        <Section title="Additional Notes">
          <Input 
            value={formData.reportNotes} 
            onChangeText={(value) => updateFormData({ reportNotes: value })}
            multiline
            style={{ height: 90 }}
            placeholder="Any additional notes or observations..."
          />
        </Section>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentPage(2)}
            disabled={saving}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={saveReport} 
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1f2937",
  },
  permitRow: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  permitDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  permitField: {
    marginBottom: 8,
  },
  permitFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  permitInput: {
    fontSize: 14,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#6b7280",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
});