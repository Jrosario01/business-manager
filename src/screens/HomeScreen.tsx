import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useShipmentsStore } from '../store/shipmentsStore';
import { useSalesStore } from '../store/salesStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';
import CurrencySettingsModal from '../components/CurrencySettingsModal';
import DualCurrencyText from '../components/DualCurrencyText';

export default function HomeScreen() {
  const { shipments, loadShipments, isLoading: shipmentsLoading } = useShipmentsStore();
  const { sales, loadSales, isLoading: salesLoading } = useSalesStore();
  const { loadCachedRate, usdToDop } = useExchangeRateStore();
  const [refreshing, setRefreshing] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadShipments(),
      loadSales(),
      loadCachedRate(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate comprehensive statistics
  const statistics = useMemo(() => {
    // Inventory metrics
    const totalInventoryUnits = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + i.remaining_inventory, 0), 0
    );
    const totalInventoryValue = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + (i.remaining_inventory * i.unit_cost), 0), 0
    );

    // Calculate total units across all shipments
    const totalUnitsOrdered = shipments.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
    );
    const soldUnits = totalUnitsOrdered - totalInventoryUnits;
    const inventoryTurnover = totalUnitsOrdered > 0 ? ((soldUnits / totalUnitsOrdered) * 100) : 0;

    return {
      // Inventory
      totalInventoryUnits,
      totalInventoryValue,
      inventoryTurnover,
      soldUnits,
    };
  }, [shipments, sales]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const isLoading = shipmentsLoading || salesLoading;

  if (isLoading && shipments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Business Dashboard</Text>
          <Text style={styles.headerSubtitle}>Overview of your operations</Text>
        </View>
        <TouchableOpacity
          style={styles.currencyButton}
          onPress={() => setCurrencyModalVisible(true)}
        >
          <Text style={styles.currencyButtonText}>💱</Text>
          <Text style={styles.currencyRate}>1 USD = {usdToDop.toFixed(2)} DOP</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Inventory Status</Text>

        <View style={styles.row}>
          <View style={[styles.statCard, styles.halfCard]}>
            <Text style={styles.statLabel}>Current Inventory</Text>
            <Text style={styles.statValue}>{statistics.totalInventoryUnits}</Text>
            <Text style={styles.statSubtext}>units</Text>
          </View>
          <View style={[styles.statCard, styles.halfCard]}>
            <Text style={styles.statLabel}>Inventory Value</Text>
            <DualCurrencyText
              usdAmount={statistics.totalInventoryValue}
              primaryCurrency="USD"
              layout="vertical"
              style={styles.statValue}
              secondaryStyle={styles.statSubtext}
            />
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.statLabel}>Inventory Turnover</Text>
            <Text style={styles.progressPercent}>{formatPercent(statistics.inventoryTurnover)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(statistics.inventoryTurnover, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.statSubtext}>
            {statistics.soldUnits} of {statistics.soldUnits + statistics.totalInventoryUnits} units sold
          </Text>
        </View>
      </View>

      {/* Shipments Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚢 Shipments Overview</Text>

        <View style={styles.row}>
          <View style={[styles.statCard, styles.thirdCard]}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{statistics.totalShipments}</Text>
          </View>
          <View style={[styles.statCard, styles.thirdCard]}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={[styles.statValue, styles.activeText]}>{statistics.activeShipments}</Text>
          </View>
          <View style={[styles.statCard, styles.thirdCard]}>
            <Text style={styles.statLabel}>Settled</Text>
            <Text style={styles.statValue}>{statistics.settledShipments}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Profitable Shipments</Text>
          <Text style={styles.statValue}>
            {statistics.profitableShipments} / {statistics.totalShipments}
          </Text>
          <Text style={styles.statSubtext}>
            {statistics.totalShipments > 0
              ? formatPercent((statistics.profitableShipments / statistics.totalShipments) * 100)
              : '0%'} success rate
          </Text>
        </View>
      </View>

      {/* Sales Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💵 Sales Overview</Text>

        <View style={styles.row}>
          <View style={[styles.statCard, styles.halfCard]}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>{statistics.totalSales}</Text>
            <Text style={styles.statSubtext}>transactions</Text>
          </View>
          <View style={[styles.statCard, styles.halfCard]}>
            <Text style={styles.statLabel}>Sales Value</Text>
            <DualCurrencyText
              usdAmount={statistics.totalSalesValue}
              primaryCurrency="USD"
              layout="vertical"
              style={[styles.statValue, styles.revenueText]}
              secondaryStyle={styles.statSubtext}
            />
          </View>
        </View>

        {statistics.totalSales > 0 && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average Sale Value</Text>
            <DualCurrencyText
              usdAmount={statistics.totalSalesValue / statistics.totalSales}
              primaryCurrency="USD"
              layout="vertical"
              style={styles.statValue}
              secondaryStyle={styles.statSubtext}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />

      {/* Currency Settings Modal */}
      <CurrencySettingsModal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  currencyButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  currencyRate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statCard: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  thirdCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
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
  activeText: {
    color: '#FF9500',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  bottomSpacer: {
    height: 20,
  },
});
