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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (product: { id: string; brand: string; name: string; size: string; cost: number; image_url?: string }) => void;
  onDelete: (id: string) => void;
  product: {
    id: string;
    brand: string;
    name: string;
    size: string;
    cost: number;
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
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('100ml');
  const [cost, setCost] = useState('');
  const [image, setImage] = useState('');
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  // Update form when product changes
  useEffect(() => {
    if (product) {
      setBrand(product.brand);
      setName(product.name);
      setSize(product.size || '100ml');
      setCost(product.cost.toString());
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
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!product) return;

    if (!brand.trim()) {
      Alert.alert('Error', 'Please enter a brand name');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (!cost || parseFloat(cost) <= 0) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    onSubmit({
      id: product.id,
      brand: brand.trim(),
      name: name.trim(),
      size: size,
      cost: parseFloat(cost),
      image_url: image || undefined,
    });

    resetForm();
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Product</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

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
                  <Text style={styles.changeImageText}>Change</Text>
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
                <Text style={styles.imageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Brand Input with Autocomplete */}
          <Text style={styles.label}>Brand *</Text>
          <View style={styles.brandCard}>
            <TextInput
              style={styles.input}
              placeholder="Start typing brand name..."
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
                        <Text style={styles.existingBadge}>✓ Existing</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Product Name */}
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name..."
            value={name}
            onChangeText={setName}
          />

          {/* Size Selector */}
          <Text style={styles.label}>Size *</Text>
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

          {/* Unit Cost */}
          <Text style={styles.label}>Unit Cost ($) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
          />

          {/* Delete Button */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️ Delete Product</Text>
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
  brandCard: {
    marginBottom: 12,
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
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  existingBadge: {
    fontSize: 12,
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});
