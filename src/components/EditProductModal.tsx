import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../utils/imageUpload';
import { isDemoAccount } from '../utils/isDemoAccount';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (product: { id: string; brand: string; name: string; size: string; cost: number; sale_price?: number; image_url?: string }) => void;
  onDelete: (id: string) => void;
  product: {
    id: string;
    brand: string;
    name: string;
    size: string;
    cost: number;
    sale_price?: number;
    image_url?: string;
  } | null;
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

export default function EditProductModal({
  visible,
  onClose,
  onSubmit,
  onDelete,
  product,
  existingBrands,
}: EditProductModalProps) {
  const { t } = useTranslation();
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('100ml');
  const [cost, setCost] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [image, setImage] = useState('');
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Update form when product changes
  useEffect(() => {
    if (product) {
      setBrand(product.brand);
      setName(product.name);
      setSize(product.size || '100ml');
      setCost(product.cost.toString());
      setSalePrice(product.sale_price?.toString() || (product.cost * 2).toString());
      setImage(product.image_url || '');
    }
  }, [product]);

  // Get brand suggestions
  const getBrandSuggestions = () => {
    if (!brand) return [];

    const query = brand.toLowerCase();
    const allBrands = [...new Set([...SUGGESTED_BRANDS, ...existingBrands])];

    const matches = allBrands.filter(b => b.toLowerCase().includes(query));

    // If no exact match, add "Create new brand" option
    const hasExactMatch = allBrands.some(b => b.toLowerCase() === query);
    if (!hasExactMatch && brand.trim().length > 0) {
      return [...matches, `➕ Add new brand: "${brand}"`];
    }

    return matches;
  };

  const pickImage = async () => {
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
      Alert.alert(t('modals.editProduct.permissionRequired'), t('modals.editProduct.permissionMessage'));
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
      setImage(localUri);
      setIsUploadingImage(true);

      try {
        // Upload to Supabase in background
        console.log('Uploading image to Supabase...');
        const publicUrl = await uploadImageToSupabase(localUri);

        // Delete old image if it exists and is from Supabase
        if (image && image.includes('supabase')) {
          await deleteImageFromSupabase(image);
        }

        // Update with Supabase URL
        setImage(publicUrl);
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
        setIsUploadingImage(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!product) return;

    if (!brand.trim()) {
      Alert.alert(t('common.error'), t('modals.editProduct.enterBrand'));
      return;
    }
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('modals.editProduct.enterProductName'));
      return;
    }
    if (!cost || parseFloat(cost) <= 0) {
      Alert.alert(t('common.error'), t('modals.editProduct.enterValidCost'));
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({
        id: product.id,
        brand: brand.trim(),
        name: name.trim(),
        size: size,
        cost: parseFloat(cost),
        sale_price: salePrice ? parseFloat(salePrice) : undefined,
        image_url: image || undefined,
      });

      Alert.alert('Success', 'Product updated successfully!');
      resetForm();
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      t('catalog.deleteProduct'),
      t('modals.editProduct.deleteConfirm', { name: product.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(product.id);
              Alert.alert('Success', 'Product deleted successfully!');
              resetForm();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setBrand('');
    setName('');
    setSize('100ml');
    setCost('');
    setImage('');
    setShowBrandSuggestions(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const brandSuggestions = getBrandSuggestions();

  if (!product) return null;

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
          <TouchableOpacity onPress={handleCancel} disabled={isSaving || isDeleting}>
            <Text style={[styles.cancelButton, (isSaving || isDeleting) && styles.disabledButton]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('catalog.editProduct')}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSaving || isDeleting}>
            <Text style={[styles.saveButton, (isSaving || isDeleting) && styles.disabledButton]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Compact Image Section */}
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imageContainer}>
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.productImage} />
                  {isUploadingImage && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="small" color="#1a5490" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={pickImage}
                  disabled={isUploadingImage}
                >
                  <Text style={styles.changeImageText}>{t('modals.editProduct.change')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage('')}
                  disabled={isUploadingImage}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#1a5490" />
                ) : (
                  <>
                    <Text style={styles.imageIcon}>📷</Text>
                    <Text style={styles.imageText}>{t('modals.editProduct.addImage')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Brand Input with Autocomplete */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('catalog.brand')} *</Text>
            <View style={styles.brandCard}>
              <TextInput
                style={styles.input}
                placeholder={t('modals.editProduct.brandPlaceholder')}
                placeholderTextColor="#999"
                value={brand}
                onChangeText={(text) => {
                  setBrand(text);
                  setShowBrandSuggestions(text.length > 0);
                }}
                onFocus={() => setShowBrandSuggestions(brand.length > 0)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowBrandSuggestions(false), 200);
                }}
              />

            {showBrandSuggestions && brandSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {brandSuggestions.map((suggestion, index) => {
                  const isCreateNew = suggestion.startsWith('➕');
                  const displayText = isCreateNew ? suggestion : suggestion;
                  const actualBrand = isCreateNew ? brand : suggestion;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        isCreateNew && styles.createNewItem
                      ]}
                      onPress={() => {
                        setBrand(actualBrand);
                        setShowBrandSuggestions(false);
                      }}
                    >
                      <Text style={[
                        styles.suggestionText,
                        isCreateNew && styles.createNewText
                      ]}>
                        {displayText}
                      </Text>
                      {!isCreateNew && existingBrands.includes(suggestion) && (
                        <Text style={styles.existingBadge}>✓ {t('modals.editProduct.existing')}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            </View>
          </View>

          {/* Product Name */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('catalog.productName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.editProduct.productNamePlaceholder')}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Size Selector */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('catalog.size')} *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sizeScrollContainer}
          >
            {SIZES.map(sizeOption => (
              <TouchableOpacity
                key={sizeOption}
                style={[
                  styles.sizeChip,
                  size === sizeOption && styles.sizeChipActive
                ]}
                onPress={() => setSize(sizeOption)}
              >
                <Text style={[
                  styles.sizeChipText,
                  size === sizeOption && styles.sizeChipTextActive
                ]}>
                  {sizeOption}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>

          {/* Unit Cost */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('modals.editProduct.unitCost')} *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Sale Price */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('catalog.salePrice')} ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={salePrice}
              onChangeText={setSalePrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>{t('modals.editProduct.salePriceHelper')}</Text>
          </View>

          {/* Delete Button */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>{t('catalog.deleteProduct')}</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Full Screen Loading Overlay for Saving */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.loadingText}>Updating product...</Text>
            </View>
          </View>
        )}

        {/* Full Screen Loading Overlay for Deleting */}
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text style={styles.loadingText}>Deleting product...</Text>
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
  card: {
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
  imageSection: {
    marginBottom: 12,
    alignItems: 'center',
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 2,
    borderColor: '#e0cf80',
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
    justifyContent: 'center',
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
  brandCard: {
    marginBottom: 0,
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
  existingBadge: {
    fontSize: 11,
    color: '#34C759',
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
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
