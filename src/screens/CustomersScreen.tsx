import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AddCustomerModal from '../components/AddCustomerModal';
import { useCustomersStore, Customer } from '../store/customersStore';
import { useSalesStore } from '../store/salesStore';

export default function CustomersScreen() {
  const { t } = useTranslation();
  const { customers, loadCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomersStore();
  const { sales, loadSales } = useSalesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owes' | 'wishlist'>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    loadCustomers();
    loadSales();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const handleCustomerPress = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalVisible(true);
  };

  const handleUpdateCustomer = async (updatedData: { name: string; phone: string; wishlist: string[] }) => {
    if (!selectedCustomer) return;

    await updateCustomer(selectedCustomer.id, {
      name: updatedData.name,
      phone: updatedData.phone,
      wishlist: updatedData.wishlist,
    });
    setIsEditModalVisible(false);
    setSelectedCustomer(null);
  };

  const handleAddCustomer = async (customerData: { name: string; phone: string; wishlist: string[] }) => {
    await addCustomer({
      name: customerData.name,
      phone: customerData.phone,
      wishlist: customerData.wishlist || [],
    });
    setIsAddModalVisible(false);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    await deleteCustomer(selectedCustomer.id);
    setIsEditModalVisible(false);
    setSelectedCustomer(null);
  };

  // Calculate actual customer stats from sales
  const getCustomerStats = (customerName: string) => {
    const customerSales = sales.filter(sale => sale.customerName === customerName);
    const totalPurchases = customerSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
    const totalPaid = customerSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const actualBalance = totalPurchases - totalPaid;
    const lastSale = customerSales.length > 0
      ? customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    return {
      totalPurchases,
      balance: actualBalance > 0 ? -actualBalance : 0, // Negative means they owe
      lastPurchase: lastSale?.date,
    };
  };

  // Filter customers
  const filteredCustomers = customers
    .filter(customer => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query);

      if (!matchesSearch) return false;

      if (filterType === 'owes') {
        const stats = getCustomerStats(customer.name);
        return stats.balance < 0;
      }
      if (filterType === 'wishlist') {
        return customer.wishlist && customer.wishlist.length > 0;
      }

      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

  // Calculate total owed from actual sales data
  const totalOwed = customers.reduce((sum, c) => {
    const stats = getCustomerStats(c.name);
    return sum + (stats.balance < 0 ? Math.abs(stats.balance) : 0);
  }, 0);
  const customersWithBalance = customers.filter(c => {
    const stats = getCustomerStats(c.name);
    return stats.balance < 0;
  }).length;

  const renderCustomer = ({ item }: { item: Customer }) => {
    const stats = getCustomerStats(item.name);
    const owes = stats.balance < 0;
    const oweAmount = Math.abs(stats.balance);
    const isCompact = windowWidth < 380;

    return (
      <TouchableOpacity
        style={[styles.customerCard, isCompact && styles.customerCardCompact]}
        onPress={() => handleCustomerPress(item)}
        activeOpacity={0.7}
      >
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
              <Text style={styles.balanceText}>{t('customers.owes')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.customerStats, isCompact && styles.customerStatsCompact]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('customers.purchases')}</Text>
            <Text style={styles.statValue}>${stats.totalPurchases.toFixed(2)}</Text>
          </View>

          {owes && (
            <View style={[styles.statBox, styles.balanceBox]}>
              <Text style={styles.statLabel}>{t('customers.owes')}</Text>
              <Text style={[styles.statValue, styles.balanceValue]}>
                ${oweAmount.toFixed(2)}
              </Text>
            </View>
          )}

          {item.wishlist && item.wishlist.length > 0 && (
            <View style={[styles.statBox, styles.wishlistBox]}>
              <Text style={styles.statLabel}>{t('customers.wishlist')}</Text>
              <Text style={styles.wishlistCount}>
                {item.wishlist.length}
              </Text>
            </View>
          )}
        </View>

        {item.wishlist && item.wishlist.length > 0 && (
          <View style={styles.wishlistSection}>
            <Text style={styles.wishlistTitle}>{t('customers.interestedIn')}:</Text>
            {item.wishlist.map((product, index) => (
              <Text key={index} style={styles.wishlistItem}>
                • {product}
              </Text>
            ))}
          </View>
        )}

        {stats.lastPurchase && (
          <Text style={styles.lastPurchase}>
            {t('customers.lastPurchase')}: {new Date(stats.lastPurchase).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { label: t('customers.all'), value: 'all' as const },
    { label: t('customers.owesMoney'), value: 'owes' as const },
    { label: t('customers.hasWishlist'), value: 'wishlist' as const },
  ];

  return (
    <View style={styles.container}>
      {/* Combined header with search and filters */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('customers.searchPlaceholder')}
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
      </View>

      {/* Compact stats and add button */}
      <View style={styles.actionBar}>
        <View style={styles.statsCompact}>
          <Text style={styles.statsCompactText}>
            {filteredCustomers.length} {t('customers.customers')} • ${totalOwed} {t('customers.owed')} • {customersWithBalance} {t('customers.withBalance')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ {t('customers.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('customers.noCustomersFound')}</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? t('customers.tryDifferentSearch') : t('customers.addFirstCustomer')}
            </Text>
          </View>
        }
      />

      <AddCustomerModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddCustomer}
      />

      {selectedCustomer && (
        <AddCustomerModal
          visible={isEditModalVisible}
          onClose={() => {
            setIsEditModalVisible(false);
            setSelectedCustomer(null);
          }}
          onSubmit={handleUpdateCustomer}
          initialData={{
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            wishlist: selectedCustomer.wishlist || [],
          }}
          customerId={selectedCustomer.id}
          isEdit={true}
          onDelete={handleDeleteCustomer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsCompact: {
    flex: 1,
    marginRight: 10,
  },
  statsCompactText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerCardCompact: {
    padding: 14,
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
    minWidth: 0,
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 13,
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
    gap: 6,
    marginBottom: 10,
  },
  customerStatsCompact: {
    gap: 4,
  },
  statBox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
  },
  balanceBox: {
    backgroundColor: '#FFE5E5',
  },
  wishlistBox: {
    backgroundColor: '#E3F2FD',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceValue: {
    color: '#FF3B30',
  },
  wishlistCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
  },
  wishlistSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wishlistTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  wishlistItem: {
    fontSize: 13,
    color: '#333',
    marginBottom: 3,
  },
  lastPurchase: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
