import React from 'react';
import { View, Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useExchangeRateStore } from '../store/exchangeRateStore';

interface DualCurrencyTextProps {
  usdAmount: number;
  primaryCurrency?: 'USD' | 'DOP';
  style?: StyleProp<TextStyle>;
  secondaryStyle?: StyleProp<TextStyle>;
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
}

export default function DualCurrencyText({
  usdAmount,
  primaryCurrency = 'USD',
  style,
  secondaryStyle,
  layout = 'vertical',
  showLabels = true,
}: DualCurrencyTextProps) {
  const { convertToDop } = useExchangeRateStore();
  const dopAmount = convertToDop(usdAmount);

  const formatUSD = (amount: number) => showLabels
    ? `$${amount.toFixed(2)} USD`
    : `$${amount.toFixed(2)}`;

  const formatDOP = (amount: number) => showLabels
    ? `$${amount.toFixed(2)} DOP`
    : `$${amount.toFixed(2)}`;

  const isPrimaryUSD = primaryCurrency === 'USD';
  const primaryAmount = isPrimaryUSD ? formatUSD(usdAmount) : formatDOP(dopAmount);
  const secondaryAmount = isPrimaryUSD ? formatDOP(dopAmount) : formatUSD(usdAmount);

  if (layout === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        <Text style={[styles.primaryText, style]}>{primaryAmount}</Text>
        <Text style={[styles.secondaryText, secondaryStyle]}> ({secondaryAmount})</Text>
      </View>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      <Text style={[styles.primaryText, style]}>{primaryAmount}</Text>
      <Text style={[styles.secondaryText, secondaryStyle]}>{secondaryAmount}</Text>
    </View>
  );
}

// Functional components for inline use
export const formatDualCurrency = (
  usdAmount: number,
  primaryCurrency: 'USD' | 'DOP' = 'USD',
  showLabels: boolean = true
): { primary: string; secondary: string } => {
  const { convertToDop } = useExchangeRateStore.getState();
  const dopAmount = convertToDop(usdAmount);

  const usdStr = showLabels ? `$${usdAmount.toFixed(2)} USD` : `$${usdAmount.toFixed(2)}`;
  const dopStr = showLabels ? `$${dopAmount.toFixed(2)} DOP` : `$${dopAmount.toFixed(2)}`;

  if (primaryCurrency === 'USD') {
    return { primary: usdStr, secondary: dopStr };
  }
  return { primary: dopStr, secondary: usdStr };
};

export const formatUSD = (amount: number): string => `$${amount.toFixed(2)} USD`;
export const formatDOP = (amount: number): string => `$${amount.toFixed(2)} DOP`;

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  secondaryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
