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
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductsStore, Product as CatalogProduct } from '../store/productsStore';
import { useSalesStore } from '../store/salesStore';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (customer: { name: string; phone: string; wishlist: string[] }) => void;
  initialData?: {
    name: string;
    phone: string;
    wishlist: string[];
  };
  customerId?: string;
  isEdit?: boolean;
  onDelete?: () => void;
}

export default function AddCustomerModal({ visible, onClose, onSubmit, initialData, customerId, isEdit = false, onDelete }: AddCustomerModalProps) {
  const { t } = useTranslation();
  const { products: catalogProducts, searchProducts, loadProducts } = useProductsStore();
  const { sales } = useSalesStore();
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [wishlistInput, setWishlistInput] = useState('');
  const [wishlist, setWishlist] = useState<string[]>(initialData?.wishlist || []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get customer's purchase history
  const customerSales = isEdit && customerId
    ? sales.filter(sale => sale.customerName === initialData?.name).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    : [];

  // Load products when modal becomes visible
  useEffect(() => {
    if (visible && catalogProducts.length === 0) {
      loadProducts();
    }
  }, [visible]);

  // Update state when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setWishlist(initialData.wishlist);
    }
  }, [initialData]);

  // Get product suggestions from catalog
  const getProductSuggestions = (): CatalogProduct[] => {
    if (!wishlistInput || wishlistInput.length < 2) return [];

    const results = searchProducts(wishlistInput);
    // Filter out already added products
    return results.filter(p => {
      const productString = `${p.brand} ${p.name}`;
      return !wishlist.includes(productString);
    }).slice(0, 10);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('modals.addCustomer.enterName'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('modals.addCustomer.enterPhone'));
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        wishlist: wishlist,
      });

      Alert.alert('Success', isEdit ? 'Customer updated successfully!' : 'Customer added successfully!');
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

  const addToWishlist = (product: CatalogProduct) => {
    const productString = `${product.brand} ${product.name}`;
    if (!wishlist.includes(productString)) {
      setWishlist([...wishlist, productString]);
      setWishlistInput('');
      setShowSuggestions(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('modals.addCustomer.deleteCustomer'),
      t('modals.addCustomer.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (onDelete) {
                await onDelete();
                Alert.alert('Success', 'Customer deleted successfully!');
                resetForm();
              }
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} disabled={isSaving || isDeleting}>
            <Text style={[styles.cancelButton, (isSaving || isDeleting) && styles.disabledButton]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? t('modals.addCustomer.editCustomer') : t('modals.addCustomer.addCustomer')}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSaving || isDeleting}>
            <Text style={[styles.saveButton, (isSaving || isDeleting) && styles.disabledButton]}>{t('common.save')}</Text>
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
            showsVerticalScrollIndicator={true}
          >
          {/* Customer Info */}
          <Text style={styles.sectionTitle}>{t('modals.addCustomer.customerInfo')}</Text>
          <View style={styles.card}>
            <Text style={styles.label}>{t('modals.addCustomer.fullName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.addCustomer.namePlaceholder')}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>{t('modals.addCustomer.phoneNumber')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.addCustomer.phonePlaceholder')}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={12}
            />
            <Text style={styles.helperText}>
              {t('modals.addCustomer.phoneHelper')}
            </Text>
          </View>

          {/* Wishlist */}
          <Text style={styles.sectionTitle}>{t('modals.addCustomer.wishlist')}</Text>
          <View style={styles.card}>
            <Text style={styles.label}>{t('modals.addCustomer.wishlistLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.addCustomer.searchProducts')}
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
                <ScrollView style={styles.suggestionsList} nestedScrollEnabled keyboardShouldPersistTaps="always">
                  {suggestions.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.suggestionItem}
                      onPress={() => addToWishlist(product)}
                      activeOpacity={0.7}
                    >
                      <View pointerEvents="none" style={styles.suggestionContent}>
                        {product.image ? (
                          <Image
                            source={{ uri: product.image }}
                            style={styles.suggestionImage}
                          />
                        ) : (
                          <View style={styles.suggestionImagePlaceholder}>
                            <Text style={styles.suggestionImagePlaceholderText}>📦</Text>
                          </View>
                        )}
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionText}>
                            {product.brand} - {product.name}
                          </Text>
                          <Text style={styles.suggestionMeta}>
                            {product.size} • ${product.cost}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {showSuggestions && suggestions.length === 0 && wishlistInput.length > 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {t('modals.addCustomer.noProducts')}
                </Text>
              </View>
            )}

            {wishlist.length > 0 && (
              <View style={styles.wishlistItems}>
                <Text style={styles.wishlistTitle}>{t('modals.addCustomer.wishlistItems')}</Text>
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
              {t('modals.addCustomer.infoMessage')}
            </Text>
          </View>

          {/* Purchase History */}
          {isEdit && customerSales.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('modals.addCustomer.purchaseHistory')}</Text>
              <View style={styles.card}>
                {customerSales.map((sale, index) => (
                  <View key={sale.id} style={[styles.historyItem, index > 0 && styles.historyItemBorder]}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>
                        {new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.historyAmount}>${sale.totalRevenue.toFixed(2)}</Text>
                    </View>
                    <View style={styles.historyProducts}>
                      {sale.products.map((product, pIndex) => (
                        <Text key={pIndex} style={styles.historyProduct}>
                          • {product.quantity}× {product.brand} {product.name}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.historyFooter}>
                      <Text style={[styles.historyStatus, sale.paymentStatus === 'paid' ? styles.historyStatusPaid : styles.historyStatusDue]}>
                        {sale.paymentStatus === 'paid' ? t('modals.addCustomer.paidStatus') : t('modals.addCustomer.dueStatus', { amount: (sale.totalRevenue - sale.amountPaid).toFixed(2) })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Delete Button */}
          {isEdit && onDelete && (
            <TouchableOpacity onPress={handleDelete} style={[styles.deleteButtonBottom, (isSaving || isDeleting) && styles.deleteButtonDisabled]} disabled={isSaving || isDeleting}>
              <Text style={styles.deleteButtonText}>{t('modals.addCustomer.deleteCustomer')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Full Screen Loading Overlay for Saving */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.loadingText}>{isEdit ? 'Updating customer...' : 'Adding customer...'}</Text>
            </View>
          </View>
        )}

        {/* Full Screen Loading Overlay for Deleting */}
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text style={styles.loadingText}>Deleting customer...</Text>
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
    // For Android, base padding on status bar + screen-relative padding
    return statusBarHeight + (screenHeight > 800 ? 30 : 25);
  } else {
    // For iOS, use screen-relative padding
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
  deleteButtonBottom: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyItem: {
    paddingVertical: 12,
  },
  historyItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 12,
    paddingTop: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 13,
    color: '#1a5490',
    fontWeight: '600',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  historyProducts: {
    marginBottom: 8,
  },
  historyProduct: {
    fontSize: 13,
    color: '#1a5490',
    marginBottom: 3,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyStatusPaid: {
    color: '#34C759',
  },
  historyStatusDue: {
    color: '#FF3B30',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0cf80',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
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
    color: '#1a5490',
    marginTop: 6,
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#e0cf80',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a5490',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  suggestionImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionImagePlaceholderText: {
    fontSize: 24,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: 13,
    color: '#1a5490',
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
    color: '#1a5490',
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
    color: '#1a5490',
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
