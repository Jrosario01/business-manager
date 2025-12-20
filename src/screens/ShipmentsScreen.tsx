import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import CreateShipmentModal from '../components/CreateShipmentModal';
import DualCurrencyText from '../components/DualCurrencyText';
import { useShipmentsStore, ShipmentWithItems } from '../store/shipmentsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';

export default function ShipmentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { shipments, loadShipments, isLoading } = useShipmentsStore();
  const { usdToDop } = useExchangeRateStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithItems | null>(null);

  useEffect(() => {
    loadShipments();
  }, []);

  const handleCreateShipment = async (shipmentData: any) => {
    try {
      // Generate shipment number (format: SHIP-YYYYMMDD-XXX)
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const shipmentCount = shipments.length + 1;
      const shipmentNumber = `SHIP-${dateStr}-${shipmentCount.toString().padStart(3, '0')}`;

      // Calculate totals
      const productsCost = shipmentData.products.reduce((sum: number, p: any) =>
        sum + (p.unitCost * p.quantity), 0
      );
      const shippingCost = shipmentData.totalShippingCost || 0;
      const totalCost = productsCost + shippingCost;

      // Create shipment object with current exchange rate
      const shipment = {
        shipment_number: shipmentNumber,
        status: 'delivered' as 'preparing' | 'shipped' | 'delivered' | 'settled', // Always delivered
        shipping_cost: shippingCost,
        additional_costs: 0, // Can be added later
        total_cost: totalCost,
        total_revenue: 0, // Will be calculated as sales happen
        net_profit: 0, // Will be calculated as sales happen
        your_share: 0, // Will be calculated later
        partner_share: 0, // Will be calculated later
        exchange_rate_used: usdToDop, // Save current USD to DOP rate
        notes: shipmentData.notes || '',
      };

      // Create shipment items with unit cost including shipping
      const items = shipmentData.products.map((p: any) => ({
        product_id: p.catalogProductId,
        quantity: p.quantity,
        unit_cost: p.unitCost + (p.shippingPerUnit || 0), // Include shipping in unit cost
        remaining_inventory: p.quantity, // Initially all inventory is available
      }));

      // Add shipment to store
      const { addShipment } = useShipmentsStore.getState();
      await addShipment(shipment, items);

      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      Alert.alert(t('common.error'), t('shipments.errorCreatingShipment'));
    }
  };

  const filteredShipments = shipments; // No filtering needed

  const calculateTotals = () => {
    return {
      totalShipments: shipments.length,
      totalValue: shipments.reduce((sum, s) => sum + s.total_cost, 0),
    };
  };

  const totals = calculateTotals();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderShipmentCard = ({ item }: { item: ShipmentWithItems }) => {
    const totalUnits = item.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <TouchableOpacity
        style={styles.shipmentCard}
        activeOpacity={0.7}
        onPress={() => setSelectedShipment(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.shipmentInfo}>
            <Text style={styles.shipmentNumber}>{item.shipment_number}</Text>
            <Text style={styles.shipmentDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={styles.shipmentMeta}>
            <Text style={styles.productCount}>{totalUnits}</Text>
            <Text style={styles.productCountLabel}>{t('shipments.units')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('shipments.loadingShipments')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Stats and New Shipment Button */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totals.totalShipments}</Text>
            <Text style={styles.statLabel}>{t('shipments.totalShipments')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${totals.totalValue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>{t('shipments.totalInvestment')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newShipmentButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.newShipmentButtonText}>+ {t('shipments.newShipment')}</Text>
        </TouchableOpacity>
      </View>

      {/* Shipments List */}
      <FlatList
        data={filteredShipments}
        renderItem={renderShipmentCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>{t('shipments.noShipments')}</Text>
            <Text style={styles.emptySubtext}>
              {t('shipments.createFirstShipment')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>+ {t('shipments.createShipment')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <CreateShipmentModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreateShipment}
      />

      {/* Shipment Details Modal */}
      <Modal
        visible={selectedShipment !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedShipment(null)}
      >
        {selectedShipment && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedShipment(null)}>
                <Text style={styles.closeButton}>✕ {t('shipments.close')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('shipments.shipmentDetails')}</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <ShipmentDetailsView shipment={selectedShipment} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// Shipment Details Component (inline)
function ShipmentDetailsView({ shipment }: { shipment: ShipmentWithItems }) {
  const { t } = useTranslation();
  const { usdToDop, loadCachedRate } = useExchangeRateStore();

  useEffect(() => {
    // Ensure exchange rate is loaded
    loadCachedRate();
  }, []);

  const totalUnits = shipment.items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate product costs and shipping per item
  const productCosts = shipment.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  const shippingPerItem = totalUnits > 0 ? shipment.shipping_cost / totalUnits : 0;

  // Use the exchange rate from when this shipment was created
  const shipmentExchangeRate = shipment.exchange_rate_used || usdToDop;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatWithPesos = (amount: number) => `${formatCurrency(amount)} ($${(amount * shipmentExchangeRate).toFixed(0)})`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.detailsContainer}>
      {/* Shipment Info */}
      <View style={styles.detailCard}>
        <Text style={styles.detailShipmentNumber}>{shipment.shipment_number}</Text>
        <Text style={styles.detailDate}>
          {shipment.delivered_date ? formatDate(shipment.delivered_date) : formatDate(shipment.created_at)}
        </Text>
        <Text style={styles.exchangeRateText}>
          {shipment.exchange_rate_used?.toFixed(2) || usdToDop.toFixed(2)}
        </Text>
        {shipment.notes && (
          <Text style={styles.detailNotes}>{shipment.notes}</Text>
        )}
      </View>

      {/* Financial Summary */}
      <View style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>{t('shipments.financialSummary')}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('shipments.productCosts')}</Text>
          <Text style={styles.detailValue}>{formatCurrency(productCosts)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('shipments.shippingCost')}</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(shipment.shipping_cost)} ({formatCurrency(shippingPerItem)}{t('shipments.perItem')})
          </Text>
        </View>

        <View style={[styles.detailRow, styles.totalInvestmentRow]}>
          <Text style={styles.totalInvestmentLabel}>{t('shipments.totalCost')}</Text>
          <Text style={styles.totalInvestmentValue}>{formatCurrency(shipment.total_cost)}</Text>
        </View>
      </View>

      {/* Products */}
      <View style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>{t('shipments.products')} ({totalUnits} {t('shipments.units')} • {shipment.items.length} {t('shipments.types')})</Text>

        {shipment.items.map((item, index) => (
          <View key={item.id} style={[styles.productRow, index > 0 && styles.productRowBorder]}>
            <View style={styles.productRowContent}>
              {/* Product Image */}
              <View style={styles.shipmentProductImageContainer}>
                {item.product?.image_url ? (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={styles.shipmentProductImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.shipmentProductImagePlaceholder}>
                    <Text style={styles.shipmentProductPlaceholderText}>📦</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.productDetailsContainer}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {item.product?.brand} {item.product?.name}
                  </Text>
                  <Text style={styles.productSize}>{item.product?.size}</Text>
                </View>

                <View style={styles.productStats}>
                  <Text style={styles.productStat}>{t('catalog.cost')}: {formatWithPesos((item.product?.cost || item.unit_cost) + shippingPerItem)}</Text>
                  <Text style={styles.productStat}>{t('shipments.qty')}: {item.quantity}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailsContainer: {
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailShipmentNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  exchangeRateText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  detailNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailSecondary: {
    fontSize: 13,
    color: '#999',
  },
  revenueText: {
    color: '#007AFF',
  },
  profitText: {
    color: '#34C759',
  },
  lossText: {
    color: '#FF3B30',
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  productRow: {
    paddingVertical: 12,
  },
  productRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productRowContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  shipmentProductImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
  },
  shipmentProductImage: {
    width: '100%',
    height: '100%',
  },
  shipmentProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipmentProductPlaceholderText: {
    fontSize: 28,
  },
  productDetailsContainer: {
    flex: 1,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 14,
    color: '#666',
  },
  productStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  productStat: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  adjustButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  newShipmentButton: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  newShipmentButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 12,
  },
  shipmentCard: {
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
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shipmentDate: {
    fontSize: 14,
    color: '#666',
  },
  shipmentMeta: {
    alignItems: 'center',
  },
  productCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productCountLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentId: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  cardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costBreakdown: {
    flex: 1,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  costLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  costValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  costSecondary: {
    fontSize: 10,
    color: '#999',
  },
  totalCost: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profitPositive: {
    color: '#34C759',
  },
  profitNegative: {
    color: '#FF3B30',
  },
  profitSecondary: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  inventoryProgress: {
    marginVertical: 4,
  },
  inventoryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inventoryProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  inventoryProgressUnits: {
    fontSize: 11,
    color: '#999',
  },
  inventoryProgressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  inventoryProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  notesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  totalInvestmentRow: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalInvestmentLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  totalInvestmentValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  marginTopLarge: {
    marginTop: 16,
  },
  shippingCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  perItemText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
});
