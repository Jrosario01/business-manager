import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';

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
  const [productPayments, setProductPayments] = useState<{ [index: number]: string }>({});

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
      'Pay All Outstanding Balances',
      'This will mark all products as fully paid. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay All',
          onPress: () => {
            // Set all products to fully paid
            const fullPayments: { [index: number]: number } = {};
            sale.products.forEach((product, index) => {
              const productTotal = product.soldPrice * product.quantity;
              fullPayments[index] = productTotal;
            });
            onSubmit(fullPayments);
            resetForm();
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    const updates: { [index: number]: number } = {};

    Object.entries(productPayments).forEach(([indexStr, valueStr]) => {
      const index = parseInt(indexStr);
      const value = parseFloat(valueStr);
      if (!isNaN(value) && value > 0) {
        const product = sale.products[index];
        const productTotal = product.soldPrice * product.quantity;
        const currentPaid = product.amountPaid || 0;
        const newTotalPaid = currentPaid + value;

        if (newTotalPaid > productTotal) {
          Alert.alert('Error', `Payment for ${product.brand} ${product.name} exceeds total amount`);
          return;
        }

        updates[index] = newTotalPaid;
      }
    });

    if (Object.keys(updates).length === 0) {
      Alert.alert('Error', 'Please enter at least one payment amount');
      return;
    }

    onSubmit(updates);
    resetForm();
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
  const totalPaymentEntered = Object.entries(productPayments).reduce((sum, [indexStr, valueStr]) => {
    const value = parseFloat(valueStr);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  const remainingAfterPayment = totalBalance - totalPaymentEntered;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Update Payment</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Customer Info */}
          <View style={styles.customerCard}>
            <View>
              <Text style={styles.customerLabel}>Customer</Text>
              <Text style={styles.customerName}>{sale.customerName}</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceLabel}>Outstanding</Text>
              <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            </View>
          </View>

          {/* Products with Individual Payments */}
          <Text style={styles.sectionTitle}>Outstanding Balances</Text>

          {sale.products.map((product, index) => {
            const productTotal = product.soldPrice * product.quantity;
            const productPaid = product.amountPaid || 0;
            const productBalance = productTotal - productPaid;
            const isPaid = productBalance === 0;
            const paymentAmount = parseFloat(productPayments[index]) || 0;
            const newBalance = productBalance - paymentAmount;

            if (isPaid) return null; // Don't show paid products

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
                    <Text style={styles.statusLabel}>Paid</Text>
                    <Text style={styles.statusValue}>${productPaid.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabelDue}>Due</Text>
                    <Text style={styles.statusValueDue}>${productBalance.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.inputLabel}>Payment Amount</Text>
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
                    <Text style={styles.payFullButtonText}>Pay Full</Text>
                  </TouchableOpacity>
                </View>

                {/* Preview New Balance */}
                {paymentAmount > 0 && (
                  <View style={styles.previewBox}>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Payment:</Text>
                      <Text style={styles.previewValue}>-${paymentAmount.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.previewRow, styles.newBalanceRow]}>
                      <Text style={styles.newBalanceLabel}>New Balance:</Text>
                      <Text style={[styles.newBalanceValue, newBalance === 0 && styles.newBalancePaid]}>
                        ${newBalance.toFixed(2)} {newBalance === 0 && '✓'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* No outstanding balances message */}
          {sale.products.every(p => {
            const productTotal = p.soldPrice * p.quantity;
            const productPaid = p.amountPaid || 0;
            return productTotal === productPaid;
          }) && (
            <View style={styles.nothingDueCard}>
              <Text style={styles.nothingDueText}>✓ All products paid in full</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Payment Summary Footer */}
        <View style={styles.footer}>
          {totalPaymentEntered > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment: ${totalPaymentEntered.toFixed(2)}</Text>
              <Text style={styles.summaryDivider}>•</Text>
              <Text style={[styles.summaryLabel, remainingAfterPayment === 0 && styles.summaryLabelPaid]}>
                Remaining: ${remainingAfterPayment.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.footerButtons}>
            {totalBalance > 0 && (
              <TouchableOpacity
                style={styles.payAllButton}
                onPress={handleMarkAllPaid}
              >
                <Text style={styles.payAllButtonText}>Pay All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitButton, totalPaymentEntered === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={totalPaymentEntered === 0}
            >
              <Text style={styles.submitButtonText}>
                {totalPaymentEntered > 0 ? 'Record Payment' : 'Enter Amount'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 15,
    color: '#34C759',
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
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCard: {
    backgroundColor: 'white',
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
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
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
    color: '#666',
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
    color: '#666',
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
    color: '#666',
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
    borderColor: '#007AFF',
    paddingHorizontal: 12,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 4,
  },
  paymentInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
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
    color: '#666',
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
});