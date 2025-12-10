import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import AddCustomerModal from '../components/AddCustomerModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  wishlist: string[];
  totalPurchases: number;
  lastPurchase?: string;
}

// Dummy customers
const initialCustomers: Customer[] = [
  {
    id: '1',
    name: 'Juan Perez',
    phone: '809-555-0101',
    balance: -150,
    wishlist: ['Lattafa Asad', 'Armaf Club De Nuit'],
    totalPurchases: 450,
    lastPurchase: '2024-12-05',
  },
  {
    id: '2',
    name: 'Maria Rodriguez',
    phone: '809-555-0102',
    balance: 0,
    wishlist: ['Rasasi Hawas'],
    totalPurchases: 320,
    lastPurchase: '2024-12-01',
  },
  {
    id: '3',
    name: 'Carlos Gomez',
    phone: '829-555-0103',
    balance: -75,
    wishlist: [],
    totalPurchases: 180,
    lastPurchase: '2024-11-28',
  },
  {
    id: '4',
    name: 'Ana Martinez',
    phone: '849-555-0104',
    balance: -200,
    wishlist: ['Al Haramain Amber Oud', 'Afnan 9PM'],
    totalPurchases: 890,
    lastPurchase: '2024-12-08',
  },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owes' | 'wishlist'>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const handleAddCustomer = (customerData: { name: string; phone: string; wishlist: string[] }) => {
    const newCustomer = {
      id: Date.now().toString(),
      ...customerData,
      balance: 0,
      totalPurchases: 0,
    };
    setCustomers([...customers, newCustomer]);
    setIsAddModalVisible(false);
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query);

    if (!matchesSearch) return false;

    if (filterType === 'owes') {
      return customer.balance < 0;
    }
    if (filterType === 'wishlist') {
      return customer.wishlist.length > 0;
    }

    return true;
  });

  const totalOwed = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const customersWithBalance = customers.filter(c => c.balance < 0).length;

  const renderCustomer = ({ item }: { item: Customer }) => {
    const owes = item.balance < 0;
    const oweAmount = Math.abs(item.balance);

    return (
      <TouchableOpacity style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.customerAvatar}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerPhone}>📱 {item.phone}</Text>
          </View>
          {owes && (
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceText}>OWES</Text>
            </View>
          )}
        </View>

        <View style={styles.customerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Purchases</Text>
            <Text style={styles.statValue}>${item.totalPurchases}</Text>
          </View>
          
          {owes && (
            <View style={[styles.statBox, styles.balanceBox]}>
              <Text style={styles.statLabel}>Balance Owed</Text>
              <Text style={[styles.statValue, styles.balanceValue]}>
                ${oweAmount}
              </Text>
            </View>
          )}

          {item.wishlist.length > 0 && (
            <View style={[styles.statBox, styles.wishlistBox]}>
              <Text style={styles.statLabel}>Wishlist</Text>
              <Text style={styles.wishlistCount}>
                {item.wishlist.length} item{item.wishlist.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {item.wishlist.length > 0 && (
          <View style={styles.wishlistSection}>
            <Text style={styles.wishlistTitle}>Interested In:</Text>
            {item.wishlist.map((product, index) => (
              <Text key={index} style={styles.wishlistItem}>
                • {product}
              </Text>
            ))}
          </View>
        )}

        {item.lastPurchase && (
          <Text style={styles.lastPurchase}>
            Last purchase: {new Date(item.lastPurchase).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { label: 'All', value: 'all' as const },
    { label: 'Owes Money', value: 'owes' as const },
    { label: 'Has Wishlist', value: 'wishlist' as const },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersContainer}>
        {filterButtons.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              filterType === filter.value && styles.filterChipActive
            ]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text style={[
              styles.filterChipText,
              filterType === filter.value && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statItemValue}>{filteredCustomers.length}</Text>
          <Text style={styles.statItemLabel}>Customer{filteredCustomers.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statItemValue, styles.owedValue]}>${totalOwed}</Text>
          <Text style={styles.statItemLabel}>Total Owed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statItemValue}>{customersWithBalance}</Text>
          <Text style={styles.statItemLabel}>With Balance</Text>
        </View>
      </View>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
            </Text>
          </View>
        }
      />

      <AddCustomerModal
  visible={isAddModalVisible}
  onClose={() => setIsAddModalVisible(false)}
  onSubmit={handleAddCustomer}
  catalogProducts={[
    { brand: 'Lattafa', name: 'Asad' },
    { brand: 'Lattafa', name: 'Bade Al Oud' },
    { brand: 'Lattafa', name: 'Fakhar' },
    { brand: 'Armaf', name: 'Club De Nuit Intense' },
    { brand: 'Armaf', name: 'Tres Nuit' },
    { brand: 'Rasasi', name: 'Hawas' },
    { brand: 'Rasasi', name: 'Fattan' },
    { brand: 'Al Haramain', name: 'L\'Aventure' },
    { brand: 'Al Haramain', name: 'Amber Oud' },
    { brand: 'Afnan', name: 'Supremacy Silver' },
    { brand: 'Afnan', name: '9PM' },
  ]}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  owedValue: {
    color: '#FF3B30',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 10,
  },
  addButtonContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  balanceBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  balanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  balanceBox: {
    backgroundColor: '#FFE5E5',
  },
  wishlistBox: {
    backgroundColor: '#E3F2FD',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceValue: {
    color: '#FF3B30',
  },
  wishlistCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  wishlistSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wishlistTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  wishlistItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  lastPurchase: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
