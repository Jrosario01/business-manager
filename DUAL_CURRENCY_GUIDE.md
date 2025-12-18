# Dual Currency System Guide

## Overview
This app now supports dual currency tracking to accurately reflect your business model:
- **Costs**: Stored in USD (wholesale purchases in USA)
- **Sales**: Stored in DOP (retail sales in Dominican Republic)
- **Profit**: Calculated by converting USD costs to DOP at time of sale

## How It Works

### 1. **Shipments (Costs in USD)**
- When you create a shipment, all costs are entered in USD
- Product unit costs are stored in USD
- Shipment total cost is in USD
- This reflects the actual wholesale price you paid in USA

### 2. **Sales (Prices in DOP)**
- When you make a sale, prices are entered in DOP
- This reflects the actual price the customer paid in Dominican Republic
- Example: Customer pays 2000 DOP → Recorded as 2000 DOP (not converted to USD)

### 3. **Exchange Rate Tracking**
- Every sale automatically captures the current USD→DOP exchange rate from CurrencyAPI
- This exchange rate is saved with the transaction for historical accuracy
- You can view what exchange rate was used for any past sale
- Exchange rate can be updated manually via the Currency Settings modal (💱 button)
- If a historical sale doesn't have a saved rate, it uses the current exchange rate

### 4. **Profit Calculation**

**Example:**
- Product cost: $15 USD (from shipment)
- Sale price: 2000 DOP
- Exchange rate at time of sale: 60 DOP = 1 USD

**Calculation:**
1. Convert cost to DOP: $15 × 60 = 900 DOP
2. Calculate profit: 2000 DOP - 900 DOP = 1100 DOP
3. Can also show in USD: 1100 DOP ÷ 60 = $18.33 USD

### 5. **Shipment Totals**
- Shipments track revenue and profit in USD (for consistency)
- When a sale is made in DOP, the revenue is converted to USD
- This allows you to see total shipment performance in USD

## Database Changes

### Sales Table
- `currency`: 'USD' or 'DOP' (defaults to DOP)
- `exchange_rate_used`: The exchange rate at time of sale

### Products Table (Optional)
- `suggested_price_dop`: Suggested retail price in DOP for catalog

## Benefits

1. **Accurate Profit Tracking**: Profit calculations use the actual exchange rate at time of sale
2. **Historical Record**: You can see exactly what exchange rate was used for any transaction
3. **True Business Reflection**: Costs in USD, sales in DOP - matches your real operations
4. **No Loss of Information**: Both currencies preserved, no rounding errors from double conversion

## Example Scenario

**Shipment arrives:**
- 10 bottles of Lattafa Asad at $15 USD each
- Total cost: $150 USD

**Customer buys 1 bottle:**
- Sale price: 2000 DOP
- Exchange rate: 60 DOP/USD
- Cost (in DOP): 15 × 60 = 900 DOP
- Profit: 2000 - 900 = 1100 DOP (~$18.33 USD)

**Shipment tracking:**
- Revenue: $33.33 USD (2000 DOP ÷ 60)
- Cost: $15 USD
- Profit: $18.33 USD

## Migration
To apply these database changes, run the SQL migration file:
```bash
# Execute in Supabase SQL Editor or via CLI
supabase db execute add-dual-currency-support.sql
```

## Notes
- All existing sales will default to DOP currency with 60 DOP/USD rate
- New sales automatically capture the current exchange rate
- Exchange rates can be managed in the Currency Settings modal (💱 button)
