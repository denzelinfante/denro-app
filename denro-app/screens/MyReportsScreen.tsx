// screens/MyReportsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';

const SESSION_KEY = "denr_user_session";

interface Report {
  id: number;
  report_date: string;
  establishment_name: string;
  proponent_name: string;
  pa_name: string;
  created_at: string;
  informant_name: string | null;
  remarks: string | null;
}

export default function MyReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enumeratorId, setEnumeratorId] = useState<number | null>(null);
  const [enumeratorName, setEnumeratorName] = useState<string>('');

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    const enumId = await getEnumeratorId();
    if (enumId) {
      setEnumeratorId(enumId);
      await loadReports(enumId);
    } else {
      Alert.alert('Error', 'Unable to identify user. Please login again.');
      setLoading(false);
    }
  };

  const getEnumeratorId = async (): Promise<number | null> => {
    try {
      // Try session storage first
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed?.id) {
          // Also get the name
          const { data: userData } = await supabase
            .from("users")
            .select("name")
            .eq("id", parsed.id)
            .single();
          
          if (userData?.name) {
            setEnumeratorName(userData.name);
          }
          
          return parsed.id;
        }
      }

      // Fall back to Supabase auth
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user?.email) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, name")
          .eq("email", authUser.user.email)
          .single();

        if (userData?.id) {
          setEnumeratorName(userData.name || '');
          return userData.id;
        }
      }
    } catch (error) {
      console.error("Error getting enumerator ID:", error);
    }
    return null;
  };

  const loadReports = async (enumId: number) => {
    try {
      const { data, error } = await supabase
        .from("enumerators_report")
        .select(`
          id,
          report_date,
          establishment_name,
          proponent_name,
          pa_name,
          created_at,
          informant_name,
          remarks
        `)
        .eq("enumerator_id", enumId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    if (enumeratorId) {
      setRefreshing(true);
      await loadReports(enumeratorId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // Navigate to report details screen
        router.push(`../ReportDetailsScreen?id=${item.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.establishmentName}>{item.establishment_name}</Text>
        <Text style={styles.reportDate}>{formatDate(item.report_date)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Protected Area:</Text>
          <Text style={styles.value}>{item.pa_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Proponent:</Text>
          <Text style={styles.value}>{item.proponent_name}</Text>
        </View>

        {item.informant_name && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Informant:</Text>
            <Text style={styles.value}>{item.informant_name}</Text>
          </View>
        )}

        {item.remarks && (
          <View style={styles.remarksContainer}>
            <Text style={styles.remarksLabel}>Remarks:</Text>
            <Text style={styles.remarksText} numberOfLines={2}>
              {item.remarks}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.submittedText}>
          Submitted: {formatDate(item.created_at)}
        </Text>
        <Text style={styles.reportId}>ID: {item.id}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        You haven't submitted any enumerator reports yet.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/Enumerators/EnumeratorsReport')}
      >
        <Text style={styles.createButtonText}>Create New Report</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reports</Text>
        {enumeratorName && (
          <Text style={styles.headerSubtitle}>Enumerator: {enumeratorName}</Text>
        )}
        <Text style={styles.headerCount}>
          {reports.length} {reports.length === 1 ? 'report' : 'reports'} submitted
        </Text>
      </View>

      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0ea5e9']}
          />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/Enumerators/EnumeratorsReport')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  establishmentName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginRight: 8,
  },
  reportDate: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    width: 110,
  },
  value: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
  },
  remarksContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  remarksLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submittedText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  reportId: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});