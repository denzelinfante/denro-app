import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';

interface HistoryRecord {
  id: number;
  establishment_id: number;
  establishment_name: string;
  pa_name: string;
  version: number;
  updated_at: string;
  change_reason: string;
  establishment_status?: string;
  attestation_id?: number;
  attested_by?: string;
  noted_by?: string;
}

interface GroupedEstablishment {
  establishment_id: number;
  establishment_name: string;
  pa_name: string;
  latest_version: number;
  latest_update: string;
  total_versions: number;
  establishment_status: string;
  history: HistoryRecord[];
}

type SortOption = 'newest' | 'oldest';

export default function EstablishmentHistory() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [groupedEstablishments, setGroupedEstablishments] = useState<GroupedEstablishment[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<GroupedEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState<GroupedEstablishment | null>(null);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const modalRecordsPerPage = 5;

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    groupEstablishments();
  }, [history]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1);
  }, [groupedEstablishments, searchQuery, currentSort]);

  const loadHistory = async () => {
    try {
      const { data: historyData, error: historyError } = await supabase
        .from("establishment_history")
        .select("*")
        .order("updated_at", { ascending: false });

      if (historyError) throw historyError;
      
      const { data: attestationData, error: attestError } = await supabase
        .from("attestation_notations")
        .select("id, attested_by_name, noted_by_name");
      
      if (attestError) console.error('Attestation fetch error:', attestError);
      
      const attestationMap = new Map(
        attestationData?.map(a => [a.id, a]) || []
      );
      
      const formattedData = historyData?.map(record => {
        const attestation = attestationMap.get(record.attestation_id);
        return {
          ...record,
          attested_by: attestation?.attested_by_name,
          noted_by: attestation?.noted_by_name
        };
      }) || [];
      
      setHistory(formattedData);
    } catch (error) {
      console.error("Error loading history:", error);
      Alert.alert("Error", "Failed to load establishment history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupEstablishments = () => {
    const grouped = history.reduce((acc, record) => {
      const existing = acc.find(item => item.establishment_id === record.establishment_id);
      
      if (existing) {
        existing.history.push(record);
        if (new Date(record.updated_at) > new Date(existing.latest_update)) {
          existing.latest_update = record.updated_at;
          existing.latest_version = record.version;
        }
        existing.total_versions = existing.history.length;
      } else {
        acc.push({
          establishment_id: record.establishment_id,
          establishment_name: record.establishment_name,
          pa_name: record.pa_name,
          latest_version: record.version,
          latest_update: record.updated_at,
          total_versions: 1,
          establishment_status: record.establishment_status || 'Operating',
          history: [record]
        });
      }
      
      return acc;
    }, [] as GroupedEstablishment[]);

    grouped.forEach(group => {
      group.history.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    });

    setGroupedEstablishments(grouped);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...groupedEstablishments];

    if (searchQuery.trim()) {
      filtered = filtered.filter(establishment =>
        establishment.establishment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        establishment.pa_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (currentSort === 'newest') {
      filtered.sort((a, b) => new Date(b.latest_update).getTime() - new Date(a.latest_update).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.latest_update).getTime() - new Date(b.latest_update).getTime());
    }

    setFilteredEstablishments(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getPaginatedRecords = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredEstablishments.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredEstablishments.length / recordsPerPage);
  const paginatedRecords = getPaginatedRecords();
  const startIndex = (currentPage - 1) * recordsPerPage + 1;
  const endIndex = Math.min(currentPage * recordsPerPage, filteredEstablishments.length);

  const openHistoryModal = (establishment: GroupedEstablishment) => {
    setSelectedEstablishment(establishment);
    setModalCurrentPage(1);
    setModalVisible(true);
  };

  const getModalPaginatedRecords = () => {
    if (!selectedEstablishment) return [];
    const startIndex = (modalCurrentPage - 1) * modalRecordsPerPage;
    const endIndex = startIndex + modalRecordsPerPage;
    return selectedEstablishment.history.slice(startIndex, endIndex);
  };

  const modalTotalPages = selectedEstablishment ? Math.ceil(selectedEstablishment.history.length / modalRecordsPerPage) : 0;
  const modalPaginatedRecords = getModalPaginatedRecords();
  const modalStartIndex = selectedEstablishment ? (modalCurrentPage - 1) * modalRecordsPerPage + 1 : 0;
  const modalEndIndex = selectedEstablishment ? Math.min(modalCurrentPage * modalRecordsPerPage, selectedEstablishment.history.length) : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderEstablishmentCard = ({ item }: { item: GroupedEstablishment }) => (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.establishment_id}</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellWide]}>
        <Text style={styles.tableCellText}>{item.establishment_name}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={[styles.tableCellText, styles.statusText]}>{item.establishment_status}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.pa_name || 'N/A'}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.total_versions}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{formatDate(item.latest_update)}</Text>
      </View>
      <View style={styles.tableCell}>
        <TouchableOpacity 
          style={styles.viewHistoryButton}
          onPress={() => openHistoryModal(item)}
        >
          <Text style={styles.viewHistoryButtonText}>View</Text>
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
            No records found for "{searchQuery}"
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={clearSearch}>
            <Text style={styles.createButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No History Records</Text>
        <Text style={styles.emptyText}>
          No establishment history records found.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Establishment History</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by establishment or protected area..."
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

        <View style={styles.paginationHeader}>
          <Text style={styles.resultsCount}>
            Showing {filteredEstablishments.length > 0 ? startIndex : 0} - {endIndex} of {filteredEstablishments.length} {filteredEstablishments.length === 1 ? 'establishment' : 'establishments'}
          </Text>
          {totalPages > 1 && (
            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>{currentPage} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>ID</Text>
          </View>
          <View style={[styles.tableCell, styles.tableCellWide]}>
            <Text style={styles.tableHeaderText}>Establishment/Owner Name</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>Establishment Status</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>Protected Area</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>Versions</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>Last Updated</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>

        <FlatList
          data={paginatedRecords}
          renderItem={renderEstablishmentCard}
          keyExtractor={(item) => item.establishment_id.toString()}
          ListEmptyComponent={renderEmptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEstablishment?.establishment_name} - History
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalPaginationHeader}>
              <Text style={styles.modalResultsCount}>
                Showing {selectedEstablishment && selectedEstablishment.history.length > 0 ? modalStartIndex : 0} - {modalEndIndex} of {selectedEstablishment?.history.length || 0} versions
              </Text>
              {modalTotalPages > 1 && (
                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[styles.paginationButton, modalCurrentPage === 1 && styles.paginationButtonDisabled]}
                    onPress={() => setModalCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={modalCurrentPage === 1}
                  >
                    <Text style={[styles.paginationButtonText, modalCurrentPage === 1 && styles.paginationButtonTextDisabled]}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageIndicator}>{modalCurrentPage} / {modalTotalPages}</Text>
                  <TouchableOpacity
                    style={[styles.paginationButton, modalCurrentPage === modalTotalPages && styles.paginationButtonDisabled]}
                    onPress={() => setModalCurrentPage(prev => Math.min(modalTotalPages, prev + 1))}
                    disabled={modalCurrentPage === modalTotalPages}
                  >
                    <Text style={[styles.paginationButtonText, modalCurrentPage === modalTotalPages && styles.paginationButtonTextDisabled]}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.modalTableContainer}>
                <View style={styles.modalTableHeader}>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Ver</Text>
                  </View>
                  <View style={[styles.modalTableCell, styles.modalTableCellWide]}>
                    <Text style={styles.modalTableHeaderText}>Name</Text>
                  </View>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Establishment Status</Text>
                  </View>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Protected Area</Text>
                  </View>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Attested By</Text>
                  </View>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Noted By</Text>
                  </View>
                  <View style={styles.modalTableCell}>
                    <Text style={styles.modalTableHeaderText}>Date</Text>
                  </View>
                </View>

                <ScrollView style={styles.modalBody}>
                  {modalPaginatedRecords.map((record) => (
                    <View key={record.id} style={styles.modalTableRow}>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{record.version}</Text>
                      </View>
                      <View style={[styles.modalTableCell, styles.modalTableCellWide]}>
                        <Text style={styles.modalTableCellText}>{record.establishment_name}</Text>
                      </View>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{record.establishment_status || 'Operating'}</Text>
                      </View>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{record.pa_name || 'N/A'}</Text>
                      </View>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{record.attested_by || 'N/A'}</Text>
                      </View>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{record.noted_by || 'N/A'}</Text>
                      </View>
                      <View style={styles.modalTableCell}>
                        <Text style={styles.modalTableCellText}>{formatDate(record.updated_at)}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTop: { marginBottom: 16 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  searchContainer: { marginBottom: 16 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, height: 48 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
  clearButton: { padding: 4 },
  clearButtonText: { fontSize: 20, color: '#9ca3af', fontWeight: '300' },
  sortContainer: { marginBottom: 12 },
  sortLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
  sortButtons: { flexDirection: 'row', gap: 8 },
  sortButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  sortButtonActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  sortButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  sortButtonTextActive: { color: '#fff' },
  paginationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 12, color: '#0ea5e9', fontWeight: '600' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paginationButton: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center' },
  paginationButtonDisabled: { backgroundColor: '#e5e7eb' },
  paginationButtonText: { fontSize: 24, color: '#fff', fontWeight: '600' },
  paginationButtonTextDisabled: { color: '#9ca3af' },
  pageIndicator: { fontSize: 12, color: '#6b7280', fontWeight: '600', minWidth: 40, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  createButton: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tableContainer: { flex: 1, backgroundColor: '#fff', margin: 16, borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 15 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  tableCell: { flex: 1, paddingHorizontal: 6, justifyContent: 'center', minHeight: 40 },
  tableCellWide: { flex: 2 },
  tableHeaderText: { fontSize: 10, fontWeight: '700', color: '#374151', textAlign: 'center' },
  tableCellText: { fontSize: 10, color: '#1f2937', textAlign: 'center', lineHeight: 14 },
  statusText: { color: '#059669', fontWeight: '600' },
  viewHistoryButton: { backgroundColor: '#0ea5e9', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 4, alignSelf: 'center' },
  viewHistoryButtonText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, margin: 5, maxHeight: '90%', width: '99%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', flex: 1 },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 22, color: '#9ca3af', fontWeight: '300' },
  modalPaginationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalResultsCount: { fontSize: 14, color: '#0ea5e9', fontWeight: '600' },
  modalTableContainer: { flex: 1 },
  modalTableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 15 },
  modalTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  modalTableCell: { width: 100, paddingHorizontal: 8, justifyContent: 'center', minHeight: 45 },
  modalTableCellWide: { width: 150 },
  modalTableHeaderText: { fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'center' },
  modalTableCellText: { fontSize: 10, color: '#1f2937', textAlign: 'center', lineHeight: 14 },
  modalBody: { maxHeight: 400 },
});