import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, isWithinInterval } from 'date-fns';

interface Sale {
  id: string;
  date: string;
  customerName: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  amountPaid: number;
  shipmentId?: string;
}

interface Shipment {
  id: string;
  name: string;
  totalCost: number;
  status: string;
  createdDate: string;
}

type TimePeriod = 'weekly' | 'monthly' | 'yearly' | 'all';
type ReportTab = 'overview' | 'shipments';

// Dummy data for testing
const dummySales: Sale[] = [
  {
    id: '1',
    date: '2024-12-10',
    customerName: 'Juan Perez',
    totalRevenue: 150,
    totalCost: 85,
    profit: 65,
    amountPaid: 100,
    shipmentId: 'shipment-1',
  },
  {
    id: '2',
    date: '2024-12-09',
    customerName: 'Maria Rodriguez',
    totalRevenue: 55,
    totalCost: 32,
    profit: 23,
    amountPaid: 55,
    shipmentId: 'shipment-1',
  },
  {
    id: '3',
    date: '2024-12-08',
    customerName: 'Ana Martinez',
    totalRevenue: 178,
    totalCost: 96,
    profit: 82,
    amountPaid: 0,
    shipmentId: 'shipment-2',
  },
  {
    id: '4',
    date: '2024-11-25',
    customerName: 'Carlos Gomez',
    totalRevenue: 240,
    totalCost: 150,
    profit: 90,
    amountPaid: 240,
    shipmentId: 'shipment-2',
  },
  {
    id: '5',
    date: '2024-11-15',
    customerName: 'Luis Fernandez',
    totalRevenue: 320,
    totalCost: 200,
    profit: 120,
    amountPaid: 200,
    shipmentId: 'shipment-1',
  },
];

const dummyShipments: Shipment[] = [
  {
    id: 'shipment-1',
    name: 'Shipment #001',
    totalCost: 2500,
    status: 'delivered',
    createdDate: '2024-11-01',
  },
  {
    id: 'shipment-2',
    name: 'Shipment #002',
    totalCost: 3200,
    status: 'delivered',
    createdDate: '2024-11-20',
  },
  {
    id: 'shipment-3',
    name: 'Shipment #003',
    totalCost: 1800,
    status: 'preparing',
    createdDate: '2024-12-05',
  },
];

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');

  // Filter sales by time period
  const filteredSales = useMemo(() => {
    const now = new Date();

    if (timePeriod === 'all') return dummySales;

    let start: Date;
    let end: Date;

    switch (timePeriod) {
      case 'weekly':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'monthly':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'yearly':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return dummySales;
    }

    return dummySales.filter(sale => {
      const saleDate = new Date(sale.date);
      return isWithinInterval(saleDate, { start, end });
    });
  }, [timePeriod]);

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
    const totalCost = filteredSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const totalOwed = totalRevenue - totalPaid;

    return {
      salesCount: filteredSales.length,
      totalRevenue,
      totalCost,
      totalProfit,
      totalPaid,
      totalOwed,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }, [filteredSales]);

  // Calculate shipment metrics
  const shipmentMetrics = useMemo(() => {
    return dummyShipments.map(shipment => {
      const shipmentSales = dummySales.filter(sale => sale.shipmentId === shipment.id);
      const totalRevenue = shipmentSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
      const totalCost = shipmentSales.reduce((sum, sale) => sum + sale.totalCost, 0);
      const totalProfit = shipmentSales.reduce((sum, sale) => sum + sale.profit, 0);
      const totalPaid = shipmentSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
      const totalOwed = totalRevenue - totalPaid;

      return {
        ...shipment,
        salesCount: shipmentSales.length,
        totalRevenue,
        totalSalesCost: totalCost,
        totalProfit,
        totalPaid,
        totalOwed,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        investmentRecovery: shipment.totalCost > 0 ? (totalPaid / shipment.totalCost) * 100 : 0,
      };
    });
  }, []);

  const generatePDF = async () => {
    try {
      const periodLabel = timePeriod === 'all' ? 'All Time' :
                         timePeriod === 'weekly' ? 'This Week' :
                         timePeriod === 'monthly' ? 'This Month' : 'This Year';

      let htmlContent = '';

      if (activeTab === 'overview') {
        htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #007AFF; margin-bottom: 10px; }
                h2 { color: #333; margin-top: 20px; border-bottom: 2px solid #007AFF; padding-bottom: 5px; }
                .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .metric-label { font-weight: bold; color: #666; }
                .metric-value { color: #333; font-size: 18px; }
                .profit { color: #34C759; }
                .owed { color: #FF3B30; }
                .date { color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <h1>Sales Report - ${periodLabel}</h1>
              <p class="date">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>

              <h2>Summary</h2>
              <div class="metric-row">
                <span class="metric-label">Total Sales:</span>
                <span class="metric-value">${overviewMetrics.salesCount}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Total Revenue:</span>
                <span class="metric-value">$${overviewMetrics.totalRevenue.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Total Cost:</span>
                <span class="metric-value">$${overviewMetrics.totalCost.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Total Profit:</span>
                <span class="metric-value profit">$${overviewMetrics.totalProfit.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Profit Margin:</span>
                <span class="metric-value profit">${overviewMetrics.profitMargin.toFixed(1)}%</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Amount Collected:</span>
                <span class="metric-value">$${overviewMetrics.totalPaid.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Amount Owed:</span>
                <span class="metric-value owed">$${overviewMetrics.totalOwed.toFixed(2)}</span>
              </div>
            </body>
          </html>
        `;
      } else {
        // Shipment report
        const shipmentRows = shipmentMetrics.map(shipment => `
          <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
            <h3 style="color: #007AFF; margin-top: 0;">${shipment.name}</h3>
            <div class="metric-row">
              <span class="metric-label">Status:</span>
              <span class="metric-value">${shipment.status.toUpperCase()}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Initial Investment:</span>
              <span class="metric-value">$${shipment.totalCost.toFixed(2)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Sales Count:</span>
              <span class="metric-value">${shipment.salesCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Total Revenue:</span>
              <span class="metric-value">$${shipment.totalRevenue.toFixed(2)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Total Profit:</span>
              <span class="metric-value profit">$${shipment.totalProfit.toFixed(2)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Amount Collected:</span>
              <span class="metric-value">$${shipment.totalPaid.toFixed(2)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Amount Owed:</span>
              <span class="metric-value owed">$${shipment.totalOwed.toFixed(2)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Investment Recovery:</span>
              <span class="metric-value">${shipment.investmentRecovery.toFixed(1)}%</span>
            </div>
          </div>
        `).join('');

        htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #007AFF; margin-bottom: 10px; }
                h2 { color: #333; margin-top: 20px; }
                .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .metric-label { font-weight: bold; color: #666; }
                .metric-value { color: #333; }
                .profit { color: #34C759; }
                .owed { color: #FF3B30; }
                .date { color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <h1>Shipment Performance Report</h1>
              <p class="date">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>

              ${shipmentRows}
            </body>
          </html>
        `;
      }

      await Print.printAsync({
        html: htmlContent,
      });

      Alert.alert('Success', 'Report exported to PDF successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Time Period Filter */}
      <View style={styles.filterContainer}>
        {[
          { label: 'Week', value: 'weekly' as TimePeriod },
          { label: 'Month', value: 'monthly' as TimePeriod },
          { label: 'Year', value: 'yearly' as TimePeriod },
          { label: 'All', value: 'all' as TimePeriod },
        ].map(period => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.filterChip,
              timePeriod === period.value && styles.filterChipActive
            ]}
            onPress={() => setTimePeriod(period.value)}
          >
            <Text style={[
              styles.filterChipText,
              timePeriod === period.value && styles.filterChipTextActive
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metrics Cards */}
      <View style={styles.metricsGrid}>
        {/* First Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.revenueCard]}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={[styles.metricValue, styles.revenueValue]}>
              ${overviewMetrics.totalRevenue.toFixed(2)}
            </Text>
            <Text style={styles.metricSubtext}>{overviewMetrics.salesCount} sales</Text>
          </View>

          <View style={[styles.metricCard, styles.profitCard]}>
            <Text style={styles.metricLabel}>Total Profit</Text>
            <Text style={[styles.metricValue, styles.profitValue]}>
              ${overviewMetrics.totalProfit.toFixed(2)}
            </Text>
            <Text style={styles.metricSubtext}>
              {overviewMetrics.profitMargin.toFixed(1)}% margin
            </Text>
          </View>
        </View>

        {/* Second Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.collectedCard]}>
            <Text style={styles.metricLabel}>Collected</Text>
            <Text style={[styles.metricValue, styles.collectedValue]}>
              ${overviewMetrics.totalPaid.toFixed(2)}
            </Text>
            <Text style={styles.metricSubtext}>
              {overviewMetrics.totalRevenue > 0
                ? ((overviewMetrics.totalPaid / overviewMetrics.totalRevenue) * 100).toFixed(1)
                : 0}% of revenue
            </Text>
          </View>

          <View style={[styles.metricCard, styles.owedCard]}>
            <Text style={styles.metricLabel}>Amount Owed</Text>
            <Text style={[styles.metricValue, styles.owedValue]}>
              ${overviewMetrics.totalOwed.toFixed(2)}
            </Text>
            <Text style={styles.metricSubtext}>Outstanding</Text>
          </View>
        </View>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.card}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Cost of Goods:</Text>
            <Text style={styles.breakdownValue}>${overviewMetrics.totalCost.toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Revenue:</Text>
            <Text style={styles.breakdownValue}>${overviewMetrics.totalRevenue.toFixed(2)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
            <Text style={styles.breakdownLabelTotal}>Net Profit:</Text>
            <Text style={styles.breakdownValueProfit}>${overviewMetrics.totalProfit.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderShipments = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Shipment Performance</Text>
      <Text style={styles.sectionSubtitle}>
        Track sales, profits, and outstanding payments for each shipment
      </Text>

      {shipmentMetrics.map(shipment => (
        <View key={shipment.id} style={styles.shipmentCard}>
          <View style={styles.shipmentHeader}>
            <View>
              <Text style={styles.shipmentName}>{shipment.name}</Text>
              <Text style={styles.shipmentDate}>
                Created {format(new Date(shipment.createdDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              shipment.status === 'delivered' ? styles.statusDelivered : styles.statusPreparing
            ]}>
              <Text style={styles.statusText}>{shipment.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.shipmentMetrics}>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Initial Investment:</Text>
              <Text style={styles.shipmentMetricValue}>${shipment.totalCost.toFixed(2)}</Text>
            </View>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Sales Made:</Text>
              <Text style={styles.shipmentMetricValue}>{shipment.salesCount}</Text>
            </View>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Revenue Generated:</Text>
              <Text style={[styles.shipmentMetricValue, styles.revenueValue]}>
                ${shipment.totalRevenue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Profit Earned:</Text>
              <Text style={[styles.shipmentMetricValue, styles.profitValue]}>
                ${shipment.totalProfit.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Amount Collected:</Text>
              <Text style={[styles.shipmentMetricValue, styles.collectedValue]}>
                ${shipment.totalPaid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Amount Owed:</Text>
              <Text style={[styles.shipmentMetricValue, styles.owedValue]}>
                ${shipment.totalOwed.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Investment Recovery:</Text>
              <Text style={styles.shipmentMetricValue}>
                {shipment.investmentRecovery.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.shipmentMetricRow}>
              <Text style={styles.shipmentMetricLabel}>Profit Margin:</Text>
              <Text style={styles.shipmentMetricValue}>
                {shipment.profitMargin.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shipments' && styles.tabActive]}
          onPress={() => setActiveTab('shipments')}
        >
          <Text style={[styles.tabText, activeTab === 'shipments' && styles.tabTextActive]}>
            Shipments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'overview' ? renderOverview() : renderShipments()}

      {/* Export Button */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
          <Text style={styles.exportButtonText}>📄 Export to PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  metricsGrid: {
    gap: 10,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  revenueCard: {
    backgroundColor: '#E3F2FD',
  },
  profitCard: {
    backgroundColor: '#E8F5E9',
  },
  collectedCard: {
    backgroundColor: '#F3E5F5',
  },
  owedCard: {
    backgroundColor: '#FFEBEE',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  revenueValue: {
    color: '#1976D2',
  },
  profitValue: {
    color: '#2E7D32',
  },
  collectedValue: {
    color: '#7B1FA2',
  },
  owedValue: {
    color: '#C62828',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownRowTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownValueProfit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
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
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shipmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shipmentDate: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDelivered: {
    backgroundColor: '#34C759',
  },
  statusPreparing: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shipmentMetrics: {
    gap: 8,
  },
  shipmentMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentMetricLabel: {
    fontSize: 14,
    color: '#666',
  },
  shipmentMetricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  exportContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
});
