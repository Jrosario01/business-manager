import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';


// Import screens
import InventoryScreen from '../screens/InventoryScreen';
import ShipmentsScreen from '../screens/ShipmentsScreen';
import SalesScreen from '../screens/SalesScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import CatalogScreen from '../screens/CatalogScreen';


// Import auth store for logout
import { useAuthStore } from '../store/authStore';
import { supabase } from '../config/supabase';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.appName}>Business Manager</Text>
        <Text style={styles.appSubtitle}>Perfume Business</Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Logout"
        onPress={handleLogout}
        labelStyle={styles.logoutLabel}
        style={styles.logoutItem}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        drawerActiveTintColor: '#007AFF',
        drawerInactiveTintColor: '#666',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Drawer.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          drawerLabel: '📋 Inventory',
          title: 'Inventory',
        }}
      />
      <Drawer.Screen
  name="Catalog"
  component={CatalogScreen}
  options={{
    drawerLabel: '📚 Catalog',
    title: 'Product Catalog',
  }}
/>

      <Drawer.Screen
        name="Shipments"
        component={ShipmentsScreen}
        options={{
          drawerLabel: '📦 Shipments',
          title: 'Shipments',
        }}
      />
      <Drawer.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          drawerLabel: '💰 Sales',
          title: 'Sales',
        }}
      />
      <Drawer.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          drawerLabel: '👥 Customers',
          title: 'Customers',
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          drawerLabel: '📊 Reports',
          title: 'Reports & Analytics',
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  logoutLabel: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
