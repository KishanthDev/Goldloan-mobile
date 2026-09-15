import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiConfig } from '../config/api';

export default function RootLayout() {
  useEffect(() => {
    ApiConfig.init();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="customers/new" 
          options={{ presentation: 'modal', headerShown: false }} 
        />
        <Stack.Screen 
          name="customers/[id]" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ornaments/new" 
          options={{ presentation: 'modal', headerShown: false }} 
        />
        <Stack.Screen 
          name="loans/new" 
          options={{ presentation: 'modal', headerShown: false }} 
        />
        <Stack.Screen 
          name="loans/[id]" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="loans/closure" 
          options={{ presentation: 'modal', headerShown: false }} 
        />
      </Stack>
    </>
  );
}
