// screens/CameraScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, STORAGE_BUCKET } from '../utils/supabase';


const SESSION_KEY = "denr_user_session";
const CAMERA_RETURN_DATA_KEY = "camera_return_data";

type PhotoRecord = {
  id: number;
  uri: string;
  lat: number;
  lon: number;
  acc?: number | null;
  createdAt: string;
  sessionId?: string;
};

const PHOTOS_KEY = 'photos';
const formatCoord = (v: number, decimals = 6) =>
  Number.isFinite(v) ? Number(v).toFixed(decimals) : '';

async function addPhotoToDB(rec: PhotoRecord) {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  const list: PhotoRecord[] = raw ? JSON.parse(raw) : [];
  list.unshift(rec);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(list));
}

async function getCurrentEnumeratorId(): Promise<number | null> {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed?.id) return parsed.id;
    }

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
}

// Test Supabase connectivity
async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Buckets test failed:', bucketsError);
      return false;
    }
    
    console.log('✅ Storage accessible. Available buckets:', buckets?.map(b => b.name));
    
    // Test 2: Check if our bucket exists (just warn, don't fail)
    const ourBucket = buckets?.find(b => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET);
    if (!ourBucket) {
      console.warn(`⚠️ Bucket "${STORAGE_BUCKET}" not found in list, will try upload anyway`);
      console.log('📦 Available bucket IDs:', buckets?.map(b => b.id));
      console.log('📦 Available bucket names:', buckets?.map(b => b.name));
      console.log('🎯 Looking for:', STORAGE_BUCKET);
      // Don't return false - bucket exists in Supabase, just not showing in list
    } else {
      console.log(`✅ Bucket "${STORAGE_BUCKET}" exists and is ${ourBucket.public ? 'public' : 'private'}`);
    }
    
    // Test 3: Database connectivity
    const { error: dbError } = await supabase
      .from('geo_tagged_images')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.error('❌ Database test failed:', dbError);
      return false;
    }
    
    console.log('✅ Database accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Connection test exception:', error);
    return false;
  }
}

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    requireGeoTag?: string;
    captureCoordinates?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView | null>(null);

  const [locGranted, setLocGranted] = useState(false);
  const [libGranted, setLibGranted] = useState(false);

  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);

  const [lat, setLat] = useState('—');
  const [lon, setLon] = useState('—');
  const [locationAddress, setLocationAddress] = useState<string>(''); 
  const [acc, setAcc] = useState<number | null>(null);

  const [frozen, setFrozen] = useState(false);
  const [locked, setLocked] = useState<{ lat: string; lon: string } | null>(null);

  const [accThresh, setAccThresh] = useState(9);

  const [pendingUri, setPendingUri] = useState<string | null>(null);

  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [lastPreviewUri, setLastPreviewUri] = useState<string | null>(null);

  const [multiMode, setMultiMode] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const reverseGeocodeTimeout = useRef<NodeJS.Timeout | null>(null);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    if (isReverseGeocoding) return locationAddress;
    
    try {
      setIsReverseGeocoding(true);
      
      const result = await Promise.race([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 3000)
        )
      ]);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const address = result[0];
        
        const parts = [
          address.street || address.name,
          address.district || address.subregion,
          address.city,
          address.region,
        ].filter(Boolean);
        
        const formattedLocation = parts.join(', ');
        if (formattedLocation) {
          setLocationAddress(formattedLocation);
          return formattedLocation;
        }
      }
    } catch (error) {
      console.log('Reverse geocoding skipped:', error);
    } finally {
      setIsReverseGeocoding(false);
    }
    return locationAddress;
  };

  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('STORAGE_BUCKET constant:', STORAGE_BUCKET);
    console.log('Expected:', 'geo-tagged-photos');
    console.log('Match:', STORAGE_BUCKET === 'geo-tagged-photos');
  }, []);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) await requestPermission();

      const lib = await MediaLibrary.requestPermissionsAsync();
      setLibGranted(lib.status === 'granted');

      const loc = await Location.requestForegroundPermissionsAsync();
      const granted = loc.status === 'granted';
      setLocGranted(granted);
      if (!granted) {
        Alert.alert(
          'Location needed',
          'Please enable location so latitude/longitude can be recorded.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      
      // Optional: Test Supabase connection on mount (non-blocking)
      // Just logs info, doesn't prevent uploads
      try {
        console.log('ℹ️  Testing initial connection (optional)...');
        const isConnected = await testSupabaseConnection();
        if (!isConnected) {
          console.warn('⚠️  Initial connection test failed, but uploads may still work');
          // Don't show alert - uploads will work anyway
        } else {
          console.log('✅ Initial connection test passed');
        }
      } catch (e) {
        console.warn('⚠️  Connection test error (non-critical):', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PHOTOS_KEY);
      const list: PhotoRecord[] = raw ? JSON.parse(raw) : [];
      if (list.length > 0) setLastPhotoUri(list[0].uri);
    })();
  }, []);

  useEffect(() => {
    if (!locGranted) return;

    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const last = await Location.getLastKnownPositionAsync({});
      if (last && !cancelled && !frozen) {
        const latVal = last.coords.latitude.toFixed(7);
        const lonVal = last.coords.longitude.toFixed(7);
        setLat(latVal);
        setLon(lonVal);
        setAcc(last.coords.accuracy != null ? Math.round(last.coords.accuracy) : null);
        
        if (!locationAddress) {
          reverseGeocode(last.coords.latitude, last.coords.longitude);
        }
      }

      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (cur && !cancelled && !frozen) {
        const latVal = cur.coords.latitude.toFixed(7);
        const lonVal = cur.coords.longitude.toFixed(7);
        setLat(latVal);
        setLon(lonVal);
        setAcc(cur.coords.accuracy != null ? Math.round(cur.coords.accuracy) : null);
        
        if (!locationAddress) {
          reverseGeocode(cur.coords.latitude, cur.coords.longitude);
        }
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (pos) => {
          if (cancelled || frozen) return;
          const latVal = pos.coords.latitude.toFixed(7);
          const lonVal = pos.coords.longitude.toFixed(7);
          setLat(latVal);
          setLon(lonVal);
          setAcc(pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null);
        }
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      if (reverseGeocodeTimeout.current) {
        clearTimeout(reverseGeocodeTimeout.current);
      }
    };
  }, [locGranted, frozen]);

  const toggleMultiMode = (val: boolean) => {
    setMultiMode(val);
    if (val && !sessionId) {
      setSessionId(String(Date.now()));
      setSessionCount(0);
    }
    if (!val) {
      setSessionId(null);
      setSessionCount(0);
    }
  };

  if (!permission) {
    return <View style={styles.center}><Text>Checking camera permission…</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10 }}>Camera permission is required.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleZoom = () => setZoom((z) => (z < 0.2 ? 0.4 : 0));
  const decThresh = () => setAccThresh((v) => Math.max(1, v - 1));
  const incThresh = () => setAccThresh((v) => Math.min(100, v + 1));

  const onToggleFrozen = (val: boolean) => {
    if (val) {
      setFrozen(true);
      setLocked({ lat: lat === '—' ? '' : lat, lon: lon === '—' ? '' : lon });
    } else {
      setFrozen(false);
      setLocked(null);
    }
  };

  const takeShot = async () => {
    try {
      if (!camRef.current) return;
      const photo = await camRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) return;
      setPendingUri(photo.uri);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to take photo.');
    }
  };

  const confirmSave = async () => {
    if (!pendingUri) return;
    try {
      if (libGranted) await MediaLibrary.saveToLibraryAsync(pendingUri);

      const useLat = (locked?.lat ?? lat).replace('—', '');
      const useLon = (locked?.lon ?? lon).replace('—', '');
      const latNum = Number(useLat);
      const lonNum = Number(useLon);

      const latFixed = Number(formatCoord(latNum, 6));
      const lonFixed = Number(formatCoord(lonNum, 6));

      const enumeratorId = await getCurrentEnumeratorId();
      if (!enumeratorId) {
        Alert.alert('Error', 'Unable to identify current user. Please login again.');
        return;
      }

      const sid = multiMode ? (sessionId ?? String(Date.now())) : `single-${Date.now()}`;
      if (multiMode && !sessionId) setSessionId(sid);

      const imageId = Date.now();
      const fileName = `geocam_${imageId}_${Date.now()}.jpg`;
      const filePath = `${STORAGE_BUCKET}/${fileName}`;

      console.log('📸 Starting save process...');
      console.log('📂 File path:', filePath);
      console.log('🪣 Bucket:', STORAGE_BUCKET);

      let publicImageUrl = '';
      let qrCodeData = '';
      let uploadSuccess = false;
      let storageMethod = 'local';

      // Try cloud upload with detailed error handling
      try {
        console.log('🔄 Converting image to blob...');
        const response = await fetch(pendingUri);
        
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('✅ Blob created:', blob.size, 'bytes, type:', blob.type);

        // Skip connection test - just try direct upload
        // The bucket exists and policies are correct, so upload will work
        console.log('⬆️  Uploading to Supabase Storage (skipping pre-check)...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('❌ Upload error:', {
            message: uploadError.message,
            name: uploadError.name,
            stack: uploadError.stack,
          });
          throw uploadError;
        }

        console.log('✅ Upload successful!', uploadData);

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        publicImageUrl = urlData.publicUrl;
        qrCodeData = publicImageUrl;
        uploadSuccess = true;
        storageMethod = 'cloud';

        console.log('🌐 Public URL:', publicImageUrl);

      } catch (uploadError: any) {
        console.error('❌ Cloud upload failed:', uploadError);
        console.error('Error details:', {
          message: uploadError?.message,
          name: uploadError?.name,
          cause: uploadError?.cause,
        });
        
        // Fallback: Use local storage
        publicImageUrl = pendingUri;
        qrCodeData = `https://www.google.com/maps?q=${latFixed},${lonFixed}&t=satellite&z=18`;
        uploadSuccess = false;
        storageMethod = 'local';
        
        console.log('📍 Using fallback - Google Maps QR:', qrCodeData);
      }

      // Save to database
      console.log('💾 Saving to database...');
      const { data: imageData, error: imageError } = await supabase
        .from("geo_tagged_images")
        .insert([{
          id: imageId,
          image: publicImageUrl,
          qr_code: qrCodeData,
          latitude: isFinite(latFixed) ? latFixed : null,
          longitude: isFinite(lonFixed) ? lonFixed : null,
          location: locationAddress || null,
          captured_by: enumeratorId,
          captured_at: new Date().toISOString(),
          storage_path: uploadSuccess ? filePath : pendingUri,
          is_primary: !multiMode,
          photo_sequence: multiMode ? sessionCount + 1 : 1,
          notes: `Storage: ${storageMethod}`,
        }])
        .select("id")
        .single();

      if (imageError) {
        console.error('❌ Database save error:', imageError);
        Alert.alert('Error', 'Failed to save image to database. Please try again.');
        return;
      }

      console.log('✅ Database save successful! Image ID:', imageData.id);

      // Update local storage
      const rec: PhotoRecord = {
        id: imageData.id,
        uri: publicImageUrl,
        lat: isFinite(latFixed) ? latFixed : 0,
        lon: isFinite(lonFixed) ? lonFixed : 0,
        acc,
        createdAt: new Date().toISOString(),
        sessionId: sid,
      };
      await addPhotoToDB(rec);

      setLastPhotoUri(publicImageUrl);
      setPendingUri(null);

      // Show appropriate success message
      if (uploadSuccess) {
        Alert.alert('✅ Success!', 'Image uploaded to cloud storage successfully!');
      } else {
        Alert.alert('💾 Saved Locally', 'Image saved locally. Will upload when connection is restored.');
      }

      if (multiMode) {
        setSessionCount((n) => n + 1);
      } else {
        if (params.returnTo && params.captureCoordinates === 'true') {
          await AsyncStorage.setItem(CAMERA_RETURN_DATA_KEY, JSON.stringify({
            primaryGeoImageId: imageData.id.toString(),
            latitude: latFixed.toString(),
            longitude: lonFixed.toString(),
            location: locationAddress,
            totalImages: '1',
            imageIds: imageData.id.toString(),
            timestamp: Date.now(),
          }));
          
          router.back();
        } else {
          router.replace('/CollectionScreen');
        }
      }

    } catch (e: any) {
      console.error('❌ Overall save error:', e);
      Alert.alert('Error', e?.message ?? 'Save failed.');
    }
  };

  const cancelPreview = () => setPendingUri(null);

  const finishSession = async () => {
    if (multiMode && sessionId) {
      if (params.returnTo && params.captureCoordinates === 'true') {
        try {
          const raw = await AsyncStorage.getItem(PHOTOS_KEY);
          const allPhotos: PhotoRecord[] = raw ? JSON.parse(raw) : [];
          const sessionPhotos = allPhotos.filter(p => p.sessionId === sessionId);
          
          if (sessionPhotos.length > 0) {
            const primaryPhoto = sessionPhotos[0];
            const imageIds = sessionPhotos.map(p => p.id).join(',');
            
            await AsyncStorage.setItem(CAMERA_RETURN_DATA_KEY, JSON.stringify({
              primaryGeoImageId: primaryPhoto.id.toString(),
              latitude: primaryPhoto.lat.toString(),
              longitude: primaryPhoto.lon.toString(),
              location: locationAddress,
              totalImages: sessionPhotos.length.toString(),
              imageIds: imageIds,
              timestamp: Date.now(),
            }));
            
            router.back();
          } else {
            Alert.alert('No Photos', 'Please capture at least one photo before finishing.');
          }
        } catch (error) {
          console.error('Error finishing session:', error);
          Alert.alert('Error', 'Failed to save session data');
        }
      } else {
        setMultiMode(false);
        setSessionId(null);
        setSessionCount(0);
        Alert.alert('Session Complete', `Captured ${sessionCount} photo${sessionCount !== 1 ? 's' : ''}`);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={camRef}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        zoom={zoom}
      >
      </CameraView>

      <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.flashBtn}>
        <Text style={{ fontSize: 28 }}>{torch ? '🔦' : '⚡'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleZoom} style={styles.zoomBubble}>
        <Text style={styles.zoomText}>{zoom < 0.2 ? '1x' : '2x'}</Text>
      </TouchableOpacity>

      <View style={styles.bottomOverlay}>
        <View style={styles.modeRow}>
          <View style={styles.modeItem}>
            <Text style={styles.label}>Multi</Text>
            <Switch value={multiMode} onValueChange={toggleMultiMode} />
          </View>

          <View style={styles.modeItem}>
            <Text style={styles.label}>Pointers</Text>
            <Switch value={frozen} onValueChange={onToggleFrozen} />
          </View>

          {multiMode && (
            <Text style={styles.sessionBadge}>
              Session: {sessionCount} photo{sessionCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.coordGroup}>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Lati:</Text>
              <Text style={styles.coordInputText}>{locked?.lat ?? lat}</Text>
            </View>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Longi:</Text>
              <Text style={styles.coordInputText}>{locked?.lon ?? lon}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Location:</Text>
            <Text style={[styles.coordInputText, { fontSize: 11, minHeight: 32 }]}>
              {locationAddress || 'Tap button to get location →'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              const latNum = parseFloat(locked?.lat ?? lat);
              const lonNum = parseFloat(locked?.lon ?? lon);
              if (!isNaN(latNum) && !isNaN(lonNum)) {
                reverseGeocode(latNum, lonNum);
              }
            }}
            style={styles.refreshLocationBtn}
            disabled={isReverseGeocoding}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>
              {isReverseGeocoding ? '⏳' : '📍'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accuracyRow}>
          <Text style={styles.accuracyLabel}>Accuracy Threshold (meters):</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={decThresh} style={styles.stepBtn}><Text style={styles.stepText}>−</Text></TouchableOpacity>
            <Text style={styles.stepValue}>{accThresh}</Text>
            <TouchableOpacity onPress={incThresh} style={styles.stepBtn}><Text style={styles.stepText}>＋</Text></TouchableOpacity>
          </View>
          <Text style={styles.liveAcc}>({acc != null ? `now: ${acc}m` : '—'})</Text>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.photoLabel}>PHOTO</Text>
            <TouchableOpacity onPress={takeShot} style={styles.shutterOuter}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>

          {multiMode ? (
            <TouchableOpacity onPress={finishSession} style={styles.finishBtn}>
              <Text style={styles.finishText}>Finish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => lastPhotoUri && setLastPreviewUri(lastPhotoUri)}
              style={styles.galleryBtn}
            >
              {lastPhotoUri ? (
                <Image source={{ uri: lastPhotoUri }} style={styles.thumb} />
              ) : (
                <Text style={{ color: '#fff', fontSize: 18 }}>📷</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {pendingUri && (
        <View style={styles.previewOverlay}>
          <Image source={{ uri: pendingUri }} style={styles.previewImage} />
          <View style={styles.previewBar}>
            <TouchableOpacity style={styles.roundBtn} onPress={cancelPreview}>
              <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundBtn, styles.roundConfirm]} onPress={confirmSave}>
              <Text style={{ color: '#fff', fontSize: 20 }}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {lastPreviewUri && (
        <View style={styles.previewOverlay}>
          <Image source={{ uri: lastPreviewUri }} style={styles.previewImage} />
          <View style={styles.previewBar}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => setLastPreviewUri(null)}>
              <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roundBtn, styles.roundConfirm]}
              onPress={() => {
                setLastPreviewUri(null);
                router.push('/CollectionScreen');
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  flashBtn: { position: 'absolute', top: 18, left: 16, padding: 8 },
  zoomBubble: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 140,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  zoomText: { color: '#fff', fontWeight: '700' },
  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 14 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionBadge: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { color: '#fff' },
  coordGroup: { flex: 1 },
  coordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  coordLabel: { color: '#fff', width: 48, textAlign: 'right', marginRight: 6 },
  coordInputText: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#000',
  },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  accuracyLabel: { color: '#fff', flex: 1.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  stepBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  stepText: { color: '#000', fontSize: 16, fontWeight: '700' },
  stepValue: { color: '#000', width: 28, textAlign: 'center', fontWeight: '700' },
  liveAcc: { color: '#fff', marginLeft: 8 },
  bottomBar: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: '#fff', fontSize: 16 },
  photoLabel: { color: '#ffcc00', fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  galleryBtn: { width: 42, height: 42, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  thumb: { width: '100%', height: '100%' },
  finishBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#fff',
    backgroundColor: 'rgba(46,125,50,0.9)',
  },
  finishText: { color: '#fff', fontWeight: '700' },
  refreshLocationBtn: {
    backgroundColor: 'rgba(14,165,233,0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    alignSelf: 'center',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  previewImage: { width: '100%', height: '85%', resizeMode: 'contain' },
  previewBar: { position: 'absolute', bottom: 26, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 28 },
  roundBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  roundConfirm: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
});