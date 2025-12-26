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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import { useProductsStore, SupabaseProduct } from '../store/productsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';

export default function CatalogScreen() {
  const { t } = useTranslation();
  const {
    products,
    isLoading,
    loadProducts,
    addProducts,
    updateProduct,
    deleteProduct,
    getBrands,
  } = useProductsStore();

  const { usdToDop } = useExchangeRateStore();

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
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSize}>{product.size}</Text>
          </View>
          <Text style={styles.productBrand}>{product.brand}</Text>
        </View>
        <View style={styles.productPrices}>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>{t('catalog.cost')}</Text>
            <Text style={styles.priceValue}>
              ${product.cost} (${(product.cost * usdToDop).toFixed(0)})
            </Text>
          </View>
          <View style={[styles.priceBox, styles.saleBox]}>
            <Text style={[styles.priceLabel, styles.saleLabel]}>{t('catalog.sale')}</Text>
            <Text style={[styles.priceValue, styles.saleValue]}>
              ${(product.sale_price || (product.cost * 2 * usdToDop)).toFixed(0)}
            </Text>
          </View>
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

  const handleAddProduct = async (newProductsList: { brand: string; name: string; size: string; cost: number; sale_price?: number; image?: string }[]) => {
    await addProducts(newProductsList);
    setIsAddModalVisible(false);
  };

  const handleEditProduct = async (updatedProduct: { id: string; brand: string; name: string; size: string; cost: number; sale_price?: number; image?: string }) => {
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
        <ActivityIndicator size="large" color="#e0cf80" />
        <Text style={styles.loadingText}>{t('catalog.loadingProducts')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact header with search, stats and add button */}
      <LinearGradient
        colors={['#1a5490', '#1a5490']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('catalog.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="rgba(255,255,255,0.7)"
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
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {filteredProducts.length} {t('catalog.products')}
            </Text>
            <Text style={styles.statsDot}>•</Text>
            <Text style={styles.statsText}>
              {brands.length} {t('catalog.brands')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ {t('catalog.add')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
            <Text style={styles.emptyText}>{t('catalog.noProducts')}</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? t('catalog.tryDifferentSearch') : t('catalog.addFirstProduct')}
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
    backgroundColor: '#1a5490',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  searchRow: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 16,
    color: '#e0cf80',
    fontWeight: 'bold',
  },
  statsDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  addButton: {
    backgroundColor: '#e0cf80',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#002f6b',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  brandSection: {
    marginBottom: 24,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: '#00ffff',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e0cf80',
    flex: 1,
    letterSpacing: 0.5,
  },
  brandTitleCompact: {
    fontSize: 24,
  },
  brandCount: {
    fontSize: 14,
    color: '#002f6b',
    fontWeight: 'bold',
    backgroundColor: '#e0cf80',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 34,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e0cf80',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0cf80',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#00ffff',
  },
  productRowCompact: {
    padding: 12,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImageCompact: {
    marginRight: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 47, 107, 0.2)',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 47, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 47, 107, 0.2)',
  },
  placeholderText: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5490',
    flexShrink: 1,
  },
  productSize: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#002f6b',
    backgroundColor: 'rgba(0, 47, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#002f6b',
  },
  productBrand: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#002f6b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productPrices: {
    alignItems: 'flex-end',
    marginLeft: 12,
    gap: 6,
  },
  priceBox: {
    backgroundColor: 'rgba(0, 47, 107, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#002f6b',
    minWidth: 80,
    alignItems: 'center',
  },
  saleBox: {
    backgroundColor: 'rgba(0, 47, 107, 0.15)',
    borderColor: '#002f6b',
  },
  priceLabel: {
    fontSize: 9,
    color: '#002f6b',
    marginBottom: 2,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  saleLabel: {
    color: '#002f6b',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#002f6b',
  },
  saleValue: {
    color: '#002f6b',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0cf80',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#99b3cc',
    textAlign: 'center',
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
    color: '#e0cf80',
  },
});
