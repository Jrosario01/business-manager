import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import CreateSaleModal from '../components/CreateSaleModal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import { useSalesStore, Sale } from '../store/salesStore';
import { useShipmentsStore } from '../store/shipmentsStore';

export default function SalesScreen() {
  const { t } = useTranslation();
  const { sales, loadSales, addSale, updateSale } = useSalesStore();
  const { loadShipments } = useShipmentsStore();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'partial'>('all');
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
      currency: 'DOP',
      exchangeRateUsed: 60, // Will be replaced with actual rate in store
    });

    // Reload shipments to reflect updated inventory and profit
    await loadShipments();

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
      products: updatedProducts,  // Pass updated products with individual payments
      amountPaid: newAmountPaid,
      paymentStatus: newStatus as 'paid' | 'pending' | 'partial',
    });

    // Reload shipments to reflect any payment/profit updates
    await loadShipments();

    setIsUpdatePaymentModalVisible(false);
    setSelectedSale(null);
  };

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
      case 'paid': return t('sales.paid').toUpperCase();
      case 'pending': return t('sales.pending').toUpperCase();
      case 'partial': return t('sales.partial').toUpperCase();
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
            <Text style={styles.footerLabel}>{t('common.total')}:</Text>
            <Text style={styles.footerValue}>${item.totalRevenue}</Text>
          </View>
          {balance > 0 ? (
            <>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>{t('sales.paid')}:</Text>
                <Text style={[styles.footerValue, styles.paidValueText]}>${item.amountPaid}</Text>
              </View>
              <View style={[styles.footerRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>{t('sales.balance')}:</Text>
                <Text style={styles.balanceValue}>${balance}</Text>
              </View>
            </>
          ) : (
            <View style={styles.footerRow}>
              <Text style={styles.footerLabel}>{t('sales.profit')}:</Text>
              <Text style={[styles.footerValue, styles.profitValue]}>+${item.profit}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { label: t('sales.partial'), value: 'partial' as const },
    { label: t('sales.paid'), value: 'paid' as const },
    { label: t('reports.all'), value: 'all' as const },
  ];

  return (
    <View style={styles.container}>
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
          <Text style={styles.newSaleButtonText}>+ {t('sales.newSale')}</Text>
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
            <Text style={styles.emptyText}>{t('sales.noSales')}</Text>
            <Text style={styles.emptySubtext}>
              {t('sales.noSalesSubtext')}
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
  paidValueText: {
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
