import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useExchangeRateStore } from '../store/exchangeRateStore';

export default function CurrencyScreen() {
  const { t } = useTranslation();
  const { usdToDop, isLoading, error, fetchRate, setManualRate, lastUpdated, isManual } = useExchangeRateStore();
  const [customRate, setCustomRate] = useState(usdToDop.toString());
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setCustomRate(usdToDop.toString());
  }, [usdToDop]);

  const formatLastUpdated = () => {
    if (!lastUpdated) return t('currency.never');

    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('currency.justNow');
    if (diffMins < 60) return t('currency.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('currency.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('currency.daysAgo', { count: diffDays });

    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleFetchRate = async () => {
    setIsFetching(true);
    try {
      await fetchRate();
      Alert.alert(t('currency.success'), t('currency.updateSuccess'));
    } catch (err) {
      Alert.alert(t('currency.error'), t('currency.fetchError'));
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpdateRate = async () => {
    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t('currency.invalidRate'), t('currency.invalidRateMessage'));
      return;
    }

    try {
      await setManualRate(rate);
      Alert.alert(t('currency.success'), t('currency.updateSuccess'));
    } catch (err) {
      Alert.alert(t('currency.error'), t('currency.updateError'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('currency.title')}</Text>
        <Text style={styles.subtitle}>{t('currency.subtitle')}</Text>
      </View>

      {/* Current Rate Display */}
      <View style={styles.currentRateCard}>
        <Text style={styles.cardLabel}>{t('currency.currentExchangeRate')}</Text>
        <View style={styles.rateDisplay}>
          <Text style={styles.rateText}>1 USD = {usdToDop.toFixed(2)} DOP</Text>
        </View>
        <View style={styles.rateInfo}>
          <Text style={styles.lastUpdated}>
            {t('currency.lastUpdated')}: {formatLastUpdated()}
          </Text>
          {isManual && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>{t('currency.manual')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Fetch from API */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('currency.fetchLatestRate')}</Text>
        <Text style={styles.sectionDescription}>
          {t('currency.fetchDescription')}
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleFetchRate}
          disabled={isFetching}
        >
          {isFetching ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t('currency.fetchCurrentRate')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Manual Update */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('currency.manualUpdate')}</Text>
        <Text style={styles.sectionDescription}>
          {t('currency.manualDescription')}
        </Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputPrefix}>1 USD =</Text>
          <TextInput
            style={styles.input}
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Text style={styles.inputSuffix}>DOP</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleUpdateRate}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>{t('currency.updateRate')}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ {t('currency.aboutExchangeRates')}</Text>
        <Text style={styles.infoText}>
          {t('currency.aboutDescription')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  currentRateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  rateDisplay: {
    paddingVertical: 12,
  },
  rateText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
  },
  manualBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  inputPrefix: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  inputSuffix: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginLeft: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E8F4FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
});
