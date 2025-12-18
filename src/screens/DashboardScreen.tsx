// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   TouchableOpacity,
// } from 'react-native';
// import { useShipmentsStore } from '../store/shipmentsStore';
// import { useSalesStore } from '../store/salesStore';
// import { useExchangeRateStore } from '../store/exchangeRateStore';
// import CurrencySettingsModal from '../components/CurrencySettingsModal';
// import DualCurrencyText from '../components/DualCurrencyText';

// export default function DashboardScreen() {
//   const { shipments, loadShipments, isLoading: shipmentsLoading } = useShipmentsStore();
//   const { sales, loadSales, isLoading: salesLoading } = useSalesStore();
//   const { loadCachedRate, usdToDop } = useExchangeRateStore();
//   const [refreshing, setRefreshing] = useState(false);
//   const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     await Promise.all([
//       loadShipments(),
//       loadSales(),
//       loadCachedRate(), // Load exchange rate
//     ]);
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadData();
//     setRefreshing(false);
//   };

//   // Calculate comprehensive statistics
//   const statistics = useMemo(() => {
//     // Profit metrics (from actual sales - more accurate than shipment-level)
//     // Total revenue from all sales (in DOP)
//     const totalSalesRevenueDOP = sales.reduce((sum, s) => sum + s.totalRevenue, 0);

//     // Total cost of goods sold from all sales (in USD, need to convert to DOP)
//     const totalCostOfGoodsSold = sales.reduce((sum, s) => sum + s.totalCost, 0);
//     const totalCostOfGoodsSoldDOP = totalCostOfGoodsSold * usdToDop;

//     // Actual profit from completed sales (in DOP)
//     const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);

//     // ROI based on actual sales: (Profit / Cost of Goods Sold) × 100
//     const overallROI = totalCostOfGoodsSoldDOP > 0 ? ((totalProfit / totalCostOfGoodsSoldDOP) * 100) : 0;

//     // Total investment in shipments (for reference, in USD)
//     const totalInvestment = shipments.reduce((sum, s) => sum + (s.total_cost || 0), 0);

//     // Inventory metrics
//     const totalInventoryUnits = shipments.reduce((sum, s) =>
//       sum + s.items.reduce((itemSum, i) => itemSum + i.remaining_inventory, 0), 0
//     );
//     const totalInventoryValue = shipments.reduce((sum, s) =>
//       sum + s.items.reduce((itemSum, i) => itemSum + (i.remaining_inventory * i.unit_cost), 0), 0
//     );

//     // Calculate total units across all shipments
//     const totalUnitsOrdered = shipments.reduce((sum, s) =>
//       sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
//     );
//     const soldUnits = totalUnitsOrdered - totalInventoryUnits;
//     const inventoryTurnover = totalUnitsOrdered > 0 ? ((soldUnits / totalUnitsOrdered) * 100) : 0;

//     // Sales metrics
//     const totalSales = sales.length;
//     // Convert sales revenue to USD (sales are in DOP, need to convert for consistency)
//     const totalSalesValue = sales.reduce((sum, s) => {
//       // If sale is in DOP, convert to USD; otherwise use as-is
//       const saleRevenue = s.currency === 'DOP'
//         ? s.totalRevenue / (s.exchangeRateUsed || usdToDop)
//         : s.totalRevenue;
//       return sum + saleRevenue;
//     }, 0);

//     // Shipment metrics - simplified (no status tracking)

//     // Profitability metrics
//     const profitableShipments = shipments.filter(s => (s.net_profit || 0) > 0).length;
//     const profitableSales = sales.filter(s => s.profit > 0).length;

//     // Profit margin = (profit / revenue) * 100
//     // Using actual sales data (all in DOP)
//     const profitMargin = totalSalesRevenueDOP > 0 ? ((totalProfit / totalSalesRevenueDOP) * 100) : 0;

//     return {
//       // Investment (shipment-level, for reference)
//       totalInvestment,

//       // Sales Performance (actual realized profits)
//       totalRevenue: totalSalesRevenueDOP,
//       totalProfit,
//       overallROI,
//       totalCostOfGoodsSold: totalCostOfGoodsSoldDOP,

//       // Inventory
//       totalInventoryUnits,
//       totalInventoryValue,
//       inventoryTurnover,
//       soldUnits,

//       // Sales
//       totalSales,
//       totalSalesValue,

//       // Shipments
//       totalShipments: shipments.length,

//       // Profitability
//       profitableShipments,
//       profitableSales,
//       profitMargin,
//     };
//   }, [shipments, sales]);

//   const formatPercent = (value: number) => `${value.toFixed(1)}%`;

//   const isLoading = shipmentsLoading || salesLoading;

//   if (isLoading && shipments.length === 0) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//         <Text style={styles.loadingText}>Loading dashboard...</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={styles.contentContainer}
//       refreshControl={
//         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//       }
//     >
//       {/* Header */}
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.headerTitle}>Business Dashboard</Text>
//           <Text style={styles.headerSubtitle}>Overview of your operations</Text>
//         </View>
//         <TouchableOpacity
//           style={styles.currencyButton}
//           onPress={() => setCurrencyModalVisible(true)}
//         >
//           <Text style={styles.currencyButtonText}>💱</Text>
//           <Text style={styles.currencyRate}>1 USD = {usdToDop.toFixed(2)} DOP</Text>
//         </TouchableOpacity>
//       </View>


//       {/* Inventory Status */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>📦 Inventory Status</Text>

//         <View style={styles.row}>
//           <View style={[styles.statCard, styles.halfCard]}>
//             <Text style={styles.statLabel}>Current Inventory</Text>
//             <Text style={styles.statValue}>{statistics.totalInventoryUnits}</Text>
//             <Text style={styles.statSubtext}>units</Text>
//           </View>
//           <View style={[styles.statCard, styles.halfCard]}>
//             <Text style={styles.statLabel}>Inventory Value</Text>
//             <DualCurrencyText
//               usdAmount={statistics.totalInventoryValue}
//               primaryCurrency="USD"
//               layout="vertical"
//               style={styles.statValue}
//               secondaryStyle={styles.statSubtext}
//             />
//           </View>
//         </View>

//         <View style={styles.statCard}>
//           <View style={styles.progressHeader}>
//             <Text style={styles.statLabel}>Inventory Turnover</Text>
//             <Text style={styles.progressPercent}>{formatPercent(statistics.inventoryTurnover)}</Text>
//           </View>
//           <View style={styles.progressBar}>
//             <View
//               style={[
//                 styles.progressFill,
//                 { width: `${Math.min(statistics.inventoryTurnover, 100)}%` }
//               ]}
//             />
//           </View>
//           <Text style={styles.statSubtext}>
//             {statistics.soldUnits} of {statistics.soldUnits + statistics.totalInventoryUnits} units sold
//           </Text>
//         </View>
//       </View>


//       <View style={styles.bottomSpacer} />

//       {/* Currency Settings Modal */}
//       <CurrencySettingsModal
//         visible={currencyModalVisible}
//         onClose={() => setCurrencyModalVisible(false)}
//       />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   contentContainer: {
//     padding: 16,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#666',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   headerSubtitle: {
//     fontSize: 14,
//     color: '#666',
//   },
//   currencyButton: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 12,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   currencyButtonText: {
//     fontSize: 24,
//     marginBottom: 4,
//   },
//   currencyRate: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#007AFF',
//     textAlign: 'center',
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   sectionSubtitle: {
//     fontSize: 13,
//     color: '#666',
//     marginBottom: 12,
//   },
//   statCard: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   row: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   halfCard: {
//     flex: 1,
//   },
//   thirdCard: {
//     flex: 1,
//   },
//   statLabel: {
//     fontSize: 13,
//     color: '#666',
//     marginBottom: 6,
//     fontWeight: '600',
//   },
//   statValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   statSubtext: {
//     fontSize: 12,
//     color: '#999',
//   },
//   revenueText: {
//     color: '#007AFF',
//   },
//   profitText: {
//     color: '#34C759',
//   },
//   lossText: {
//     color: '#FF3B30',
//   },
//   activeText: {
//     color: '#FF9500',
//   },
//   progressHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   progressPercent: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#007AFF',
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#007AFF',
//     borderRadius: 4,
//   },
//   bottomSpacer: {
//     height: 20,
//   },
// });
