# Remaining Modal Translations

The translation keys have been added to both `en.json` and `es.json`. The following two modals still need to be updated with `useTranslation()`:

## 1. AddProductModal.tsx

### Add imports:
```typescript
import { useTranslation } from 'react-i18next';
```

### Add hook:
```typescript
const { t } = useTranslation();
```

### Replace these strings with t() calls:

- Line 153: `'Error', 'You must have at least one product'` → `t('common.error'), t('modals.addProduct.atLeastOne')`
- Line 164: `'Error', \`Product ${i + 1}: Please enter a brand name\`` → `t('common.error'), t('modals.addProduct.enterBrand', { num: i + 1 })`
- Line 168: `'Error', \`Product ${i + 1}: Please enter a product name\`` → `t('common.error'), t('modals.addProduct.enterProductName', { num: i + 1 })`
- Line 172: `'Error', \`Product ${i + 1}: Please enter a valid cost\`` → `t('common.error'), t('modals.addProduct.enterValidCost', { num: i + 1 })`
- Line 106: `'Permission Required', 'Please allow access to your photos...'` → `t('modals.editProduct.permissionRequired'), t('modals.editProduct.permissionMessage')`
- Line 212: `'Cancel'` → `t('common.cancel')`
- Line 214: `'Add Products ({products.length})'` → `t('modals.addProduct.addProducts', { count: products.length })`
- Line 216: `'Save All'` → `t('modals.addProduct.saveAll')`
- Line 232: `'Product {index + 1}'` → `t('modals.addProduct.product') + ' ' + (index + 1)`
- Line 234: `'✕ Remove'` → `'✕ ' + t('modals.addProduct.remove')`
- Line 262: `'Add Image'` → `t('modals.addProduct.addImage')`
- Line 253: `'Change'` → `t('modals.addProduct.change')`
- Line 269: `'Brand *'` → `t('modals.addProduct.brand')`
- Line 288: `'Start typing brand name...'` → `t('modals.addProduct.brandPlaceholder')`
- Line 276: `'Edit'` → `t('common.edit')`
- Line 337: `'Product Name *'` → `t('modals.addProduct.productName')`
- Line 340: `'Enter product name...'` → `t('modals.addProduct.productNamePlaceholder')`
- Line 346: `'Size *'` → `t('modals.addProduct.size')`
- Line 372: `'Unit Cost ($) *'` → `t('modals.addProduct.unitCost')`
- Line 382: `'Sale Price ($)'` → `t('modals.addProduct.salePrice')`
- Line 390: `'Suggested retail price'` → `t('modals.addProduct.salePriceHelper')`
- Line 397: `'+ Add Another Product'` → `t('modals.addProduct.addAnotherProduct')`

## 2. CreateShipmentModal.tsx

### Add imports:
```typescript
import { useTranslation } from 'react-i18next';
```

### Add hook:
```typescript
const { t } = useTranslation();
```

### Replace these strings with t() calls:

- Line 85: `'Error', 'You must have at least one product'` → `t('common.error'), t('modals.createShipment.atLeastOne')`
- Line 203: `'Error', 'Please select products from the catalog...'` → `t('common.error'), t('modals.createShipment.selectAllProducts')`
- Line 209: `'Error', 'Please enter quantity for all products'` → `t('common.error'), t('modals.createShipment.enterQuantity')`
- Line 214: `'Error', 'Please enter total shipping cost...'` → `t('common.error'), t('modals.createShipment.enterShippingCost')`
- Line 260: `'Discard Changes?', 'You have unsaved changes...'` → `t('modals.createShipment.discardChanges'), t('modals.createShipment.unsavedChanges')`
- Line 263: `'Keep Editing'` → `t('modals.createShipment.keepEditing')`
- Line 265: `'Discard'` → `t('modals.createShipment.discard')`
- Line 294: `'Cancel'` → `t('common.cancel')`
- Line 296: `'New Shipment'` → `t('modals.createShipment.newShipment')`
- Line 298: `'Save'` → `t('common.save')`
- Line 304: `'Total Shipping Cost'` → `t('modals.createShipment.totalShippingCost')`
- Line 306: `'Total Shipping ($) *'` → `t('modals.createShipment.totalShipping')`
- Line 318: `'📦 Total Units:'` → `'📦 ' + t('modals.createShipment.totalUnits')`
- Line 321: `'💰 Shipping per Unit:'` → `'💰 ' + t('modals.createShipment.shippingPerUnit')`
- Line 328: `'Products'` → `t('modals.createShipment.products')`
- Line 339: `'Product {index + 1}'` → `t('modals.createShipment.product') + ' ' + (index + 1)`
- Line 342: `'✕ Remove'` → `'✕ ' + t('modals.createShipment.remove')`
- Line 350: `'Search Product *'` → `t('modals.createShipment.searchProduct')`
- Line 353: `'Type brand or product name...'` → `t('modals.createShipment.typeBrandOrProduct')`
- Line 416: `'⚠️ Search and select a product...'` → `'⚠️ ' + t('modals.createShipment.searchSelectProduct')`
- Line 424: `'Selected Product'` → `t('modals.createShipment.selectedProduct')`
- Line 449: `'Edit'` → `t('common.edit')`
- Line 462: `'Unit Cost ($)'` → `t('modals.createShipment.unitCost')`
- Line 470: `'Shipping/Unit'` → `t('modals.createShipment.shippingUnit')`
- Line 478: `'Quantity *'` → `t('modals.createShipment.quantity')`
- Line 493: `'Product Cost:'` → `t('modals.createShipment.productCost')`
- Line 497: `'Shipping ({product.quantity} × ${shippingPerUnit.toFixed(2)}):'` → `t('modals.createShipment.shipping', { qty: product.quantity, rate: shippingPerUnit.toFixed(2) })`
- Line 503: `'Product Total:'` → `t('modals.createShipment.productTotal')`
- Line 514: `'+ Add Another Product'` → `t('modals.createShipment.addAnotherProduct')`
- Line 520: `'Shipment Summary'` → `t('modals.createShipment.shipmentSummary')`
- Line 523: `'Products Cost:'` → `t('modals.createShipment.productsCost')`
- Line 527: `'Total Shipping:'` → `t('modals.createShipment.totalShippingLabel')`
- Line 531: `'Grand Total:'` → `t('modals.createShipment.grandTotal')`
- Line 538: `'Notes (Optional)'` → `t('modals.createShipment.notesOptional')`
- Line 542: `'Add notes (supplier, tracking, etc.)'` → `t('modals.createShipment.addNotesPlaceholder')`
- Line 410: `'➕ Add New Product to Catalog'` → `t('modals.createShipment.addNewProductToCatalog')`

## Summary

All translation keys have been added to:
- `/home/jaybach/business-manager/src/i18n/translations/en.json`
- `/home/jaybach/business-manager/src/i18n/translations/es.json`

Completed translations:
- ✅ CreateSaleModal.tsx
- ✅ UpdatePaymentModal.tsx
- ✅ EditProductModal.tsx

Remaining to translate:
- ⏳ AddProductModal.tsx
- ⏳ CreateShipmentModal.tsx

The translation keys are already in the JSON files. You just need to add the `useTranslation` import and hook, then replace the hardcoded strings with `t()` calls as shown above.
