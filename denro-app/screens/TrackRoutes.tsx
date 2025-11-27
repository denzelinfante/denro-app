import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";

interface RoutePoint {
  lat: number;
  lon: number;
}

export default function TrackRoutes() {
  const params = useLocalSearchParams();
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let p = params.points;

    if (!p) return;

    // Ensure string (because params may return string[])
    if (Array.isArray(p)) p = p[0];

    try {
      const parsed: RoutePoint[] = JSON.parse(p);
      setPoints(parsed);
    } catch (err) {
      console.error("Invalid points:", err);
    }

    setLoading(false);
  }, [params.points]);

  if (loading || points.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: points[0].lat,
        longitude: points[0].lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >

      {/* Markers */}
      {points.map((p, i) => (
        <Marker
          key={i}
          coordinate={{ latitude: p.lat, longitude: p.lon }}
          title={`Point ${i + 1}`}
        />
      ))}

      {/* Route Line */}
      <Polyline
        coordinates={points.map(p => ({
          latitude: p.lat,
          longitude: p.lon,
        }))}
        strokeColor="#1976d2"
        strokeWidth={4}
      />

      {/* Polygon (optional if > 2 points) */}
      {points.length > 2 && (
        <Polygon
          coordinates={points.map(p => ({
            latitude: p.lat,
            longitude: p.lon,
          }))}
          strokeColor="#1976d2"
          fillColor="rgba(25, 118, 210, 0.3)"
          strokeWidth={3}
        />
      )}

    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
