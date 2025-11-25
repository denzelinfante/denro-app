// screens/ReportDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../utils/supabase';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

// ---- Mapbox / OSM -----------------------------------------------------------
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** Mapbox Static Image (uses LON,LAT order in the URL). */
function buildMapboxStatic(
  lat: number,
  lon: number,
  w = 120,
  h = 84,
  zoom = 16
) {
  if (!MAPBOX_TOKEN) return null;

  const style = 'mapbox/streets-v12';
  const marker = `pin-s+ff0000(${lon},${lat})`; // lon,lat
  const size = `${Math.round(w)}x${Math.round(h)}@2x`;

  return (
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `${marker}/` +
    `${lon},${lat},${zoom},0,0/` +
    `${size}` +
    `?access_token=${MAPBOX_TOKEN}`
  );
}

/** OpenStreetMap static fallback (lat,lon order here). */
function buildOSMStatic(
  lat: number,
  lon: number,
  w = 120,
  h = 84,
  zoom = 16
) {
  return (
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${lat},${lon}` +
    `&zoom=${zoom}` +
    `&size=${Math.round(w)}x${Math.round(h)}` +
    `&markers=${lat},${lon},lightblue1`
  );
}

function openInGoogleMaps(lat: number, lon: number) {
  const q = `${lat},${lon}`;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
}
// ---------------------------------------------------------------------------

interface ReportDetails {
  id: number;
  report_date: string;
  establishment_name: string;
  proponent_name: string;
  pa_name: string;
  enumerator_name: string;
  informant_name: string | null;
  informant_signature_date: string | null;
  enumerator_signature: string | null;
  informant_signature: string | null;
  remarks: string | null;
  created_at: string;
  geo_tagged_image_id: number | null;
}

interface GeoImage {
  id: number;
  image: string;
  latitude: number;
  longitude: number;
  location: string;
  captured_at: string;
  is_primary: boolean;
  image_sequence: number;
  qr_code: string;
}

export default function ReportDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [images, setImages] = useState<GeoImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fallbackIds, setFallbackIds] = useState<Record<number, boolean>>({});
  const [mapLoading, setMapLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (params.id) {
      loadReportDetails(parseInt(params.id));
    }
  }, [params.id]);

  const loadReportDetails = async (reportId: number) => {
    try {
      // Fetch report details
      const { data: reportData, error: reportError } = await supabase
        .from("enumerators_report")
        .select("*")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;
      setReport(reportData);

      // Fetch ALL associated images from reported_images table
      const { data: reportedImages, error: reportedImagesError } = await supabase
        .from("reported_images")
        .select(`
          image_id,
          is_primary,
          image_sequence,
          geo_tagged_images (
            id,
            image,
            latitude,
            longitude,
            location,
            captured_at,
            qr_code
          )
        `)
        .eq("report_id", reportId)
        .eq("report_type", "enumerator")
        .order("image_sequence", { ascending: true });

      if (reportedImagesError) {
        console.error("Error loading images:", reportedImagesError);
      } else if (reportedImages && reportedImages.length > 0) {
        // Transform the data to match our GeoImage interface
        const imageData = reportedImages
          .filter(ri => ri.geo_tagged_images) // Filter out any null joins
          .map(ri => {
            const img = ri.geo_tagged_images as any;
            return {
              id: img.id,
              image: img.image,
              latitude: img.latitude,
              longitude: img.longitude,
              location: img.location,
              captured_at: img.captured_at,
              qr_code: img.qr_code,
              is_primary: ri.is_primary,
              image_sequence: ri.image_sequence,
            };
          });
        
        setImages(imageData);
        console.log(`Loaded ${imageData.length} images for report ${reportId}`);
      } else {
        console.log("No images found in reported_images, trying legacy method");
        
        // Fallback: Try loading from the single geo_tagged_image_id (legacy support)
        if (reportData.geo_tagged_image_id) {
          const { data: imageData, error: imageError } = await supabase
            .from("geo_tagged_images")
            .select("id, image, latitude, longitude, location, captured_at, qr_code")
            .eq("id", reportData.geo_tagged_image_id)
            .single();

          if (!imageError && imageData) {
            setImages([{
              ...imageData,
              is_primary: true,
              image_sequence: 1,
            }]);
            console.log("Loaded 1 image from legacy geo_tagged_image_id");
          }
        }
      }
    } catch (error) {
      console.error("Error loading report details:", error);
      Alert.alert("Error", "Failed to load report details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    // Navigate to update form with report data
    Alert.alert(
      "Update Report",
      "This will allow you to edit the report details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: () => {
            // TODO: Navigate to edit screen with report ID
            router.push(`/Enumerators/EnumeratorsReport?editId=${report?.id}`);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', '');
  };

  const ImageWithOverlay = ({ img }: { img: GeoImage }) => {
    // Smaller map dimensions
    const mapW = 120;
    const mapH = 84;
    const mbUrl = buildMapboxStatic(img.latitude, img.longitude, mapW, mapH, 16);
    const useOSM = fallbackIds[img.id] || !mbUrl;
    const mapUrl = useOSM ? buildOSMStatic(img.latitude, img.longitude, mapW, mapH, 16) : mbUrl!;

    return (
      <TouchableOpacity
        onPress={() => setSelectedImage(img.image)}
        style={styles.imageWithOverlay}
      >
        <Image
          source={{ uri: img.image }}
          style={styles.fullImage}
          resizeMode="cover"
        />
        
        {/* QR Code Overlay - Upper Left */}
        {img.qr_code && (
          <View style={styles.qrCodeOverlay}>
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={img.qr_code}
                size={100}
                backgroundColor="white"
              />
            </View>
          </View>
        )}

        {/* Bottom Info Overlay */}
        <View style={styles.imageInfoOverlay}>
          <View style={styles.imageInfoContent}>
            <Text style={styles.imageInfoText}>Latitude: {img.latitude?.toFixed(7)}</Text>
            <Text style={styles.imageInfoText}>Longitude: {img.longitude?.toFixed(7)}</Text>
            <Text style={styles.imageInfoText}>{img.location || 'Location not available'}</Text>
            <Text style={styles.imageInfoText}>{formatDateTime(img.captured_at)}</Text>
            <Text style={styles.imageInfoText}>© DENR GeoCam app</Text>
          </View>
          
          {/* Map Thumbnail with Loading State */}
          <TouchableOpacity
            style={styles.mapThumbnail}
            activeOpacity={0.85}
            onPress={() => openInGoogleMaps(img.latitude, img.longitude)}
          >
            <Image
              source={{ uri: mapUrl }}
              style={styles.mapThumbnailImage}
              onLoadStart={() => setMapLoading((s) => ({ ...s, [img.id]: true }))}
              onLoadEnd={() => setMapLoading((s) => ({ ...s, [img.id]: false }))}
              onError={() => {
                setFallbackIds(prev => ({ ...prev, [img.id]: true }));
                setMapLoading((s) => ({ ...s, [img.id]: false }));
              }}
            />
            {mapLoading[img.id] && (
              <View style={styles.mapSpinner}>
                <Text style={{ color: '#111', fontSize: 10 }}>Loading...</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Primary Badge */}
        {img.is_primary && (
          <View style={styles.primaryBadgeTop}>
            <Text style={styles.primaryBadgeTextTop}>Primary #{img.image_sequence}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || "N/A"}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading report details...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Report not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get primary image for coordinates display
  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{report.establishment_name}</Text>
          <Text style={styles.reportId}>Report ID: {report.id}</Text>
        </View>

        {/* Images Section */}
        {images.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Geo-tagged Images</Text>
              <Text style={styles.imageCount}>
                {images.length} photo{images.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {/* Display images with overlays */}
            {images.map((img) => (
              <View key={img.id} style={styles.imageSection}>
                <ImageWithOverlay img={img} />
              </View>
            ))}
            
            {primaryImage && (
              <View style={styles.coordinatesBox}>
                <Text style={styles.coordinatesLabel}>Primary Image Coordinates:</Text>
                <Text style={styles.coordinatesText}>
                  {primaryImage.location || "No location data"}
                </Text>
                <Text style={styles.coordinatesText}>
                  Lat: {primaryImage.latitude?.toFixed(6)}, Lon: {primaryImage.longitude?.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Information</Text>
          <InfoRow label="Report Date" value={formatDate(report.report_date)} />
          <InfoRow label="Protected Area" value={report.pa_name} />
          <InfoRow label="Enumerator" value={report.enumerator_name} />
          <InfoRow label="Submitted On" value={formatDate(report.created_at)} />
          
        </View>

        <View style={styles.infoRow}>
  <Text style={styles.label}>Enumerator:</Text>

  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
    <Text style={styles.value}>{report.enumerator_name}</Text>

  </View>
</View>
<TouchableOpacity
      style={styles.trackButton}
        onPress={() => router.push(`/TrackRoutes?reportId=${report?.id}`)}
    >
      <Text style={styles.trackButtonText}>Track</Text>
    </TouchableOpacity>

        {/* Establishment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Establishment Details</Text>
          <InfoRow label="Establishment" value={report.establishment_name} />
          <InfoRow label="Proponent" value={report.proponent_name} />
        </View>

        {/* Signatures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          
          {report.enumerator_signature && (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Enumerator Signature:</Text>
              <Image
                source={{ uri: report.enumerator_signature }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <Text style={styles.signatureName}>{report.enumerator_name}</Text>
            </View>
          )}

          {report.informant_name && (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Informant Signature:</Text>
              {report.informant_signature ? (
                <>
                  <Image
                    source={{ uri: report.informant_signature }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.signatureName}>{report.informant_name}</Text>
                  {report.informant_signature_date && (
                    <Text style={styles.signatureDate}>
                      Date: {formatDate(report.informant_signature_date)}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.noSignatureText}>
                  {report.informant_name} - No signature captured
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Remarks */}
        {report.remarks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <Text style={styles.remarksText}>{report.remarks}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={handleUpdate}
        >
          <Text style={styles.updateBtnText}>Update Report</Text>
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  reportId: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  imageCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 130,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  imageScroll: {
    marginBottom: 12,
  },
  imageSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageWithOverlay: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  qrCodeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  imageInfoContent: {
    flex: 1,
  },
  imageInfoText: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  mapThumbnail: {
    width: 120,
    height: 84,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 12,
    position: 'relative',
  },
  mapThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  mapSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  mapIcon: {
    fontSize: 24,
  },
  mapText: {
    fontSize: 9,
    color: '#374151',
    marginTop: 2,
    fontWeight: '600',
  },
  primaryBadgeTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryBadgeTextTop: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  imageThumbnail: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  thumbnailInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageSequence: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  imageDate: {
    fontSize: 9,
    color: '#fff',
  },
  coordinatesBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  coordinatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 11,
    color: '#6b7280',
  },
  signatureBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  signatureImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  signatureName: {
    fontSize: 12,
    color: '#1f2937',
    marginTop: 4,
    fontWeight: '500',
  },
  signatureDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  noSignatureText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  remarksText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateBtn: {
    flex: 2,
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },

  trackButton: {
  marginLeft: 6,          // slightly smaller gap
  backgroundColor: "#22c55e",
  paddingVertical: 4,     // reduced height
  paddingHorizontal: 8,   // reduced width
  borderRadius: 4,        // smaller rounded corners
  minWidth: 50,           // optional fixed min width
  alignItems: "center",
  justifyContent: "center",
},

trackButtonText: {
  color: "#fff",
  fontSize: 10,           // smaller font
  fontWeight: "600",
},

});