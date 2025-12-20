import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n/i18n';


// Import screens
import InventoryScreen from '../screens/InventoryScreen';
import ShipmentsScreen from '../screens/ShipmentsScreen';
import SalesScreen from '../screens/SalesScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CurrencyScreen from '../screens/CurrencyScreen';


// Import auth store for logout
import { useAuthStore } from '../store/authStore';
import { supabase } from '../config/supabase';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const logout = useAuthStore((state) => state.logout);
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'es' ? t('drawer.spanish') : t('drawer.english');
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.appName}>Business Manager</Text>
        <Text style={styles.appSubtitle}>Perfume Business</Text>
      </View>
      <DrawerItemList {...props} />

      {/* Language Selector */}
      <DrawerItem
        label={() => (
          <View style={styles.languageContainer}>
            <Text style={styles.languageLabel}>🌐 {t('drawer.language')}</Text>
            <Text style={styles.currentLanguage}>{getCurrentLanguageLabel()}</Text>
          </View>
        )}
        onPress={() => setShowLanguageModal(true)}
        style={styles.languageItem}
      />

      {/* Logout */}
      <DrawerItem
        label={t('auth.signOut')}
        onPress={handleLogout}
        labelStyle={styles.logoutLabel}
        style={styles.logoutItem}
      />

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('drawer.selectLanguage')}</Text>

            <TouchableOpacity
              style={[
                styles.languageOption,
                i18n.language === 'en' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.languageOptionText}>🇺🇸 {t('drawer.english')}</Text>
              {i18n.language === 'en' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                i18n.language === 'es' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('es')}
            >
              <Text style={styles.languageOptionText}>🇩🇴 {t('drawer.spanish')}</Text>
              {i18n.language === 'es' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      initialRouteName="Shipments"
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
          drawerLabel: `📋 ${t('drawer.inventory')}`,
          title: t('inventory.title'),
        }}
      />
      <Drawer.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          drawerLabel: `📚 ${t('drawer.catalog')}`,
          title: t('catalog.title'),
        }}
      />

      <Drawer.Screen
        name="Shipments"
        component={ShipmentsScreen}
        options={{
          drawerLabel: `📦 ${t('drawer.shipments')}`,
          title: t('shipments.title'),
        }}
      />
      <Drawer.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          drawerLabel: `💰 ${t('drawer.sales')}`,
          title: t('sales.title'),
        }}
      />
      <Drawer.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          drawerLabel: `👥 ${t('drawer.customers')}`,
          title: t('customers.title'),
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          drawerLabel: `📊 ${t('drawer.reports')}`,
          title: t('reports.title'),
        }}
      />
      <Drawer.Screen
        name="Currency"
        component={CurrencyScreen}
        options={{
          drawerLabel: `💱 ${t('drawer.currency')}`,
          title: t('currency.title'),
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
  languageItem: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  currentLanguage: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  logoutItem: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  logoutLabel: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
  },
  languageOptionActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
