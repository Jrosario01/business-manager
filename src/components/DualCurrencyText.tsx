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

  // Ensure we have valid amounts
  const safeUsdAmount = usdAmount || 0;
  const dopAmount = convertToDop(safeUsdAmount);
  const safeDopAmount = isNaN(dopAmount) || dopAmount === undefined ? 0 : dopAmount;

  const formatUSD = (amount: number) => {
    const safeAmount = amount || 0;
    return showLabels
      ? `$${safeAmount.toFixed(2)} USD`
      : `$${safeAmount.toFixed(2)}`;
  };

  const formatDOP = (amount: number) => {
    const safeAmount = amount || 0;
    return showLabels
      ? `$${safeAmount.toFixed(2)} DOP`
      : `$${safeAmount.toFixed(2)}`;
  };

  const isPrimaryUSD = primaryCurrency === 'USD';
  const primaryAmount = isPrimaryUSD ? formatUSD(safeUsdAmount) : formatDOP(safeDopAmount);
  const secondaryAmount = isPrimaryUSD ? formatDOP(safeDopAmount) : formatUSD(safeUsdAmount);

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
