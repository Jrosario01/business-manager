import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as Print from 'expo-print';
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, isWithinInterval } from 'date-fns';
import { PieChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import { useShipmentsStore } from '../store/shipmentsStore';
import { useSalesStore } from '../store/salesStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';

type TimePeriod = 'weekly' | 'monthly' | 'yearly' | 'all';
type ReportTab = 'overview' | 'shipments';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [shipmentsAllocations, setShipmentsAllocations] = useState<Map<string, any[]>>(new Map());
  const [allocationsLoading, setAllocationsLoading] = useState(false);

  // Load data from stores
  const { shipments, isLoading: shipmentsLoading, loadShipments, getShipmentSalesAllocations } = useShipmentsStore();
  const { sales, isLoading: salesLoading, loadSales } = useSalesStore();
  const { usdToDop } = useExchangeRateStore();

  useEffect(() => {
    loadShipments();
    loadSales();
  }, []);

  // Load allocation data for all shipments
  useEffect(() => {
    const loadAllocations = async () => {
      if (shipments.length === 0) return;

      setAllocationsLoading(true);
      const allocationsMap = new Map();

      for (const shipment of shipments) {
        const allocations = await getShipmentSalesAllocations(shipment.id);
        allocationsMap.set(shipment.id, allocations);
      }

      setShipmentsAllocations(allocationsMap);
      setAllocationsLoading(false);
    };

    loadAllocations();
  }, [shipments, getShipmentSalesAllocations]);

  // Log exchange rate for debugging
  useEffect(() => {
    console.log('Exchange rate (USD to DOP):', usdToDop);
  }, [usdToDop]);

  // Format currency in pesos with thousand separators
  const formatPesos = (amount: number) => {
    return `$${Math.round(amount).toLocaleString('en-US')}`;
  };

  // Filter sales by time period
  const filteredSales = useMemo(() => {
    const now = new Date();

    if (timePeriod === 'all') return sales;

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
        return sales;
    }

    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return isWithinInterval(saleDate, { start, end });
    });
  }, [timePeriod, sales]);

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
    // Convert each sale's cost using its own exchange rate for accuracy
    const totalCostDOP = filteredSales.reduce((sum, sale) => {
      const saleExchangeRate = sale.exchangeRateUsed || usdToDop; // Fallback to current if not set
      return sum + (sale.totalCost * saleExchangeRate);
    }, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const totalOwed = totalRevenue - totalPaid;

    return {
      salesCount: filteredSales.length,
      totalRevenue,
      totalCost: totalCostDOP,  // Now in DOP
      totalProfit,
      totalPaid,
      totalOwed,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
    };
  }, [filteredSales, usdToDop]);

  // Calculate payment status breakdown
  const paymentStatusData = useMemo(() => {
    const paid = filteredSales.filter(s => s.paymentStatus === 'paid').length;
    const partial = filteredSales.filter(s => s.paymentStatus === 'partial').length;
    const pending = filteredSales.filter(s => s.paymentStatus === 'pending').length;

    return [
      { name: t('sales.paid'), count: paid, color: '#34C759', legendFontColor: '#666', legendFontSize: 12 },
      { name: t('sales.partial'), count: partial, color: '#FF9500', legendFontColor: '#666', legendFontSize: 12 },
      { name: t('sales.pending'), count: pending, color: '#FF3B30', legendFontColor: '#666', legendFontSize: 12 },
    ].filter(item => item.count > 0); // Only show statuses that exist
  }, [filteredSales, t]);

  // Calculate top selling products
  const topProductsData = useMemo(() => {
    // Aggregate products by brand + name + size
    const productMap = new Map<string, { brand: string; name: string; size: string; revenue: number; quantity: number }>();

    filteredSales.forEach(sale => {
      sale.products.forEach(product => {
        const key = `${product.brand}-${product.name}-${product.size}`;
        const existing = productMap.get(key);

        if (existing) {
          existing.revenue += product.quantity * product.soldPrice;
          existing.quantity += product.quantity;
        } else {
          productMap.set(key, {
            brand: product.brand,
            name: product.name,
            size: product.size || '',
            revenue: product.quantity * product.soldPrice,
            quantity: product.quantity,
          });
        }
      });
    });

    // Convert to array and sort by revenue
    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 products
  }, [filteredSales]);

  // Calculate shipment metrics using allocation data (100% accurate)
  const shipmentMetrics = useMemo(() => {
    return shipments.map(shipment => {
      const totalCostUSD = shipment.total_cost || 0;
      // Use the exchange rate from when shipment was created, not current rate
      const exchangeRate = shipment.exchange_rate_used || usdToDop; // Fallback to current if not set
      const totalCostDOP = totalCostUSD * exchangeRate;

      // Calculate total units and sold units
      const totalUnits = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
      const remainingUnits = shipment.items.reduce((sum, item) => sum + item.remaining_inventory, 0);
      const soldUnits = totalUnits - remainingUnits;

      // Get allocation data for this shipment
      const allocations = shipmentsAllocations.get(shipment.id) || [];

      // Group allocations by sale_id to calculate per-sale metrics
      const salesMap = new Map<string, {
        saleId: string;
        totalAmount: number;
        amountPaid: number;
        currency: string;
        exchangeRate: number;
        revenue: number;
        cost: number;
      }>();

      allocations.forEach((alloc: any) => {
        if (!salesMap.has(alloc.sale_id)) {
          salesMap.set(alloc.sale_id, {
            saleId: alloc.sale_id,
            totalAmount: alloc.sale_total_amount,
            amountPaid: alloc.sale_amount_paid,
            currency: alloc.sale_currency,
            exchangeRate: alloc.sale_exchange_rate,
            revenue: 0,
            cost: 0,
          });
        }

        const sale = salesMap.get(alloc.sale_id)!;
        // Revenue from this allocation (quantity * unit price)
        sale.revenue += alloc.allocation_quantity * alloc.sale_item_unit_price;
        // Cost from this allocation (quantity * unit cost in USD)
        sale.cost += alloc.allocation_quantity * alloc.allocation_unit_cost;
      });

      // Calculate totals from allocations
      let totalRevenue = 0;
      let totalCost = 0;
      let totalPaid = 0;

      for (const [saleId, sale] of salesMap) {
        // Revenue is already in the sale's currency (DOP)
        totalRevenue += sale.revenue;

        // Cost is in USD, convert to DOP if sale is in DOP
        const costInDOP = sale.currency === 'DOP' ? sale.cost * sale.exchangeRate : sale.cost;
        totalCost += costInDOP;

        // Calculate proportion of payment that belongs to this shipment
        const proportion = sale.totalAmount > 0 ? sale.revenue / sale.totalAmount : 0;
        totalPaid += sale.amountPaid * proportion;
      }

      const totalProfit = totalRevenue - totalCost;
      const totalOwed = totalRevenue - totalPaid;

      return {
        id: shipment.id,
        name: shipment.shipment_number,
        totalCost: totalCostDOP,
        status: shipment.status,
        createdDate: shipment.created_at,
        soldUnits: soldUnits,
        remainingUnits: remainingUnits,
        totalUnits: totalUnits,
        totalRevenue: totalRevenue,        // 100% accurate from allocations
        totalProfit: totalProfit,          // 100% accurate from allocations
        totalPaid: totalPaid,              // Proportional based on allocation revenue
        totalOwed: totalOwed,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        investmentRecovery: totalCostDOP > 0 ? (totalPaid / totalCostDOP) * 100 : 0,
      };
    });
  }, [shipments, shipmentsAllocations, usdToDop]);

  const generateIndividualPDF = async (shipmentId: string) => {
    try {
      const shipment = shipmentMetrics.find(s => s.id === shipmentId);
      if (!shipment) return;

      const pdfFilename = `${shipment.name.replace(/[^a-z0-9]/gi, '_')}_Report`;

      const htmlContent = `
        <html>
          <head>
            <title>${pdfFilename}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1a5490; margin-bottom: 10px; }
              .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .metric-label { font-weight: bold; color: #666; }
              .metric-value { color: #333; font-size: 16px; }
              .profit { color: #34C759; }
              .owed { color: #FF3B30; }
              .date { color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>${t('reports.exportShipmentReport')}: ${shipment.name}</h1>
            <p class="date">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
            <p class="date">${t('reports.createdOn', { date: format(new Date(shipment.createdDate), 'MMMM dd, yyyy') })}</p>

            <div class="metric-row">
              <span class="metric-label">${t('reports.initialInvestment')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalCost)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.salesMade')}:</span>
              <span class="metric-value">${t('reports.unitsSold', { sold: shipment.soldUnits, remaining: shipment.totalUnits })}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.revenueGenerated')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalRevenue)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.profitEarned')}:</span>
              <span class="metric-value profit">${formatPesos(shipment.totalProfit)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.amountCollected')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalPaid)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.amountOwed')}:</span>
              <span class="metric-value owed">${formatPesos(shipment.totalOwed)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.investmentRecovery')}:</span>
              <span class="metric-value">${shipment.investmentRecovery.toFixed(1)}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.profitMargin')}:</span>
              <span class="metric-value">${shipment.profitMargin.toFixed(1)}%</span>
            </div>
          </body>
        </html>
      `;

      // Print/Save PDF with custom filename
      await Print.printAsync({
        html: htmlContent,
      });

      Alert.alert(t('common.success'), t('reports.exportShipmentReport') + ' exported successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(t('common.error'), 'Failed to generate PDF report');
    }
  };

  const generatePDF = async () => {
    try {
      const periodLabel = timePeriod === 'all' ? t('reports.all') :
                         timePeriod === 'weekly' ? t('reports.weekly') :
                         timePeriod === 'monthly' ? t('reports.monthly') : t('reports.yearly');

      let htmlContent = '';

      if (activeTab === 'overview') {
        htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1a5490; margin-bottom: 10px; }
                h2 { color: #333; margin-top: 20px; border-bottom: 2px solid #1a5490; padding-bottom: 5px; }
                .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .metric-label { font-weight: bold; color: #666; }
                .metric-value { color: #333; font-size: 18px; }
                .profit { color: #34C759; }
                .owed { color: #FF3B30; }
                .date { color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <h1>${t('reports.title')} - ${periodLabel}</h1>
              <p class="date">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>

              <h2>${t('reports.overview')}</h2>
              <div class="metric-row">
                <span class="metric-label">${t('dashboard.totalSales')}:</span>
                <span class="metric-value">${overviewMetrics.salesCount}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('reports.totalRevenue')}:</span>
                <span class="metric-value">$${overviewMetrics.totalRevenue.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('sales.totalCost')}:</span>
                <span class="metric-value">$${overviewMetrics.totalCost.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('reports.totalProfit')}:</span>
                <span class="metric-value profit">$${overviewMetrics.totalProfit.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('dashboard.profitMargin')}:</span>
                <span class="metric-value profit">${overviewMetrics.profitMargin.toFixed(1)}%</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('reports.collected')}:</span>
                <span class="metric-value">$${overviewMetrics.totalPaid.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">${t('reports.amountOwed')}:</span>
                <span class="metric-value owed">$${overviewMetrics.totalOwed.toFixed(2)}</span>
              </div>
            </body>
          </html>
        `;
      } else {
        // Shipment report
        const shipmentRows = shipmentMetrics.map(shipment => `
          <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
            <h3 style="color: #1a5490; margin-top: 0;">${shipment.name}</h3>
            <div class="metric-row">
              <span class="metric-label">${t('reports.initialInvestment')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalCost)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.salesMade')}:</span>
              <span class="metric-value">${t('reports.unitsSold', { sold: shipment.soldUnits, remaining: shipment.totalUnits })}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.totalRevenue')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalRevenue)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.totalProfit')}:</span>
              <span class="metric-value profit">${formatPesos(shipment.totalProfit)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.amountCollected')}:</span>
              <span class="metric-value">${formatPesos(shipment.totalPaid)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.amountOwed')}:</span>
              <span class="metric-value owed">${formatPesos(shipment.totalOwed)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${t('reports.investmentRecovery')}:</span>
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
                h1 { color: #1a5490; margin-bottom: 10px; }
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
              <h1>${t('reports.shipmentPerformance')}</h1>
              <p class="date">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>

              ${shipmentRows}
            </body>
          </html>
        `;
      }

      await Print.printAsync({
        html: htmlContent,
      });

      Alert.alert(t('common.success'), 'Report exported to PDF successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(t('common.error'), 'Failed to generate PDF report');
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Time Period Filter */}
      <View style={styles.filterContainer}>
        {[
          { label: t('reports.weekly'), value: 'weekly' as TimePeriod },
          { label: t('reports.monthly'), value: 'monthly' as TimePeriod },
          { label: t('reports.yearly'), value: 'yearly' as TimePeriod },
          { label: t('reports.all'), value: 'all' as TimePeriod },
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
            <Text style={styles.metricLabel}>{t('reports.totalRevenue')}</Text>
            <Text style={[styles.metricValue, styles.revenueValue]}>
              {formatPesos(overviewMetrics.totalRevenue)}
            </Text>
            <Text style={styles.metricSubtext}>
              {t('reports.salesCount', { count: overviewMetrics.salesCount })}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.profitCard]}>
            <Text style={styles.metricLabel}>{t('reports.totalProfit')}</Text>
            <Text style={[styles.metricValue, styles.profitValue]}>
              {formatPesos(overviewMetrics.totalProfit)}
            </Text>
            <Text style={styles.metricSubtext}>
              {t('reports.profitMargin')}
            </Text>
          </View>
        </View>

        {/* Second Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.collectedCard]}>
            <Text style={styles.metricLabel}>{t('reports.collected')}</Text>
            <Text style={[styles.metricValue, styles.collectedValue]}>
              {formatPesos(overviewMetrics.totalPaid)}
            </Text>
            <Text style={styles.metricSubtext}>
              {t('reports.collectionRate')}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.owedCard]}>
            <Text style={styles.metricLabel}>{t('reports.amountOwed')}</Text>
            <Text style={[styles.metricValue, styles.owedValue]}>
              {formatPesos(overviewMetrics.totalOwed)}
            </Text>
            <Text style={styles.metricSubtext}>{t('reports.outstanding')}</Text>
          </View>
        </View>
      </View>

      {/* Charts Section */}
      {filteredSales.length > 0 && (
        <>
          {/* Payment Status Chart */}
          {paymentStatusData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reports.paymentStatus')}</Text>
              <View style={styles.card}>
                <PieChart
                  data={paymentStatusData.map(item => ({
                    name: `${item.name} (${item.count})`,
                    population: item.count,
                    color: item.color,
                    legendFontColor: item.legendFontColor,
                    legendFontSize: item.legendFontSize,
                  }))}
                  width={Dimensions.get('window').width - 48}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            </View>
          )}

          {/* Top Products List */}
          {topProductsData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reports.topSellingProducts')}</Text>
              <View style={styles.card}>
                <View style={styles.productsList}>
                  {topProductsData.map((product, index) => (
                    <View key={index} style={styles.productItem}>
                      <View style={styles.productRank}>
                        <Text style={styles.productRankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.brand} - {product.name}</Text>
                        <Text style={styles.productSize}>{product.size} • {product.quantity} units sold</Text>
                      </View>
                      <Text style={styles.productRevenue}>{formatPesos(product.revenue)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
            <View style={styles.card}>
              <View style={styles.quickStatRow}>
                <Text style={styles.quickStatLabel}>{t('reports.avgSaleValue')}:</Text>
                <Text style={styles.quickStatValue}>
                  {overviewMetrics.salesCount > 0
                    ? formatPesos(overviewMetrics.totalRevenue / overviewMetrics.salesCount)
                    : '$0'}
                </Text>
              </View>
              <View style={styles.quickStatRow}>
                <Text style={styles.quickStatLabel}>{t('reports.collectionRateLabel')}:</Text>
                <Text style={styles.quickStatValue}>{overviewMetrics.collectionRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.quickStatRow}>
                <Text style={styles.quickStatLabel}>{t('reports.avgProfitPerSale')}:</Text>
                <Text style={styles.quickStatValue}>
                  {overviewMetrics.salesCount > 0
                    ? formatPesos(overviewMetrics.totalProfit / overviewMetrics.salesCount)
                    : '$0'}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderShipments = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('reports.shipmentPerformance')}</Text>
      <Text style={styles.sectionSubtitle}>
        {t('reports.allAmountsInPesos')}
      </Text>

      {shipmentMetrics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('reports.noShipments')}</Text>
          <Text style={styles.emptySubtext}>{t('reports.createFirstShipment')}</Text>
        </View>
      ) : (
        <>
          {shipmentMetrics.map(shipment => (
            <View key={shipment.id} style={styles.shipmentCard}>
              <View style={styles.shipmentHeader}>
                <View>
                  <Text style={styles.shipmentName}>{shipment.name}</Text>
                  <Text style={styles.shipmentDate}>
                    {t('reports.createdOn', { date: format(new Date(shipment.createdDate), 'MMM dd, yyyy') })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exportIcon}
                  onPress={() => generateIndividualPDF(shipment.id)}
                >
                  <Text style={styles.exportIconText}>📄</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.shipmentMetrics}>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.initialInvestment')}:</Text>
                  <Text style={styles.shipmentMetricValue}>{formatPesos(shipment.totalCost)}</Text>
                </View>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.salesMade')}:</Text>
                  <Text style={styles.shipmentMetricValue}>
                    {t('reports.unitsSold', { sold: shipment.soldUnits, remaining: shipment.totalUnits })}
                  </Text>
                </View>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.revenueGenerated')}:</Text>
                  <Text style={[styles.shipmentMetricValue, styles.revenueValue]}>
                    {formatPesos(shipment.totalRevenue)}
                  </Text>
                </View>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.profitEarned')}:</Text>
                  <Text style={[styles.shipmentMetricValue, styles.profitValue]}>
                    {formatPesos(shipment.totalProfit)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.amountCollected')}:</Text>
                  <Text style={[styles.shipmentMetricValue, styles.collectedValue]}>
                    {formatPesos(shipment.totalPaid)}
                  </Text>
                </View>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.amountOwed')}:</Text>
                  <Text style={[styles.shipmentMetricValue, styles.owedValue]}>
                    {formatPesos(shipment.totalOwed)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.investmentRecovery')}:</Text>
                  <Text style={styles.shipmentMetricValue}>
                    {shipment.investmentRecovery.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.shipmentMetricRow}>
                  <Text style={styles.shipmentMetricLabel}>{t('reports.profitMargin')}:</Text>
                  <Text style={styles.shipmentMetricValue}>
                    {shipment.profitMargin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Export All Button at bottom */}
          <TouchableOpacity style={styles.exportAllButton} onPress={generatePDF}>
            <Text style={styles.exportAllButtonText}>📄 {t('reports.exportAllShipments')}</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  // Show loading state
  const isLoading = shipmentsLoading || salesLoading || allocationsLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1a5490" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            {t('reports.overview')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shipments' && styles.tabActive]}
          onPress={() => setActiveTab('shipments')}
        >
          <Text style={[styles.tabText, activeTab === 'shipments' && styles.tabTextActive]}>
            {t('reports.shipments')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'overview' ? renderOverview() : renderShipments()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5490',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a5490',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1a5490',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#1a5490',
    borderColor: '#e0cf80',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  tabTextActive: {
    color: '#e0cf80',
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
    backgroundColor: '#e0cf80',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#1a5490',
    borderColor: '#e0cf80',
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
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
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
    color: '#e0cf80',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#e0cf80',
    fontWeight: 'bold',
    marginBottom: 12,
    backgroundColor: '#1a5490',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#e0cf80',
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
    borderTopColor: '#1a5490',
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
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
    marginBottom: 4,
  },
  shipmentDate: {
    fontSize: 13,
    color: '#1a5490',
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
    color: '#1a5490',
  },
  shipmentMetricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  exportIcon: {
    padding: 8,
    backgroundColor: '#1a5490',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  exportIconText: {
    fontSize: 20,
  },
  exportAllButton: {
    backgroundColor: '#1a5490',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 60,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  productsList: {
    marginTop: 0,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a5490',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 2,
  },
  productSize: {
    fontSize: 12,
    color: '#1a5490',
  },
  productRevenue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickStatLabel: {
    fontSize: 14,
    color: '#1a5490',
    fontWeight: '500',
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5490',
  },
});
