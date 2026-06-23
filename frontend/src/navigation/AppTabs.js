import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/DashboardScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ServicesStack from './ServicesStack';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

// Emoji icons keep us dependency-free (no icon font to load).
const ICONS = {
  Dashboard: '🏠',
  Maintenance: '🔧',
  Expenses: '💵',
  Services: '🧰',
  Profile: '👤',
};

function tabIcon(routeName) {
  return ({ focused }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[routeName]}</Text>
  );
}

/** Main app shell once authenticated. */
export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: tabIcon(route.name),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Maintenance" component={MaintenanceScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Services" component={ServicesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
