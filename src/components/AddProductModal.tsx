import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (product: { brand: string; name: string; cost: number; image?: string }) => void;
  existingBrands: string[];
}

// Common Arabic perfume brands
const SUGGESTED_BRANDS = [
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
];

export default function AddProductModal({ 
  visible, 
  onClose, 
  onSubmit, 
  existingBrands,
}: AddProductModalProps) {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [image, setImage] = useState('');
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = () => {
    if (!brand.trim()) {
      alert('Please enter a brand name');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }
    if (!cost || parseFloat(cost) <= 0) {
      alert('Please enter a valid cost');
      return;
    }

    onSubmit({
      brand: brand.trim(),
      name: name.trim(),
      cost: parseFloat(cost),
      image: image || undefined,
    });

    resetForm();
  };

  const resetForm = () => {
    setBrand('');
    setName('');
    setCost('');
    setImage('');
    setShowBrandSuggestions(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert to base64 for display and storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const brandSuggestions = getBrandSuggestions();

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
          <Text style={styles.title}>Add Product</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Image Upload - FIRST */}
          <Text style={styles.sectionTitle}>Product Image (Optional)</Text>
          <View style={styles.card}>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImage('')}
                >
                  <Text style={styles.removeImageText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleImageSelect}
              >
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Add Product Image</Text>
                <Text style={styles.uploadSubtext}>Click to select from your device</Text>
              </TouchableOpacity>
            )}
            {/* Hidden file input for web */}
            <input
              ref={fileInputRef as any}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </View>

          {/* Brand Input with Autocomplete */}
          <Text style={styles.sectionTitle}>Brand</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Brand Name *</Text>
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

          {/* Product Name - Simple text input */}
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name..."
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Unit Cost ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
            />
          </View>

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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  createNewItem: {
    backgroundColor: '#E8F5E9',
  },
  suggestionText: {
    fontSize: 16,
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
  uploadButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#999',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  removeImageButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
