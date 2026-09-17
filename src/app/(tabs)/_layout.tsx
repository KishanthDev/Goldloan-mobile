import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, Animated, Easing, useWindowDimensions, Platform, StatusBar as RNStatusBar,
  Image, ActivityIndicator 
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';
import { Env } from '../../config/env';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { SidebarTrigger } from '../../components/SidebarTrigger';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../constants/theme';
import { ThemeToggleBtn } from '../../components/ThemeToggleBtn';

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

const TAB_METADATA: Record<string, { title: string; subtitle: string }> = {
  index: {
    title: 'Financial Overview',
    subtitle: 'Real-time portfolio valuation & gold vault status',
  },
  users: {
    title: 'Customers & Borrowers',
    subtitle: 'KYC profiles, pledged assets & credit tracking',
  },
  'bank-accounts': {
    title: 'Lending Bank Accounts',
    subtitle: 'Manage credit limits, lenders & utilized balances',
  },
  ornaments: {
    title: 'Gold Vault Inventory',
    subtitle: 'Physical inventory, karat purity & vault custody',
  },
  loans: {
    title: 'Active Loans Portfolio',
    subtitle: 'Disbursements, interest tenure & repayments',
  },
  closure: {
    title: 'Loan Closure & Settlements',
    subtitle: 'Settle active loans & release vault collateral',
  },
};

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

  const currentTabKey = (() => {
    if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/') return 'index';
    for (const key of Object.keys(TAB_METADATA)) {
      if (key !== 'index' && pathname.includes(key)) return key;
    }
    return 'index';
  })();

  const activeTabMeta = TAB_METADATA[currentTabKey] || TAB_METADATA.index;
  const insets = useSafeAreaInsets();
  const { collapsed, setCollapsed, mobileDrawerOpen, setMobileDrawerOpen, isDesktop } = useSidebar();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

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
    inputRange: [68, 120, 240],
    outputRange: [0, 0, 1],
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
            <View style={styles.desktopSidebarHeader}>
              <View style={styles.desktopBrandRow}>
                <Image
                  source={require('../../../assets/Logo.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <Animated.View style={[styles.desktopBrandTextWrapper, { opacity: textOpacity }]}>
                  <Text style={styles.brandTitle} numberOfLines={1}>{Env.APP_NAME}</Text>
                  <Text style={styles.brandSub} numberOfLines={1}>{Env.APP_SUBTITLE}</Text>
                </Animated.View>
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
                      styles.desktopNavItem,
                      active && styles.navItemActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    {active && <View style={styles.activePillIndicator} />}
                    <View style={styles.desktopNavIconBox}>
                      <Ionicons
                        name={active ? item.activeIcon : item.icon}
                        size={20}
                        color={active ? (isDark ? '#fbbf24' : colors.primaryDark) : colors.textSecondary}
                      />
                    </View>
                    <Animated.View style={[styles.desktopNavTextWrapper, { opacity: textOpacity }]}>
                      <Text 
                        style={[styles.navText, active && styles.navTextActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </Animated.View>
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
                <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
                  <ThemeToggleBtn showLabel size={15} />
                </View>
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
              <>
                <View style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <ThemeToggleBtn size={15} />
                </View>
                <TouchableOpacity 
                  onPress={() => setCollapsed(false)} 
                  style={styles.expandRailBtn}
                  accessibilityLabel="Expand sidebar"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#fbbf24' : colors.primaryDark} />
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#fbbf24' : colors.primaryDark} style={{ marginLeft: -8 }} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}

        {/* ─── TAB SCREENS CONTENT (Full height, bottom bar permanently hidden) ─── */}
        <View style={styles.screensWrapper}>
          {/* ─── GLOBAL SHARED TOP NAVIGATION BAR ─── */}
          <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
            <View style={styles.topBarTitleGroup}>
              <SidebarTrigger />
              <View style={styles.topBarTextWrapper}>
                <Text style={styles.pageTitle} numberOfLines={1}>{activeTabMeta.title}</Text>
                <Text style={styles.pageSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  {activeTabMeta.subtitle}
                </Text>
              </View>
            </View>

            <View style={styles.topBarActions}>
              <ThemeToggleBtn size={15} />
              <TouchableOpacity 
                onPress={() => store.syncFromBackend(true)} 
                style={styles.refreshActionBtn} 
                activeOpacity={0.7}
                disabled={store.isSyncing}
              >
                {store.isSyncing ? (
                  <ActivityIndicator size="small" color={isDark ? '#fbbf24' : colors.primaryDark} />
                ) : (
                  <Ionicons name="refresh" size={15} color={isDark ? '#fbbf24' : colors.primaryDark} />
                )}
                <Text style={styles.refreshActionText}>
                  {store.isSyncing ? 'Syncing...' : isDesktop ? 'Sync Rates & Data' : 'Sync'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1 }}>
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
                <Image
                  source={require('../../../assets/Logo.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <View style={styles.drawerBrandTexts}>
                  <Text style={styles.brandTitle} numberOfLines={1} ellipsizeMode="tail">
                    {Env.APP_NAME}
                  </Text>
                  <Text style={styles.brandSub} numberOfLines={1} ellipsizeMode="tail">
                    {Env.APP_SUBTITLE}
                  </Text>
                </View>
              </View>
              <View style={{ marginRight: 8 }}>
                <ThemeToggleBtn size={16} />
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
                      color={active ? (isDark ? '#fbbf24' : colors.primaryDark) : colors.textSecondary}
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

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  screensWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ─── GLOBAL TOP NAVIGATION BAR ───
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  topBarDesktop: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  topBarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 160,
  },
  topBarTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : colors.primarySubtle,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#fde68a',
    flexShrink: 0,
  },
  refreshActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#fbbf24' : colors.primaryDark,
  },

  // ─── DESKTOP SIDEBAR ───
  desktopSidebar: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  desktopSidebarHeader: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  desktopBrandTextWrapper: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    marginLeft: 10,
  },
  desktopNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
    minHeight: 42,
    overflow: 'hidden',
    width: '100%',
  },
  desktopNavIconBox: {
    width: 52,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  desktopNavTextWrapper: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    paddingRight: 8,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  brandSub: {
    fontSize: 10,
    color: colors.textSecondary,
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
  navItemActive: {
    backgroundColor: isDark ? '#261a02' : colors.primarySubtle,
  },
  activePillIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: isDark ? '#f59e0b' : colors.primaryDark,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navTextActive: {
    color: isDark ? '#fbbf24' : colors.primaryDark,
    fontWeight: '800',
  },

  // ─── SIDEBAR FOOTER ───
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  goldTickerCard: {
    backgroundColor: isDark ? '#1e293b' : '#fefce8',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#fef08a',
    marginBottom: 10,
  },
  tickerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#fbbf24' : colors.primaryDark,
  },
  tickerRate: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  tickerUnit: {
    fontSize: 10,
    color: colors.textMuted,
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
    color: colors.textMuted,
    fontWeight: '600',
  },
  expandRailBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  mobileDrawer: {
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
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
    borderBottomColor: colors.border,
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
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDrawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});