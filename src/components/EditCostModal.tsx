import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useShipmentsStore } from '../store/shipmentsStore';
import { supabase } from '../config/supabase';

interface EditCostModalProps {
  visible: boolean;
  onClose: () => void;
  shipmentItemId: string;
  currentCost: number;
  productName: string;
  quantity: number;
  remainingInventory: number;
  shipmentId: string;
}

export default function EditCostModal({
  visible,
  onClose,
  shipmentItemId,
  currentCost,
  productName,
  quantity,
  remainingInventory,
  shipmentId,
}: EditCostModalProps) {
  const [newCost, setNewCost] = useState(currentCost.toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const { loadShipments } = useShipmentsStore();

  useEffect(() => {
    if (visible) {
      setNewCost(currentCost.toFixed(2));
    }
  }, [visible, currentCost]);

  const soldQuantity = quantity - remainingInventory;
  const costDifference = parseFloat(newCost || '0') - currentCost;
  const totalCostChange = costDifference * quantity;
  const profitImpact = -totalCostChange; // Negative because higher cost = lower profit

  const handleSave = async () => {
    const parsedCost = parseFloat(newCost);

    if (isNaN(parsedCost) || parsedCost < 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid positive number');
      return;
    }

    if (parsedCost === currentCost) {
      Alert.alert('No Change', 'The cost is the same as the current value');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Update the shipment_item unit_cost
      const { error: itemError } = await supabase
        .from('shipment_items')
        .update({ unit_cost: parsedCost })
        .eq('id', shipmentItemId);

      if (itemError) throw itemError;

      // Step 2: If any items were sold, update the sale_item_allocations
      if (soldQuantity > 0) {
        const { error: allocError } = await supabase
          .from('sale_item_allocations')
          .update({ unit_cost: parsedCost })
          .eq('shipment_item_id', shipmentItemId);

        if (allocError) throw allocError;
      }

      // Step 3: Recalculate shipment totals
      await recalculateShipmentTotals(shipmentId);

      // Step 4: Reload shipments to reflect changes
      await loadShipments();

      Alert.alert(
        'Success',
        `Unit cost updated to $${parsedCost.toFixed(2)}.\n\nProfit impact: ${profitImpact >= 0 ? '+' : ''}$${profitImpact.toFixed(2)}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error updating cost:', error);
      Alert.alert('Error', 'Failed to update cost. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateShipmentTotals = async (shipmentId: string) => {
    // Get all items for this shipment
    const { data: items, error: itemsError } = await supabase
      .from('shipment_items')
      .select('id, quantity, unit_cost')
      .eq('shipment_id', shipmentId);

    if (itemsError) throw itemsError;

    // Calculate new total cost
    const newTotalCost = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

    // Get all allocations for this shipment to calculate revenue
    const { data: allocations, error: allocError } = await supabase
      .from('sale_item_allocations')
      .select(`
        quantity,
        unit_cost,
        sale_item:sale_items!inner (
          sale:sales!inner (
            sale_price
          )
        )
      `)
      .in('shipment_item_id', items.map(i => i.id));

    if (allocError) throw allocError;

    // Calculate revenue from all sales
    const revenue = allocations.reduce((sum: number, alloc: any) => {
      const salePrice = alloc.sale_item?.sale?.sale_price || 0;
      return sum + (alloc.quantity * salePrice);
    }, 0);

    // Calculate profit
    const profit = revenue - newTotalCost;

    // Update shipment
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        total_cost: newTotalCost,
        total_revenue: revenue,
        net_profit: profit,
      })
      .eq('id', shipmentId);

    if (updateError) throw updateError;
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Unit Cost</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Text style={[styles.closeButton, isLoading && styles.disabled]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Product Info */}
            <View style={styles.section}>
              <Text style={styles.productName}>{productName}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Original Quantity:</Text>
                <Text style={styles.infoValue}>{quantity} units</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sold:</Text>
                <Text style={styles.infoValue}>{soldQuantity} units</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Remaining:</Text>
                <Text style={styles.infoValue}>{remainingInventory} units</Text>
              </View>
            </View>

            {/* Cost Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unit Cost</Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Current Cost:</Text>
                <Text style={styles.costValue}>{formatCurrency(currentCost)}</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Cost:</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={newCost}
                    onChangeText={setNewCost}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    editable={!isLoading}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>

            {/* Impact Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Impact Summary</Text>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Cost Difference (per unit):</Text>
                <Text style={[
                  styles.impactValue,
                  costDifference > 0 ? styles.negative : costDifference < 0 ? styles.positive : null
                ]}>
                  {costDifference > 0 ? '+' : ''}{formatCurrency(costDifference)}
                </Text>
              </View>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Total Cost Change:</Text>
                <Text style={[
                  styles.impactValue,
                  totalCostChange > 0 ? styles.negative : totalCostChange < 0 ? styles.positive : null
                ]}>
                  {totalCostChange > 0 ? '+' : ''}{formatCurrency(totalCostChange)}
                </Text>
              </View>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Profit Impact:</Text>
                <Text style={[
                  styles.impactValue,
                  styles.impactHighlight,
                  profitImpact > 0 ? styles.positive : profitImpact < 0 ? styles.negative : null
                ]}>
                  {profitImpact > 0 ? '+' : ''}{formatCurrency(profitImpact)}
                </Text>
              </View>

              {soldQuantity > 0 && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>
                    ⓘ This will update the cost for {soldQuantity} sold unit{soldQuantity !== 1 ? 's' : ''} in past sales.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isLoading && styles.disabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 12,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  impactLabel: {
    fontSize: 14,
    color: '#666',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  impactHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  noteBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB800',
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabled: {
    opacity: 0.5,
  },
});
