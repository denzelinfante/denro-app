// screens/Enumerators/EnumeratorsReport.tsx
import React, { useState, useEffect, useRef } from "react";
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
  proponentId: number | null;
  proponentName: string;
  proponentContact: string;
  proponentEmail: string;
  proponentAddress: string;
  
  // Lot data
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
  
  // Signatures
  enumeratorName: string;
  enumeratorSignature: string;
  informantName: string;
  informantSignature: string;
  informantDate: string;
  
  // General notes
  reportNotes: string;
}

export default function EnumeratorsReport() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    primaryGeoImageId?: string;
    latitude?: string;
    longitude?: string;
    location?: string;
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

  // Track if camera data has been processed to prevent loop
  const processedImageId = useRef<string | null>(null);

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    paId: null,
    proponentId: null,
    proponentName: "",
    proponentContact: "",
    proponentEmail: "",
    proponentAddress: "",
    location: "",
    lotStatus: "",
    taxDeclarationNo: "",
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
    enumeratorName: "",
    enumeratorSignature: "",
    informantName: "",
    informantSignature: "",
    informantDate: "",
    reportNotes: "",
  });

  // Initialize component ONCE
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load protected areas
        await loadProtectedAreas();
        
        // Get enumerator ID and name
        const enumId = await getEnumeratorId();
        setEnumeratorId(enumId);
        
        // Load enumerator name immediately after getting ID
        if (enumId) {
          try {
            const { data: userData, error } = await supabase
              .from("users")
              .select("first_name, last_name")
              .eq("id", enumId)
              .single();
            
            if (error) {
              console.error("Error loading enumerator name:", error);
            } else if (userData) {
              const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
              console.log("Loaded enumerator name:", fullName);
              setFormData(prev => ({ ...prev, enumeratorName: fullName }));
            } else {
              console.warn("No name found for enumerator ID:", enumId);
              setFormData(prev => ({ ...prev, enumeratorName: "Unknown User" }));
            }
          } catch (nameError) {
            console.error("Exception loading name:", nameError);
            setFormData(prev => ({ ...prev, enumeratorName: "Error loading name" }));
          }
        } else {
          console.warn("No enumerator ID found");
          setFormData(prev => ({ ...prev, enumeratorName: "Not logged in" }));
        }
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize form");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Check for camera return data when screen comes into focus
  useEffect(() => {
    const checkCameraReturnData = async () => {
      try {
        const cameraDataStr = await AsyncStorage.getItem("camera_return_data");
        if (cameraDataStr) {
          const cameraData = JSON.parse(cameraDataStr);
          console.log("Found camera return data:", cameraData);
          
          // Process the camera data
          const parsedPrimaryId = parseInt(cameraData.primaryGeoImageId);
          const allIds = cameraData.imageIds
            .split(',')
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
          
          // Update form data with camera data
          setFormData(prev => ({
            ...prev,
            primaryGeoImageId: parsedPrimaryId,
            latitude: cameraData.latitude,
            longitude: cameraData.longitude,
            location: cameraData.location || prev.location,
            allImageIds: allIds,
            coordinateSource: "camera",
          }));
          
          // Clear the camera return data
          await AsyncStorage.removeItem("camera_return_data");
        }
      } catch (error) {
        console.error("Error checking camera return data:", error);
      }
    };

    // Check immediately when component mounts or updates
    checkCameraReturnData();
    
    // Set up an interval to check periodically (in case of race conditions)
    const interval = setInterval(checkCameraReturnData, 500);
    
    return () => clearInterval(interval);
  }, []);

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

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Database operations - single establishment_profile table
  const createEstablishmentProfile = async () => {
    // Get selected establishment types
    const selectedTypes = Object.keys(formData.establishmentTypes)
      .filter(type => formData.establishmentTypes[type]);
    
    // Combine selected types and other type
    let establishmentType = selectedTypes.join(', ');
    if (formData.establishmentOther && formData.establishmentTypes["Others"]) {
      establishmentType += establishmentType ? `, ${formData.establishmentOther}` : formData.establishmentOther;
    }

    const { data, error } = await supabase
      .from("establishment_profile")
      .insert([{
        establishment_name: formData.proponentName,
        geo_tagged_image_id: formData.primaryGeoImageId,
        
        // Lot/Land info
        lot_status: formData.lotStatus || null,
        tax_declaration_no: formData.taxDeclarationNo || null,
        land_classification: formData.landClassification || null,
        title_no: formData.titleNo || null,
        lot_no: formData.lotNo || null,
        lot_owner: formData.lotOwner || null,
        area_covered: formData.areaCovered || null,
        
        // PA Zone
        pa_zone: formData.managementZone || null,
        within_easement: formData.withinEasement,
        
        // Establishment info
        establishment_status: formData.establishmentStatus || null,
        establishment_type: establishmentType || null,
        description: formData.establishmentNotes || null,
        
        // LGU Permits
        mayor_permit_no: formData.lguPermits.mpNumber || null,
        mayor_permit_issued: formData.lguPermits.mpDateIssued || null,
        mayor_permit_exp: formData.lguPermits.mpExpiryDate || null,
        
        business_permit_no: formData.lguPermits.bpNumber || null,
        business_permit_issued: formData.lguPermits.bpDateIssued || null,
        business_permit_exp: formData.lguPermits.bpExpiryDate || null,
        
        building_permit_no: formData.lguPermits.bldgNumber || null,
        building_permit_issued: formData.lguPermits.bldgDateIssued || null,
        building_permit_exp: formData.lguPermits.bldgExpiryDate || null,
        
        // DENR/EMB Permits
        pamb_resolution_no: formData.denrPermits.pambResolutionNo || null,
        pamb_date_issued: formData.denrPermits.pambDateIssued || null,
        
        sapa_no: formData.denrPermits.sapaNo || null,
        sapa_date_issued: formData.denrPermits.sapaDateIssued || null,
        
        pacbrma_no: formData.denrPermits.pacbrmaNo || null,
        pacbrma_date_issued: formData.denrPermits.pacbrmaDateIssued || null,
        
        ecc_no: formData.denrPermits.eccNo || null,
        ecc_date_issued: formData.denrPermits.eccDateIssued || null,
        
        discharge_permit_no: formData.denrPermits.dpNo || null,
        discharge_date_issued: formData.denrPermits.dpDateIssued || null,
        
        pto_no: formData.denrPermits.ptoNo || null,
        pto_date_issued: formData.denrPermits.ptoDateIssued || null,
        
        other_emb: formData.denrPermits.otherPermits || null,
      }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };

  const validateForm = (): boolean => {
    const required = [
      { field: formData.proponentName, name: "Establishment Name" },
      { field: formData.paId, name: "Protected Area" },
      { field: formData.location, name: "Location" },
      { field: formData.primaryGeoImageId, name: "Geo-tagged Image" },
      { field: formData.enumeratorSignature, name: "Enumerator Signature" },
    ];

    for (const { field, name } of required) {
      if (!field || (typeof field === 'string' && !field.trim())) {
        Alert.alert("Validation Error", `${name} is required`);
        return false;
      }
    }

    // Validate tax declaration number if lot status is "tax declaration"
    if (formData.lotStatus === "tax declaration" && !formData.taxDeclarationNo?.trim()) {
      Alert.alert("Validation Error", "Tax Declaration No. is required when Lot Status is Tax Declaration");
      return false;
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
      console.log('Form data before save:', {
        primaryGeoImageId: formData.primaryGeoImageId,
        proponentId: formData.proponentId,
        proponentName: formData.proponentName,
        latitude: formData.latitude,
        longitude: formData.longitude,
        allImageIds: formData.allImageIds
      });

      // Create establishment profile
      const establishmentId = await createEstablishmentProfile();

      // Handle proponent - create new or update existing
      let proponentId = formData.proponentId;
      
      if (proponentId) {
        // Update existing proponent's contact if it was modified
        const { error: updateError } = await supabase
          .from("proponents")
          .update({
            contact_number: formData.proponentContact || null,
          })
          .eq("id", proponentId);

        if (updateError) {
          console.warn("Warning: Could not update proponent contact:", updateError);
        }
      } else {
        // Create new proponent
        const { data: proponentData, error: proponentError } = await supabase
          .from("proponents")
          .insert([{
            name: formData.proponentName,
            contact_number: formData.proponentContact || null,
          }])
          .select("id")
          .single();

        if (proponentError) throw proponentError;
        proponentId = proponentData.id;
      }

      // Fetch names for denormalization
      const { data: enumeratorData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", enumeratorId)
        .single();

      const enumeratorFullName = enumeratorData 
        ? `${enumeratorData.first_name || ''} ${enumeratorData.last_name || ''}`.trim()
        : null;

      const { data: paData } = await supabase
        .from("protected_areas")
        .select("name")
        .eq("id", formData.paId)
        .single();

      // Validate informant date - only save if it's a valid date format
      const isValidDate = (dateString: string): boolean => {
        if (!dateString || !dateString.trim()) return false;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
      };

      const informantDateValue = isValidDate(formData.informantDate) 
        ? formData.informantDate 
        : null;

      // Store the reason in remarks if not a valid date
      let remarksText = formData.reportNotes || '';
      if (formData.informantDate && !isValidDate(formData.informantDate)) {
        remarksText = `Informant signature note: ${formData.informantDate}\n\n${remarksText}`.trim();
      }

      console.log('About to insert enumerators_report with:', {
        establishment_id: establishmentId,
        proponent_id: proponentId,
        geo_tagged_image_id: formData.primaryGeoImageId,
        total_images: formData.allImageIds.length
      });

      // Create the main enumerators report
      const { data: reportData, error: reportError } = await supabase
        .from("enumerators_report")
        .insert([{
          establishment_id: establishmentId,
          proponent_id: proponentId,
          pa_id: formData.paId,
          geo_tagged_image_id: formData.primaryGeoImageId,
          report_date: new Date().toISOString().split('T')[0],
          enumerator_id: enumeratorId,
          enumerator_signature_date: new Date().toISOString().split('T')[0],
          enumerator_signature: formData.enumeratorSignature || null,
          informant_name: formData.informantName || null,
          informant_signature_date: informantDateValue,
          informant_signature: formData.informantSignature || null,
          remarks: remarksText || null,
          // Denormalized names for historical record
          enumerator_name: enumeratorData?.first_name + ' ' + enumeratorData?.last_name || formData.enumeratorName || null,
          establishment_name: formData.proponentName || null,
          proponent_name: formData.proponentName || null,
          pa_name: paData?.name || null,
        }])
        .select("id")
        .single();

      if (reportError) throw reportError;

      // Save all captured images to the linking table
      if (formData.allImageIds && formData.allImageIds.length > 0) {
        console.log('Saving all images to report:', formData.allImageIds);
        
        const reportImages = formData.allImageIds.map((imageId, index) => ({
          report_id: reportData.id,
          report_type: 'enumerator',
          image_id: imageId,
          is_primary: imageId === formData.primaryGeoImageId,
          image_sequence: index + 1,
        }));

        const { error: imagesError } = await supabase
          .from("reported_images")
          .insert(reportImages);

        if (imagesError) {
          console.error('Error saving report images:', imagesError);
          // Don't throw error here - report is already created, just log the issue
          Alert.alert(
            "Warning", 
            "Report saved but some images may not be linked. Please contact support if images are missing."
          );
        } else {
          console.log(`Successfully linked ${formData.allImageIds.length} images to report`);
        }
      }

      Alert.alert(
        "Success",
        `Enumerator report saved successfully with ${formData.allImageIds.length} image${formData.allImageIds.length !== 1 ? 's' : ''}`,
        [{ text: "OK", onPress: () => router.replace("/MyReportsScreen") }]
      );
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert("Error", `Failed to save report: ${errorMessage}`);
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