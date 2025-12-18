import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface ProductForm {
  brand: string;
  name: string;
  size: string;
  cost: string;
  sale_price?: string;
  image?: string;
}

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (products: { brand: string; name: string; size: string; cost: number; sale_price?: number; image?: string }[]) => void;
  existingBrands: string[];
}

// Comprehensive list of Arabic and mainstream perfume brands
const SUGGESTED_BRANDS = [
  // Arabic Brands
  'Lattafa',
  'Armaf',
  'Rasasi',
  'Al Haramain',
  'Afnan',
  'Ajmal',
  'Swiss Arabian',
  'Ard Al Zaafaran',
  'Nabeel',
  'Al Rehab',
  'Khalis',
  'My Perfumes',
  'Zimaya',
  'Maison Alhambra',
  'Paris Corner',
  'Anfar',
  'Arabian Oud',
  'Abdul Samad Al Qurashi',
  'Hind Al Oud',
  'Amouage',
  'Kayali',
  'Khadlaj',
  'Al Wataniah',
  'Junaid Jamshed',
  'Al Zahra',
  'Areej Al Ameerah',
  'Hamidi',
  'Anfasic Dokhoon',
  'Ateej',
  'Asdaaf',

  // Mainstream Designer Brands
  'Dior',
  'Chanel',
  'Versace',
  'Paco Rabanne',
  'Yves Saint Laurent',
  'Giorgio Armani',
  'Jean Paul Gaultier',
  'Dolce & Gabbana',
  'Tom Ford',
  'Creed',
  'Gucci',
  'Prada',
  'Burberry',
  'Carolina Herrera',
  'Calvin Klein',
  'Hugo Boss',
  'Givenchy',
  'Hermès',
  'Valentino',
  'Bvlgari',
];

const SIZES = ['30ml', '50ml', '60ml', '75ml', '90ml', '100ml', '105ml', '125ml', '150ml', '200ml'];

export default function AddProductModal({
  visible,
  onClose,
  onSubmit,
  existingBrands,
}: AddProductModalProps) {
  const [products, setProducts] = useState<ProductForm[]>([
    { brand: '', name: '', size: '100ml', cost: '', sale_price: '', image: undefined }
  ]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(-1);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  const pickImage = async (index: number) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProduct(index, 'image', result.assets[0].uri);
    }
  };

  const getBrandSuggestions = (brand: string) => {
    if (!brand) return [];

    const query = brand.toLowerCase();
    const allBrands = [...new Set([...SUGGESTED_BRANDS, ...existingBrands])];

    // Filter matches and sort alphabetically
    const matches = allBrands
      .filter(b => b.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b));

    const hasExactMatch = allBrands.some(b => b.toLowerCase() === query);
    if (!hasExactMatch && brand.trim().length > 0) {
      return [...matches, `➕ Add new brand: "${brand}"`];
    }

    return matches;
  };

  const updateProduct = (index: number, field: keyof ProductForm, value: string) => {
    const newProducts = [...products];
    newProducts[index][field] = value as any;
    setProducts(newProducts);
  };

  const addProduct = () => {
    setProducts([...products, { brand: '', name: '', size: '100ml', cost: '', sale_price: '', image: undefined }]);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) {
      Alert.alert('Error', 'You must have at least one product');
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Validate all products
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.brand.trim()) {
        Alert.alert('Error', `Product ${i + 1}: Please enter a brand name`);
        return;
      }
      if (!product.name.trim()) {
        Alert.alert('Error', `Product ${i + 1}: Please enter a product name`);
        return;
      }
      if (!product.cost || parseFloat(product.cost) <= 0) {
        Alert.alert('Error', `Product ${i + 1}: Please enter a valid cost`);
        return;
      }
    }

    const formattedProducts = products.map(p => ({
      brand: p.brand.trim(),
      name: p.name.trim(),
      size: p.size,
      cost: parseFloat(p.cost),
      sale_price: p.sale_price ? parseFloat(p.sale_price) : undefined,
      image: p.image,
    }));

    onSubmit(formattedProducts);
    resetForm();
  };

  const resetForm = () => {
    setProducts([{ brand: '', name: '', size: '100ml', cost: '', image: undefined }]);
    setShowBrandSuggestions(-1);
    setSelectedProductIndex(null);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Products ({products.length})</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {products.map((product, index) => {
            const brandSuggestions = getBrandSuggestions(product.brand);

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

                {/* Compact Image Section */}
                <View style={styles.imageSection}>
                  {product.image ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: product.image }} style={styles.productImage} />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage(index)}
                      >
                        <Text style={styles.changeImageText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => updateProduct(index, 'image', '')}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={() => pickImage(index)}
                    >
                      <Text style={styles.imageIcon}>📷</Text>
                      <Text style={styles.imageText}>Add Image</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Brand */}
                <Text style={styles.label}>Brand *</Text>
                {product.brand.trim() && showBrandSuggestions !== index ? (
                  // Show selected brand
                  <View style={styles.selectedBrandCard}>
                    <Text style={styles.selectedBrandText}>{product.brand}</Text>
                    <TouchableOpacity
                      style={styles.editBrandButton}
                      onPress={() => {
                        updateProduct(index, 'brand', '');
                        setShowBrandSuggestions(index);
                      }}
                    >
                      <Text style={styles.editBrandButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Start typing brand name..."
                      value={product.brand}
                      onChangeText={(text) => {
                        updateProduct(index, 'brand', text);
                        setShowBrandSuggestions(text.length > 0 ? index : -1);
                      }}
                      onFocus={() => setShowBrandSuggestions(index)}
                      onBlur={() => setTimeout(() => setShowBrandSuggestions(-1), 300)}
                    />

                    {showBrandSuggestions === index && brandSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        <ScrollView
                          style={styles.suggestionsList}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="always"
                        >
                          {brandSuggestions.map((suggestion, sugIndex) => {
                            const isCreateNew = suggestion.startsWith('➕');
                            const actualBrand = isCreateNew ? product.brand : suggestion;

                            return (
                              <TouchableOpacity
                                key={sugIndex}
                                style={[
                                  styles.suggestionItem,
                                  isCreateNew && styles.createNewItem
                                ]}
                                onPress={() => {
                                  updateProduct(index, 'brand', actualBrand);
                                  setShowBrandSuggestions(-1);
                                }}
                              >
                                <Text style={[
                                  styles.suggestionText,
                                  isCreateNew && styles.createNewText
                                ]}>
                                  {suggestion}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                {/* Product Name */}
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name..."
                  value={product.name}
                  onChangeText={(text) => updateProduct(index, 'name', text)}
                />

                {/* Size Selector */}
                <Text style={styles.label}>Size *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sizeScrollContainer}
                >
                  {SIZES.map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeChip,
                        product.size === size && styles.sizeChipActive
                      ]}
                      onPress={() => updateProduct(index, 'size', size)}
                    >
                      <Text style={[
                        styles.sizeChipText,
                        product.size === size && styles.sizeChipTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Unit Cost */}
                <Text style={styles.label}>Unit Cost ($) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={product.cost}
                  onChangeText={(text) => updateProduct(index, 'cost', text)}
                  keyboardType="decimal-pad"
                />

                {/* Sale Price */}
                <Text style={styles.label}>Sale Price ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={product.sale_price || ''}
                  onChangeText={(text) => updateProduct(index, 'sale_price', text)}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>Suggested retail price</Text>
              </View>
            );
          })}

          {/* Add Another Product Button */}
          <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
            <Text style={styles.addProductButtonText}>+ Add Another Product</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  removeButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  imageSection: {
    marginBottom: 12,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  changeImageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  removeImageButton: {
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imageIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  imageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
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
    borderColor: '#e0e0e0',
    maxHeight: 150,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  createNewItem: {
    backgroundColor: '#E8F5E9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  createNewText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  sizeScrollContainer: {
    flexDirection: 'row',
    paddingRight: 10,
    paddingVertical: 4,
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
  addProductButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#34C759',
    borderStyle: 'dashed',
  },
  addProductButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34C759',
  },
  bottomSpacer: {
    height: 40,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 12,
  },
  selectedBrandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D4EDDA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  selectedBrandText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#155724',
    flex: 1,
    marginRight: 8,
  },
  editBrandButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBrandButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
