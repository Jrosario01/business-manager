import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (customer: { name: string; phone: string; wishlist: string[] }) => void;
  catalogProducts: Array<{ brand: string; name: string }>;
}

export default function AddCustomerModal({ visible, onClose, onSubmit, catalogProducts }: AddCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wishlistInput, setWishlistInput] = useState('');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get product suggestions from catalog
  const getProductSuggestions = () => {
    if (!wishlistInput) return [];
    
    const query = wishlistInput.toLowerCase();
    
    return catalogProducts
      .filter(p => {
        const fullName = `${p.name} by ${p.brand}`.toLowerCase();
        return fullName.includes(query) && !wishlist.includes(`${p.brand} ${p.name}`);
      })
      .slice(0, 10) // Limit to 10 suggestions
      .map(p => `${p.name} by ${p.brand}`);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter customer name');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter phone number');
      return;
    }

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      wishlist: wishlist,
    });

    resetForm();
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setWishlistInput('');
    setWishlist([]);
    setShowSuggestions(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const addToWishlist = (productName: string) => {
    if (productName.trim() && !wishlist.includes(productName.trim())) {
      setWishlist([...wishlist, productName.trim()]);
      setWishlistInput('');
      setShowSuggestions(false);
    }
  };

  const removeFromWishlist = (index: number) => {
    setWishlist(wishlist.filter((_, i) => i !== index));
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  const suggestions = getProductSuggestions();

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
          <Text style={styles.title}>Add Customer</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Customer Info */}
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name..."
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="XXX-XXX-XXXX"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={12}
            />
            <Text style={styles.helperText}>
              Enter 10 digits (e.g., 809-555-0123)
            </Text>
          </View>

          {/* Wishlist */}
          <Text style={styles.sectionTitle}>Wishlist (Optional)</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Add products they're interested in</Text>
            <TextInput
              style={styles.input}
              placeholder="Search catalog products..."
              value={wishlistInput}
              onChangeText={(text) => {
                setWishlistInput(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(wishlistInput.length > 0)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => addToWishlist(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showSuggestions && suggestions.length === 0 && wishlistInput.length > 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  No products found. Try a different search.
                </Text>
              </View>
            )}

            {wishlist.length > 0 && (
              <View style={styles.wishlistItems}>
                <Text style={styles.wishlistTitle}>Wishlist Items:</Text>
                {wishlist.map((item, index) => (
                  <View key={index} style={styles.wishlistItem}>
                    <Text style={styles.wishlistItemText}>{item}</Text>
                    <TouchableOpacity 
                      onPress={() => removeFromWishlist(index)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Balance and purchase history will be tracked automatically when you make sales to this customer.
            </Text>
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
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  noResults: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  wishlistItems: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wishlistTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  wishlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  wishlistItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
