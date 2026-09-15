import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bank-accounts"
        options={{
          title: 'Banks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ornaments"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="diamond" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="closure"
        options={{
          title: 'Closure',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-circle" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
