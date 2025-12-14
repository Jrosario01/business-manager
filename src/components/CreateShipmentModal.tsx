import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useProductsStore, Product as CatalogProduct } from '../store/productsStore';
import AddProductModal from './AddProductModal';

interface ShipmentProduct {
  brand: string;
  name: string;
  size: string;
  unitCost: string;
  quantity: string;
  catalogProductId?: string; // Link to catalog product if selected
}

interface CreateShipmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function CreateShipmentModal({ visible, onClose, onSubmit }: CreateShipmentModalProps) {
  const { products: catalogProducts, searchProducts, addProducts } = useProductsStore();

  const [products, setProducts] = useState<ShipmentProduct[]>([
    { brand: '', name: '', size: '100ml', unitCost: '', quantity: '', catalogProductId: undefined }
  ]);
  const [totalShippingCost, setTotalShippingCost] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});
  const [showSuggestions, setShowSuggestions] = useState<number>(-1);
  const [isAddProductModalVisible, setIsAddProductModalVisible] = useState(false);
  const [pendingProductIndex, setPendingProductIndex] = useState<number | null>(null);

  // Calculate shipping per unit in real-time
  const calculateShippingPerUnit = () => {
    const shipping = parseFloat(totalShippingCost) || 0;
    const totalUnits = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    return totalUnits > 0 ? shipping / totalUnits : 0;
  };

  const shippingPerUnit = useMemo(() => calculateShippingPerUnit(), [totalShippingCost, products]);

  // Get product suggestions based on search
  const getProductSuggestions = (index: number): CatalogProduct[] => {
    const query = searchQuery[index] || '';
    console.log('getProductSuggestions - Query:', query);
    if (!query || query.length < 2) return [];

    const results = searchProducts(query);
    console.log('getProductSuggestions - Results:', results.length, 'products');
    return results.slice(0, 10); // Limit to 10 results
  };

  const addProduct = () => {
    setProducts([...products, {
      brand: '',
      name: '',
      size: '100ml',
      unitCost: '',
      quantity: '',
      catalogProductId: undefined
    }]);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) {
      Alert.alert('Error', 'You must have at least one product');
      return;
    }
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);

    // Clean up search query
    const newSearchQuery = { ...searchQuery };
    delete newSearchQuery[index];
    setSearchQuery(newSearchQuery);
  };

  const updateProduct = (index: number, field: keyof ShipmentProduct, value: string) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const handleSearchChange = (index: number, text: string) => {
    const newSearchQuery = { ...searchQuery, [index]: text };
    setSearchQuery(newSearchQuery);
    setShowSuggestions(text.length >= 2 ? index : -1);
  };

  const selectProduct = (index: number, catalogProduct: CatalogProduct) => {
    console.log('==== selectProduct CALLED ====');
    console.log('Index:', index);
    console.log('Product:', catalogProduct);
    console.log('Current products state:', products);

    const newProducts = [...products];
    const updatedProduct = {
      brand: catalogProduct.brand,
      name: catalogProduct.name,
      size: catalogProduct.size,
      unitCost: catalogProduct.cost.toString(),
      quantity: newProducts[index].quantity, // Preserve quantity if already entered
      catalogProductId: catalogProduct.id,
    };

    console.log('Updated product:', updatedProduct);
    newProducts[index] = updatedProduct;

    console.log('New products array:', newProducts);
    setProducts(newProducts);

    // Clear search query when product is selected
    const newSearchQuery = { ...searchQuery };
    delete newSearchQuery[index];
    setSearchQuery(newSearchQuery);

    setShowSuggestions(-1);
    console.log('==== selectProduct DONE ====');
  };

  const clearProductSelection = (index: number) => {
    const newProducts = [...products];
    newProducts[index] = {
      brand: '',
      name: '',
      size: '100ml',
      unitCost: '',
      quantity: newProducts[index].quantity, // Preserve quantity
      catalogProductId: undefined,
    };
    setProducts(newProducts);

    // Clear search query to show search field again
    const newSearchQuery = { ...searchQuery };
    delete newSearchQuery[index];
    setSearchQuery(newSearchQuery);
  };

  const handleAddNewProduct = (index: number) => {
    setPendingProductIndex(index);
    setIsAddProductModalVisible(true);
    setShowSuggestions(-1);
  };

  const handleProductAdded = async (newProducts: { brand: string; name: string; size: string; cost: number; image?: string }[]) => {
    await addProducts(newProducts);

    // If this was triggered from a specific product row, auto-select the first added product
    if (pendingProductIndex !== null && newProducts.length > 0) {
      const newProduct = newProducts[0];
      const updatedProducts = [...products];
      updatedProducts[pendingProductIndex] = {
        ...updatedProducts[pendingProductIndex],
        brand: newProduct.brand,
        name: newProduct.name,
        size: newProduct.size,
        unitCost: newProduct.cost.toString(),
      };
      setProducts(updatedProducts);
      setSearchQuery({ ...searchQuery, [pendingProductIndex]: `${newProduct.brand} ${newProduct.name} ${newProduct.size}` });
    }

    setPendingProductIndex(null);
    setIsAddProductModalVisible(false);
  };

  const calculateProductsCost = () => {
    return products.reduce((sum, product) => {
      const cost = parseFloat(product.unitCost) || 0;
      const quantity = parseInt(product.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);
  };

  const calculateTotalCost = () => {
    const shipping = parseFloat(totalShippingCost) || 0;
    return calculateProductsCost() + shipping;
  };

  const handleSubmit = () => {
    // Check if all products are selected from catalog
    const hasInvalidProducts = products.some(p => !p.catalogProductId);
    if (hasInvalidProducts) {
      Alert.alert('Error', 'Please select products from the catalog. Use the search to find products or add new ones.');
      return;
    }

    const hasEmptyFields = products.some(p => !p.quantity || parseInt(p.quantity) <= 0);
    if (hasEmptyFields) {
      Alert.alert('Error', 'Please enter quantity for all products');
      return;
    }

    if (!totalShippingCost) {
      Alert.alert('Error', 'Please enter total shipping cost (enter 0 if none)');
      return;
    }

    const shippingPerUnit = calculateShippingPerUnit();

    const shipmentData = {
      products: products.map(p => ({
        brand: p.brand.trim(),
        name: p.name.trim(),
        size: p.size,
        unitCost: parseFloat(p.unitCost),
        quantity: parseInt(p.quantity),
        shippingPerUnit: shippingPerUnit,
        catalogProductId: p.catalogProductId,
      })),
      totalShippingCost: parseFloat(totalShippingCost),
      totalCost: calculateTotalCost(),
      notes: notes.trim(),
      status: 'preparing',
    };

    onSubmit(shipmentData);
    resetForm();
  };

  const resetForm = () => {
    setProducts([{ brand: '', name: '', size: '100ml', unitCost: '', quantity: '', catalogProductId: undefined }]);
    setTotalShippingCost('');
    setNotes('');
    setSearchQuery({});
    setShowSuggestions(-1);
    setPendingProductIndex(null);
  };

  const hasUnsavedChanges = () => {
    return (
      products.some(p => p.brand || p.name || p.unitCost || p.quantity) ||
      totalShippingCost ||
      notes
    );
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };


  const totalUnits = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancel}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Shipment</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Total Shipping Section */}
            <Text style={styles.sectionTitle}>Total Shipping Cost</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Total Shipping ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={totalShippingCost}
                onChangeText={setTotalShippingCost}
                keyboardType="decimal-pad"
              />

              {totalShippingCost && totalUnits > 0 && (
                <View style={styles.shippingInfo}>
                  <Text style={styles.shippingInfoText}>
                    📦 Total Units: {totalUnits}
                  </Text>
                  <Text style={styles.shippingInfoText}>
                    💰 Shipping per Unit: ${shippingPerUnit.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Products Section */}
            <Text style={styles.sectionTitle}>Products</Text>

            {products.map((product, index) => {
              const productCost = (parseFloat(product.unitCost) || 0) * (parseInt(product.quantity) || 0);
              const productShipping = shippingPerUnit * (parseInt(product.quantity) || 0);
              const productTotal = productCost + productShipping;
              const suggestions = getProductSuggestions(index);

              return (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productNumber}>Product {index + 1}</Text>
                    {products.length > 1 && (
                      <TouchableOpacity onPress={() => removeProduct(index)}>
                        <Text style={styles.removeButton}>✕ Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Product Selection - Show search OR selected product */}
                  {!product.catalogProductId ? (
                    <>
                      <Text style={styles.label}>Search Product *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Type brand or product name..."
                        value={searchQuery[index] || ''}
                        onChangeText={(text) => handleSearchChange(index, text)}
                        onFocus={() => {
                          if ((searchQuery[index] || '').length >= 2) {
                            setShowSuggestions(index);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow clicking suggestions
                          console.log('Input blurred, hiding suggestions in 500ms...');
                          setTimeout(() => {
                            console.log('Hiding suggestions now');
                            setShowSuggestions(-1);
                          }, 500);
                        }}
                      />

                      {/* Product Suggestions */}
                      {showSuggestions === index && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                          <ScrollView
                            style={styles.suggestionsList}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="always"
                          >
                            {suggestions.map((catalogProduct) => {
                              console.log('Rendering suggestion:', catalogProduct.brand, catalogProduct.name);
                              return (
                                <TouchableOpacity
                                  key={catalogProduct.id}
                                  style={styles.suggestionItem}
                                  onPressIn={() => {
                                    console.log('PRESS IN suggestion:', catalogProduct.brand, catalogProduct.name);
                                  }}
                                  onPress={() => {
                                    console.log('PRESSED suggestion:', catalogProduct.brand, catalogProduct.name);
                                    selectProduct(index, catalogProduct);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View pointerEvents="none">
                                    <Text style={styles.suggestionName}>
                                      {catalogProduct.brand} - {catalogProduct.name}
                                    </Text>
                                    <Text style={styles.suggestionDetails}>
                                      {catalogProduct.size} • ${catalogProduct.cost}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                          <TouchableOpacity
                            style={styles.addNewProductButton}
                            onPress={() => handleAddNewProduct(index)}
                          >
                            <Text style={styles.addNewProductText}>➕ Add New Product to Catalog</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.noProductInfo}>
                        <Text style={styles.noProductText}>
                          ⚠️ Search and select a product from catalog above
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>Selected Product</Text>
                      <View style={styles.selectedProductCard}>
                        {/* Product Image */}
                        <View style={styles.selectedProductImageContainer}>
                          {product.catalogProductId && catalogProducts.find(p => p.id === product.catalogProductId)?.image ? (
                            <Image
                              source={{ uri: catalogProducts.find(p => p.id === product.catalogProductId)!.image }}
                              style={styles.selectedProductImage}
                            />
                          ) : (
                            <View style={styles.selectedProductPlaceholder}>
                              <Text style={styles.selectedProductPlaceholderText}>📦</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.selectedProductDetails}>
                          <Text style={styles.selectedProductName}>
                            {product.brand} - {product.name}
                          </Text>
                          <Text style={styles.selectedProductMeta}>
                            {product.size} • ${product.unitCost}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editProductButton}
                          onPress={() => clearProductSelection(index)}
                        >
                          <Text style={styles.editProductButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Unit Cost, Shipping Cost, Quantity - Only show if product selected */}
                  {product.catalogProductId && (
                    <>
                  <View style={styles.threeColumnRow}>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>Unit Cost ($)</Text>
                      <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                          ${product.unitCost || '0.00'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>Shipping/Unit</Text>
                      <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                          ${shippingPerUnit.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>Quantity *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={product.quantity}
                        onChangeText={(value) => updateProduct(index, 'quantity', value)}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* Product Total */}
                  {product.unitCost && product.quantity && (
                    <View style={styles.productTotalSection}>
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Product Cost:</Text>
                        <Text style={styles.costValue}>${productCost.toFixed(2)}</Text>
                      </View>
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>
                          Shipping ({product.quantity} × ${shippingPerUnit.toFixed(2)}):
                        </Text>
                        <Text style={styles.costValue}>${productShipping.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.costRow, styles.productTotalRow]}>
                        <Text style={styles.productTotalLabel}>Product Total:</Text>
                        <Text style={styles.productTotalValue}>${productTotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  )}
                  </>
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
              <Text style={styles.addProductButtonText}>+ Add Another Product</Text>
            </TouchableOpacity>

            {/* Grand Total */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Shipment Summary</Text>
              <View style={styles.costSummary}>
                <View style={styles.costRow}>
                  <Text style={styles.summaryLabel}>Products Cost:</Text>
                  <Text style={styles.summaryValue}>${calculateProductsCost().toFixed(2)}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.summaryLabel}>Total Shipping:</Text>
                  <Text style={styles.summaryValue}>${(parseFloat(totalShippingCost) || 0).toFixed(2)}</Text>
                </View>
                <View style={[styles.costRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                  <Text style={styles.grandTotalValue}>${calculateTotalCost().toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes (supplier, tracking, etc.)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <AddProductModal
        visible={isAddProductModalVisible}
        onClose={() => {
          setIsAddProductModalVisible(false);
          setPendingProductIndex(null);
        }}
        onSubmit={handleProductAdded}
        existingBrands={[...new Set(catalogProducts.map(p => p.brand))]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  removeButton: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsContainer: {
    marginTop: 6,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionDetails: {
    fontSize: 13,
    color: '#666',
  },
  addNewProductButton: {
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addNewProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  selectedProductInfo: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  selectedProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  noProductInfo: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  noProductText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  selectedProductImageContainer: {
    marginRight: 10,
  },
  selectedProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  selectedProductPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedProductPlaceholderText: {
    fontSize: 24,
  },
  selectedProductDetails: {
    flex: 1,
    marginRight: 12,
  },
  selectedProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  selectedProductMeta: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  editProductButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editProductButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  sizeScroll: {
    maxHeight: 40,
  },
  sizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sizeChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sizeChipTextActive: {
    color: 'white',
  },
  readOnlyInput: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#90CAF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  threeColumnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thirdWidth: {
    flex: 1,
  },
  shippingInfo: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  shippingInfoText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 3,
  },
  productTotalSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 12,
    color: '#666',
  },
  costValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  productTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  productTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  productTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addProductButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addProductButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  costSummary: {
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bottomSpacer: {
    height: 20,
  },
});
