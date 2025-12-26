import React, { useState, useMemo, useCallback } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useShipmentsStore } from '../store/shipmentsStore';

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
  const { t } = useTranslation();
  const { shipments, loadShipments, isLoading } = useShipmentsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadShipments();
    }, [loadShipments])
  );

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
        <Text style={styles.loadingText}>{t('inventory.loadingInventory')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header with Gradient */}
      <LinearGradient
        colors={['#1a5490', '#1a5490']}
        style={styles.searchContainer}
      >
        <TextInput
          style={styles.searchInput}
          placeholder={t('inventory.searchPlaceholder')}
          placeholderTextColor="#99b3cc"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </LinearGradient>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'consolidated' && styles.toggleButtonActive]}
          onPress={() => setViewMode('consolidated')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'consolidated' && styles.toggleTextActive]}>
            {t('inventory.generalView')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'per-shipment' && styles.toggleButtonActive]}
          onPress={() => setViewMode('per-shipment')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'per-shipment' && styles.toggleTextActive]}>
            {t('inventory.perShipment')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Inventory Stats */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={['#e0cf80', '#e6d699']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>{t('inventory.totalInventory')}</Text>
            <Text style={styles.statValue}>{inventoryStats.totalUnits}</Text>
            <Text style={styles.statSubtext}>{t('inventory.unitsInStock')}</Text>
          </LinearGradient>
        </View>

        {viewMode === 'consolidated' ? (
          // CONSOLIDATED VIEW
          <View>
            {filteredConsolidated.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('inventory.noInventoryFound')}</Text>
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
                        <Text style={styles.totalQuantity}>{product.totalQuantity} {t('inventory.units')}</Text>
                        <Text style={styles.salePriceText}>
                          ${product.salePrice?.toFixed(0) || '0'} {t('inventory.perUnit')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Shipment Breakdown */}
                  <View style={styles.breakdown}>
                    <Text style={styles.breakdownTitle}>{t('inventory.breakdown')}:</Text>
                    {product.shipments.map((shipment, idx) => (
                      <View key={idx} style={styles.breakdownRow}>
                        <Text style={styles.breakdownShipment}>• {shipment.shipmentNumber}</Text>
                        <Text style={styles.breakdownText}>{shipment.quantity} {t('inventory.units')}</Text>
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
                <Text style={styles.emptyText}>{t('inventory.noShipmentsFound')}</Text>
              </View>
            ) : (
              filteredShipments.map((shipment) => {
                const itemsWithInventory = shipment.items.filter(i => i.remaining_inventory > 0);
                if (itemsWithInventory.length === 0) return null;

                const totalUnits = itemsWithInventory.reduce((sum, i) => sum + i.remaining_inventory, 0);

                return (
                  <View key={shipment.id} style={styles.shipmentCard}>
                    <View style={styles.shipmentHeader}>
                      <View style={styles.shipmentTitleRow}>
                        <Text style={styles.shipmentNumber}>{shipment.shipment_number}</Text>
                        <Text style={styles.shipmentDate}>
                          {new Date(shipment.delivered_date || shipment.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.shipmentSummary}>
                        <Text style={styles.shipmentUnits}>{totalUnits} {t('inventory.units')}</Text>
                      </View>
                    </View>

                    {/* Products in this shipment */}
                    <View style={styles.shipmentProducts}>
                      {itemsWithInventory.map((item, idx) => (
                        <View key={item.id} style={[styles.shipmentProductRow, idx > 0 && styles.borderTop]}>
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
                                <Text style={styles.placeholderText}>📦</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.shipmentProductInfo}>
                            <Text style={styles.shipmentProductName}>
                              {item.product?.brand} {item.product?.name}
                            </Text>
                            <Text style={styles.shipmentProductSize}>{item.product?.size}</Text>
                          </View>
                          <View style={styles.shipmentProductStats}>
                            <Text style={styles.shipmentProductQty}>{item.remaining_inventory} {t('inventory.units')}</Text>
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
    backgroundColor: '#1a5490',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a5490',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1a5490',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#1a5490',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a5490',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a5490',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e0cf80',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0cf80',
  },
  toggleButtonActive: {
    backgroundColor: '#1a5490',
    borderColor: '#e0cf80',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
  },
  toggleTextActive: {
    color: '#e0cf80',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#e0cf80',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#00ffff',
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  productImageContainer: {
    width: 95,
    height: 95,
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
    minWidth: 0,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a5490',
    marginBottom: 5,
    letterSpacing: -0.3,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  productSize: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  productMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalQuantity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a5490',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
  },
  totalValueSecondary: {
    fontSize: 12,
    color: '#6c757d',
  },
  breakdown: {
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a5490',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownShipment: {
    fontSize: 13,
    color: '#495057',
    flex: 1,
    fontWeight: '500',
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
    backgroundColor: '#e0cf80',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#00ffff',
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 47, 107, 0.2)',
  },
  shipmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shipmentNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  shipmentDate: {
    fontSize: 13,
    color: '#1a5490',
  },
  shipmentSummary: {
    alignItems: 'flex-end',
  },
  shipmentUnits: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 4,
  },
  shipmentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
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
    alignItems: 'center',
    paddingVertical: 10,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 47, 107, 0.2)',
  },
  shipmentProductImageContainer: {
    marginRight: 12,
  },
  shipmentProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  shipmentProductImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 47, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipmentProductInfo: {
    flex: 1,
    minWidth: 0,
  },
  shipmentProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 4,
    flexShrink: 1,
  },
  shipmentProductSize: {
    fontSize: 13,
    color: '#1a5490',
  },
  shipmentProductStats: {
    alignItems: 'flex-end',
  },
  shipmentProductQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 2,
  },
  shipmentProductCost: {
    fontSize: 12,
    color: '#1a5490',
    marginBottom: 2,
  },
  shipmentProductValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a5490',
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
    color: '#1a5490',
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#1a5490',
  },
  salePriceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a5490',
  },
  shipmentSalePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a5490',
  },
});
