import { NavigatorScreenParams } from '@react-navigation/native';

// Main Tab Navigator
export type TabParamList = {
  ShipmentsTab: undefined;
  InventoryTab: undefined;
  SalesTab: undefined;
  CustomersTab: undefined;
  ReportsTab: undefined;
  CurrencyTab: undefined;
};

// Stack Navigators for each tab
export type ShipmentsStackParamList = {
  ShipmentsList: undefined;
  ShipmentDetail: { shipmentId: string };
  CreateShipment: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
};

export type SalesStackParamList = {
  SalesList: undefined;
  SaleDetail: { saleId: string };
  CreateSale: undefined;
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { customerId: string };
  CreateCustomer: undefined;
};

export type ReportsStackParamList = {
  Dashboard: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<TabParamList>;
};
