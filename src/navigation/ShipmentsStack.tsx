import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShipmentsScreen from '../screens/ShipmentsScreen';
import ShipmentDetailsScreen from '../screens/ShipmentDetailsScreen';
import { ShipmentsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ShipmentsStackParamList>();

export default function ShipmentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ShipmentsList"
        component={ShipmentsScreen}
        options={{ title: 'Shipments' }}
      />
      <Stack.Screen
        name="ShipmentDetail"
        component={ShipmentDetailsScreen}
        options={{ title: 'Shipment Details' }}
      />
    </Stack.Navigator>
  );
}
