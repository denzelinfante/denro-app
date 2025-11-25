// screens/TrackRoutes.tsx - Using Mapbox Static Image API
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../utils/supabase';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

interface RoutePoint {
  id: number;
  latitude: number;
  longitude: number;
  location: string;
  captured_at: string;
  image_sequence: number;
  qr_code: string;
}

export default function TrackRoutesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reportId?: string }>();
  
  const [loading, setLoading] = useState(true);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [reportName, setReportName] = useState('');
  const [totalDistance, setTotalDistance] = useState(0);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (params.reportId) {
      loadRouteData(parseInt(params.reportId));
    }
  }, [params.reportId]);

  const loadRouteData = async (reportId: number) => {
    try {
      const { data: reportData, error: reportError } = await supabase
        .from("enumerators_report")
        .select("establishment_name")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;
      setReportName(reportData.establishment_name);

      const { data: reportedImages, error: imagesError } = await supabase
        .from("reported_images")
        .select(`
          image_sequence,
          geo_tagged_images (
            id,
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

      if (imagesError) throw imagesError;

      if (reportedImages && reportedImages.length > 0) {
        const points: RoutePoint[] = reportedImages
          .filter(ri => ri.geo_tagged_images)
          .map(ri => {
            const img = ri.geo_tagged_images as any;
            return {
              id: img.id,
              latitude: img.latitude,
              longitude: img.longitude,
              location: img.location,
              captured_at: img.captured_at,
              qr_code: img.qr_code,
              image_sequence: ri.image_sequence,
            };
          });
        
        console.log('Route points loaded:', points);
        setRoutePoints(points);
        
        // Calculate total distance
        const distance = calculateTotalDistance(points);
        setTotalDistance(distance);
        
        // Generate map image URL
        const mapUrl = buildMapboxStaticWithRoute(points);
        console.log('Map URL:', mapUrl);
        setMapImageUrl(mapUrl);
      } else {
        Alert.alert("No Route Data", "No geo-tagged locations found for this report.");
      }
    } catch (error) {
      console.error("Error loading route data:", error);
      Alert.alert("Error", "Failed to load route tracking data");
    } finally {
      setLoading(false);
    }
  };

  // Build Mapbox Static Image with route line and markers
  const buildMapboxStaticWithRoute = (points: RoutePoint[]): string | null => {
  if (!MAPBOX_TOKEN || points.length === 0) return null;

  const style = 'mapbox/streets-v12';

  // Build route line (polyline)
  const lineCoords = points.map(p => `${p.longitude},${p.latitude}`).join(',');
  const lineOverlay = `path-6+ff0000-1(${lineCoords})`; // red line, stroke width 6, full opacity

  // Build markers
  const markers = points.map((point, index) => {
    const color = index === 0 ? '22c55e' : index === points.length - 1 ? 'ef4444' : '0ea5e9';
    return `pin-s-${point.image_sequence}+${color}(${point.longitude},${point.latitude})`;
  });

  // Calculate center of route
  const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const avgLon = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

  // Combine overlays: line first, then markers
  const overlays = [lineOverlay, ...markers].join(',');

  // Use zoom 18 for better framing
  const zoom = 20;
  const size = '600x400@2x';
  const url = `https://api.mapbox.com/styles/v1/${style}/static/${overlays}/${avgLon},${avgLat},${zoom}/${size}?access_token=${MAPBOX_TOKEN}`;

  return url;
};





  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const calculateTotalDistance = (points: RoutePoint[]): number => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += calculateDistance(
        points[i].latitude,
        points[i].longitude,
        points[i + 1].latitude,
        points[i + 1].longitude
      );
    }
    return total;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openInGoogleMaps = () => {
    if (routePoints.length === 0) return;
    
    // Open first point in Google Maps
    const firstPoint = routePoints[0];
    const url = `https://www.google.com/maps/search/?api=1&query=${firstPoint.latitude},${firstPoint.longitude}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading route data...</Text>
      </View>
    );
  }

  if (routePoints.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No route data available</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Route Tracking</Text>
            <Text style={styles.headerSubtitle}>{reportName}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Points</Text>
              <Text style={styles.statValue}>{routePoints.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {totalDistance < 1 
                  ? `${(totalDistance * 1000).toFixed(0)}m`
                  : `${totalDistance.toFixed(2)}km`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Map Image */}
        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Route Map</Text>
          {mapImageUrl ? (
            <TouchableOpacity 
              style={styles.mapContainer}
              onPress={openInGoogleMaps}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: mapImageUrl }}
                style={styles.mapImage}
                resizeMode="cover"
                onLoadStart={() => setMapLoading(true)}
                onLoadEnd={() => setMapLoading(false)}
                onError={(e) => {
                  console.error('Map image error:', e.nativeEvent.error);
                  setMapLoading(false);
                  Alert.alert('Map Error', 'Failed to load map. Check your Mapbox token.');
                }}
              />
              {mapLoading && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text style={styles.mapLoadingText}>Loading map...</Text>
                </View>
              )}
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>Tap to open in Google Maps</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                ⚠️ Map not available. Check Mapbox token in .env
              </Text>
            </View>
          )}
          
          {/* Map Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendText}>Start Point</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
              <Text style={styles.legendText}>Route Points</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>End Point</Text>
            </View>
          </View>
        </View>

        {/* Route Points List */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Route Points</Text>
          {routePoints.map((point, index) => (
            <View key={point.id} style={styles.pointItem}>
              <View style={[
                styles.pointNumber,
                index === 0 && styles.startPoint,
                index === routePoints.length - 1 && styles.endPoint,
              ]}>
                <Text style={styles.pointNumberText}>{point.image_sequence}</Text>
              </View>
              <View style={styles.pointInfo}>
                <Text style={styles.pointLocation} numberOfLines={2}>
                  {point.location || 'Unknown location'}
                </Text>
                <Text style={styles.pointCoords}>
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </Text>
                <Text style={styles.pointTime}>{formatDate(point.captured_at)}</Text>
                {index > 0 && (
                  <Text style={styles.pointDistance}>
                    📍 {(calculateDistance(
                      routePoints[index - 1].latitude,
                      routePoints[index - 1].longitude,
                      point.latitude,
                      point.longitude
                    ) * 1000).toFixed(0)}m from previous
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backBtnText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  mapSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    alignItems: 'center',
  },
  mapOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mapPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  listSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  pointItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pointNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  startPoint: {
    backgroundColor: '#22c55e',
  },
  endPoint: {
    backgroundColor: '#ef4444',
  },
  pointNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pointInfo: {
    flex: 1,
  },
  pointLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  pointCoords: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  pointTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  pointDistance: {
    fontSize: 11,
    color: '#0ea5e9',
    fontWeight: '600',
    marginTop: 4,
  },
  backButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});