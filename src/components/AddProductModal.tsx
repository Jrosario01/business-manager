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
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../utils/imageUpload';
import { isDemoAccount } from '../utils/isDemoAccount';

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
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductForm[]>([
    { brand: '', name: '', size: '100ml', cost: '', sale_price: '', image: undefined }
  ]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(-1);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);

  const pickImage = async (index: number) => {
    // Block image uploads for demo accounts
    if (isDemoAccount()) {
      Alert.alert(
        'Demo Account Limitation',
        'Image uploads are disabled for demo accounts to prevent storage abuse and keep the demo environment clean for all users.',
        [{ text: 'OK' }]
      );
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('modals.addProduct.permissionRequired'), t('modals.addProduct.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;

      // Show local image immediately for better UX
      updateProduct(index, 'image', localUri);
      setUploadingImageIndex(index);

      try {
        // Upload to Supabase in background
        console.log('Uploading image to Supabase...');
        const publicUrl = await uploadImageToSupabase(localUri);

        // Update with Supabase URL
        updateProduct(index, 'image', publicUrl);
        console.log('Image uploaded and URL updated');
        Alert.alert('Success', 'Image uploaded successfully!');
      } catch (error) {
        console.error('Failed to upload image:', error);
        Alert.alert(
          'Upload Failed',
          'Failed to upload image to cloud storage. The image will only be visible on this device.',
          [{ text: 'OK' }]
        );
      } finally {
        setUploadingImageIndex(null);
      }
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
      return [...matches, t('modals.addProduct.addNewBrand', { brand })];
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
      Alert.alert(t('common.error'), t('modals.addProduct.atLeastOne'));
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate all products
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.brand.trim()) {
        Alert.alert(t('common.error'), t('modals.addProduct.enterBrand', { num: i + 1 }));
        return;
      }
      if (!product.name.trim()) {
        Alert.alert(t('common.error'), t('modals.addProduct.enterProductName', { num: i + 1 }));
        return;
      }
      if (!product.cost || parseFloat(product.cost) <= 0) {
        Alert.alert(t('common.error'), t('modals.addProduct.enterValidCost', { num: i + 1 }));
        return;
      }
    }

    setIsSaving(true);

    try {
      const formattedProducts = products.map(p => ({
        brand: p.brand.trim(),
        name: p.name.trim(),
        size: p.size,
        cost: parseFloat(p.cost),
        sale_price: p.sale_price ? parseFloat(p.sale_price) : undefined,
        image: p.image,
      }));

      await onSubmit(formattedProducts);
      Alert.alert('Success', `${products.length} product(s) added successfully!`);
      resetForm();
    } catch (error) {
      console.error('Error saving products:', error);
      Alert.alert('Error', 'Failed to save products. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} disabled={isSaving}>
            <Text style={[styles.cancelButton, isSaving && styles.disabledButton]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('modals.addProduct.addProducts', { count: products.length })}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSaving}>
            <Text style={[styles.saveButton, isSaving && styles.disabledButton]}>{t('modals.addProduct.saveAll')}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
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
                  <Text style={styles.productNumber}>{t('modals.addProduct.product')} {index + 1}</Text>
                  {products.length > 1 && (
                    <TouchableOpacity onPress={() => removeProduct(index)}>
                      <Text style={styles.removeButton}>✕ {t('modals.addProduct.remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Compact Image Section */}
                <View style={styles.imageSection}>
                  {product.image ? (
                    <View style={styles.imageContainer}>
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: product.image }} style={styles.productImage} />
                        {uploadingImageIndex === index && (
                          <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator size="small" color="#1a5490" />
                            <Text style={styles.uploadingText}>Uploading...</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage(index)}
                        disabled={uploadingImageIndex === index}
                      >
                        <Text style={styles.changeImageText}>{t('modals.addProduct.change')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => updateProduct(index, 'image', '')}
                        disabled={uploadingImageIndex === index}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={() => pickImage(index)}
                      disabled={uploadingImageIndex === index}
                    >
                      {uploadingImageIndex === index ? (
                        <ActivityIndicator size="small" color="#1a5490" />
                      ) : (
                        <>
                          <Text style={styles.imageIcon}>📷</Text>
                          <Text style={styles.imageText}>{t('modals.addProduct.addImage')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Brand */}
                <Text style={styles.label}>{t('catalog.brand')} *</Text>
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
                      <Text style={styles.editBrandButtonText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={t('modals.addProduct.brandPlaceholder')}
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
                <Text style={styles.label}>{t('modals.addProduct.productName')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('modals.addProduct.productNamePlaceholder')}
                  value={product.name}
                  onChangeText={(text) => updateProduct(index, 'name', text)}
                />

                {/* Size Selector */}
                <Text style={styles.label}>{t('modals.addProduct.size')}</Text>
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
                <Text style={styles.label}>{t('modals.addProduct.unitCost')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={product.cost}
                  onChangeText={(text) => updateProduct(index, 'cost', text)}
                  keyboardType="decimal-pad"
                />

                {/* Sale Price */}
                <Text style={styles.label}>{t('modals.addProduct.salePrice')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={product.sale_price || ''}
                  onChangeText={(text) => updateProduct(index, 'sale_price', text)}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>{t('modals.addProduct.salePriceHelper')}</Text>
              </View>
            );
          })}

          {/* Add Another Product Button */}
          <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
            <Text style={styles.addProductButtonText}>{t('modals.addProduct.addAnotherProduct')}</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Full Screen Loading Overlay */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.loadingText}>Saving products...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const { height: screenHeight } = Dimensions.get('window');
const getHeaderPaddingTop = () => {
  if (Platform.OS === 'android') {
    const statusBarHeight = StatusBar.currentHeight || 0;
    return statusBarHeight + (screenHeight > 800 ? 30 : 25);
  } else {
    return screenHeight > 800 ? 60 : 50;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5490',
    paddingBottom: 0,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: getHeaderPaddingTop(),
    paddingBottom: 20,
    backgroundColor: '#1a5490',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  saveButton: {
    fontSize: 16,
    color: '#00ffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  productCard: {
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
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
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 10,
    color: '#1a5490',
    fontWeight: '600',
    marginTop: 4,
  },
  changeImageButton: {
    backgroundColor: '#1a5490',
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
    color: '#1a5490',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a5490',
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
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
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
    backgroundColor: '#1a5490',
    borderColor: '#1a5490',
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a5490',
  },
  sizeChipTextActive: {
    color: 'white',
  },
  addProductButton: {
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1a5490',
    borderStyle: 'dashed',
  },
  addProductButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5490',
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
    backgroundColor: 'rgba(26, 84, 144, 0.15)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a5490',
  },
  selectedBrandText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
    flex: 1,
    marginRight: 8,
  },
  editBrandButton: {
    backgroundColor: '#1a5490',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBrandButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#1a5490',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
});
