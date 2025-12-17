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
import CreateShipmentModal from '../components/CreateShipmentModal';
import EditCostModal from '../components/EditCostModal';
import InventoryAdjustmentModal from '../components/InventoryAdjustmentModal';
import DualCurrencyText from '../components/DualCurrencyText';
import { useShipmentsStore, ShipmentWithItems } from '../store/shipmentsStore';

export default function ShipmentsScreen() {
  const navigation = useNavigation<any>();
  const { shipments, loadShipments, isLoading } = useShipmentsStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithItems | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'preparing' | 'shipped' | 'delivered' | 'settled'>('all');

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

      // Create shipment object
      const shipment = {
        shipment_number: shipmentNumber,
        status: shipmentData.status as 'preparing' | 'shipped' | 'delivered' | 'settled',
        shipping_cost: shippingCost,
        additional_costs: 0, // Can be added later
        total_cost: totalCost,
        total_revenue: 0, // Will be calculated as sales happen
        net_profit: 0, // Will be calculated as sales happen
        your_share: 0, // Will be calculated later
        partner_share: 0, // Will be calculated later
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
      Alert.alert('Error', 'Failed to create shipment. Please try again.');
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    if (statusFilter === 'all') return true;
    return shipment.status === statusFilter;
  });

  const calculateTotals = () => {
    return {
      totalShipments: shipments.length,
      preparing: shipments.filter(s => s.status === 'preparing').length,
      shipped: shipments.filter(s => s.status === 'shipped').length,
      delivered: shipments.filter(s => s.status === 'delivered').length,
      settled: shipments.filter(s => s.status === 'settled').length,
      totalValue: shipments.reduce((sum, s) => sum + s.total_cost, 0),
    };
  };

  const totals = calculateTotals();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#FF9800';
      case 'shipped': return '#007AFF';
      case 'delivered': return '#34C759';
      case 'settled': return '#8E8E93';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Preparing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'settled': return 'Settled';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderShipmentCard = ({ item }: { item: ShipmentWithItems }) => {
    const totalUnits = item.items.reduce((sum, i) => sum + i.quantity, 0);
    const remainingUnits = item.items.reduce((sum, i) => sum + i.remaining_inventory, 0);
    const soldUnits = totalUnits - remainingUnits;
    const soldPercentage = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;
    const roi = item.total_cost > 0 ? ((item.net_profit / item.total_cost) * 100).toFixed(1) : '0';
    const isProfitable = item.net_profit >= 0;

    return (
      <TouchableOpacity
        style={styles.shipmentCard}
        activeOpacity={0.7}
        onPress={() => setSelectedShipment(item)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.shipmentDate}>{item.shipment_number}</Text>
            <Text style={styles.shipmentId}>
              {item.delivered_date
                ? formatDate(item.delivered_date)
                : formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Inventory Progress Bar */}
        <View style={styles.inventoryProgress}>
          <View style={styles.inventoryProgressHeader}>
            <Text style={styles.inventoryProgressLabel}>
              Inventory: {remainingUnits}/{totalUnits} units ({soldPercentage}% sold)
            </Text>
            <Text style={styles.inventoryProgressUnits}>{item.items.length} products</Text>
          </View>
          <View style={styles.inventoryProgressBar}>
            <View
              style={[
                styles.inventoryProgressFill,
                { width: `${soldPercentage}%` }
              ]}
            />
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.costBreakdown}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Investment:</Text>
              <DualCurrencyText
                usdAmount={item.total_cost}
                primaryCurrency="USD"
                layout="horizontal"
                style={styles.costValue}
                secondaryStyle={styles.costSecondary}
                showLabels={false}
              />
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Revenue:</Text>
              <DualCurrencyText
                usdAmount={item.total_revenue}
                primaryCurrency="USD"
                layout="horizontal"
                style={styles.costValue}
                secondaryStyle={styles.costSecondary}
                showLabels={false}
              />
            </View>
          </View>
          <View style={styles.totalCost}>
            <Text style={styles.totalLabel}>Profit ({roi}% ROI)</Text>
            <DualCurrencyText
              usdAmount={item.net_profit}
              primaryCurrency="USD"
              layout="vertical"
              style={[
                styles.totalValue,
                isProfitable ? styles.profitPositive : styles.profitNegative
              ]}
              secondaryStyle={styles.profitSecondary}
              showLabels={false}
            />
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText} numberOfLines={2}>📝 {item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shipments...</Text>
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
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totals.preparing}</Text>
            <Text style={styles.statLabel}>Preparing</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totals.shipped}</Text>
            <Text style={styles.statLabel}>Shipped</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totals.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newShipmentButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.newShipmentButtonText}>+ New Shipment</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        {(['all', 'preparing', 'shipped', 'delivered', 'settled'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              statusFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === filter && styles.filterChipTextActive,
            ]}>
              {filter === 'all' ? 'All' :
               filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.emptyText}>No shipments yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first shipment to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>+ Create Shipment</Text>
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
                <Text style={styles.closeButton}>✕ Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Shipment Details</Text>
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
  const [editingItem, setEditingItem] = useState<{
    id: string;
    cost: number;
    name: string;
    quantity: number;
    remaining: number;
  } | null>(null);

  const [adjustingItem, setAdjustingItem] = useState<{
    id: string;
    currentInventory: number;
    originalQuantity: number;
    name: string;
  } | null>(null);

  const totalUnits = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingUnits = shipment.items.reduce((sum, item) => sum + item.remaining_inventory, 0);
  const soldUnits = totalUnits - remainingUnits;
  const roi = shipment.total_cost > 0 ? ((shipment.net_profit / shipment.total_cost) * 100).toFixed(1) : '0';
  const completionPercentage = totalUnits > 0 ? ((soldUnits / totalUnits) * 100).toFixed(0) : '0';

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
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
        {shipment.notes && (
          <Text style={styles.detailNotes}>{shipment.notes}</Text>
        )}
      </View>

      {/* Financial Summary */}
      <View style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>Financial Summary</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Investment</Text>
          <DualCurrencyText
            usdAmount={shipment.total_cost}
            primaryCurrency="USD"
            layout="horizontal"
            style={styles.detailValue}
            secondaryStyle={styles.detailSecondary}
            showLabels={false}
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Revenue</Text>
          <DualCurrencyText
            usdAmount={shipment.total_revenue || 0}
            primaryCurrency="USD"
            layout="horizontal"
            style={[styles.detailValue, styles.revenueText]}
            secondaryStyle={styles.detailSecondary}
            showLabels={false}
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Profit</Text>
          <DualCurrencyText
            usdAmount={shipment.net_profit || 0}
            primaryCurrency="USD"
            layout="horizontal"
            style={[styles.detailValue, shipment.net_profit >= 0 ? styles.profitText : styles.lossText]}
            secondaryStyle={styles.detailSecondary}
            showLabels={false}
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ROI</Text>
          <Text style={[styles.detailValue, parseFloat(roi) >= 0 ? styles.profitText : styles.lossText]}>
            {roi}%
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>{completionPercentage}% Sold ({soldUnits}/{totalUnits} units)</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
        </View>
      </View>

      {/* Products */}
      <View style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>Products ({shipment.items.length})</Text>

        {shipment.items.map((item, index) => {
          const soldQty = item.quantity - item.remaining_inventory;
          return (
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

                {/* Product Info and Actions */}
                <View style={styles.productDetailsContainer}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {item.product?.brand} {item.product?.name}
                    </Text>
                    <Text style={styles.productSize}>{item.product?.size}</Text>
                  </View>

                  <View style={styles.productStats}>
                    <Text style={styles.productStat}>Original: {item.quantity}</Text>
                    <Text style={styles.productStat}>Sold: {soldQty}</Text>
                    <Text style={styles.productStat}>Left: {item.remaining_inventory}</Text>
                  </View>

                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setEditingItem({
                        id: item.id,
                        cost: item.unit_cost,
                        name: `${item.product?.brand} ${item.product?.name}`,
                        quantity: item.quantity,
                        remaining: item.remaining_inventory,
                      })}
                    >
                      <Text style={styles.actionButtonText}>Edit Cost ✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.adjustButton]}
                      onPress={() => setAdjustingItem({
                        id: item.id,
                        currentInventory: item.remaining_inventory,
                        originalQuantity: item.quantity,
                        name: `${item.product?.brand} ${item.product?.name}`,
                      })}
                    >
                      <Text style={styles.actionButtonText}>Adjust Inventory ±</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Edit Cost Modal */}
      {editingItem && (
        <EditCostModal
          visible={editingItem !== null}
          onClose={() => setEditingItem(null)}
          shipmentItemId={editingItem.id}
          currentCost={editingItem.cost}
          productName={editingItem.name}
          quantity={editingItem.quantity}
          remainingInventory={editingItem.remaining}
          shipmentId={shipment.id}
        />
      )}

      {/* Inventory Adjustment Modal */}
      {adjustingItem && (
        <InventoryAdjustmentModal
          visible={adjustingItem !== null}
          onClose={() => setAdjustingItem(null)}
          shipmentItemId={adjustingItem.id}
          currentInventory={adjustingItem.currentInventory}
          originalQuantity={adjustingItem.originalQuantity}
          productName={adjustingItem.name}
          shipmentId={shipment.id}
        />
      )}
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
    padding: 14,
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
  },
  shipmentDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
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
});
