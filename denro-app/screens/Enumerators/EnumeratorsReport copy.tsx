// screens/Enumerators/EnumeratorsReport.tsx
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../utils/supabase";

import EnumRep1 from "./EnumRep1";
import EnumRep2 from "./EnumRep2";
import EnumRep3 from "./EnumRep3";

const SESSION_KEY = "denr_user_session";

// Types for the normalized structure
interface FormData {
  // Protected Area
  paId: number | null;
  
  // Proponent data
  proponentName: string;
  proponentContact: string;
  proponentEmail: string;
  proponentAddress: string;
  
  // Lot data
  location: string;
  lotStatus: string;
  landClassification: string;
  titleNo: string;
  lotNo: string;
  lotOwner: string;
  areaCovered: string;
  managementZone: "MUZ" | "SPZ" | "";
  withinEasement: boolean;
  lotNotes: string;
  
  // Establishment data
  establishmentStatus: string;
  establishmentTypes: Record<string, boolean>;
  establishmentOther: string;
  establishmentNotes: string;
  
  // Coordinates (derived from camera)
  latitude: string;
  longitude: string;
  coordinateSource: "camera" | "manual" | "gps";
  
  // Images
  primaryGeoImageId: number | null;
  allImageIds: number[];
  
  // LGU Permits
  lguPermits: {
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
  };
  
  // DENR Permits
  denrPermits: {
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
  };
  
  // Attestation
  attestedByName: string;
  attestedByPosition: string;
  attestedBySignature: string;
  notedByName: string;
  notedByPosition: string;
  notedBySignature: string;
  
  // General notes
  reportNotes: string;
}

export default function EnumeratorsReport() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    primaryGeoImageId?: string;
    latitude?: string;
    longitude?: string;
    totalImages?: string;
    imageIds?: string;
  }>();

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enumeratorId, setEnumeratorId] = useState<number | null>(null);

  // Protected Areas dropdown
  const [paItems, setPaItems] = useState<{ label: string; value: number }[]>([]);
  const [paOpen, setPaOpen] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    paId: null,
    proponentName: "",
    proponentContact: "",
    proponentEmail: "",
    proponentAddress: "",
    location: "",
    lotStatus: "",
    landClassification: "",
    titleNo: "",
    lotNo: "",
    lotOwner: "",
    areaCovered: "",
    managementZone: "",
    withinEasement: false,
    lotNotes: "",
    establishmentStatus: "",
    establishmentTypes: {},
    establishmentOther: "",
    establishmentNotes: "",
    latitude: "",
    longitude: "",
    coordinateSource: "camera",
    primaryGeoImageId: null,
    allImageIds: [],
    lguPermits: {
      mayorsPermit: false,
      mpNumber: "",
      mpDateIssued: "",
      mpExpiryDate: "",
      businessPermit: false,
      bpNumber: "",
      bpDateIssued: "",
      bpExpiryDate: "",
      buildingPermit: false,
      bldgNumber: "",
      bldgDateIssued: "",
      bldgExpiryDate: "",
    },
    denrPermits: {
      pambResolution: false,
      pambResolutionNo: "",
      pambDateIssued: "",
      sapa: false,
      sapaNo: "",
      sapaDateIssued: "",
      pacbrma: false,
      pacbrmaNo: "",
      pacbrmaDateIssued: "",
      ecc: false,
      eccNo: "",
      eccDateIssued: "",
      dischargePermit: false,
      dpNo: "",
      dpDateIssued: "",
      permitToOperate: false,
      ptoNo: "",
      ptoDateIssued: "",
      otherPermits: "",
    },
    attestedByName: "",
    attestedByPosition: "",
    attestedBySignature: "",
    notedByName: "",
    notedByPosition: "",
    notedBySignature: "",
    reportNotes: "",
  });

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load protected areas
        await loadProtectedAreas();
        
        // Get enumerator ID
        const enumId = await getEnumeratorId();
        setEnumeratorId(enumId);

        // Process camera return data
        processCameraData();
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize form");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [params]);

  const loadProtectedAreas = async () => {
    const { data, error } = await supabase
      .from("protected_areas")
      .select("id, name")
      .order("name");

    if (error) throw error;
    if (data) {
      setPaItems(data.map(pa => ({ label: pa.name, value: pa.id })));
    }
  };

  const getEnumeratorId = async (): Promise<number | null> => {
    try {
      // Try session storage first
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed?.id) return parsed.id;
      }

      // Fall back to Supabase auth
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user?.email) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", authUser.user.email)
          .single();

        if (userData?.id) return userData.id;
      }
    } catch (error) {
      console.error("Error getting enumerator ID:", error);
    }
    return null;
  };

  const processCameraData = () => {
    const primaryId = params.primaryGeoImageId;
    if (primaryId && !isNaN(parseInt(primaryId))) {
      const parsedPrimaryId = parseInt(primaryId);
      
      // Safely handle imageIds
      let allIds: number[] = [parsedPrimaryId];
      if (params.imageIds) {
        const parsedIds = params.imageIds
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        
        if (parsedIds.length > 0) {
          allIds = parsedIds;
        }
      }

      setFormData(prev => ({
        ...prev,
        primaryGeoImageId: parsedPrimaryId,
        latitude: params.latitude || "",
        longitude: params.longitude || "",
        allImageIds: allIds,
        coordinateSource: "camera",
      }));
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Database operations for normalized structure
  const createProponent = async () => {
    const { data, error } = await supabase
      .from("proponents")
      .insert([{
        name: formData.proponentName,
        contact_no: formData.proponentContact || null,
        email: formData.proponentEmail || null,
        address: formData.proponentAddress || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const createLot = async () => {
    const { data, error } = await supabase
      .from("lots")
      .insert([{
        location: formData.location,
        lot_status: formData.lotStatus || null,
        land_classification: formData.landClassification || null,
        title_no: formData.titleNo || null,
        lot_no: formData.lotNo || null,
        lot_owner: formData.lotOwner || null,
        area_covered: formData.areaCovered ? parseFloat(formData.areaCovered) : null,
        management_zone: formData.managementZone || null,
        within_easement: formData.withinEasement,
        notes: formData.lotNotes || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const createEstablishmentProfile = async () => {
    if (!formData.establishmentStatus && Object.keys(formData.establishmentTypes).length === 0) {
      return null; // Skip if no establishment data
    }

    const selectedTypes = Object.keys(formData.establishmentTypes)
      .filter(type => formData.establishmentTypes[type]);

    const { data, error } = await supabase
      .from("establishment_profiles")
      .insert([{
        status: formData.establishmentStatus || null,
        type_data: selectedTypes,
        other_type: formData.establishmentOther || null,
        notes: formData.establishmentNotes || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const createLguPermits = async () => {
    const hasAnyLguPermit = Object.values(formData.lguPermits).some(value => 
      typeof value === 'boolean' ? value : (value && value.trim() !== '')
    );

    if (!hasAnyLguPermit) return null;

    const { data, error } = await supabase
      .from("permits_lgu")
      .insert([{
        mayors_permit: formData.lguPermits.mayorsPermit,
        mp_number: formData.lguPermits.mpNumber || null,
        mp_date_issued: formData.lguPermits.mpDateIssued || null,
        mp_expiry_date: formData.lguPermits.mpExpiryDate || null,
        business_permit: formData.lguPermits.businessPermit,
        bp_number: formData.lguPermits.bpNumber || null,
        bp_date_issued: formData.lguPermits.bpDateIssued || null,
        bp_expiry_date: formData.lguPermits.bpExpiryDate || null,
        building_permit: formData.lguPermits.buildingPermit,
        bldg_number: formData.lguPermits.bldgNumber || null,
        bldg_date_issued: formData.lguPermits.bldgDateIssued || null,
        bldg_expiry_date: formData.lguPermits.bldgExpiryDate || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const createDenrPermits = async () => {
    const hasAnyDenrPermit = Object.values(formData.denrPermits).some(value =>
      typeof value === 'boolean' ? value : (value && value.trim() !== '')
    );

    if (!hasAnyDenrPermit) return null;

    const { data, error } = await supabase
      .from("permits_denremb")
      .insert([{
        pamb_resolution: formData.denrPermits.pambResolution,
        pamb_resolution_no: formData.denrPermits.pambResolutionNo || null,
        pamb_date_issued: formData.denrPermits.pambDateIssued || null,
        sapa: formData.denrPermits.sapa,
        sapa_no: formData.denrPermits.sapaNo || null,
        sapa_date_issued: formData.denrPermits.sapaDateIssued || null,
        pacbrma: formData.denrPermits.pacbrma,
        pacbrma_no: formData.denrPermits.pacbrmaNo || null,
        pacbrma_date_issued: formData.denrPermits.pacbrmaDateIssued || null,
        ecc: formData.denrPermits.ecc,
        ecc_no: formData.denrPermits.eccNo || null,
        ecc_date_issued: formData.denrPermits.eccDateIssued || null,
        discharge_permit: formData.denrPermits.dischargePermit,
        dp_no: formData.denrPermits.dpNo || null,
        dp_date_issued: formData.denrPermits.dpDateIssued || null,
        permit_to_operate: formData.denrPermits.permitToOperate,
        pto_no: formData.denrPermits.ptoNo || null,
        pto_date_issued: formData.denrPermits.ptoDateIssued || null,
        other_permits: formData.denrPermits.otherPermits || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const createAttestationNotation = async () => {
    const hasAttestation = formData.attestedByName || formData.notedByName;
    if (!hasAttestation) return null;

    const { data, error } = await supabase
      .from("attestation_notations")
      .insert([{
        attested_by_name: formData.attestedByName || null,
        attested_by_position: formData.attestedByPosition || null,
        attested_by_signature: formData.attestedBySignature || null,
        noted_by_name: formData.notedByName || null,
        noted_by_position: formData.notedByPosition || null,
        noted_by_signature: formData.notedBySignature || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const linkReportImages = async (reportId: number) => {
    if (formData.allImageIds.length === 0) return;

    const linkData = formData.allImageIds.map((imageId, index) => ({
      report_id: reportId,
      geo_image_id: imageId,
      is_primary: imageId === formData.primaryGeoImageId,
      sequence_order: index + 1,
    }));

    const { error } = await supabase
      .from("report_geo_images")
      .insert(linkData);

    if (error) throw error;
  };

  const validateForm = (): boolean => {
    const required = [
      { field: formData.proponentName, name: "Proponent Name" },
      { field: formData.paId, name: "Protected Area" },
      { field: formData.location, name: "Location" },
    ];

    for (const { field, name } of required) {
      if (!field || (typeof field === 'string' && !field.trim())) {
        Alert.alert("Validation Error", `${name} is required`);
        return false;
      }
    }

    if (!enumeratorId) {
      Alert.alert("Error", "Unable to identify enumerator");
      return false;
    }

    return true;
  };

  const saveReport = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Create all related entities first
      const proponentId = await createProponent();
      const lotId = await createLot();
      const establishmentId = await createEstablishmentProfile();
      const lguPermitId = await createLguPermits();
      const denrPermitId = await createDenrPermits();
      const attestationId = await createAttestationNotation();

      // Create the main report
      const { data: reportData, error: reportError } = await supabase
        .from("enumerators_reports")
        .insert([{
          pa_id: formData.paId,
          proponent_id: proponentId,
          lot_id: lotId,
          establishment_profile_id: establishmentId,
          lgu_permit_id: lguPermitId,
          denr_permit_id: denrPermitId,
          attestation_id: attestationId,
          primary_geo_image_id: formData.primaryGeoImageId,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          coordinate_source: formData.coordinateSource,
          enumerator_id: enumeratorId,
          notes: formData.reportNotes || null,
        }])
        .select("id")
        .single();

      if (reportError) throw reportError;

      // Link all captured images to the report
      await linkReportImages(reportData.id);

      Alert.alert(
        "Success",
        "Enumerator report saved successfully",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading form...</Text>
      </View>
    );
  }

  const commonProps = {
    formData,
    updateFormData,
    paItems,
    paOpen,
    setPaOpen,
    setCurrentPage,
    saving,
  };

  switch (currentPage) {
    case 1:
      return <EnumRep1 {...commonProps} />;
    case 2:
      return <EnumRep2 {...commonProps} />;
    case 3:
      return <EnumRep3 {...commonProps} saveReport={saveReport} />;
    default:
      return <EnumRep1 {...commonProps} />;
  }
}