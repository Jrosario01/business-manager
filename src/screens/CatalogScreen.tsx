import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import AddProductModal from '../components/AddProductModal';

interface CatalogProduct {
  id: string;
  brand: string;
  name: string;
  cost: number;
  image?: string;
}

// Initial Arabic perfume brands data
const initialProducts: CatalogProduct[] = [
  { id: '1', brand: 'Lattafa', name: 'Asad', cost: 25 },
  { id: '2', brand: 'Lattafa', name: 'Bade Al Oud', cost: 30 },
  { id: '3', brand: 'Lattafa', name: 'Fakhar', cost: 22 },
  { id: '4', brand: 'Armaf', name: 'Club De Nuit Intense', cost: 35 },
  { id: '5', brand: 'Armaf', name: 'Tres Nuit', cost: 28 },
  { id: '6', brand: 'Rasasi', name: 'Hawas', cost: 32 },
  { id: '7', brand: 'Rasasi', name: 'Fattan', cost: 27 },
  { id: '8', brand: 'Al Haramain', name: 'L\'Aventure', cost: 30 },
  { id: '9', brand: 'Al Haramain', name: 'Amber Oud', cost: 35 },
  { id: '10', brand: 'Afnan', name: 'Supremacy Silver', cost: 29 },
  { id: '11', brand: 'Afnan', name: '9PM', cost: 26 },
];

export default function CatalogScreen() {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Filter products
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      product.brand.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query)
    );
  });

  // Group by brand
  const productsByBrand = filteredProducts.reduce((acc, product) => {
    if (!acc[product.brand]) {
      acc[product.brand] = [];
    }
    acc[product.brand].push(product);
    return acc;
  }, {} as Record<string, CatalogProduct[]>);

  const brands = Object.keys(productsByBrand).sort();

  const renderProduct = (product: CatalogProduct) => (
    <View key={product.id} style={styles.productRow}>
      <View style={styles.productImageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
  <Text style={styles.productName}>{product.name} by {product.brand}</Text>
</View>
      <View style={styles.productCost}>
        <Text style={styles.costLabel}>Unit Cost</Text>
        <Text style={styles.costValue}>${product.cost}</Text>
      </View>
    </View>
  );

  const renderBrandSection = (brand: string) => (
    <View key={brand} style={styles.brandSection}>
      <View style={styles.brandHeader}>
        <Text style={styles.brandTitle}>{brand}</Text>
        <Text style={styles.brandCount}>
          {productsByBrand[brand].length} product{productsByBrand[brand].length !== 1 ? 's' : ''}
        </Text>
      </View>
      {productsByBrand[brand].map(renderProduct)}
    </View>
  );

  const handleAddProduct = (product: { brand: string; name: string; cost: number; image?: string }) => {
  const newProduct = {
    id: Date.now().toString(),
    ...product,
  };
  setProducts([...products, newProduct]);
  setIsAddModalVisible(false);
};

const existingBrands = [...new Set(products.map(p => p.brand))];

  return (
    <View style={styles.container}>
      {/* Header with Search and Add Button */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by brand or product..."
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
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} • {brands.length} brand{brands.length !== 1 ? 's' : ''}
        </Text>
      </View>

     <AddProductModal
  visible={isAddModalVisible}
  onClose={() => setIsAddModalVisible(false)}
  onSubmit={handleAddProduct}
  existingBrands={existingBrands}
/>

      {/* Product List */}
      <FlatList
        data={brands}
        renderItem={({ item }) => renderBrandSection(item)}
        keyExtractor={item => item}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            </Text>
          </View>
        }
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsBar: {
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
  },
  brandSection: {
    marginBottom: 24,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  brandCount: {
    fontSize: 14,
    color: '#666',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 30,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productCost: {
    alignItems: 'flex-end',
  },
  costLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
