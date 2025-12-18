import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useShipmentsStore } from '../store/shipmentsStore';
import DualCurrencyText from '../components/DualCurrencyText';

type ViewMode = 'consolidated' | 'per-shipment';

interface ConsolidatedProduct {
  productId: string;
  brand: string;
  name: string;
  size: string;
  imageUrl?: string;
  salePrice?: number;
  totalQuantity: number;
  totalValue: number;
  shipments: Array<{
    shipmentNumber: string;
    shipmentId: string;
    quantity: number;
    unitCost: number;
    value: number;
  }>;
}

export default function InventoryScreen() {
  const { shipments, loadShipments, isLoading } = useShipmentsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadShipments();
  }, []);

  // Consolidated inventory - group by product across all shipments
  const consolidatedInventory = useMemo(() => {
    const productMap = new Map<string, ConsolidatedProduct>();

    shipments.forEach(shipment => {
      shipment.items.forEach(item => {
        if (!item.product || item.remaining_inventory <= 0) return;

        const key = `${item.product.brand}-${item.product.name}-${item.product.size}`;

        if (!productMap.has(key)) {
          productMap.set(key, {
            productId: item.product_id,
            brand: item.product.brand,
            name: item.product.name,
            size: item.product.size,
            imageUrl: item.product.image_url,
            salePrice: item.product.sale_price,
            totalQuantity: 0,
            totalValue: 0,
            shipments: [],
          });
        }

        const product = productMap.get(key)!;
        const value = item.remaining_inventory * item.unit_cost;

        product.totalQuantity += item.remaining_inventory;
        product.totalValue += value;
        product.shipments.push({
          shipmentNumber: shipment.shipment_number,
          shipmentId: shipment.id,
          quantity: item.remaining_inventory,
          unitCost: item.unit_cost,
          value,
        });
      });
    });

    return Array.from(productMap.values()).sort((a, b) =>
      a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
    );
  }, [shipments]);

  // Filter based on search
  const filteredConsolidated = useMemo(() => {
    if (!searchQuery) return consolidatedInventory;
    const query = searchQuery.toLowerCase();
    return consolidatedInventory.filter(p =>
      p.brand.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.size.toLowerCase().includes(query)
    );
  }, [consolidatedInventory, searchQuery]);

  const filteredShipments = useMemo(() => {
    if (!searchQuery) return shipments;
    const query = searchQuery.toLowerCase();
    return shipments.filter(s =>
      s.shipment_number.toLowerCase().includes(query) ||
      s.items.some(item =>
        item.product?.brand.toLowerCase().includes(query) ||
        item.product?.name.toLowerCase().includes(query)
      )
    );
  }, [shipments, searchQuery]);

  // Calculate inventory statistics
  const inventoryStats = useMemo(() => {
    const totalUnits = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + i.remaining_inventory, 0), 0
    );
    const totalValue = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + (i.remaining_inventory * i.unit_cost), 0), 0
    );

    // Calculate total units ordered and sold for turnover
    const totalUnitsOrdered = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
    );
    const soldUnits = totalUnitsOrdered - totalUnits;
    const inventoryTurnover = totalUnitsOrdered > 0 ? ((soldUnits / totalUnitsOrdered) * 100) : 0;

    return {
      totalUnits,
      totalValue,
      soldUnits,
      totalUnitsOrdered,
      inventoryTurnover,
    };
  }, [shipments]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or shipments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'consolidated' && styles.toggleButtonActive]}
          onPress={() => setViewMode('consolidated')}
        >
          <Text style={[styles.toggleText, viewMode === 'consolidated' && styles.toggleTextActive]}>
            General View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'per-shipment' && styles.toggleButtonActive]}
          onPress={() => setViewMode('per-shipment')}
        >
          <Text style={[styles.toggleText, viewMode === 'per-shipment' && styles.toggleTextActive]}>
            Per-Shipment
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Inventory Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Inventory</Text>
            <Text style={styles.statValue}>{inventoryStats.totalUnits}</Text>
            <Text style={styles.statSubtext}>units in stock</Text>
          </View>
        </View>

        {viewMode === 'consolidated' ? (
          // CONSOLIDATED VIEW
          <View>
            {filteredConsolidated.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No inventory found</Text>
              </View>
            ) : (
              filteredConsolidated.map((product, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    {/* Product Image */}
                    <View style={styles.productImageContainer}>
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Text style={styles.placeholderText}>📦</Text>
                        </View>
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.brand} {product.name}</Text>
                      <Text style={styles.productSize}>{product.size}</Text>
                      <View style={styles.productMetrics}>
                        <Text style={styles.totalQuantity}>{product.totalQuantity} units</Text>
                        <Text style={styles.salePriceText}>
                          ${product.salePrice?.toFixed(0) || '0'} /unit
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Shipment Breakdown */}
                  <View style={styles.breakdown}>
                    <Text style={styles.breakdownTitle}>Breakdown:</Text>
                    {product.shipments.map((shipment, idx) => (
                      <View key={idx} style={styles.breakdownRow}>
                        <Text style={styles.breakdownShipment}>• {shipment.shipmentNumber}</Text>
                        <View style={styles.breakdownDetails}>
                          <Text style={styles.breakdownText}>{shipment.quantity} units</Text>
                          <DualCurrencyText
                            usdAmount={shipment.value}
                            primaryCurrency="USD"
                            layout="horizontal"
                            style={styles.breakdownValue}
                            secondaryStyle={styles.breakdownSecondary}
                            showLabels={false}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          // PER-SHIPMENT VIEW
          <View>
            {filteredShipments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No shipments found</Text>
              </View>
            ) : (
              filteredShipments.map((shipment) => {
                const itemsWithInventory = shipment.items.filter(i => i.remaining_inventory > 0);
                if (itemsWithInventory.length === 0) return null;

                const totalUnits = itemsWithInventory.reduce((sum, i) => sum + i.remaining_inventory, 0);
                const totalValue = itemsWithInventory.reduce((sum, i) => sum + (i.remaining_inventory * i.unit_cost), 0);

                return (
                  <View key={shipment.id} style={styles.shipmentCard}>
                    <View style={styles.shipmentHeader}>
                      <View>
                        <Text style={styles.shipmentNumber}>{shipment.shipment_number}</Text>
                        <Text style={styles.shipmentDate}>
                          {new Date(shipment.delivered_date || shipment.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.shipmentSummary}>
                        <Text style={styles.shipmentUnits}>{totalUnits} units</Text>
                        <DualCurrencyText
                          usdAmount={totalValue}
                          primaryCurrency="USD"
                          layout="vertical"
                          style={styles.shipmentValue}
                          secondaryStyle={styles.shipmentValueSecondary}
                          showLabels={false}
                        />
                      </View>
                    </View>

                    {/* Products in this shipment */}
                    <View style={styles.shipmentProducts}>
                      {itemsWithInventory.map((item, idx) => (
                        <View key={item.id} style={[styles.shipmentProductRow, idx > 0 && styles.borderTop]}>
                          <View style={styles.shipmentProductInfo}>
                            <Text style={styles.shipmentProductName}>
                              {item.product?.brand} {item.product?.name}
                            </Text>
                            <Text style={styles.shipmentProductSize}>{item.product?.size}</Text>
                          </View>
                          <View style={styles.shipmentProductStats}>
                            <Text style={styles.shipmentProductQty}>{item.remaining_inventory} units</Text>
                            <Text style={styles.shipmentSalePrice}>
                              ${item.product?.sale_price?.toFixed(0) || '0'} /unit
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
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
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productMetrics: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  totalQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },
  totalValueSecondary: {
    fontSize: 12,
    color: '#999',
  },
  breakdown: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownShipment: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  breakdownDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  breakdownText: {
    fontSize: 13,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  breakdownSecondary: {
    fontSize: 11,
    color: '#999',
  },
  shipmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shipmentNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shipmentDate: {
    fontSize: 13,
    color: '#666',
  },
  shipmentSummary: {
    alignItems: 'flex-end',
  },
  shipmentUnits: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  shipmentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  shipmentValueSecondary: {
    fontSize: 12,
    color: '#999',
  },
  shipmentProducts: {
    gap: 0,
  },
  shipmentProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  shipmentProductInfo: {
    flex: 1,
  },
  shipmentProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shipmentProductSize: {
    fontSize: 13,
    color: '#666',
  },
  shipmentProductStats: {
    alignItems: 'flex-end',
  },
  shipmentProductQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  shipmentProductCost: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  shipmentProductValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  shipmentProductValueSecondary: {
    fontSize: 11,
    color: '#999',
  },
  bottomSpacer: {
    height: 20,
  },
  statsSection: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  halfCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
  },
  salePriceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },
  shipmentSalePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
});
