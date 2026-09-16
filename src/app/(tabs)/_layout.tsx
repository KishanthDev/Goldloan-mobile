import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, Animated, Easing, useWindowDimensions, Platform, StatusBar as RNStatusBar 
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';
import { Env } from '../../config/env';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

interface NavItem {
  name: string;
  route: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'index',
    route: '/(tabs)',
    title: 'Dashboard',
    icon: 'pie-chart-outline',
    activeIcon: 'pie-chart',
  },
  {
    name: 'users',
    route: '/(tabs)/users',
    title: 'Customers',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  {
    name: 'bank-accounts',
    route: '/(tabs)/bank-accounts',
    title: 'Bank Accounts',
    icon: 'business-outline',
    activeIcon: 'business',
  },
  {
    name: 'ornaments',
    route: '/(tabs)/ornaments',
    title: 'Gold Vault',
    icon: 'diamond-outline',
    activeIcon: 'diamond',
  },
  {
    name: 'loans',
    route: '/(tabs)/loans',
    title: 'Active Loans',
    icon: 'cash-outline',
    activeIcon: 'cash',
  },
  {
    name: 'closure',
    route: '/(tabs)/closure',
    title: 'Settlements',
    icon: 'checkmark-done-circle-outline',
    activeIcon: 'checkmark-done-circle',
  },
];

export default function TabLayout() {
  return (
    <SidebarProvider>
      <TabLayoutInner />
    </SidebarProvider>
  );
}

function TabLayoutInner() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useAppStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { collapsed, setCollapsed, mobileDrawerOpen, setMobileDrawerOpen, isDesktop } = useSidebar();

  const isLive = !ApiConfig.isMockMode();
  const live22kRate = store.goldRates?.gold22k?.rate1g;

  // ─── ACCURATE SAFE AREA INSETS (PREVENTS NOTIFICATION OVERLAP) ───
  const statusBarHeight = Platform.OS === 'android'
    ? Math.max(insets.top, RNStatusBar.currentHeight || 28)
    : insets.top;
  const bottomInset = insets.bottom;

  // On desktop, don't pad for status bar; on mobile, pad safely
  const appTopPadding = isDesktop ? 0 : statusBarHeight;

  // ─── DESKTOP SIDEBAR SMOOTH ANIMATION ───
  const sidebarWidthAnim = useRef(new Animated.Value(collapsed ? 68 : 240)).current;

  useEffect(() => {
    Animated.timing(sidebarWidthAnim, {
      toValue: collapsed ? 68 : 240,
      duration: 240,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [collapsed]);

  const textOpacity = sidebarWidthAnim.interpolate({
    inputRange: [68, 140, 240],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });

  // ─── MOBILE DRAWER SMOOTH ANIMATION ───
  const drawerWidth = Math.min(300, Math.round(width * 0.84));
  const drawerSlideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const [drawerRendered, setDrawerRendered] = useState(false);

  useEffect(() => {
    if (mobileDrawerOpen) {
      setDrawerRendered(true);
      Animated.parallel([
        Animated.timing(drawerSlideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (drawerRendered) {
      Animated.parallel([
        Animated.timing(drawerSlideAnim, {
          toValue: -drawerWidth,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDrawerRendered(false);
      });
    }
  }, [mobileDrawerOpen]);

  const isRouteActive = (item: NavItem) => {
    if (item.name === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';
    }
    return pathname.includes(item.name);
  };

  const navigateTo = (item: NavItem) => {
    if (item.name === 'index') {
      router.push('/(tabs)' as any);
    } else {
      router.push(`/(tabs)/${item.name}` as any);
    }
    if (!isDesktop) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: appTopPadding, paddingBottom: bottomInset }]}>
      <View style={styles.mainContainer}>
        {/* ─── DESKTOP COLLAPSIBLE SIDEBAR WITH SMOOTH ANIMATION ─── */}
        {isDesktop && (
          <Animated.View style={[styles.desktopSidebar, { width: sidebarWidthAnim }]}>
            {/* Clean Sidebar Header */}
            <View style={[styles.sidebarHeader, collapsed && styles.sidebarHeaderCollapsed]}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Text style={{ fontSize: 20 }}>🪙</Text>
                </View>
                {!collapsed && (
                  <Animated.View style={[styles.brandTextWrapper, { opacity: textOpacity }]}>
                    <Text style={styles.brandTitle} numberOfLines={1}>{Env.APP_NAME}</Text>
                    <Text style={styles.brandSub} numberOfLines={1}>{Env.APP_SUBTITLE}</Text>
                  </Animated.View>
                )}
              </View>
            </View>

            {/* Navigation Menu Links */}
            <ScrollView style={styles.navScroll} contentContainerStyle={styles.navContent}>
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(item);
                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => navigateTo(item)}
                    style={[
                      styles.navItem,
                      collapsed && styles.navItemCollapsed,
                      active && styles.navItemActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    {active && <View style={styles.activePillIndicator} />}
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={20}
                      color={active ? Colors.primaryDark : Colors.textSecondary}
                    />
                    {!collapsed && (
                      <Animated.Text 
                        style={[styles.navText, active && styles.navTextActive, { opacity: textOpacity }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Animated.Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer / Gold Rate Ticker */}
            {!collapsed ? (
              <Animated.View style={[styles.sidebarFooter, { opacity: textOpacity }]}>
                {live22kRate ? (
                  <View style={styles.goldTickerCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="trending-up" size={14} color={Colors.primaryDark} />
                      <Text style={styles.tickerTitle}>{Env.LOCATION_BENCHMARK} 22K</Text>
                    </View>
                    <Text style={styles.tickerRate}>₹{live22kRate.toLocaleString()} <Text style={styles.tickerUnit}>/g</Text></Text>
                  </View>
                ) : null}
                <TouchableOpacity 
                  onPress={() => setCollapsed(true)} 
                  style={styles.collapseFooterBtn}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-back" size={14} color={Colors.textMuted} />
                    <Ionicons name="chevron-back" size={14} color={Colors.textMuted} style={{ marginLeft: -8 }} />
                  </View>
                  <Text style={styles.collapseFooterText}>{"Collapse (<<)"}</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity 
                onPress={() => setCollapsed(false)} 
                style={styles.expandRailBtn}
                accessibilityLabel="Expand sidebar"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
                  <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} style={{ marginLeft: -8 }} />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ─── TAB SCREENS CONTENT (Full height, bottom bar permanently hidden) ─── */}
        <View style={styles.screensWrapper}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="users" options={{ title: 'Users' }} />
            <Tabs.Screen name="bank-accounts" options={{ title: 'Banks' }} />
            <Tabs.Screen name="ornaments" options={{ title: 'Vault' }} />
            <Tabs.Screen name="loans" options={{ title: 'Loans' }} />
            <Tabs.Screen name="closure" options={{ title: 'Closure' }} />
          </Tabs>
        </View>
      </View>

      {/* ─── MOBILE SLIDE-IN DRAWER OVERLAY WITH ACCURATE INSETS ─── */}
      {!isDesktop && drawerRendered && (
        <View style={styles.mobileOverlay}>
          {/* Animated Backdrop */}
          <Animated.View style={[styles.mobileBackdrop, { opacity: backdropFadeAnim }]}>
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={() => setMobileDrawerOpen(false)} 
            />
          </Animated.View>

          {/* Animated Drawer Container */}
          <Animated.View 
            style={[
              styles.mobileDrawer, 
              { 
                width: drawerWidth, 
                paddingTop: statusBarHeight,
                paddingBottom: Math.max(bottomInset, 16),
                transform: [{ translateX: drawerSlideAnim }] 
              }
            ]}
          >
            {/* Header (Strictly bounded, never overflows) */}
            <View style={styles.mobileDrawerHeader}>
              <View style={styles.drawerBrandGroup}>
                <View style={styles.brandIcon}>
                  <Text style={{ fontSize: 20 }}>🪙</Text>
                </View>
                <View style={styles.drawerBrandTexts}>
                  <Text style={styles.brandTitle} numberOfLines={1} ellipsizeMode="tail">
                    {Env.APP_NAME}
                  </Text>
                  <Text style={styles.brandSub} numberOfLines={1} ellipsizeMode="tail">
                    {Env.APP_SUBTITLE}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setMobileDrawerOpen(false)}
                style={styles.drawerCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close navigation"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
                  <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} style={{ marginLeft: -8 }} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.navScroll} contentContainerStyle={styles.navContent}>
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(item);
                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => navigateTo(item)}
                    style={[styles.navItem, active && styles.navItemActive]}
                    activeOpacity={0.7}
                  >
                    {active && <View style={styles.activePillIndicator} />}
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={22}
                      color={active ? Colors.primaryDark : Colors.textSecondary}
                    />
                    <Text style={[styles.navText, active && styles.navTextActive, { fontSize: 14 }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {live22kRate ? (
              <View style={styles.mobileDrawerFooter}>
                <View style={styles.goldTickerCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="trending-up" size={14} color={Colors.primaryDark} />
                    <Text style={styles.tickerTitle}>{Env.LOCATION_BENCHMARK} 22K Gold</Text>
                  </View>
                  <Text style={styles.tickerRate}>₹{live22kRate.toLocaleString()} <Text style={styles.tickerUnit}>/g</Text></Text>
                </View>
              </View>
            ) : null}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  screensWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ─── DESKTOP SIDEBAR ───
  desktopSidebar: {
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  sidebarHeaderCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
    flexShrink: 0,
  },
  brandTextWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  brandSub: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  // ─── NAV ITEMS ───
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
    minHeight: 42,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  navItemActive: {
    backgroundColor: Colors.primarySubtle,
  },
  activePillIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primaryDark,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  navTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  // ─── SIDEBAR FOOTER ───
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
    overflow: 'hidden',
  },
  goldTickerCard: {
    backgroundColor: '#fffdf5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  tickerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tickerRate: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  tickerUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  collapseFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  collapseFooterText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  expandRailBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // ─── MOBILE DRAWER OVERLAY ───
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
  },
  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  mobileDrawer: {
    height: '100%',
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  mobileDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerBrandGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
    minWidth: 0,
  },
  drawerBrandTexts: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  drawerCloseBtn: {
    flexShrink: 0,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDrawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
