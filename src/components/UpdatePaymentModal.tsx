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
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface UpdatePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (updatedPayments: { [productIndex: number]: number }) => void;
  sale: {
    id: string;
    customerName: string;
    products: Array<{
      name: string;
      brand: string;
      quantity: number;
      soldPrice: number;
      amountPaid?: number;
      balance?: number;
    }>;
    totalRevenue: number;
    amountPaid: number;
  } | null;
}

export default function UpdatePaymentModal({ visible, onClose, onSubmit, sale }: UpdatePaymentModalProps) {
  const { t } = useTranslation();
  const [productPayments, setProductPayments] = useState<{ [index: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset payment fields when modal opens/closes
  useEffect(() => {
    if (!visible) {
      // Reset when modal closes
      setProductPayments({});
    }
    // Don't pre-populate - leave fields empty for new payments
  }, [visible, sale]);

  if (!sale) return null;

  const handlePaymentChange = (index: number, value: string) => {
    setProductPayments(prev => ({ ...prev, [index]: value }));
  };

  const quickFillAmount = (index: number, amount: number) => {
    setProductPayments(prev => ({ ...prev, [index]: amount.toFixed(2) }));
  };

  const clearPayment = (index: number) => {
    setProductPayments(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleMarkAllPaid = () => {
    Alert.alert(
      t('modals.updatePayment.payAllBalances'),
      t('modals.updatePayment.payAllConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('modals.updatePayment.payAll'),
          onPress: async () => {
            setIsSaving(true);
            try {
              // Set all products to fully paid
              const fullPayments: { [index: number]: number } = {};
              sale.products.forEach((product, index) => {
                const productTotal = product.soldPrice * product.quantity;
                fullPayments[index] = productTotal;
              });
              await onSubmit(fullPayments);
              Alert.alert('Success', 'All balances paid in full!');
              resetForm();
            } catch (error) {
              console.error('Error paying all balances:', error);
              Alert.alert('Error', 'Failed to update payment. Please try again.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const updates: { [index: number]: number } = {};

    Object.entries(productPayments).forEach(([indexStr, valueStr]) => {
      const index = parseInt(indexStr);
      const additionalPayment = parseFloat(valueStr);
      if (!isNaN(additionalPayment) && additionalPayment > 0) {
        const product = sale.products[index];
        const productTotal = product.soldPrice * product.quantity;

        // Calculate current paid amount (proportional or actual)
        let currentPaid = product.amountPaid || 0;
        if (currentPaid === 0 && sale.amountPaid > 0) {
          const saleTotal = sale.products.reduce((sum, p) => sum + (p.soldPrice * p.quantity), 0);
          const productPercentage = productTotal / saleTotal;
          currentPaid = sale.amountPaid * productPercentage;
        }

        // Calculate new total by adding additional payment to current paid
        const newTotal = currentPaid + additionalPayment;

        if (newTotal > productTotal) {
          Alert.alert(t('common.error'), t('modals.updatePayment.paymentExceedsTotal', { product: `${product.brand} ${product.name}` }));
          return;
        }

        updates[index] = newTotal; // New total after adding additional payment
      }
    });

    if (Object.keys(updates).length === 0) {
      Alert.alert(t('common.error'), t('modals.updatePayment.noChanges'));
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit(updates);
      Alert.alert('Success', 'Payment updated successfully!');
      resetForm();
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', 'Failed to update payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setProductPayments({});
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Calculate summary
  const totalBalance = sale.totalRevenue - sale.amountPaid;
  const totalPaymentChange = Object.entries(productPayments).reduce((sum, [index, valueStr]) => {
    const additionalPayment = parseFloat(valueStr) || 0;
    return sum + additionalPayment; // Sum up all additional payments
  }, 0);
  const remainingAfterPayment = totalBalance - totalPaymentChange;

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
          <Text style={styles.title}>{t('sales.updatePayment')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Customer Info */}
          <View style={styles.customerCard}>
            <View>
              <Text style={styles.customerLabel}>{t('sales.customer')}</Text>
              <Text style={styles.customerName}>{sale.customerName}</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceLabel}>{t('modals.updatePayment.outstanding')}</Text>
              <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            </View>
          </View>

          {/* Products with Individual Payments */}
          {/* Separate products into unpaid and paid */}
          {(() => {
            const productsWithStatus = sale.products.map((product, index) => {
              const productTotal = product.soldPrice * product.quantity;
              let productPaid = product.amountPaid || 0;

              // If no product-level payment but sale has payment, calculate proportionally
              if (productPaid === 0 && sale.amountPaid > 0) {
                const saleTotal = sale.products.reduce((sum, p) => sum + (p.soldPrice * p.quantity), 0);
                const productPercentage = productTotal / saleTotal;
                productPaid = sale.amountPaid * productPercentage;
              }

              const productBalance = productTotal - productPaid;
              const isPaid = productBalance === 0;

              return { product, index, productTotal, productPaid, productBalance, isPaid };
            });

            const unpaidProducts = productsWithStatus.filter(p => !p.isPaid);
            const paidProducts = productsWithStatus.filter(p => p.isPaid);

            return (
              <>
                {/* Outstanding Balances Section */}
                {unpaidProducts.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>{t('modals.updatePayment.outstandingBalances')}</Text>
                    {unpaidProducts.map(({ product, index, productTotal, productPaid, productBalance }) => {
                      const enteredAmount = parseFloat(productPayments[index]) || 0;
                      const paymentChange = enteredAmount;
                      const newBalance = productBalance - enteredAmount;

                      return (
                        <View key={index} style={styles.productCard}>
                          <View style={styles.productHeader}>
                            <Text style={styles.productName}>
                              {product.quantity}× {product.brand} {product.name}
                            </Text>
                            <Text style={styles.productPrice}>${productTotal.toFixed(2)}</Text>
                          </View>

                          <View style={styles.statusRow}>
                            <View style={styles.statusItem}>
                              <Text style={styles.statusLabel}>{t('modals.updatePayment.paid')}</Text>
                              <Text style={styles.statusValue}>${productPaid.toFixed(2)}</Text>
                            </View>
                            <View style={styles.statusItem}>
                              <Text style={styles.statusLabelDue}>{t('modals.updatePayment.due')}</Text>
                              <Text style={styles.statusValueDue}>${productBalance.toFixed(2)}</Text>
                            </View>
                          </View>

                          <View style={styles.divider} />

                          <Text style={styles.inputLabel}>{t('modals.updatePayment.amountToPay')}</Text>
                          <View style={styles.paymentRow}>
                            <View style={styles.inputRow}>
                              <Text style={styles.dollarSign}>$</Text>
                              <TextInput
                                style={styles.paymentInput}
                                placeholder="0.00"
                                value={productPayments[index] || ''}
                                onChangeText={(value) => handlePaymentChange(index, value)}
                                keyboardType="decimal-pad"
                              />
                              {productPayments[index] && (
                                <TouchableOpacity
                                  style={styles.clearButton}
                                  onPress={() => clearPayment(index)}
                                >
                                  <Text style={styles.clearButtonText}>✕</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {/* Pay Full Button */}
                            <TouchableOpacity
                              style={styles.payFullButton}
                              onPress={() => quickFillAmount(index, productBalance)}
                            >
                              <Text style={styles.payFullButtonText}>{t('modals.updatePayment.payFull')}</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Preview New Balance */}
                          {enteredAmount > 0 && (
                            <View style={styles.previewBox}>
                              <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>{t('modals.updatePayment.paying')}</Text>
                                <Text style={styles.previewValue}>
                                  +${paymentChange.toFixed(2)}
                                </Text>
                              </View>
                              <View style={[styles.previewRow, styles.newBalanceRow]}>
                                <Text style={styles.newBalanceLabel}>{t('modals.updatePayment.remainingBalance')}</Text>
                                <Text style={[styles.newBalanceValue, newBalance === 0 && styles.newBalancePaid]}>
                                  ${newBalance.toFixed(2)} {newBalance === 0 && '✓'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {/* Paid Products Section */}
                {paidProducts.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, styles.paidSectionTitle]}>{t('modals.updatePayment.paidInFull')}</Text>
                    {paidProducts.map(({ product, index, productTotal, productPaid }) => (
                      <View key={index} style={[styles.productCard, styles.paidProductCard]}>
                        <View style={styles.productHeader}>
                          <Text style={[styles.productName, styles.paidProductName]}>
                            {product.quantity}× {product.brand} {product.name}
                          </Text>
                          <Text style={[styles.productPrice, styles.paidProductPrice]}>
                            ${productTotal.toFixed(2)}
                          </Text>
                        </View>

                        <View style={styles.paidBadge}>
                          <Text style={styles.paidBadgeText}>✓ {t('modals.updatePayment.paidAmount', { amount: productPaid.toFixed(2) })}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            );
          })()}

          {/* No outstanding balances message */}
          {sale.products.every(p => {
            const productTotal = p.soldPrice * p.quantity;

            // Calculate current paid amount (proportional or actual)
            let productPaid = p.amountPaid || 0;
            if (productPaid === 0 && sale.amountPaid > 0) {
              const saleTotal = sale.products.reduce((sum, prod) => sum + (prod.soldPrice * prod.quantity), 0);
              const productPercentage = productTotal / saleTotal;
              productPaid = sale.amountPaid * productPercentage;
            }

            return productTotal === productPaid;
          }) && (
            <View style={styles.nothingDueCard}>
              <Text style={styles.nothingDueText}>{t('modals.updatePayment.allPaidInFull')}</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Payment Summary Footer */}
        <View style={styles.footer}>
          {totalPaymentChange > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t('modals.updatePayment.totalPayment')}: ${totalPaymentChange.toFixed(2)}
              </Text>
              <Text style={styles.summaryDivider}>•</Text>
              <Text style={[styles.summaryLabel, remainingAfterPayment === 0 && styles.summaryLabelPaid]}>
                {t('modals.updatePayment.remaining')}: ${remainingAfterPayment.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.footerButtons}>
            {totalBalance > 0 && (
              <TouchableOpacity
                style={[styles.payAllButton, isSaving && styles.submitButtonDisabled]}
                onPress={handleMarkAllPaid}
                disabled={isSaving}
              >
                <Text style={styles.payAllButtonText}>{t('modals.updatePayment.payAll')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitButton, (totalPaymentChange === 0 || isSaving) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={totalPaymentChange === 0 || isSaving}
            >
              <Text style={styles.submitButtonText}>
                {totalPaymentChange > 0 ? t('modals.updatePayment.savePayment') : t('modals.updatePayment.enterAmount')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Screen Loading Overlay */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.loadingText}>Updating payment...</Text>
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
  content: {
    flex: 1,
    padding: 12,
  },
  customerCard: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e0cf80',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCard: {
    backgroundColor: '#e0cf80',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a5490',
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5490',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 11,
    color: '#1a5490',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34C759',
  },
  statusLabelDue: {
    fontSize: 11,
    color: '#1a5490',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValueDue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a5490',
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputRow: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1a5490',
    paddingHorizontal: 12,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a5490',
    marginRight: 4,
  },
  paymentInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a5490',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  payFullButton: {
    flex: 0.35,
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  payFullButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  previewBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
  },
  newBalanceRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(230, 81, 0, 0.2)',
    marginBottom: 0,
  },
  newBalanceLabel: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: 'bold',
  },
  newBalanceValue: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: 'bold',
  },
  newBalancePaid: {
    color: '#2E7D32',
  },
  nothingDueCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  nothingDueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  footer: {
    backgroundColor: '#1a5490',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  summaryLabelPaid: {
    color: '#34C759',
  },
  summaryDivider: {
    fontSize: 13,
    color: '#ccc',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  payAllButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  payAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
  paidSectionTitle: {
    color: '#2E7D32',
    marginTop: 16,
  },
  paidProductCard: {
    backgroundColor: '#F1F8F4',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    opacity: 0.85,
  },
  paidProductName: {
    color: '#666',
  },
  paidProductPrice: {
    color: '#2E7D32',
  },
  paidBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 125, 50, 0.2)',
    alignItems: 'center',
  },
  paidBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
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