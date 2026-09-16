import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, 
  SafeAreaView, ScrollView 
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';

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
  const router = useRouter();
  const pathname = usePathname();
  const store = useAppStore();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isLive = !ApiConfig.isMockMode();
  const live22kRate = store.goldRates?.gold22k?.rate1g;

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
    <SafeAreaView style={styles.root}>
      {/* ─── MOBILE TOP HEADER (when on mobile/tablet < 768) ─── */}
      {!isDesktop && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity 
            onPress={() => setMobileDrawerOpen(true)} 
            style={styles.mobileMenuBtn}
            accessibilityLabel="Open Navigation Menu"
          >
            <Ionicons name="menu" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.mobileBrand}>
            <View style={styles.brandIconMini}>
              <Text style={{ fontSize: 16 }}>🪙</Text>
            </View>
            <View>
              <Text style={styles.mobileBrandTitle}>Gold Loan Tracker</Text>
              <Text style={styles.mobileBrandSub}>Bangalore Gold System</Text>
            </View>
          </View>

          <View style={[styles.statusPill, isLive ? styles.statusPillLive : styles.statusPillDemo]}>
            <View style={[styles.statusDot, { backgroundColor: isLive ? '#16a34a' : '#d97706' }]} />
            <Text style={[styles.statusPillText, { color: isLive ? '#15803d' : '#92400e' }]}>
              {isLive ? 'Live' : 'Demo'}
            </Text>
          </View>
        </View>
      )}

      {/* ─── MAIN APP CONTAINER (Sidebar + Tabs Screens) ─── */}
      <View style={styles.mainContainer}>
        {/* ─── DESKTOP COLLAPSIBLE SIDEBAR ─── */}
        {isDesktop && (
          <View style={[styles.desktopSidebar, collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded]}>
            {/* Sidebar Header / Brand */}
            <View style={[styles.sidebarHeader, collapsed && styles.sidebarHeaderCollapsed]}>
              {!collapsed ? (
                <View style={styles.brandRow}>
                  <View style={styles.brandIcon}>
                    <Text style={{ fontSize: 20 }}>🪙</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.brandTitle} numberOfLines={1}>Gold Loan Tracker</Text>
                    <Text style={styles.brandSub} numberOfLines={1}>Bangalore Valuation</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.brandIcon, { alignSelf: 'center' }]}>
                  <Text style={{ fontSize: 20 }}>🪙</Text>
                </View>
              )}

              {/* Open / Close Toggle Button */}
              <TouchableOpacity 
                onPress={() => setCollapsed(!collapsed)} 
                style={[styles.collapseToggleBtn, collapsed && styles.collapseToggleBtnCollapsed]}
                accessibilityLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Ionicons 
                  name={collapsed ? "chevron-forward" : "chevron-back"} 
                  size={18} 
                  color={Colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Live Sheets Status Tag (Expanded mode) */}
            {!collapsed && (
              <View style={styles.syncBanner}>
                <View style={[styles.statusDot, { backgroundColor: isLive ? '#16a34a' : '#d97706' }]} />
                <Text style={styles.syncBannerText}>
                  {isLive ? 'Connected to Google Sheets' : 'Demo Offline Mode'}
                </Text>
              </View>
            )}

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
                      <Text style={[styles.navText, active && styles.navTextActive]}>
                        {item.title}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer / Gold Rate Ticker */}
            {!collapsed ? (
              <View style={styles.sidebarFooter}>
                {live22kRate ? (
                  <View style={styles.goldTickerCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="trending-up" size={14} color={Colors.primaryDark} />
                      <Text style={styles.tickerTitle}>Bangalore 22K</Text>
                    </View>
                    <Text style={styles.tickerRate}>₹{live22kRate.toLocaleString()} <Text style={styles.tickerUnit}>/g</Text></Text>
                  </View>
                ) : null}
                <TouchableOpacity 
                  onPress={() => setCollapsed(true)} 
                  style={styles.collapseFooterBtn}
                >
                  <Ionicons name="chevron-back-circle-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.collapseFooterText}>Collapse Sidebar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => setCollapsed(false)} 
                style={styles.expandRailBtn}
                accessibilityLabel="Expand sidebar"
              >
                <Ionicons name="chevron-forward-circle-outline" size={20} color={Colors.primaryDark} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── TAB SCREENS CONTENT (Bottom bar permanently hidden) ─── */}
        <View style={styles.screensWrapper}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // Remove bottom tab bar
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

      {/* ─── MOBILE SLIDE-IN DRAWER OVERLAY ─── */}
      {!isDesktop && mobileDrawerOpen && (
        <View style={styles.mobileOverlay}>
          {/* Backdrop (tap to close) */}
          <TouchableOpacity 
            style={styles.mobileBackdrop} 
            activeOpacity={1} 
            onPress={() => setMobileDrawerOpen(false)} 
          />

          {/* Slide-in Drawer Container */}
          <View style={[styles.mobileDrawer, { width: Math.min(300, width * 0.8) }]}>
            <View style={styles.mobileDrawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Text style={{ fontSize: 20 }}>🪙</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brandTitle}>Gold Loan Tracker</Text>
                  <Text style={styles.brandSub}>Bangalore Gold System</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setMobileDrawerOpen(false)}
                style={styles.drawerCloseBtn}
                accessibilityLabel="Close navigation"
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.mobileDrawerSync}>
              <View style={[styles.statusDot, { backgroundColor: isLive ? '#16a34a' : '#d97706' }]} />
              <Text style={styles.syncBannerText}>
                {isLive ? 'Google Sheets Sync Active' : 'Offline / Demo Mode'}
              </Text>
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
                    <Text style={[styles.navText, active && styles.navTextActive, { fontSize: 14 }]}>
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
                    <Text style={styles.tickerTitle}>Bangalore 22K Gold</Text>
                  </View>
                  <Text style={styles.tickerRate}>₹{live22kRate.toLocaleString()} <Text style={styles.tickerUnit}>/g</Text></Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
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

  // ─── MOBILE HEADER ───
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
  },
  mobileMenuBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
  },
  mobileBrandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  mobileBrandSub: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillLive: {
    backgroundColor: '#dcfce7',
  },
  statusPillDemo: {
    backgroundColor: '#fef3c7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ─── DESKTOP SIDEBAR ───
  desktopSidebar: {
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    height: '100%',
    flexDirection: 'column',
  },
  sidebarExpanded: {
    width: 240,
  },
  sidebarCollapsed: {
    width: 68,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sidebarHeaderCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  collapseToggleBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 6,
  },
  collapseToggleBtnCollapsed: {
    position: 'absolute',
    right: -12,
    top: 20,
    zIndex: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  syncBannerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ─── NAV ITEMS ───
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingVertical: 10,
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
  drawerCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  mobileDrawerSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mobileDrawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
