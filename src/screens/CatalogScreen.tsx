import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import { useProductsStore, SupabaseProduct } from '../store/productsStore';

export default function CatalogScreen() {
  const {
    products,
    isLoading,
    loadProducts,
    addProducts,
    updateProduct,
    deleteProduct,
    getBrands,
  } = useProductsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SupabaseProduct | null>(null);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Filter products
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      product.brand.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query) ||
      product.size.toLowerCase().includes(query)
    );
  });

  // Group by brand
  const productsByBrand = filteredProducts.reduce((acc, product) => {
    if (!acc[product.brand]) {
      acc[product.brand] = [];
    }
    acc[product.brand].push(product);
    return acc;
  }, {} as Record<string, SupabaseProduct[]>);

  const brands = Object.keys(productsByBrand).sort();

  const handleProductPress = (product: SupabaseProduct) => {
    setSelectedProduct(product);
    setIsEditModalVisible(true);
  };

  const renderProduct = (product: SupabaseProduct) => {
    const isCompact = windowWidth < 380;

    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.productRow, isCompact && styles.productRowCompact]}
        onPress={() => handleProductPress(product)}
        activeOpacity={0.7}
      >
        <View style={[styles.productImageContainer, isCompact && styles.productImageCompact]}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.productSize}>{product.size}</Text>
          </View>
          <Text style={styles.productBrand}>{product.brand}</Text>
        </View>
        <View style={styles.productCost}>
          <Text style={styles.costLabel}>Cost</Text>
          <Text style={styles.costValue}>${product.cost}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBrandSection = (brand: string) => {
    const isCompact = windowWidth < 380;
    return (
      <View key={brand} style={styles.brandSection}>
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, isCompact && styles.brandTitleCompact]}>{brand}</Text>
          <Text style={styles.brandCount}>
            {productsByBrand[brand].length}
          </Text>
        </View>
        {productsByBrand[brand].map(renderProduct)}
      </View>
    );
  };

  const handleAddProduct = async (newProductsList: { brand: string; name: string; size: string; cost: number; image?: string }[]) => {
    await addProducts(newProductsList);
    setIsAddModalVisible(false);
  };

  const handleEditProduct = async (updatedProduct: { id: string; brand: string; name: string; size: string; cost: number; image?: string }) => {
    const { id, ...productData } = updatedProduct;
    await updateProduct(id, productData);
    setIsEditModalVisible(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setIsEditModalVisible(false);
    setSelectedProduct(null);
  };

  const existingBrands = getBrands();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact header with search, stats and add button */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
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
        </View>
        
        <View style={styles.actionRow}>
          <Text style={styles.statsText}>
            {filteredProducts.length} products • {brands.length} brands
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AddProductModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddProduct}
        existingBrands={existingBrands}
      />

      <EditProductModal
        visible={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleEditProduct}
        onDelete={handleDeleteProduct}
        product={selectedProduct}
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchRow: {
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  clearButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  brandSection: {
    marginBottom: 20,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
  },
  brandTitleCompact: {
    fontSize: 16,
  },
  brandCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    textAlign: 'center',
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
  productRowCompact: {
    padding: 10,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImageCompact: {
    marginRight: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 28,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  productSize: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  productCost: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  costLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  costValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
