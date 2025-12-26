import React, { useState, useEffect } from 'react';
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
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductsStore, SupabaseProduct as CatalogProduct } from '../store/productsStore';
import { useCustomersStore } from '../store/customersStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';

interface CreateSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (saleData: any) => void;
}

interface SaleProduct {
  brand: string;
  name: string;
  size: string;
  quantity: string;
  unitCost: number;
  salePrice: string;
  amountPaid: string; // Amount paid for THIS product
  catalogProductId?: string;
  showCost?: boolean; // Toggle to show/hide cost
  peekCost?: boolean; // Temporary peek at cost (triple-tap)
}

export default function CreateSaleModal({
  visible,
  onClose,
  onSubmit,
}: CreateSaleModalProps) {
  const { t } = useTranslation();
  const { products: catalogProducts, searchProducts, loadProducts } = useProductsStore();
  const { customers, searchCustomers, loadCustomers, addCustomer } = useCustomersStore();
  const { usdToDop } = useExchangeRateStore();

  // Load products and customers when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (catalogProducts.length === 0) {
        loadProducts();
      }
      if (customers.length === 0) {
        loadCustomers();
      }
    }
  }, [visible]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  // New customer fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Sale products
  const [products, setProducts] = useState<SaleProduct[]>([
    { brand: '', name: '', size: '', quantity: '', unitCost: 0, salePrice: '', amountPaid: '', showCost: false, peekCost: false }
  ]);

  // Product search
  const [productSearches, setProductSearches] = useState<{ [key: number]: string }>({});
  const [showSuggestions, setShowSuggestions] = useState<number>(-1);

  // Triple-tap detection for peeking at cost
  const [tapCounts, setTapCounts] = useState<{ [key: number]: number }>({});
  const [tapTimers, setTapTimers] = useState<{ [key: number]: NodeJS.Timeout | null }>({});

  // Notes
  const [notes, setNotes] = useState('');

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const getCustomerSuggestions = () => {
    if (!customerSearch || customerSearch.length < 2) return [];
    return searchCustomers(customerSearch).slice(0, 5);
  };

  const getProductSuggestions = (index: number): CatalogProduct[] => {
    const query = productSearches[index] || '';
    if (!query || query.length < 2) return [];
    const results = searchProducts(query);
    return results.slice(0, 10);
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerSuggestions(false);
    setIsAddingNewCustomer(false);
  };

  const handleAddNewCustomer = () => {
    setIsAddingNewCustomer(true);
    setSelectedCustomer(null);
    setShowCustomerSuggestions(false);
  };

  const handleSearchChange = (index: number, text: string) => {
    const newSearchQuery = { ...productSearches, [index]: text };
    setProductSearches(newSearchQuery);
    setShowSuggestions(text.length >= 2 ? index : -1);
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
    setNewCustomerPhone(formatted);
  };

  const selectProduct = (index: number, catalogProduct: CatalogProduct) => {
    const newProducts = [...products];
    // Prepopulate with sale_price if available, otherwise use cost * 2
    const defaultPrice = catalogProduct.sale_price || (catalogProduct.cost * 2);
    newProducts[index] = {
      brand: catalogProduct.brand,
      name: catalogProduct.name,
      size: catalogProduct.size,
      unitCost: catalogProduct.cost,
      quantity: newProducts[index].quantity,
      salePrice: defaultPrice.toString(),
      amountPaid: newProducts[index].amountPaid,
      catalogProductId: catalogProduct.id,
      showCost: false,
    };
    setProducts(newProducts);

    // Clear search query when product is selected
    const newSearchQuery = { ...productSearches };
    delete newSearchQuery[index];
    setProductSearches(newSearchQuery);

    setShowSuggestions(-1);
  };

  const clearProductSelection = (index: number) => {
    const newProducts = [...products];
    newProducts[index] = {
      brand: '',
      name: '',
      size: '',
      unitCost: 0,
      quantity: newProducts[index].quantity,
      salePrice: '',
      amountPaid: newProducts[index].amountPaid,
      catalogProductId: undefined,
      showCost: false,
    };
    setProducts(newProducts);

    // Clear search query to show search field again
    const newSearchQuery = { ...productSearches };
    delete newSearchQuery[index];
    setProductSearches(newSearchQuery);
  };

  const toggleShowCost = (index: number) => {
    const newProducts = [...products];
    newProducts[index].showCost = !newProducts[index].showCost;
    setProducts(newProducts);
  };

  const handleTripleTap = (index: number) => {
    // Clear existing timer for this index
    if (tapTimers[index]) {
      clearTimeout(tapTimers[index]!);
    }

    // Increment tap count
    const currentCount = (tapCounts[index] || 0) + 1;
    setTapCounts({ ...tapCounts, [index]: currentCount });

    // If 3 taps, show cost for 2 seconds
    if (currentCount === 3) {
      const newProducts = [...products];
      newProducts[index].peekCost = true;
      setProducts(newProducts);

      // Hide after 1.5 seconds
      setTimeout(() => {
        const updatedProducts = [...products];
        updatedProducts[index].peekCost = false;
        setProducts(updatedProducts);
      }, 1500);

      // Reset tap count
      setTapCounts({ ...tapCounts, [index]: 0 });
    } else {
      // Reset tap count after 500ms of no taps
      const timer = setTimeout(() => {
        setTapCounts({ ...tapCounts, [index]: 0 });
      }, 500);
      setTapTimers({ ...tapTimers, [index]: timer });
    }
  };

  const addProduct = () => {
    setProducts([...products, {
      brand: '',
      name: '',
      size: '',
      quantity: '',
      unitCost: 0,
      salePrice: '',
      amountPaid: '',
      showCost: false,
      peekCost: false,
    }]);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) {
      Alert.alert(t('common.error'), t('modals.createSale.atLeastOneProduct'));
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof SaleProduct, value: string | number) => {
    const newProducts = [...products];
    (newProducts[index][field] as any) = value;
    setProducts(newProducts);
  };

  const calculateTotals = () => {
    const totalCost = products.reduce((sum, p) => {
      const cost = p.unitCost * (parseInt(p.quantity) || 0);
      return sum + cost;
    }, 0);

    const totalRevenue = products.reduce((sum, p) => {
      const revenue = (parseFloat(p.salePrice) || 0) * (parseInt(p.quantity) || 0);
      return sum + revenue;
    }, 0);

    const profit = totalRevenue - totalCost;

    // Calculate total amount paid across all products
    const paid = products.reduce((sum, p) => {
      const productTotal = (parseFloat(p.salePrice) || 0) * (parseInt(p.quantity) || 0);
      const productPaid = parseFloat(p.amountPaid) || 0;
      // Can't pay more than the product total
      return sum + Math.min(productPaid, productTotal);
    }, 0);
    
    const balance = totalRevenue - paid;

    return { totalCost, totalRevenue, profit, paid, balance };
  };

  const handleSubmit = async () => {
    // Validate customer
    if (!selectedCustomer && !isAddingNewCustomer) {
      Alert.alert(t('common.error'), t('modals.createSale.selectOrAddCustomer'));
      return;
    }

    if (isAddingNewCustomer) {
      if (!newCustomerName.trim()) {
        Alert.alert(t('common.error'), t('modals.createSale.enterCustomerName'));
        return;
      }
      if (!newCustomerPhone.trim()) {
        Alert.alert(t('common.error'), t('modals.createSale.enterCustomerPhone'));
        return;
      }
    }

    // Validate products
    const hasInvalidProducts = products.some(p => !p.catalogProductId);
    if (hasInvalidProducts) {
      Alert.alert(t('common.error'), t('modals.createSale.selectAllProducts'));
      return;
    }

    const hasEmptyFields = products.some(p => !p.quantity || !p.salePrice || !p.amountPaid);
    if (hasEmptyFields) {
      Alert.alert(t('common.error'), t('modals.createSale.fillAllFields'));
      return;
    }

    setIsSaving(true);

    try {
      const { totalCost, totalRevenue, profit, paid, balance } = calculateTotals();

      const paymentStatus = balance === 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending');

      // Save new customer to database if adding
      let customerData = selectedCustomer;
      if (isAddingNewCustomer) {
        await addCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          balance: 0,
          wishlist: [],
          totalPurchases: 0,
        });
        // Use the newly added customer (it will be at the end of the customers array after adding)
        customerData = { name: newCustomerName.trim(), phone: newCustomerPhone.trim(), isNew: true };
      }

      const currentDate = new Date().toISOString();

      const saleData = {
        customer: customerData,
        products: products.map(p => {
          const productTotal = parseFloat(p.salePrice) * parseInt(p.quantity);
          const productPaid = parseFloat(p.amountPaid);
          const productBalance = productTotal - productPaid;
          const productStatus = productBalance === 0 ? 'paid' : (productPaid > 0 ? 'partial' : 'pending');

          return {
            brand: p.brand,
            name: p.name,
            size: p.size,
            quantity: parseInt(p.quantity),
            unitCost: p.unitCost,
            soldPrice: parseFloat(p.salePrice),
            amountPaid: productPaid,
            balance: productBalance,
            paymentStatus: productStatus,
            catalogProductId: p.catalogProductId,
          };
        }),
        totalCost,
        totalRevenue,
        profit,
        amountPaid: paid,
        paymentStatus,
        notes: notes.trim(),
        date: currentDate,
      };

      await onSubmit(saleData);
      Alert.alert('Success', 'Sale created successfully!');
      resetForm();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerSearch('');
    setSelectedCustomer(null);
    setIsAddingNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setProducts([{ brand: '', name: '', size: '', quantity: '', unitCost: 0, salePrice: '', amountPaid: '', showCost: false, peekCost: false }]);
    setProductSearches({});
    setShowSuggestions(-1);
    setTapCounts({});
    setTapTimers({});
    setNotes('');
  };

  const hasUnsavedChanges = () => {
    return (
      products.some(p => p.brand || p.name || p.salePrice || p.quantity || p.amountPaid) ||
      selectedCustomer ||
      isAddingNewCustomer ||
      notes
    );
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        t('modals.createSale.discardChanges'),
        t('modals.createSale.unsavedChangesWarning'),
        [
          { text: t('modals.createSale.keepEditing'), style: 'cancel' },
          {
            text: t('modals.createSale.discard'),
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

  const customerSuggestions = getCustomerSuggestions();
  const { totalCost, totalRevenue, profit, paid, balance } = calculateTotals();

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
          <TouchableOpacity onPress={handleCancel} disabled={isSaving} style={styles.headerButton}>
            <Text style={[styles.cancelButton, isSaving && styles.disabledButton]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('sales.newSale')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Customer Section */}
          <Text style={styles.sectionTitle}>{t('sales.customer')}</Text>
          <View style={styles.card}>
            {selectedCustomer ? (
              // Show selected customer with Edit button
              <View style={styles.selectedCustomerCard}>
                <View style={styles.selectedCustomerInfo}>
                  <Text style={styles.selectedLabel}>{t('modals.createSale.selectedCustomer')}</Text>
                  <Text style={styles.selectedName}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedPhone}>{selectedCustomer.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editCustomerButton}
                  onPress={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                    setShowCustomerSuggestions(false);
                  }}
                >
                  <Text style={styles.editCustomerButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>
            ) : isAddingNewCustomer ? (
              // Show new customer form
              <>
                <View style={styles.newCustomerHeader}>
                  <Text style={styles.newCustomerTitle}>{t('modals.createSale.newCustomerDetails')}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddingNewCustomer(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                    }}
                  >
                    <Text style={styles.cancelNewCustomerText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>{t('modals.createSale.fullName')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('modals.createSale.enterCustomerNamePlaceholder')}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                />

                <Text style={styles.label}>{t('modals.createSale.phoneNumber')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XXX-XXX-XXXX"
                  value={newCustomerPhone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </>
            ) : (
              // Show search field
              <>
                <Text style={styles.label}>{t('modals.createSale.searchCustomer')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('modals.createSale.searchByNameOrPhone')}
                  value={customerSearch}
                  onChangeText={(text) => {
                    setCustomerSearch(text);
                    setShowCustomerSuggestions(text.length > 0);
                  }}
                  onFocus={() => setShowCustomerSuggestions(customerSearch.length > 0)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                />

                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView style={styles.suggestionsList} nestedScrollEnabled keyboardShouldPersistTaps="always">
                      {customerSuggestions.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          style={styles.suggestionItem}
                          onPress={() => handleCustomerSelect(customer)}
                        >
                          <Text style={styles.suggestionName}>{customer.name}</Text>
                          <Text style={styles.suggestionPhone}>{customer.phone}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {showCustomerSuggestions && customerSuggestions.length === 0 && customerSearch.length > 0 && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>{t('modals.createSale.customerNotFound')}</Text>
                    <TouchableOpacity
                      style={styles.addNewCustomerButton}
                      onPress={handleAddNewCustomer}
                    >
                      <Text style={styles.addNewCustomerButtonText}>{t('modals.createSale.addNewCustomer')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Products Section */}
          <Text style={styles.sectionTitle}>{t('sales.products')}</Text>
          {products.map((product, index) => {
            const suggestions = getProductSuggestions(index);

            return (
              <View key={index} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <TouchableOpacity onPress={() => handleTripleTap(index)} activeOpacity={0.7}>
                    <Text style={styles.productNumber}>{t('modals.createSale.product')} {index + 1}</Text>
                  </TouchableOpacity>
                  {products.length > 1 && (
                    <TouchableOpacity onPress={() => removeProduct(index)}>
                      <Text style={styles.removeButton}>✕ {t('modals.createSale.remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Peek Cost - shows for 1.5 seconds after triple-tap */}
                {product.peekCost && product.catalogProductId && (
                  <View style={styles.peekCostBanner}>
                    <Text style={styles.peekCostText}>
                      💰 ${product.unitCost.toFixed(2)} USD (${(product.unitCost * usdToDop).toFixed(2)} DOP)
                    </Text>
                  </View>
                )}

                {/* Product Selection */}
                {!product.catalogProductId ? (
                  <>
                    <Text style={styles.label}>{t('modals.createSale.searchProduct')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('modals.createSale.typeBrandOrProduct')}
                      value={productSearches[index] || ''}
                      onChangeText={(text) => handleSearchChange(index, text)}
                      onFocus={() => {
                        if ((productSearches[index] || '').length >= 2) {
                          setShowSuggestions(index);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow clicking suggestions
                        setTimeout(() => {
                          setShowSuggestions(-1);
                        }, 500);
                      }}
                    />

                    {/* Product Suggestions */}
                    {showSuggestions === index && suggestions.length > 0 && (
                      <View style={styles.productSuggestionsContainer}>
                        <ScrollView
                          style={styles.suggestionsList}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="always"
                        >
                          {suggestions.map((catalogProduct) => (
                            <TouchableOpacity
                              key={catalogProduct.id}
                              style={styles.productSuggestionItem}
                              onPress={() => selectProduct(index, catalogProduct)}
                              activeOpacity={0.7}
                            >
                              <View pointerEvents="none" style={styles.productSuggestionContent}>
                                {catalogProduct.image_url ? (
                                  <Image
                                    source={{ uri: catalogProduct.image_url }}
                                    style={styles.suggestionImage}
                                  />
                                ) : (
                                  <View style={styles.suggestionImagePlaceholder}>
                                    <Text style={styles.suggestionImagePlaceholderText}>📦</Text>
                                  </View>
                                )}
                                <View style={styles.suggestionTextContainer}>
                                  <Text style={styles.suggestionName}>
                                    {catalogProduct.brand} - {catalogProduct.name}
                                  </Text>
                                  <Text style={styles.suggestionPhone}>
                                    {catalogProduct.size} • ${catalogProduct.sale_price || catalogProduct.cost}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.noProductInfo}>
                      <Text style={styles.noProductText}>
                        ⚠️ {t('modals.createSale.searchSelectProduct')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>{t('modals.createSale.selectedProduct')}</Text>
                    <View style={styles.selectedProductCard}>
                      {/* Product Image */}
                      <View style={styles.selectedProductImageContainer}>
                        {product.catalogProductId && catalogProducts.find(p => p.id === product.catalogProductId)?.image_url ? (
                          <Image
                            source={{ uri: catalogProducts.find(p => p.id === product.catalogProductId)!.image_url }}
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
                          {product.size}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editProductButton}
                        onPress={() => clearProductSelection(index)}
                      >
                        <Text style={styles.editProductButtonText}>{t('common.edit')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Show fields only if product is selected */}
                {product.catalogProductId && (
                  <>
                  <View style={styles.threeColumnRow}>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>{t('modals.createSale.qty')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={product.quantity}
                        onChangeText={(value) => updateProduct(index, 'quantity', value)}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>{t('modals.createSale.priceDollar')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={product.salePrice}
                        onChangeText={(value) => updateProduct(index, 'salePrice', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.thirdWidth}>
                      <Text style={styles.label}>{t('modals.createSale.paidDollar')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={product.amountPaid}
                        onChangeText={(value) => updateProduct(index, 'amountPaid', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                    {/* Toggle Unit Cost */}
                    <TouchableOpacity
                      style={styles.showCostButton}
                      onPress={() => toggleShowCost(index)}
                    >
                      <Text style={styles.showCostButtonText}>
                        {product.showCost ? `▼ ${t('modals.createSale.hideUnitCost')}` : `▶ ${t('modals.createSale.showUnitCost')}`}
                      </Text>
                    </TouchableOpacity>

                    {product.showCost && (
                      <View style={styles.unitCostContainer}>
                        <Text style={styles.unitCostLabel}>{t('modals.createSale.unitCost')}</Text>
                        <Text style={styles.unitCostValue}>${product.unitCost.toFixed(2)}</Text>
                      </View>
                    )}

                   {product.quantity && product.salePrice && (
                     <View style={styles.productTotalSection}>
                       <View style={styles.productTotalRow}>
                         <Text style={styles.productTotalLabel}>{t('modals.createSale.total')}</Text>
                         <Text style={styles.productTotalValue}>
                           ${(parseFloat(product.salePrice) * parseInt(product.quantity || '0')).toFixed(2)}
                         </Text>
                       </View>
                       {product.amountPaid && (
                         <>
                           <View style={styles.productTotalRow}>
                             <Text style={styles.costLabel}>{t('modals.createSale.paid')}</Text>
                             <Text style={styles.costValue}>
                               ${parseFloat(product.amountPaid).toFixed(2)}
                             </Text>
                           </View>
                           <View style={[styles.productTotalRow, styles.balanceRow]}>
                             <Text style={styles.balanceLabel}>{t('sales.balance')}</Text>
                             <Text style={styles.balanceValue}>
                               ${((parseFloat(product.salePrice) * parseInt(product.quantity || '0')) - parseFloat(product.amountPaid)).toFixed(2)}
                             </Text>
                           </View>
                         </>
                       )}
                     </View>
                   )}
                  </>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
            <Text style={styles.addProductButtonText}>{t('modals.createSale.addAnotherProduct')}</Text>
          </TouchableOpacity>

          {/* Sale Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('modals.createSale.saleSummary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('modals.createSale.totalAmount')}</Text>
              <Text style={styles.summaryValue}>${totalRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('sales.amountPaid')}</Text>
              <Text style={styles.summaryValue}>${paid.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('modals.createSale.balanceDue')}</Text>
              <Text style={styles.totalValue}>${balance.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>{t('modals.createSale.notesOptional')}</Text>
          <View style={styles.card}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('modals.createSale.addNotesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Complete Sale Button */}
        <View style={styles.completeSaleContainer}>
          <TouchableOpacity
            style={[styles.completeSaleButton, isSaving && styles.disabledCompleteSaleButton]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Text style={styles.completeSaleButtonText}>{t('modals.createSale.completeSale')}</Text>
          </TouchableOpacity>
        </View>

        {/* Full Screen Loading Overlay */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.loadingText}>Creating sale...</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: getHeaderPaddingTop(),
    paddingBottom: 20,
    backgroundColor: '#1a5490',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  headerButton: {
    minWidth: 70,
  },
  cancelButton: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    fontSize: 15,
    color: '#00ffff',
    fontWeight: '600',
  },
  completeSaleContainer: {
    backgroundColor: '#1a5490',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  completeSaleButton: {
    backgroundColor: '#e0cf80',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  completeSaleButtonText: {
    color: '#1a5490',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
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
    borderColor: '#1a5490',
    maxHeight: 200,
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
    color: '#1a5490',
    marginBottom: 2,
  },
  suggestionPhone: {
    fontSize: 13,
    color: '#1a5490',
  },
  noResults: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  addNewCustomerButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNewCustomerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  selectedCustomerInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  selectedPhone: {
    fontSize: 13,
    color: '#2E7D32',
    marginTop: 2,
  },
  editCustomerButton: {
    backgroundColor: '#1a5490',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  editCustomerButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  newCustomerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  newCustomerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34C759',
  },
  cancelNewCustomerText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  newCustomerFields: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  productCard: {
    backgroundColor: '#e0cf80',
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
    color: '#1a5490',
  },
  removeButton: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  productSuggestionsContainer: {
    marginTop: 6,
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
  productSuggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productSuggestionContent: {
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
    backgroundColor: '#1a5490',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editProductButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  halfWidth: {
    flex: 1,
  },
  showCostButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  showCostButtonText: {
    fontSize: 12,
    color: '#1a5490',
    fontWeight: '600',
  },
  unitCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  unitCostLabel: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  unitCostValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  threeColumnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  thirdWidth: {
    flex: 1,
  },
  productTotalSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  productTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  costLabel: {
    fontSize: 12,
    color: '#1a5490',
  },
  costValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a5490',
  },
  balanceRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  addProductButton: {
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1a5490',
    borderStyle: 'dashed',
  },
  addProductButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a5490',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#1a5490',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a5490',
  },
  profitLabel: {
    fontWeight: '600',
  },
  profitValue: {
    color: '#34C759',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1a5490',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  bottomSpacer: {
    height: 20,
  },
  peekCostBanner: {
    backgroundColor: '#FFF3CD',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    alignItems: 'center',
  },
  peekCostText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
  },
  disabledCompleteSaleButton: {
    opacity: 0.5,
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
