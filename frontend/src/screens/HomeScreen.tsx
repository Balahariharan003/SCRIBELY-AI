import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator, RefreshControl, ScrollView, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { Feather } from '@expo/vector-icons';

const API_BASE_URL = 'http://10.14.26.249:8001';

export default function HomeScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'All'>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const YEARS = ['All', 2024, 2025, 2026];
  const MONTHS = [
    { label: 'All', value: 'All' as const },
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 1 }, { label: 'Mar', value: 2 },
    { label: 'Apr', value: 3 }, { label: 'May', value: 4 }, { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 }, { label: 'Aug', value: 7 }, { label: 'Sep', value: 8 },
    { label: 'Oct', value: 9 }, { label: 'Nov', value: 10 }, { label: 'Dec', value: 11 }
  ];

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sessions`);
      setSessions(res.data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/session/${sessionId}`);
              fetchSessions();
            } catch (err) {
              Alert.alert("Error", "Failed to delete session");
            }
          }
        }
      ]
    );
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const sessionDate = new Date(s.timestamp * 1000);
    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth();

    if (selectedYear !== 'All' && sessionYear !== selectedYear) return false;
    if (selectedMonth !== 'All' && sessionMonth !== selectedMonth) return false;

    return true;
  });

  const getRelativeTime = (timestamp: number) => {
    const now = new Date().getTime() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Notes', { sessionId: item.id })}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardDate}>{getRelativeTime(item.timestamp)}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.cardRightTop}>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDeleteSession(item.id)}
          >
            <Feather name="trash-2" size={18} color="#FF4D4D" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.headerTitle}>My Notes</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileCircle}
          onPress={() => setProfileMenuVisible(true)}
        >
          <Text style={styles.profileText}>U</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Menu Modal */}
      <Modal
        visible={isProfileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <View style={styles.menuProfileCircle}>
                <Text style={styles.menuProfileText}>U</Text>
              </View>
              <View>
                <Text style={styles.menuUserName}>User Name</Text>
                <Text style={styles.menuUserEmail}>user@example.com</Text>
              </View>
            </View>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                navigation.replace('Login');
              }}
            >
              <Feather name="log-out" size={18} color="#FF4D4D" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#999" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your notes..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, (selectedMonth !== 'All' || selectedYear !== 'All') && styles.filterButtonActive]} 
          onPress={() => setFilterModalVisible(true)}
        >
          <Feather 
            name="filter" 
            size={22} 
            color={(selectedMonth !== 'All' || selectedYear !== 'All') ? "#fff" : "#353535"} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSubLabel}>Select Year</Text>
            <View style={styles.yearRow}>
              {YEARS.map(y => (
                <TouchableOpacity 
                  key={y} 
                  style={[styles.yearChip, selectedYear === y && styles.activeYearChip]}
                  onPress={() => setSelectedYear(y as any)}
                >
                  <Text style={[styles.yearText, selectedYear === y && styles.activeYearText]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSubLabel}>Select Month</Text>
            <View style={styles.monthGrid}>
              {MONTHS.filter(m => {
                if (m.value === 'All') return true;
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth();
                
                if (selectedYear === 'All') return true;
                if (selectedYear < currentYear) return true;
                if (selectedYear === currentYear) return (m.value as number) <= currentMonth;
                return false;
              }).map(m => (
                <TouchableOpacity 
                  key={m.label} 
                  style={[styles.monthBox, selectedMonth === m.value && styles.activeMonthBox]}
                  onPress={() => setSelectedMonth(m.value as any)}
                >
                  <Text style={[styles.monthText, selectedMonth === m.value && styles.activeMonthText]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent History</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#284b63" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notes found yet.</Text>
              <Text style={styles.emptySubText}>Record your first session to get started!</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Record')}
      >
        <Feather name="mic" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(53, 53, 53, 0.6)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#353535',
    letterSpacing: -0.5,
  },
  profileCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#d9d9d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#353535',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#353535',
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterButtonActive: {
    backgroundColor: '#284b63',
    borderColor: '#284b63',
  },
  filterIcon: {
    fontSize: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#353535',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    elevation: 1,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#353535',
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 13,
    color: 'rgba(53, 53, 53, 0.5)',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardRightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusReady: {
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#38b2ac',
  },
  statusProcessing: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#ed8936',
  },
  statusText: {
    fontSize: 10,
    color: '#353535',
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 12,
    color: '#284b63',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#353535',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
  },
  filterSubLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(53, 53, 53, 0.6)',
    marginBottom: 12,
    marginTop: 10,
  },
  yearRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  yearChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeYearChip: {
    backgroundColor: '#284b63',
    borderColor: '#284b63',
  },
  yearText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeYearText: {
    color: '#fff',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  monthBox: {
    width: '23%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeMonthBox: {
    backgroundColor: '#284b63',
    borderColor: '#284b63',
  },
  monthText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeMonthText: {
    color: '#fff',
  },
  applyBtn: {
    backgroundColor: '#284b63',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#353535',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#284b63',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 20,
  },
  menuContent: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuProfileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d9d9d9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuProfileText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#353535',
  },
  menuUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#353535',
  },
  menuUserEmail: {
    fontSize: 12,
    color: '#999',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4D4D',
    marginLeft: 10,
  },
});
