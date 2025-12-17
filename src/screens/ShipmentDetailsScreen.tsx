import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useShipmentsStore, ShipmentWithItems } from '../store/shipmentsStore';
import { supabase } from '../config/supabase';

interface SaleInfo {
  id: string;
  sale_date: string;
  customer_name: string;
  total_amount: number;
  quantity_from_shipment: number;
}

export default function ShipmentDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { shipmentId } = route.params;
  const { shipments } = useShipmentsStore();
  const [shipment, setShipment] = useState<ShipmentWithItems | null>(null);
  const [sales, setSales] = useState<SaleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShipmentDetails();
  }, [shipmentId]);

  const loadShipmentDetails = async () => {
    setIsLoading(true);
    try {
      // Find shipment in store
      const foundShipment = shipments.find(s => s.id === shipmentId);
      if (foundShipment) {
        setShipment(foundShipment);
      }

      // Load sales that used this shipment
      await loadSalesHistory();
    } catch (error) {
      console.error('Error loading shipment details:', error);
      Alert.alert('Error', 'Failed to load shipment details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalesHistory = async () => {
    try {
      // Get all sale_item_allocations for this shipment's items
      const { data: allocations, error } = await supabase
        .from('sale_item_allocations')
        .select(`
          quantity,
          sale_item:sale_items!inner(
            sale:sales!inner(
              id,
              sale_date,
              total_amount,
              customer:customers(name)
            )
          ),
          shipment_item:shipment_items!inner(
            shipment_id
          )
        `)
        .eq('shipment_item.shipment_id', shipmentId);

      if (error) throw error;

      // Group by sale and sum quantities
      const salesMap = new Map<string, SaleInfo>();

      allocations?.forEach((alloc: any) => {
        const sale = alloc.sale_item?.sale;
        if (sale) {
          const existing = salesMap.get(sale.id);
          if (existing) {
            existing.quantity_from_shipment += alloc.quantity;
          } else {
            salesMap.set(sale.id, {
              id: sale.id,
              sale_date: sale.sale_date,
              customer_name: sale.customer?.name || 'Unknown',
              total_amount: sale.total_amount,
              quantity_from_shipment: alloc.quantity,
            });
          }
        }
      });

      setSales(Array.from(salesMap.values()));
    } catch (error) {
      console.error('Error loading sales history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

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
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading || !shipment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shipment details...</Text>
      </View>
    );
  }

  const totalUnits = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingUnits = shipment.items.reduce((sum, item) => sum + item.remaining_inventory, 0);
  const soldUnits = totalUnits - remainingUnits;
  const roi = shipment.total_cost > 0 ? ((shipment.net_profit / shipment.total_cost) * 100).toFixed(1) : '0';
  const completionPercentage = totalUnits > 0 ? ((soldUnits / totalUnits) * 100).toFixed(0) : '0';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipment Info Card */}
        <View style={styles.card}>
          <View style={styles.shipmentHeader}>
            <View>
              <Text style={styles.shipmentNumber}>{shipment.shipment_number}</Text>
              <Text style={styles.shipmentDate}>
                {shipment.delivered_date ? formatDate(shipment.delivered_date) : formatDate(shipment.created_at)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(shipment.status)}</Text>
            </View>
          </View>

          {shipment.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{shipment.notes}</Text>
            </View>
          )}
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Summary</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Investment</Text>
            <Text style={styles.metricValue}>{formatCurrency(shipment.total_cost)}</Text>
          </View>

          <View style={styles.metricBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>• Shipping Cost</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(shipment.shipping_cost)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>• Additional Costs</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(shipment.additional_costs || 0)}</Text>
            </View>
          </View>

          <View style={[styles.metricRow, styles.marginTop]}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={[styles.metricValue, styles.revenueText]}>{formatCurrency(shipment.total_revenue || 0)}</Text>
          </View>

          <View style={[styles.metricRow, styles.marginTop]}>
            <Text style={styles.metricLabel}>Net Profit</Text>
            <Text style={[styles.metricValue, shipment.net_profit >= 0 ? styles.profitText : styles.lossText]}>
              {formatCurrency(shipment.net_profit || 0)}
            </Text>
          </View>

          <View style={[styles.metricRow, styles.marginTop]}>
            <Text style={styles.metricLabel}>ROI</Text>
            <Text style={[styles.metricValue, parseFloat(roi) >= 0 ? styles.profitText : styles.lossText]}>
              {roi}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Inventory Progress</Text>
              <Text style={styles.progressPercentage}>{completionPercentage}% Sold</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${completionPercentage}%` as any }]} />
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressStat}>{soldUnits} sold</Text>
              <Text style={styles.progressStat}>{remainingUnits} remaining</Text>
            </View>
          </View>
        </View>

        {/* Products List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Products ({shipment.items.length})</Text>

          {shipment.items.map((item, index) => {
            const soldQty = item.quantity - item.remaining_inventory;
            const revenue = 0; // TODO: Calculate from allocations

            return (
              <View key={item.id} style={[styles.productItem, index > 0 && styles.productItemBorder]}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{item.product?.brand} {item.product?.name}</Text>
                  <Text style={styles.productSize}>{item.product?.size}</Text>
                </View>

                <View style={styles.productStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Original</Text>
                    <Text style={styles.statValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Sold</Text>
                    <Text style={styles.statValue}>{soldQty}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text style={[styles.statValue, item.remaining_inventory === 0 && styles.depleted]}>
                      {item.remaining_inventory}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Unit Cost</Text>
                    <Text style={styles.statValue}>{formatCurrency(item.unit_cost)}</Text>
                  </View>
                </View>

                {item.remaining_inventory === 0 && (
                  <View style={styles.depletedBadge}>
                    <Text style={styles.depletedText}>SOLD OUT</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Sales History */}
        {sales.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sales History ({sales.length})</Text>
            <Text style={styles.cardSubtitle}>Sales that used products from this shipment</Text>

            {sales.map((sale, index) => (
              <View key={sale.id} style={[styles.saleItem, index > 0 && styles.saleItemBorder]}>
                <View style={styles.saleHeader}>
                  <View>
                    <Text style={styles.saleCustomer}>{sale.customer_name}</Text>
                    <Text style={styles.saleDate}>{formatDate(sale.sale_date)}</Text>
                  </View>
                  <View style={styles.saleAmounts}>
                    <Text style={styles.saleQuantity}>{sale.quantity_from_shipment} units</Text>
                    <Text style={styles.saleAmount}>{formatCurrency(sale.total_amount)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
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
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shipmentNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shipmentDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: -12,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  metricBreakdown: {
    marginLeft: 16,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#999',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  marginTop: {
    marginTop: 8,
  },
  progressSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 12,
    color: '#666',
  },
  productItem: {
    marginBottom: 16,
  },
  productItemBorder: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  productSize: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  depleted: {
    color: '#FF3B30',
  },
  depletedBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF3F3',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  depletedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
  saleItem: {
    marginBottom: 12,
  },
  saleItemBorder: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: '#666',
  },
  saleAmounts: {
    alignItems: 'flex-end',
  },
  saleQuantity: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  saleAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bottomSpacer: {
    height: 20,
  },
});
