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
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../utils/supabase';
import polyline from '@mapbox/polyline';
// ✅ Use only PUBLIC token in frontend
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
  const [mapHtml, setMapHtml] = useState<string | null>(null);

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

        setRoutePoints(points);

        // Calculate total distance
        const distance = calculateTotalDistance(points);
        setTotalDistance(distance);

        // Generate interactive map
        const html = buildInteractiveMap(points);
        setMapHtml(html);
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

  const buildInteractiveMap = (points: RoutePoint[]): string | null => {
    if (!MAPBOX_TOKEN || points.length === 0) return null;

    const avgLat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const avgLon = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    
    // Close the loop: 1 -> 2 -> 3 -> 4 -> 1
    const loopPoints = [...points, points[0]];
    const coordinates = loopPoints.map(p => `[${p.longitude}, ${p.latitude}]`).join(',');

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
  <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${MAPBOX_TOKEN}';
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${avgLon}, ${avgLat}],
      zoom: 14
    });

    map.on('load', () => {
      const coordinates = [${coordinates}];
      const markerCoords = coordinates.slice(0, -1); // Remove duplicate last point for markers
      
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0ea5e9', 'line-width': 4 }
      });
      markerCoords.forEach((coord, i) => {
        const color = i === 0 ? '#22c55e' : i === markerCoords.length - 1 ? '#ef4444' : '#0ea5e9';
        new mapboxgl.Marker({ color }).setLngLat(coord).addTo(map);
      });
      const bounds = markerCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(markerCoords[0], markerCoords[0]));
      map.fitBounds(bounds, { padding: 50 });
    });
  </script>
</body>
</html>`;
  };



  // Distance helpers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const toRad = (deg: number): number => deg * (Math.PI / 180);

  const calculateTotalDistance = (points: RoutePoint[]): number => {
    if (points.length < 2) return 0;
    return points.reduce((total, p, i) => {
      if (i === 0) return total;
      return total + calculateDistance(points[i - 1].latitude, points[i - 1].longitude, p.latitude, p.longitude);
    }, 0);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const openInGoogleMaps = () => {
    if (routePoints.length === 0) return;
    const firstPoint = routePoints[0];
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${firstPoint.latitude},${firstPoint.longitude}`);
  };

  // UI rendering
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

        {/* Interactive Map */}
        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Route Map (Pinch to Zoom)</Text>
          {mapHtml ? (
            <View style={styles.mapContainer}>
              <WebView
                source={{ html: mapHtml }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
              <TouchableOpacity 
                style={styles.googleMapsButton}
                onPress={openInGoogleMaps}
              >
                <Text style={styles.googleMapsButtonText}>📍 Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
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
            <TouchableOpacity 
              key={point.id} 
              style={styles.pointItem}
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`)}
              activeOpacity={0.7}
            >
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
              <Text style={styles.tapHint}>Tap to open</Text>
            </TouchableOpacity>
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
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  googleMapsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  googleMapsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
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
  tapHint: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 8,
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
