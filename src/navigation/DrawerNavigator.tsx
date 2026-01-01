import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'es' ? t('drawer.spanish') : t('drawer.english');
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Main menu items */}
        <DrawerItemList {...props} />

        {/* Bottom section - Language & Logout */}
        <View style={styles.bottomSection}>
          {/* Language Selector */}
          <DrawerItem
            label={() => (
              <View style={styles.bottomItemContent}>
                <Text style={styles.bottomItemIcon}>🌐</Text>
                <Text style={styles.bottomItemLabel}>{t('drawer.language')}</Text>
                <Text style={styles.currentLanguage}>{getCurrentLanguageLabel()}</Text>
              </View>
            )}
            onPress={() => setShowLanguageModal(true)}
            style={styles.bottomItem}
          />

          {/* Logout */}
          <DrawerItem
            label={() => (
              <View style={styles.bottomItemContent}>
                <Text style={styles.bottomItemIcon}>🚪</Text>
                <Text style={styles.logoutLabel}>{t('auth.signOut')}</Text>
              </View>
            )}
            onPress={handleLogout}
            style={styles.bottomItem}
          />
        </View>
      </DrawerContentScrollView>

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
    </View>
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
          backgroundColor: '#1a5490',
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 18,
          fontWeight: '600',
          paddingLeft: 10,
        },
        drawerActiveTintColor: '#e0cf80',
        drawerInactiveTintColor: '#E5E5EA',
        drawerActiveBackgroundColor: '#2c6bb3',
        drawerItemStyle: {
          borderRadius: 8,
          marginVertical: 2,
        },
        headerStyle: {
          backgroundColor: '#1a5490',
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
    padding: 24,
    backgroundColor: 'transparent',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    width: 220,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 140,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a5490',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#5A5A5A',
    marginTop: 4,
    fontWeight: '500',
  },
  bottomSection: {
    borderTopWidth: 2,
    borderTopColor: '#e0cf80',
    paddingTop: 8,
    marginTop: 16,
    paddingBottom: 8,
  },
  bottomItem: {
    marginVertical: 0,
  },
  bottomItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bottomItemIcon: {
    fontSize: 20,
  },
  bottomItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E5EA',
    flex: 1,
  },
  currentLanguage: {
    fontSize: 13,
    color: '#e0cf80',
    fontWeight: '600',
  },
  logoutLabel: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    borderWidth: 2,
    borderColor: '#e0cf80',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: '#e0cf80',
    borderColor: '#1a5490',
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkmark: {
    fontSize: 20,
    color: '#1a5490',
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
