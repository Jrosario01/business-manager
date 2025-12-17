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
import { useExchangeRateStore } from '../store/exchangeRateStore';

interface CurrencySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CurrencySettingsModal({
  visible,
  onClose,
}: CurrencySettingsModalProps) {
  const {
    usdToDop,
    lastUpdated,
    isManual,
    isLoading,
    error,
    fetchRate,
    setManualRate,
    enableAutoFetch,
  } = useExchangeRateStore();

  const [manualRateInput, setManualRateInput] = useState(usdToDop.toFixed(4));

  useEffect(() => {
    if (visible) {
      setManualRateInput(usdToDop.toFixed(4));
    }
  }, [visible, usdToDop]);

  const handleRefresh = async () => {
    if (isManual) {
      Alert.alert(
        'Auto-Fetch Disabled',
        'Exchange rate is set manually. Enable auto-fetch to refresh from API.',
        [{ text: 'OK' }]
      );
      return;
    }

    await fetchRate();
    Alert.alert('Success', 'Exchange rate updated successfully!');
  };

  const handleSetManualRate = async () => {
    const rate = parseFloat(manualRateInput);

    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid positive number');
      return;
    }

    await setManualRate(rate);
    Alert.alert(
      'Manual Rate Set',
      `Exchange rate manually set to:\n1 USD = ${rate.toFixed(4)} MXN\n\nAuto-fetch is now disabled.`,
      [{ text: 'OK' }]
    );
  };

  const handleEnableAutoFetch = () => {
    Alert.alert(
      'Enable Auto-Fetch',
      'This will re-enable automatic exchange rate updates from CurrencyAPI and fetch the latest rate.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            await enableAutoFetch();
            Alert.alert('Auto-Fetch Enabled', 'Exchange rate will now update automatically.');
          },
        },
      ]
    );
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

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
            <Text style={styles.headerTitle}>Currency Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Current Rate */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Exchange Rate</Text>
              <View style={styles.rateCard}>
                <Text style={styles.rateValue}>1 USD = {usdToDop.toFixed(4)} DOP</Text>
                <View style={styles.rateInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Updated:</Text>
                    <Text style={styles.infoValue}>{formatLastUpdated()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mode:</Text>
                    <View style={[
                      styles.modeBadge,
                      isManual ? styles.modeBadgeManual : styles.modeBadgeAuto
                    ]}>
                      <Text style={styles.modeBadgeText}>
                        {isManual ? 'Manual' : 'Auto-Fetch'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}
            </View>

            {/* Auto-Fetch Section */}
            {!isManual && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Automatic Updates</Text>
                <Text style={styles.sectionDescription}>
                  Exchange rates are fetched automatically from CurrencyAPI when the app opens (if older than 6 hours).
                </Text>
                <TouchableOpacity
                  style={[styles.button, styles.refreshButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>🔄 Refresh Rate Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Manual Override Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manual Override</Text>
              <Text style={styles.sectionDescription}>
                Set a custom exchange rate. This will disable automatic updates.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>1 USD =</Text>
                <TextInput
                  style={styles.input}
                  value={manualRateInput}
                  onChangeText={setManualRateInput}
                  keyboardType="decimal-pad"
                  placeholder="60.0000"
                  editable={!isLoading}
                />
                <Text style={styles.inputLabel}>DOP</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, styles.setButton, isLoading && styles.buttonDisabled]}
                onPress={handleSetManualRate}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Set Manual Rate</Text>
              </TouchableOpacity>

              {isManual && (
                <TouchableOpacity
                  style={[styles.button, styles.enableAutoButton]}
                  onPress={handleEnableAutoFetch}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>↻ Re-enable Auto-Fetch</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* API Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>ℹ️ About CurrencyAPI</Text>
              <Text style={styles.infoBoxText}>
                Using CurrencyAPI free tier (300 requests/month).{'\n\n'}
                Auto-fetch updates every 6 hours to stay within limits.{'\n\n'}
                To add your API key, update the CURRENCYAPI_KEY in exchangeRateStore.ts
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Close</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  rateCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  rateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  rateInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeAuto: {
    backgroundColor: '#34C759',
  },
  modeBadgeManual: {
    backgroundColor: '#FF9500',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  setButton: {
    backgroundColor: '#FF9500',
  },
  enableAutoButton: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoBox: {
    backgroundColor: '#E5F5FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  closeFooterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
