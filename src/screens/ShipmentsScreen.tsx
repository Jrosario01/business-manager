import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import CreateShipmentModal from '../components/CreateShipmentModal';

interface ShipmentProduct {
  brand: string;
  name: string;
  size: string;
  unitCost: number;
  quantity: number;
  shippingPerUnit: number;
  catalogProductId?: string;
}

interface Shipment {
  id: string;
  products: ShipmentProduct[];
  totalShippingCost: number;
  totalCost: number;
  notes: string;
  status: 'preparing' | 'in_transit' | 'delivered';
  createdAt: string;
}

export default function ShipmentsScreen() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'preparing' | 'in_transit' | 'delivered'>('all');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setIsLoading(true);
    // TODO: Load from storage/database
    // For now, using empty array
    setShipments([]);
    setIsLoading(false);
  };

  const handleCreateShipment = async (shipmentData: any) => {
    const newShipment: Shipment = {
      id: `shipment_${Date.now()}`,
      ...shipmentData,
      createdAt: new Date().toISOString(),
    };

    setShipments([newShipment, ...shipments]);
    setIsModalVisible(false);

    // TODO: Save to storage/database
  };

  const filteredShipments = shipments.filter(shipment => {
    if (statusFilter === 'all') return true;
    return shipment.status === statusFilter;
  });

  const calculateTotals = () => {
    return {
      totalShipments: shipments.length,
      preparing: shipments.filter(s => s.status === 'preparing').length,
      inTransit: shipments.filter(s => s.status === 'in_transit').length,
      delivered: shipments.filter(s => s.status === 'delivered').length,
      totalValue: shipments.reduce((sum, s) => sum + s.totalCost, 0),
    };
  };

  const totals = calculateTotals();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#FF9800';
      case 'in_transit': return '#007AFF';
      case 'delivered': return '#34C759';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Preparing';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderShipmentCard = ({ item }: { item: Shipment }) => {
    const totalUnits = item.products.reduce((sum, p) => sum + p.quantity, 0);
    const productsCost = item.products.reduce((sum, p) => sum + (p.unitCost * p.quantity), 0);

    return (
      <TouchableOpacity style={styles.shipmentCard} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.shipmentDate}>{formatDate(item.createdAt)}</Text>
            <Text style={styles.shipmentId}>#{item.id.slice(-8)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Products</Text>
            <Text style={styles.metricValue}>{item.products.length} items</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Units</Text>
            <Text style={styles.metricValue}>{totalUnits}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Products Cost</Text>
            <Text style={styles.metricValue}>${productsCost.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.costBreakdown}>
            <Text style={styles.costLabel}>Shipping: ${item.totalShippingCost.toFixed(2)}</Text>
          </View>
          <View style={styles.totalCost}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${item.totalCost.toFixed(2)}</Text>
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
            <Text style={styles.statValue}>{totals.inTransit}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
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
        {(['all', 'preparing', 'in_transit', 'delivered'] as const).map(filter => (
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
               filter === 'in_transit' ? 'In Transit' :
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
  costLabel: {
    fontSize: 12,
    color: '#666',
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
    color: '#34C759',
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
