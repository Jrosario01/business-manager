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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

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
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('modals.editProduct.permissionRequired'), t('modals.editProduct.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
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

    onSubmit({
      id: product.id,
      brand: brand.trim(),
      name: name.trim(),
      size: size,
      cost: parseFloat(cost),
      sale_price: salePrice ? parseFloat(salePrice) : undefined,
      image_url: image || undefined,
    });

    resetForm();
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
          onPress: () => {
            onDelete(product.id);
            resetForm();
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
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelButton}>✕</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.titleIcon}>✏️</Text>
            <Text style={styles.title}>{t('catalog.editProduct')}</Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} style={styles.headerButton}>
            <Text style={styles.saveButton}>✓</Text>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Compact Image Section */}
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.productImage} />
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={pickImage}
                >
                  <Text style={styles.changeImageText}>{t('modals.editProduct.change')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage('')}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
              >
                <Text style={styles.imageIcon}>📷</Text>
                <Text style={styles.imageText}>{t('modals.editProduct.addImage')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Brand Input with Autocomplete */}
          <View style={styles.card}>
            <Text style={styles.label}>🏷️ {t('catalog.brand')} *</Text>
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
            <Text style={styles.label}>📦 {t('catalog.productName')} *</Text>
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
            <Text style={styles.label}>📏 {t('catalog.size')} *</Text>
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
            <Text style={styles.label}>💰 {t('modals.editProduct.unitCost')} *</Text>
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
            <Text style={styles.label}>💵 {t('catalog.salePrice')} ($)</Text>
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
            <Text style={styles.deleteButtonText}>🗑️ {t('catalog.deleteProduct')}</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  saveButton: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  changeImageButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  changeImageText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  removeImageButton: {
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  removeImageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  imageIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  imageText: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 10,
  },
  brandCard: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    color: '#333',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  createNewItem: {
    backgroundColor: '#E8F5E9',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  createNewText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  existingBadge: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: 'bold',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeScrollContainer: {
    flexDirection: 'row',
    paddingRight: 10,
    paddingVertical: 4,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  sizeChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  sizeChipTextActive: {
    color: 'white',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
});
