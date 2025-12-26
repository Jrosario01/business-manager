import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import CreateSaleModal from '../components/CreateSaleModal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import { useSalesStore, Sale } from '../store/salesStore';
import { useShipmentsStore } from '../store/shipmentsStore';
import { isDemoAccount } from '../utils/isDemoAccount';

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

  const sendReceiptViaWhatsApp = async (sale: Sale) => {
    // Block for demo accounts
    if (isDemoAccount()) {
      Alert.alert(
        'Demo Account',
        'WhatsApp receipt sending is disabled for demo accounts. This feature is available for authenticated users.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Format receipt as text
    const currencySymbol = sale.currency === 'DOP' ? 'RD$' : '$';
    const statusEmoji = sale.paymentStatus === 'paid' ? '✅' : sale.paymentStatus === 'partial' ? '⚠️' : '⏳';

    const productLines = sale.products.map(p =>
      `• ${p.quantity}x ${p.brand} ${p.name} ${p.size} - ${currencySymbol}${(p.soldPrice * p.quantity).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    ).join('\n');

    const receipt = `🧾 *RECEIPT - GJ Essence*

*Customer:* ${sale.customerName}
*Date:* ${new Date(sale.date).toLocaleDateString()} ${new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

*Products:*
${productLines}

*Total:* ${currencySymbol}${sale.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
*Paid:* ${currencySymbol}${sale.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 0 })}${sale.paymentStatus !== 'paid' ? `\n*Balance:* ${currencySymbol}${(sale.totalRevenue - sale.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : ''}
*Status:* ${sale.paymentStatus.toUpperCase()} ${statusEmoji}

Thank you for your purchase! 🙏`;

    // Get customer phone number from sale
    // For now, we'll ask user to select contact or we can use customer phone if available
    const encodedReceipt = encodeURIComponent(receipt);
    const whatsappUrl = `https://wa.me/?text=${encodedReceipt}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open WhatsApp');
      console.error('WhatsApp error:', error);
    }
  };

  const renderSale = ({ item }: { item: Sale }) => {
    const balance = item.totalRevenue - item.amountPaid;
    const currencySymbol = item.currency === 'DOP' ? 'RD$' : '$';

    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => handleSalePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.saleDate}>
              {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => sendReceiptViaWhatsApp(item)}
            >
              <Text style={styles.whatsappIcon}>📱</Text>
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
              <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.productsSection}>
          {item.products.map((product, index) => (
            <View key={index} style={styles.productLine}>
              <Text style={styles.productText}>
                {product.quantity}× {product.brand} {product.name} {product.size}
              </Text>
              <Text style={styles.productPrice}>{currencySymbol}{(product.soldPrice * product.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            </View>
          ))}
        </View>

        <View style={styles.saleFooter}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>{t('common.total')}:</Text>
            <Text style={styles.footerValue}>{currencySymbol}{item.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
          {balance > 0 ? (
            <>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>{t('sales.paid')}:</Text>
                <Text style={[styles.footerValue, styles.paidValueText]}>{currencySymbol}{item.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
              </View>
              <View style={[styles.footerRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>{t('sales.balance')}:</Text>
                <Text style={styles.balanceValue}>{currencySymbol}{balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
              </View>
            </>
          ) : (
            <View style={styles.footerRow}>
              <Text style={styles.footerLabel}>{t('sales.profit')}:</Text>
              <Text style={[styles.footerValue, styles.profitValue]}>+{currencySymbol}{item.profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
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
    backgroundColor: '#1a5490',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#1a5490',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0cf80',
  },
  filterChipActive: {
    backgroundColor: '#1a5490',
    borderColor: '#e0cf80',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a5490',
  },
  filterChipTextActive: {
    color: 'white',
  },
  newSaleContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#1a5490',
  },
  newSaleButton: {
    backgroundColor: '#e0cf80',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newSaleButtonText: {
    color: '#1a5490',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  saleCard: {
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#00ffff',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: 3,
  },
  saleDate: {
    fontSize: 13,
    color: '#1a5490',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  whatsappIcon: {
    fontSize: 20,
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
    borderColor: 'rgba(26, 84, 144, 0.3)',
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
    color: '#1a5490',
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
    color: '#1a5490',
    flex: 1,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a5490',
    minWidth: 70,
    textAlign: 'right',
  },
  profitValue: {
    color: '#1a5490',
  },
  paidValueText: {
    color: '#1a5490',
  },
  balanceRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 84, 144, 0.3)',
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
    color: '#1a5490',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
