// screens/Templates_Screen.tsx
import { supabase } from "../../utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

/* ---------- Types ---------- */
export type ProponentRow = { id: number; name: string; contact_no: string | null };
type PA = { id: number; name: string };

/* ---------- Type guard ---------- */
function isProponentRow(v: unknown): v is ProponentRow {
  return !!v && typeof v === "object" && typeof (v as any).id === "number" && typeof (v as any).name === "string";
}

/* ---------- Small presentational helpers ---------- */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={{ fontWeight: "700", marginBottom: 8 }}>{title}</Text>
    {children}
  </View>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontWeight: "600", marginBottom: 6 }}>{label}</Text>
    {children}
  </View>
);

const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor="#94a3b8"
    style={[
      {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        backgroundColor: "#fff",
        color: "#0f172a",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
      },
      props.style,
    ]}
    {...props}
  />
);

/* ---------- New UI atoms (to mirror paper form) ---------- */
const RadioPill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const CheckBox = ({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity onPress={onToggle} style={styles.checkItem}>
    <View style={[styles.checkBox, checked && styles.checkBoxChecked]} />
    <Text style={styles.checkLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ---- Permit row components (LGU / DENR-EMB) ---- */
type LGUPermitRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  num: string;
  onChangeNum: (s: string) => void;
  di: string;
  onChangeDi: (s: string) => void;
  ed: string;
  onChangeEd: (s: string) => void;
};

const LGUPermitRow: React.FC<LGUPermitRowProps> = ({
  label,
  checked,
  onToggle,
  num,
  onChangeNum,
  di,
  onChangeDi,
  ed,
  onChangeEd,
}) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Switch value={checked} onValueChange={onToggle} />
      <Text style={{ marginLeft: 8, fontWeight: "600" }}>{label}</Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.smallLabel}>Permit #</Text>
        <Input value={num} onChangeText={onChangeNum} keyboardType="number-pad" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.smallLabel}>Date issued (YYYY-MM-DD)</Text>
        <Input value={di} onChangeText={onChangeDi} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.smallLabel}>Expiration date (YYYY-MM-DD)</Text>
        <Input value={ed} onChangeText={onChangeEd} />
      </View>
    </View>
  </View>
);

type DENRPermitRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  noLabel: string; // e.g., "Resolution #", "SAPA #"
  num: string;
  onChangeNum: (s: string) => void;
  di: string;
  onChangeDi: (s: string) => void;
};

const DENRPermitRow: React.FC<DENRPermitRowProps> = ({
  label,
  checked,
  onToggle,
  noLabel,
  num,
  onChangeNum,
  di,
  onChangeDi,
}) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Switch value={checked} onValueChange={onToggle} />
      <Text style={{ marginLeft: 8, fontWeight: "600" }}>{label}</Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.smallLabel}>{noLabel}</Text>
        <Input value={num} onChangeText={onChangeNum} keyboardType="number-pad" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.smallLabel}>Date issued (YYYY-MM-DD)</Text>
        <Input value={di} onChangeText={onChangeDi} />
      </View>
    </View>
  </View>
);

/* ---------- Local helpers ---------- */
const todayISO = () => new Date().toISOString().slice(0, 10);
const todayLabel = todayISO();

const parseCoord = (raw: string, kind: "lat" | "lon"): number | null => {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error("Coordinate is not a number");
  const max = kind === "lat" ? 90 : 180;
  if (Math.abs(n) > max) {
    throw new Error(`${kind === "lat" ? "Latitude" : "Longitude"} must be within ${kind === "lat" ? "±90" : "±180"}°.`);
  }
  return Number(n.toFixed(7));
};

/* ---------- Constants to match the sheet ---------- */
const ZONES = ["MUZ", "SPZ"] as const;
const STATUS_OPTIONS = ["functional", "under renovation", "under construction", "dilapidated", "abandoned"] as const;
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
] as const;

const SESSION_KEY = "denr_user_session";

/* ======================================================================= */

export default function Templates_Screen() {
  // --- core form state ---
  const [proponent, setProponent] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [proponentId, setProponentId] = useState<number | null>(null);
  const [checkingProponent, setCheckingProponent] = useState(false);

  const [location, setLocation] = useState("");
  const [lotStatus, setLotStatus] = useState("");
  const [landClass, setLandClass] = useState("");
  const [titleNo, setTitleNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [owner, setOwner] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [areaCovered, setAreaCovered] = useState("");

  // PA zone (MUZ/SPZ) & easement
  const [paZone, setPaZone] = useState("");
  const [easement, setEasement] = useState(false);

  // establishment status & types (to mirror the paper form)
  const [estStatus, setEstStatus] = useState<string>("");
  const [types, setTypes] = useState<Record<string, boolean>>(
    Object.fromEntries(TYPE_OPTIONS.map((t) => [t, false])) as Record<string, boolean>,
  );
  const [typeOther, setTypeOther] = useState("");
  const [establishmentTypeName, setEstablishmentTypeName] = useState(""); // legacy single text if needed
  const [notes, setNotes] = useState("");

  // LGU permits
  const [mp, setMp] = useState(false);
  const [mpNumber, setMpNumber] = useState("");
  const [mpDI, setMpDI] = useState("");
  const [mpED, setMpED] = useState("");

  const [bp, setBp] = useState(false);
  const [bpNumber, setBpNumber] = useState("");
  const [bpDI, setBpDI] = useState("");
  const [bpED, setBpED] = useState("");

  const [bldg, setBldg] = useState(false);
  const [bldgNumber, setBldgNumber] = useState("");
  const [bldgDI, setBldgDI] = useState("");
  const [bldgED, setBldgED] = useState("");

  // DENR/EMB permits
  const [pamb, setPamb] = useState(false);
  const [pambNo, setPambNo] = useState("");
  const [pambDI, setPambDI] = useState("");

  const [sapa, setSapa] = useState(false);
  const [sapaNo, setSapaNo] = useState("");
  const [sapaDI, setSapaDI] = useState("");

  const [pacbrma, setPacbrma] = useState(false);
  const [pacbrmaNo, setPacbrmaNo] = useState("");
  const [pacbrmaDI, setPacbrmaDI] = useState("");

  const [ecc, setEcc] = useState(false);
  const [eccNo, setEccNo] = useState("");
  const [eccDI, setEccDI] = useState("");

  const [dp, setDp] = useState(false);
  const [dpNo, setDpNo] = useState("");
  const [dpDI, setDpDI] = useState("");

  const [pto, setPto] = useState(false);
  const [ptoNo, setPtoNo] = useState("");
  const [ptoDI, setPtoDI] = useState("");

  const [embOther, setEmbOther] = useState("");

  const [saving, setSaving] = useState(false);
  const [enumeratorId, setEnumeratorId] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // resolve enumerator (auth → users)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) {
            setEnumeratorId(parsed.id);
            return;
          }
        }
        const { data: au } = await supabase.auth.getUser();
        const email = au.user?.email;
        if (email) {
          const { data } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
          if (data?.id) setEnumeratorId(data.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // PA dropdown
  const [paItems, setPaItems] = useState<{ label: string; value: number }[]>([]);
  const [paOpen, setPaOpen] = useState(false);
  const [paValue, setPaValue] = useState<number | null>(null);

  const loadProtectedAreas = async () => {
    try {
      const { data, error } = await supabase.from("protected_areas").select("id, name").order("name");
      if (error) throw error;
      setPaItems((data as PA[]).map((r) => ({ label: r.name, value: r.id })));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load PA list";
      Alert.alert("Protected Areas", msg);
    }
  };
  useEffect(() => {
    loadProtectedAreas();
  }, []);

  // toggle a type checkbox
  const toggleType = (label: string) => setTypes((prev) => ({ ...prev, [label]: !prev[label] }));

  // Ensure proponent exists (lookup → create via RPC if missing)
  const ensureProponentExists = async (): Promise<number | null> => {
    const name = proponent.trim();
    if (!name) return null;

    const contact = (contactNo || "").trim(); // empty string if none yet
    setCheckingProponent(true);

    try {
      if (contact) {
        // Idempotent path: create if missing OR update contact_no if different
        const { data, error } = await supabase.rpc("add_proponent", {
          p_name: name,
          p_contact: contact,
        });
        if (error) throw error;

        const row = data as ProponentRow | null;
        if (!row || typeof row.id !== "number") throw new Error("Unexpected response from add_proponent");

        setProponentId(row.id);
        if (row.contact_no) setContactNo(row.contact_no);
        return row.id;
      }

      // No contact yet → lookup only (do NOT create a row with NULL contact_no)
      const { data, error } = await supabase
        .from("proponents")
        .select("id, name, contact_no")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        const row = data as ProponentRow;
        setProponentId(row.id);
        if (!contactNo && row.contact_no) setContactNo(row.contact_no);
        return row.id;
      }

      // Not found and no contact provided → defer creation until submit
      return null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ensuring proponent.";
      Alert.alert("Proponent", msg);
      return null;
    } finally {
      setCheckingProponent(false);
    }
  };

  // Establishment profile (status/type/note)
  const createEstablishmentProfile = async (): Promise<number> => {
    // Convert multi-select types to CSV like the paper sheet
    const selectedTypes = Object.entries(types)
      .filter(([, v]) => v)
      .map(([k]) => (k === "Others" && typeOther.trim() ? `Others: ${typeOther.trim()}` : k));
    const typeVal = selectedTypes.join(", ") || (establishmentTypeName || "").trim() || "Unknown";

    const statusVal = (estStatus || "").trim() || "Unknown";
    const noteVal = (notes || "").trim() || null;

    const { data, error } = await supabase
      .from("establishment_profile")
      .insert([{ status: statusVal, type: typeVal, note: noteVal }])
      .select("id")
      .single();

    if (error) throw error;
    return (data as any).id as number;
  };

  // Lot (create or find)
  const createOrFindLot = async (): Promise<number> => {
    const titleNum = titleNo ? Number(titleNo) : null;
    const lotNum = lotNo ? Number(lotNo) : null;
    const ownerVal = (owner || "").trim();
    const locationVal = (location || "").trim();
    const easementVal = easement ? "YES" : "NO";

    let latNum: number | null = null;
    let lonNum: number | null = null;
    try {
      latNum = parseCoord(latitude, "lat");
      lonNum = parseCoord(longitude, "lon");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Check latitude/longitude.";
      Alert.alert("Invalid coordinates", msg);
      throw e;
    }

    if (titleNum !== null && lotNum !== null) {
      const { data: existByTL } = await supabase
        .from("lots")
        .select("id")
        .eq("title_no", titleNum)
        .eq("lot_no", lotNum)
        .maybeSingle();
      if (existByTL?.id) return existByTL.id as number;
    }

    if (ownerVal && locationVal) {
      const { data: existByOL } = await supabase
        .from("lots")
        .select("id")
        .ilike("lot_owner", ownerVal)
        .ilike("location", locationVal)
        .maybeSingle();
      if (existByOL?.id) return existByOL.id as number;
    }

    const { data, error } = await supabase
      .from("lots")
      .insert([
        {
          location: locationVal || null,
          lot_status: lotStatus || null,
          land_cs: landClass || null,
          title_no: titleNum,
          lot_no: lotNum,
          lot_owner: ownerVal || null,
          note_details: null,
          latitude: latNum,
          longitude: lonNum,
          area_covered: areaCovered || null,
          pm_zone: paZone || null,
          easement: easementVal,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    return (data as any).id as number;
  };

  // Permits creators
  const createLGUPermits = async (): Promise<number | null> => {
    const any =
      mp ||
      bp ||
      bldg ||
      mpNumber ||
      mpDI ||
      mpED ||
      bpNumber ||
      bpDI ||
      bpED ||
      bldgNumber ||
      bldgDI ||
      bldgED;

    if (!any) return null;

    const { data, error } = await supabase
      .from("permits_lgu")
      .insert([
        {
          mayors_permit: mp,
          mp_number: mpNumber ? Number(mpNumber) : null,
          mpdi: mpDI || null,
          mped: mpED || null,

          business_permit: bp,
          bp_number: bpNumber ? Number(bpNumber) : null,
          bpdi: bpDI || null,
          bped: bpED || null,

          building_permit: bldg,
          bldg_number: bldgNumber ? Number(bldgNumber) : null,
          bldgdi: bldgDI || null,
          bldged: bldgED || null,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    return (data as any).id as number;
  };

  const createDENREMBPermits = async (): Promise<number | null> => {
    const any =
      pamb ||
      sapa ||
      pacbrma ||
      ecc ||
      dp ||
      pto ||
      pambNo ||
      pambDI ||
      sapaNo ||
      sapaDI ||
      pacbrmaNo ||
      pacbrmaDI ||
      eccNo ||
      eccDI ||
      dpNo ||
      dpDI ||
      ptoNo ||
      ptoDI ||
      embOther;

    if (!any) return null;

    const { data, error } = await supabase
      .from("permits_denremb")
      .insert([
        {
          pamb_resolution: pamb,
          pamb_resolution_no: pambNo ? Number(pambNo) : null,
          pamb_di: pambDI || null,

          sapa: sapa,
          sapa_no: sapaNo ? Number(sapaNo) : null,
          sapa_di: sapaDI || null,

          pacbrma: pacbrma,
          pacbrma_no: pacbrmaNo ? Number(pacbrmaNo) : null,
          pacbrma_di: pacbrmaDI || null,

          ecc: ecc,
          ecc_no: eccNo ? Number(eccNo) : null,
          ecc_di: eccDI || null,

          discharge_permit: dp,
          dp_no: dpNo ? Number(dpNo) : null,
          dp_di: dpDI || null,

          permit_to_operate: pto,
          pto_no: ptoNo ? Number(ptoNo) : null,
          pto_di: ptoDI || null,

          emb_rp: embOther || null,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    return (data as any).id as number;
  };

  // Resolve enumerator if needed
  const resolveEnumeratorId = async (): Promise<number> => {
    if (enumeratorId) return enumeratorId;

    const cached = await AsyncStorage.getItem("denr_enumerator_id");
    const cachedNum = cached ? Number(cached) : 0;
    if (cachedNum) {
      setEnumeratorId(cachedNum);
      return cachedNum;
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    const user = authData?.user;
    if (!user) throw new Error("Not logged in.");

    const email = (user.email ?? "").trim();

    let found: { id: number } | null = null;
    try {
      const { data } = await supabase.from("users").select("id").eq("auth_uid", user.id).maybeSingle();
      if (data?.id) found = data as any;
    } catch {}

    if (!found && email) {
      const { data } = await supabase.from("users").select("id").ilike("email", email).maybeSingle();
      if (data?.id) found = data as any;
    }

    const profileId = (user.user_metadata as any)?.profile_id;
    if (!found && profileId) {
      const { data } = await supabase.from("users").select("id").eq("id", Number(profileId)).maybeSingle();
      if (data?.id) found = data as any;
    }

    if (!found?.id) throw new Error("Could not resolve enumerator in users table.");

    await AsyncStorage.setItem("denr_enumerator_id", String(found.id));
    setEnumeratorId(found.id);
    return found.id;
  };

  // Submit
  const handleSubmit = async () => {
    try {
      if (!proponent.trim()) {
        Alert.alert("Missing field", "Please enter the Proponent/Owner.");
        return;
      }
      if (!paValue) {
        Alert.alert("Protected Area", "Please select a Protected Area.");
        return;
      }

      let effectiveEnumeratorId = enumeratorId;
      if (!effectiveEnumeratorId) {
        try {
          effectiveEnumeratorId = await resolveEnumeratorId();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Cannot save without a resolved enumerator_id.";
          Alert.alert("No enumerator", msg);
          return;
        }
      }

      const pid = await ensureProponentExists();
      if (!pid) return;

      setSaving(true);

      const estProfileId = await createEstablishmentProfile();
      const lotId = await createOrFindLot();
      const lguId = await createLGUPermits();
      const embId = await createDENREMBPermits();

      const { error: repErr } = await supabase.from("enumerators_reports").insert([
        {
          report_date: todayISO(),
          pa_id: paValue,
          proponent_id: pid,
          lot_id: lotId,
          establishment_profile_id: estProfileId,
          lgu_permit_id: lguId ?? null,
          denr_emb_id: embId ?? null,
          attestation_id: null,
          enumerator_id: effectiveEnumeratorId!,
          informant_id: null,
          geo_tag_image_id: null,
          notes: notes || null,
        },
      ]);

      if (repErr) throw repErr;

      Alert.alert("Saved", "Enumerator report saved to Supabase.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save the report.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */
  if (loadingUser) {
    return (
      <View style={[styles.center, { backgroundColor: "#fff" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#111" }}>Loading user…</Text>
      </View>
    );
  }

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
        {/* Protected Area */}
        <Section title="Protected Area">
          <DropDownPicker
            placeholder="Select Protected Area"
            items={paItems}
            open={paOpen}
            value={paValue}
            setOpen={setPaOpen}
            setValue={setPaValue as any}
            setItems={setPaItems as any}
            style={styles.dd}
            containerStyle={styles.ddContainer}
            listMode="MODAL"
            modalProps={{ animationType: "slide" }}
            zIndex={3000}
            zIndexInverse={1000}
          />
        </Section>

        {/* Report Details */}
        <Section title="Report Details">
          <Field label="Date">
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{todayLabel}</Text>
            </View>
          </Field>
        </Section>

        {/* Proponent / Owner */}
        <Section title="Proponent / Owner">
          <Field label="Name">
            <Input value={proponent} onChangeText={setProponent} onBlur={ensureProponentExists} returnKeyType="done" />
          </Field>
          <Field label="Contact No.">
            <Input value={contactNo} onChangeText={setContactNo} keyboardType="phone-pad" />
            {checkingProponent ? (
              <Text style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>Checking proponent…</Text>
            ) : null}
          </Field>
        </Section>

        {/* Location & Tenure */}
        <Section title="Location & Tenure">
          <Field label="Location (Sitio/Brgy/Municipality/Province)">
            <Input value={location} onChangeText={setLocation} />
          </Field>
          <Field label="Lot Status">
            <Input value={lotStatus} onChangeText={setLotStatus} />
          </Field>
          <Field label="Land Classification Status">
            <Input value={landClass} onChangeText={setLandClass} />
          </Field>
          <Field label="Title No.">
            <Input value={titleNo} onChangeText={setTitleNo} keyboardType="number-pad" />
          </Field>
          <Field label="Lot No.">
            <Input value={lotNo} onChangeText={setLotNo} keyboardType="number-pad" />
          </Field>
          <Field label="Lot Owner">
            <Input value={owner} onChangeText={setOwner} />
          </Field>
          <Field label="Latitude">
            <Input value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
          </Field>
          <Field label="Longitude">
            <Input value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
          </Field>
          <Field label="Area covered (sqm)">
            <Input value={areaCovered} onChangeText={setAreaCovered} keyboardType="decimal-pad" />
          </Field>
        </Section>

        {/* Location relative to PA Management Zone (MUZ/SPZ) */}
        <Section title="Location relative to PA Management Zone">
          <View style={{ flexDirection: "row" }}>
            {ZONES.map((z) => (
              <View key={z} style={{ marginRight: 8 }}>
                <RadioPill label={z} selected={paZone === z} onPress={() => setPaZone(z)} />
              </View>
            ))}
          </View>
        </Section>

        {/* Within Easement (Yes/No) */}
        <Section title="Within Easement (Yes/No)">
          <View style={{ flexDirection: "row" }}>
            <View style={{ marginRight: 8 }}>
              <RadioPill label="Yes" selected={easement === true} onPress={() => setEasement(true)} />
            </View>
            <RadioPill label="No" selected={easement === false} onPress={() => setEasement(false)} />
          </View>
        </Section>

        {/* Status of establishment/facility/structure */}
        <Section title="Status of establishment/facility/structure">
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map((opt) => (
              <View key={opt} style={{ marginRight: 8, marginBottom: 8 }}>
                <RadioPill label={opt} selected={estStatus === opt} onPress={() => setEstStatus(opt)} />
              </View>
            ))}
          </View>
        </Section>


        {/* Permits / Issuances */}
        <Section title="Permits / Issuances">
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            Permits/issuances acquired from LGUs and other Government agencies:
          </Text>

          <LGUPermitRow
            label="Mayor’s Permit"
            checked={mp}
            onToggle={() => setMp((v) => !v)}
            num={mpNumber}
            onChangeNum={setMpNumber}
            di={mpDI}
            onChangeDi={setMpDI}
            ed={mpED}
            onChangeEd={setMpED}
          />

          <LGUPermitRow
            label="Business Permit"
            checked={bp}
            onToggle={() => setBp((v) => !v)}
            num={bpNumber}
            onChangeNum={setBpNumber}
            di={bpDI}
            onChangeDi={setBpDI}
            ed={bpED}
            onChangeEd={setBpED}
          />

          <LGUPermitRow
            label="Building Permit"
            checked={bldg}
            onToggle={() => setBldg((v) => !v)}
            num={bldgNumber}
            onChangeNum={setBldgNumber}
            di={bldgDI}
            onChangeDi={setBldgDI}
            ed={bldgED}
            onChangeEd={setBldgED}
          />

          <Text style={{ fontWeight: "700", marginVertical: 8 }}>
            Permits/issuances acquired from DENR and EMB:
          </Text>

          <DENRPermitRow
            label="PAMB Resolution/Clearance"
            checked={pamb}
            onToggle={() => setPamb((v) => !v)}
            noLabel="Resolution #"
            num={pambNo}
            onChangeNum={setPambNo}
            di={pambDI}
            onChangeDi={setPambDI}
          />

          <DENRPermitRow
            label="SAPA"
            checked={sapa}
            onToggle={() => setSapa((v) => !v)}
            noLabel="SAPA #"
            num={sapaNo}
            onChangeNum={setSapaNo}
            di={sapaDI}
            onChangeDi={setSapaDI}
          />

          <DENRPermitRow
            label="PACBRMA / PACBRMS"
            checked={pacbrma}
            onToggle={() => setPacbrma((v) => !v)}
            noLabel="PACBRMA #"
            num={pacbrmaNo}
            onChangeNum={setPacbrmaNo}
            di={pacbrmaDI}
            onChangeDi={setPacbrmaDI}
          />

          <DENRPermitRow
            label="ECC"
            checked={ecc}
            onToggle={() => setEcc((v) => !v)}
            noLabel="ECC #"
            num={eccNo}
            onChangeNum={setEccNo}
            di={eccDI}
            onChangeDi={setEccDI}
          />

          <DENRPermitRow
            label="Discharge Permit"
            checked={dp}
            onToggle={() => setDp((v) => !v)}
            noLabel="Permit #"
            num={dpNo}
            onChangeNum={setDpNo}
            di={dpDI}
            onChangeDi={setDpDI}
          />

          <DENRPermitRow
            label="Permit to Operate"
            checked={pto}
            onToggle={() => setPto((v) => !v)}
            noLabel="Permit #"
            num={ptoNo}
            onChangeNum={setPtoNo}
            di={ptoDI}
            onChangeDi={setPtoDI}
          />

          <Field label="Other EMB related permits">
            <Input value={embOther} onChangeText={setEmbOther} />
          </Field>
        </Section>

        <TouchableOpacity
          style={[styles.button, { opacity: saving || checkingProponent ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={saving || checkingProponent}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save to Supabase</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  readonlyBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { color: "#0f172a" },

  dd: { borderColor: "#cbd5e1", backgroundColor: "#fff" },
  ddContainer: { zIndex: 100 },

  smallLabel: { fontSize: 12, color: "#334155", marginBottom: 4 },

  // Pills
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  pillSelected: { borderColor: "#0ea5e9", backgroundColor: "#e0f2fe" },
  pillText: { color: "#0f172a" },
  pillTextSelected: { fontWeight: "700", color: "#075985" },

  // Two-column checkbox grid
  gridTwoCol: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  gridItem: { width: "50%", paddingRight: 8, paddingVertical: 6 },

  // Checkbox item
  checkItem: { flexDirection: "row", alignItems: "center" },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  checkBoxChecked: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  checkLabel: { color: "#0f172a" },
});
