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
  TextInput,
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

type SortOption = 'newest' | 'oldest';

export default function MyReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enumeratorId, setEnumeratorId] = useState<number | null>(null);
  const [enumeratorName, setEnumeratorName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState<SortOption>('newest');

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // Apply search and sort whenever reports, searchQuery, or currentSort changes
    applyFiltersAndSort();
  }, [reports, searchQuery, currentSort]);

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

  const applyFiltersAndSort = () => {
    let filtered = [...reports];

    // Apply search filter (search by proponent name only)
    if (searchQuery.trim()) {
      filtered = filtered.filter(report =>
        report.proponent_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (currentSort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredReports(filtered);
  };

  const handleEditReport = (report: Report) => {
    // Navigate to edit screen with report ID
    router.push(`/Enumerators/EnumeratorsReport?editId=${report.id}`);
  };

  const handleDeleteReport = (report: Report) => {
    Alert.alert(
      "Delete Report",
      `Are you sure you want to delete the report for "${report.establishment_name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("enumerators_report")
                .delete()
                .eq("id", report.id);

              if (error) throw error;

              // Remove from local state
              setReports(prev => prev.filter(r => r.id !== report.id));
              Alert.alert("Success", "Report deleted successfully");
            } catch (error) {
              console.error("Error deleting report:", error);
              Alert.alert("Error", "Failed to delete report. Please try again.");
            }
          }
        }
      ]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
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
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditReport(item)}
        >
          <Text style={styles.editButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyList = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            No reports found for proponent "{searchQuery}"
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={clearSearch}>
            <Text style={styles.createButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
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
  };

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
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>My Reports</Text>
            {enumeratorName && (
              <Text style={styles.headerSubtitle}>Enumerator: {enumeratorName}</Text>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by proponent name..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort Buttons */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, currentSort === 'newest' && styles.sortButtonActive]}
              onPress={() => setCurrentSort('newest')}
            >
              <Text style={[styles.sortButtonText, currentSort === 'newest' && styles.sortButtonTextActive]}>
                Newest First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, currentSort === 'oldest' && styles.sortButtonActive]}
              onPress={() => setCurrentSort('oldest')}
            >
              <Text style={[styles.sortButtonText, currentSort === 'oldest' && styles.sortButtonTextActive]}>
                Oldest First
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          Showing {filteredReports.length} of {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </Text>
      </View>

      <FlatList
        data={filteredReports}
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
  headerTop: {
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
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
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: '300',
  },
  sortContainer: {
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  resultsCount: {
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
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
  actionButtons: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    backgroundColor: '#dbeafe',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
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