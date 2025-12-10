import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface Product {
  brand: string;
  name: string;
  size: string;
  unitCost: string;
  quantity: string;
}

interface CreateShipmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function CreateShipmentModal({ visible, onClose, onSubmit }: CreateShipmentModalProps) {
  const [products, setProducts] = useState<Product[]>([
    { brand: '', name: '', size: '50ml', unitCost: '', quantity: '' }
  ]);
  const [totalShippingCost, setTotalShippingCost] = useState('');
  const [notes, setNotes] = useState('');

  const sizes = ['30ml', '50ml', '75ml', '100ml', '150ml'];

  // Calculate shipping per unit in real-time (not stored in state)
  const calculateShippingPerUnit = () => {
  const shipping = parseFloat(totalShippingCost) || 0;
  const totalUnits = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
  const result = totalUnits > 0 ? shipping / totalUnits : 0;
  console.log('Calculating shipping:', { shipping, totalUnits, result }); // ADD THIS
  return result;
};

  const addProduct = () => {
    setProducts([...products, { 
      brand: '', 
      name: '', 
      size: '50ml', 
      unitCost: '', 
      quantity: ''
    }]);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) {
      Alert.alert('Error', 'You must have at least one product');
      return;
    }
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const updateProduct = (index: number, field: keyof Product, value: string) => {
  const newProducts = [...products];
  newProducts[index][field] = value;
  setProducts(newProducts);
  console.log('Updated product:', field, value, 'New products:', newProducts); // ADD THIS
};

  const calculateProductsCost = () => {
    return products.reduce((sum, product) => {
      const cost = parseFloat(product.unitCost) || 0;
      const quantity = parseInt(product.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);
  };

  const calculateTotalShippingDistributed = () => {
    const shippingPerUnit = calculateShippingPerUnit();
    return products.reduce((sum, product) => {
      const quantity = parseInt(product.quantity) || 0;
      return sum + (shippingPerUnit * quantity);
    }, 0);
  };

  const calculateTotalCost = () => {
    return calculateProductsCost() + calculateTotalShippingDistributed();
  };

  const handleSubmit = () => {
    const hasEmptyFields = products.some(p => 
      !p.brand.trim() || !p.name.trim() || !p.unitCost || !p.quantity
    );

    if (hasEmptyFields) {
      Alert.alert('Error', 'Please fill in all product fields');
      return;
    }

    if (!totalShippingCost) {
      Alert.alert('Error', 'Please enter total shipping cost (enter 0 if none)');
      return;
    }

    const shippingPerUnit = calculateShippingPerUnit();

    const shipmentData = {
      products: products.map(p => ({
        brand: p.brand.trim(),
        name: p.name.trim(),
        size: p.size,
        unitCost: parseFloat(p.unitCost),
        quantity: parseInt(p.quantity),
        shippingPerUnit: shippingPerUnit,
      })),
      totalShippingCost: parseFloat(totalShippingCost),
      totalCost: calculateTotalCost(),
      notes: notes.trim(),
      status: 'preparing',
    };

    onSubmit(shipmentData);
    resetForm();
  };

  const resetForm = () => {
    setProducts([{ brand: '', name: '', size: '50ml', unitCost: '', quantity: '' }]);
    setTotalShippingCost('');
    setNotes('');
  };

  const handleCancel = () => {
  const hasData = products.some(p => p.brand || p.name || p.unitCost || p.quantity) || totalShippingCost || notes;
  
  console.log('Cancel clicked, hasData:', hasData);
  console.log('Products:', products);
  console.log('Shipping:', totalShippingCost);
  console.log('Notes:', notes);
  
  if (hasData) {
    console.log('Should show alert now!');
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to cancel? All entered data will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => {
            console.log('Discard pressed');
            resetForm();
            onClose();
          }
        },
      ]
    );
  } else {
    console.log('No data, just closing');
    resetForm();
    onClose();
  }
};

  const totalUnits = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
const shippingPerUnit = React.useMemo(() => calculateShippingPerUnit(), [totalShippingCost, products]);

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
          <Text style={styles.title}>New Shipment</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Total Shipping Section */}
          <Text style={styles.sectionTitle}>Total Shipping Cost</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Total Shipping ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={totalShippingCost}
              onChangeText={setTotalShippingCost}
              keyboardType="decimal-pad"
            />
            
            {totalShippingCost && totalUnits > 0 && (
              <View style={styles.shippingInfo}>
                <Text style={styles.shippingInfoText}>
                  📦 Total Units: {totalUnits}
                </Text>
                <Text style={styles.shippingInfoText}>
                  💰 Shipping per Unit: ${shippingPerUnit.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* Products Section */}
          <Text style={styles.sectionTitle}>Products</Text>
          
          {products.map((product, index) => {
            const productCost = (parseFloat(product.unitCost) || 0) * (parseInt(product.quantity) || 0);
            const productShipping = shippingPerUnit * (parseInt(product.quantity) || 0);
            const productTotal = productCost + productShipping;

            return (
              <View key={index} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productNumber}>Product {index + 1}</Text>
                  {products.length > 1 && (
                    <TouchableOpacity onPress={() => removeProduct(index)}>
                      <Text style={styles.removeButton}>✕ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Brand *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Dior, Chanel"
                  value={product.brand}
                  onChangeText={(value) => updateProduct(index, 'brand', value)}
                />

                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Sauvage, Bleu"
                  value={product.name}
                  onChangeText={(value) => updateProduct(index, 'name', value)}
                />

                <Text style={styles.label}>Size *</Text>
                <View style={styles.sizeContainer}>
                  {sizes.map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeChip,
                        product.size === size && styles.sizeChipActive
                      ]}
                      onPress={() => updateProduct(index, 'size', size)}
                    >
                      <Text style={[
                        styles.sizeChipText,
                        product.size === size && styles.sizeChipTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Three-column row: Unit Cost, Shipping Cost, Quantity */}
                <View style={styles.threeColumnRow}>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.label}>Unit Cost ($) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={product.unitCost}
                      onChangeText={(value) => updateProduct(index, 'unitCost', value)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.label}>Shipping Cost ($)</Text>
                    <View style={styles.readOnlyInput}>
                      <Text style={styles.readOnlyText}>
                        ${shippingPerUnit.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.label}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={product.quantity}
                      onChangeText={(value) => updateProduct(index, 'quantity', value)}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Product Total */}
                {product.unitCost && product.quantity && (
                  <View style={styles.productTotalSection}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Product Cost:</Text>
                      <Text style={styles.costValue}>${productCost.toFixed(2)}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
  Shipping ({product.quantity} × ${shippingPerUnit.toFixed(2)}):
</Text>
                      <Text style={styles.costValue}>${productShipping.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.costRow, styles.productTotalRow]}>
                      <Text style={styles.productTotalLabel}>Product Total:</Text>
                      <Text style={styles.productTotalValue}>${productTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
            <Text style={styles.addProductButtonText}>+ Add Another Product</Text>
          </TouchableOpacity>

          {/* Grand Total */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipment Summary</Text>
            <View style={styles.costSummary}>
              <View style={styles.costRow}>
                <Text style={styles.summaryLabel}>Products Cost:</Text>
                <Text style={styles.summaryValue}>${calculateProductsCost().toFixed(2)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.summaryLabel}>Total Shipping:</Text>
                <Text style={styles.summaryValue}>${(parseFloat(totalShippingCost) || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.costRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalValue}>${calculateTotalCost().toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes (supplier, tracking, etc.)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
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
    color: '#007AFF',
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
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  removeButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
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
  readOnlyInput: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sizeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sizeChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sizeChipTextActive: {
    color: 'white',
  },
  threeColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thirdWidth: {
    flex: 1,
  },
  shippingInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  shippingInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 4,
  },
  productTotalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  costLabel: {
    fontSize: 13,
    color: '#666',
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  productTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  productTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  productTotalValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addProductButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  costSummary: {
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bottomSpacer: {
    height: 40,
  },
});
