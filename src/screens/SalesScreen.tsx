import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import CreateSaleModal from '../components/CreateSaleModal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import { useSalesStore, Sale } from '../store/salesStore';

export default function SalesScreen() {
  const { sales, loadSales, addSale, updateSale } = useSalesStore();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'partial'>('all');
  const [isCreateSaleModalVisible, setIsCreateSaleModalVisible] = useState(false);
  const [isUpdatePaymentModalVisible, setIsUpdatePaymentModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = filterStatus === 'all'
    ? sales
    : sales.filter(sale => sale.paymentStatus === filterStatus);

  const handleCreateSale = () => {
    setIsCreateSaleModalVisible(true);
  };

  const handleSubmitSale = async (saleData: any) => {
    await addSale({
      date: saleData.date,
      customerName: saleData.customer.isNew ? saleData.customer.name : saleData.customer.name,
      products: saleData.products,
      totalCost: saleData.totalCost,
      totalRevenue: saleData.totalRevenue,
      profit: saleData.profit,
      paymentStatus: saleData.paymentStatus,
      amountPaid: saleData.amountPaid,
    });
    setIsCreateSaleModalVisible(false);
  };


  const handleSalePress = (sale: Sale) => {
    // Only allow updating payment if not fully paid
    if (sale.paymentStatus !== 'paid') {
      setSelectedSale(sale);
      setIsUpdatePaymentModalVisible(true);
    }
  };

  const handleUpdatePayment = async (updatedPayments: { [productIndex: number]: number }) => {
    if (!selectedSale) return;

    const updatedProducts = selectedSale.products.map((product, index) => {
      if (updatedPayments[index] !== undefined) {
        return {
          ...product,
          amountPaid: updatedPayments[index],
          balance: (product.soldPrice * product.quantity) - updatedPayments[index],
        };
      }
      return product;
    });

    const newAmountPaid = updatedProducts.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const newBalance = selectedSale.totalRevenue - newAmountPaid;
    const newStatus = newBalance === 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'pending');

    await updateSale(selectedSale.id, {
      products: updatedProducts,
      amountPaid: newAmountPaid,
      paymentStatus: newStatus as 'paid' | 'pending' | 'partial',
    });

    setIsUpdatePaymentModalVisible(false);
    setSelectedSale(null);
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalPaid = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);
  const totalPending = totalRevenue - totalPaid;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'pending': return '#FF3B30';
      case 'partial': return '#FF9500';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'PAID';
      case 'pending': return 'PENDING';
      case 'partial': return 'PARTIAL';
      default: return status.toUpperCase();
    }
  };

  const renderSale = ({ item }: { item: Sale }) => {
    const balance = item.totalRevenue - item.amountPaid;
    
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => handleSalePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.saleDate}>
              {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          {item.products.map((product, index) => (
            <View key={index} style={styles.productLine}>
              <Text style={styles.productText}>
                {product.quantity}× {product.brand} {product.name}
              </Text>
              <Text style={styles.productPrice}>${product.soldPrice * product.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.saleFooter}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Revenue:</Text>
            <Text style={styles.footerValue}>${item.totalRevenue}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Profit:</Text>
            <Text style={[styles.footerValue, styles.profitValue]}>+${item.profit}</Text>
          </View>
          {balance > 0 && (
            <View style={[styles.footerRow, styles.balanceRow]}>
              <Text style={styles.balanceLabel}>Balance Due:</Text>
              <Text style={styles.balanceValue}>${balance}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { label: 'All', value: 'all' as const },
    { label: 'Paid', value: 'paid' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Partial', value: 'partial' as const },
  ];

  return (
    <View style={styles.container}>
      {/* Stats Overview */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sales</Text>
          <Text style={styles.statValue}>{sales.length}</Text>
        </View>
        <View style={[styles.statCard, styles.revenueCard]}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={[styles.statValue, styles.revenueValue]}>${totalRevenue}</Text>
        </View>
        <View style={[styles.statCard, styles.profitCard]}>
          <Text style={styles.statLabel}>Profit</Text>
          <Text style={[styles.statValue, styles.profitValueStat]}>${totalProfit}</Text>
        </View>
        <View style={[styles.statCard, styles.paidCard]}>
          <Text style={styles.statLabel}>Collected</Text>
          <Text style={[styles.statValue, styles.paidValue]}>${totalPaid}</Text>
        </View>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, styles.pendingValue]}>${totalPending}</Text>
        </View>
      </ScrollView>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {filterButtons.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              filterStatus === filter.value && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus(filter.value)}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === filter.value && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* New Sale Button */}
      <View style={styles.newSaleContainer}>
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={handleCreateSale}
        >
          <Text style={styles.newSaleButtonText}>+ New Sale</Text>
        </TouchableOpacity>
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        renderItem={renderSale}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubtext}>
              Sales will appear here when customers make purchases
            </Text>
          </View>
        }
      />

      <CreateSaleModal
        visible={isCreateSaleModalVisible}
        onClose={() => setIsCreateSaleModalVisible(false)}
        onSubmit={handleSubmitSale}
      />

      <UpdatePaymentModal
        visible={isUpdatePaymentModalVisible}
        onClose={() => {
          setIsUpdatePaymentModalVisible(false);
          setSelectedSale(null);
        }}
        onSubmit={handleUpdatePayment}
        sale={selectedSale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minWidth: 110,
    minHeight: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueCard: {
    backgroundColor: '#E3F2FD',
  },
  profitCard: {
    backgroundColor: '#E8F5E9',
  },
  paidCard: {
    backgroundColor: '#E8F5E9',
  },
  pendingCard: {
    backgroundColor: '#FFE5E5',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  revenueValue: {
    color: '#1976D2',
  },
  profitValueStat: {
    color: '#2E7D32',
  },
  paidValue: {
    color: '#34C759',
  },
  pendingValue: {
    color: '#FF3B30',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
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
  newSaleContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  newSaleButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newSaleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  saleCard: {
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
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  saleDate: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productsSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 10,
  },
  productLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 70,
    textAlign: 'right',
  },
  saleFooter: {
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
  profitValue: {
    color: '#34C759',
  },
  balanceRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
    flex: 1,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    minWidth: 70,
    textAlign: 'right',
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
