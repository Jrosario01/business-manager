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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useShipmentsStore } from '../store/shipmentsStore';
import { supabase } from '../config/supabase';

type AdjustmentType = 'add' | 'subtract';

interface InventoryAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  shipmentItemId: string;
  currentInventory: number;
  originalQuantity: number;
  productName: string;
  shipmentId: string;
}

export default function InventoryAdjustmentModal({
  visible,
  onClose,
  shipmentItemId,
  currentInventory,
  originalQuantity,
  productName,
  shipmentId,
}: InventoryAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('subtract');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loadShipments } = useShipmentsStore();

  useEffect(() => {
    if (visible) {
      setAdjustmentType('subtract');
      setQuantity('1');
      setReason('');
    }
  }, [visible]);

  const quantityNum = parseInt(quantity) || 0;
  const adjustmentAmount = adjustmentType === 'add' ? quantityNum : -quantityNum;
  const newInventory = currentInventory + adjustmentAmount;

  const commonReasons = [
    'Damaged goods',
    'Lost in transit',
    'Returned to supplier',
    'Quality control rejection',
    'Found additional units',
    'Inventory recount',
  ];

  const handleSave = async () => {
    if (quantityNum <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a positive number');
      return;
    }

    if (newInventory < 0) {
      Alert.alert('Invalid Adjustment', `Cannot reduce inventory below 0. Current: ${currentInventory}, Adjustment: ${adjustmentAmount}`);
      return;
    }

    if (newInventory > originalQuantity) {
      Alert.alert(
        'Warning',
        `New inventory (${newInventory}) exceeds original quantity (${originalQuantity}). Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => performAdjustment() }
        ]
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this adjustment');
      return;
    }

    await performAdjustment();
  };

  const performAdjustment = async () => {
    setIsLoading(true);

    try {
      // Step 1: Record the adjustment in inventory_adjustments table
      const { error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert({
          shipment_item_id: shipmentItemId,
          adjustment_quantity: adjustmentAmount,
          reason: reason.trim(),
          adjusted_by: 'user', // You could get actual user ID from auth
        });

      if (adjustmentError) throw adjustmentError;

      // Step 2: Update the shipment_item remaining_inventory
      const { error: updateError } = await supabase
        .from('shipment_items')
        .update({ remaining_inventory: newInventory })
        .eq('id', shipmentItemId);

      if (updateError) throw updateError;

      // Step 3: Reload shipments to reflect changes
      await loadShipments();

      Alert.alert(
        'Success',
        `Inventory adjusted by ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} units.\n\nNew inventory: ${newInventory}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      Alert.alert('Error', 'Failed to adjust inventory. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Adjust Inventory</Text>
              <TouchableOpacity onPress={onClose} disabled={isLoading}>
                <Text style={[styles.closeButton, isLoading && styles.disabled]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
            {/* Product Info */}
            <View style={styles.section}>
              <Text style={styles.productName}>{productName}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Inventory:</Text>
                <Text style={styles.infoValue}>{currentInventory} units</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Original Quantity:</Text>
                <Text style={styles.infoValue}>{originalQuantity} units</Text>
              </View>
            </View>

            {/* Adjustment Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adjustment Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    adjustmentType === 'subtract' && styles.typeButtonActive,
                    adjustmentType === 'subtract' && styles.typeButtonSubtract,
                  ]}
                  onPress={() => setAdjustmentType('subtract')}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.typeButtonText,
                    adjustmentType === 'subtract' && styles.typeButtonTextActive,
                  ]}>
                    Reduce (-)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    adjustmentType === 'add' && styles.typeButtonActive,
                    adjustmentType === 'add' && styles.typeButtonAdd,
                  ]}
                  onPress={() => setAdjustmentType('add')}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.typeButtonText,
                    adjustmentType === 'add' && styles.typeButtonTextActive,
                  ]}>
                    Add (+)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(String(Math.max(1, quantityNum - 1)))}
                  disabled={isLoading || quantityNum <= 1}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  editable={!isLoading}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(String(quantityNum + 1))}
                  disabled={isLoading}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Current Inventory:</Text>
                <Text style={styles.previewValue}>{currentInventory}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Adjustment:</Text>
                <Text style={[
                  styles.previewValue,
                  styles.previewAdjustment,
                  adjustmentType === 'add' ? styles.positive : styles.negative,
                ]}>
                  {adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount}
                </Text>
              </View>
              <View style={[styles.previewRow, styles.previewRowFinal]}>
                <Text style={styles.previewLabelFinal}>New Inventory:</Text>
                <Text style={[
                  styles.previewValueFinal,
                  newInventory < 0 && styles.error,
                ]}>
                  {newInventory}
                </Text>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason *</Text>
              <View style={styles.reasonChips}>
                {commonReasons.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      reason === r && styles.reasonChipActive,
                    ]}
                    onPress={() => setReason(r)}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.reasonChipText,
                      reason === r && styles.reasonChipTextActive,
                    ]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Or enter custom reason..."
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
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
                <Text style={styles.saveButtonText}>Save Adjustment</Text>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
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
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonSubtract: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF3B30',
  },
  typeButtonAdd: {
    backgroundColor: '#E5F5E5',
    borderColor: '#34C759',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#333',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  quantityInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  previewBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
    marginBottom: 0,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewAdjustment: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  previewValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  error: {
    color: '#FF3B30',
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reasonChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  reasonChipTextActive: {
    color: 'white',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
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
