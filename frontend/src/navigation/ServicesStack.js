import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ServicesScreen from '../screens/ServicesScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

/** List → detail flow for the Services tab. */
export default function ServicesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="ServicesList" component={ServicesScreen} options={{ title: 'Find services' }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: 'Provider' }} />
    </Stack.Navigator>
  );
}
