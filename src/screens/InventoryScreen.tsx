import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { generateDummyShipments, Product, Shipment } from '../services/dummyData';
import CreateShipmentModal from '../components/CreateShipmentModal';

interface ProductWithShipment extends Product {
  shipmentId: string;
  shipmentNumber: string;
  shipmentStatus: string;
}

interface ShipmentSection {
  title: string;
  data: ProductWithShipment[];
  shipment: Shipment;
}

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const shipments = useMemo(() => generateDummyShipments(), []);

  const sections: ShipmentSection[] = useMemo(() => {
    let filteredShipments = shipments;

    if (selectedStatus !== 'all') {
      filteredShipments = filteredShipments.filter(s => s.status === selectedStatus);
    }

    return filteredShipments.map(shipment => {
      let products = shipment.products.map(p => ({
        ...p,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        shipmentStatus: shipment.status,
      }));

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        products = products.filter(p =>
          p.brand.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.fullName.toLowerCase().includes(query)
        );
      }

      return {
        title: shipment.shipmentNumber,
        data: products,
        shipment,
      };
    }).filter(section => section.data.length > 0);
  }, [shipments, searchQuery, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#FFA500';
      case 'shipped': return '#007AFF';
      case 'delivered': return '#34C759';
      case 'settled': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStockColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return '#FF3B30';
    if (percentage < 30) return '#FF9500';
    return '#34C759';
  };

  const renderSectionHeader = ({ section }: { section: ShipmentSection }) => {
    const statusColor = getStatusColor(section.shipment.status);
    
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderTop}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{section.shipment.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.sectionStats}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Products:</Text>
            <Text style={styles.statPillValue}>{section.data.length}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Total Units:</Text>
            <Text style={styles.statPillValue}>{section.shipment.totalUnits}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Remaining:</Text>
            <Text style={[styles.statPillValue, { color: '#34C759' }]}>
              {section.shipment.remainingUnits}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProduct = ({ item, index }: { item: ProductWithShipment; index: number }) => {
    const stockPercentage = (item.remaining / item.quantity) * 100;
    const stockColor = getStockColor(item.remaining, item.quantity);

    return (
      <View style={[styles.productCard, index % 2 === 0 ? styles.productCardLeft : styles.productCardRight]}>
        <View style={styles.productHeader}>
          <View style={styles.productBrandRow}>
            <Text style={styles.brandName}>{item.brand}</Text>
            <Text style={styles.sizeBadge}>{item.size}</Text>
          </View>
        </View>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={styles.statValue}>${item.unitCost}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Sold</Text>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>{item.sold}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Left</Text>
            <Text style={[styles.statValue, { color: '#34C759' }]}>{item.remaining}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{item.quantity}</Text>
          </View>
        </View>
        <View style={styles.stockContainer}>
          <View style={styles.stockBar}>
            <View 
              style={[
                styles.stockFill, 
                { 
                  width: `${stockPercentage}%`,
                  backgroundColor: stockColor 
                }
              ]} 
            />
          </View>
          <Text style={[styles.stockText, { color: stockColor }]}>
            {stockPercentage.toFixed(0)}% in stock
          </Text>
        </View>
      </View>
    );
  };

  const renderSectionFooter = () => <View style={styles.sectionSpacer} />;

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
  ];

  const totalProducts = sections.reduce((sum, section) => sum + section.data.length, 0);

  const handleCreateShipment = (shipmentData: any) => {
    console.log('Creating shipment:', shipmentData);
    setIsCreateModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by brand or product name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              selectedStatus === filter.value && styles.filterChipActive
            ]}
            onPress={() => setSelectedStatus(filter.value)}
          >
            <Text style={[
              styles.filterChipText,
              selectedStatus === filter.value && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* THIS IS THE BUTTON - Making it SUPER visible */}
      <View style={styles.resultsBar}>
        <View>
          <Text style={styles.resultsText}>
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.resultsText}>
            {sections.length} shipment{sections.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => {
            console.log('Button clicked!');
            setIsCreateModalVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ NEW SHIPMENT</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderProduct}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'No products match your filters'}
            </Text>
          </View>
        }
      />

      <CreateShipmentModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filtersContent: {
    padding: 15,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    minHeight: 60,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  sectionHeader: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statPillLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionSpacer: {
    height: 20,
  },
  productCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardLeft: {
    marginLeft: 10,
    marginRight: 5,
  },
  productCardRight: {
    marginLeft: 5,
    marginRight: 10,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  sizeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    minHeight: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  stockContainer: {
    marginTop: 8,
  },
  stockBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stockFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    flex: 1,
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
  },
});
