import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, SafeAreaView, useWindowDimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';
import { Env } from '../../config/env';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();
  const store = useAppStore();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const isDesktop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;

  const dash = store.dashboardData;
  const rates = store.goldRates;

  // Gold Valuation Calculations
  const totalGoldWeight = dash.totalGoldWeight || 0;
  const buyingGoldValue = Math.round(dash.totalBuyingGoldValue || 0);
  const live22kRate = rates?.gold22k?.rate1g || Env.FALLBACK_22K_RATE;
  const live24kRate = rates?.gold24k?.rate1g || Env.FALLBACK_24K_RATE;
  const live18kRate = rates?.gold18k?.rate1g || Env.FALLBACK_18K_RATE;
  const currentGoldValue = Math.round(totalGoldWeight * live22kRate);
  const appreciationGains = currentGoldValue - buyingGoldValue;
  const appreciationPct = buyingGoldValue > 0 ? ((appreciationGains / buyingGoldValue) * 100) : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await store.syncFromBackend(true);
    setRefreshing(false);
  };

  const isLive = !ApiConfig.isMockMode();
  const utilPercent = dash.totalEligibleLoanAmount > 0 
    ? Math.min(100, Math.round((dash.totalLoanAmount / dash.totalEligibleLoanAmount) * 100)) 
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── DASHBOARD TOP ACTION BAR ─── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Financial Overview</Text>
          <Text style={styles.pageSubtitle}>Real-time portfolio valuation and gold vault status</Text>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshActionBtn} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color={Colors.primaryDark} />
          <Text style={styles.refreshActionText}>Sync Rates & Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* ─── SECTION 1: LIVE GOLD RATES (BANGALORE MARKET) ─── */}
        <View style={styles.goldRatesCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.goldBadgeIcon}>
                <Ionicons name="trending-up" size={16} color={Colors.primaryDark} />
              </View>
              <Text style={styles.cardSectionTitle}>{Env.LOCATION_BENCHMARK} Live Gold Benchmark</Text>
              <View style={styles.cityPill}>
                <Text style={styles.cityPillText}>Live 24K/22K/18K</Text>
              </View>
            </View>
            <Text style={styles.dateLabel}>{rates?.displayDate || 'Updated Today'}</Text>
          </View>

          {/* 3-Column Rates Grid */}
          <View style={styles.ratesGridRow}>
            {/* 24K Pure Gold */}
            <View style={styles.rateBox}>
              <View style={styles.rateBoxHeader}>
                <Text style={styles.rateKarat}>24K Pure (999)</Text>
                <View style={[styles.miniBadge, { backgroundColor: '#fef08a' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#854d0e' }]}>99.9%</Text>
                </View>
              </View>
              <Text style={styles.rateAmount}>₹{live24kRate.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per 1g</Text>
              <View style={styles.sovereignBox}>
                <Text style={styles.sovereignText}>8g: ₹{(live24kRate * 8).toLocaleString()}</Text>
              </View>
            </View>

            {/* 22K Jewelry Standard (Featured) */}
            <View style={[styles.rateBox, styles.rateBoxFeatured]}>
              <View style={styles.rateBoxHeader}>
                <Text style={[styles.rateKarat, { color: Colors.primaryDark }]}>22K Standard (916)</Text>
                <View style={[styles.miniBadge, { backgroundColor: Colors.primaryDark }]}>
                  <Text style={[styles.miniBadgeText, { color: '#ffffff' }]}>Primary</Text>
                </View>
              </View>
              <Text style={[styles.rateAmount, styles.rateAmountFeatured]}>₹{live22kRate.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per 1g</Text>
              <View style={[styles.sovereignBox, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.sovereignText, { color: '#92400e', fontWeight: '700' }]}>
                  8g Sovereign: ₹{(live22kRate * 8).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* 18K Hallmarked */}
            <View style={styles.rateBox}>
              <View style={styles.rateBoxHeader}>
                <Text style={styles.rateKarat}>18K Gold (750)</Text>
                <View style={[styles.miniBadge, { backgroundColor: '#fed7aa' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#9a3412' }]}>75.0%</Text>
                </View>
              </View>
              <Text style={styles.rateAmount}>₹{live18kRate.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per 1g</Text>
              <View style={styles.sovereignBox}>
                <Text style={styles.sovereignText}>8g: ₹{(live18kRate * 8).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── SECTION 2: GOLD VAULT VALUATION (3-COLUMN GRID) ─── */}
        <Text style={styles.sectionHeading}>Gold Vault Valuation</Text>
        <View style={[styles.valGrid, (isDesktop || isTablet) && styles.valGridRow]}>
          {/* 1. Current Market Value */}
          <View style={[styles.valCard, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle}>Current Market Value</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="diamond" size={18} color="#b45309" />
              </View>
            </View>
            <Text style={styles.valAmount}>₹{currentGoldValue.toLocaleString()}</Text>
            <View style={styles.valBadge}>
              <Text style={styles.valBadgeText}>
                {totalGoldWeight.toFixed(2)}g net wt @ ₹{live22kRate}/g
              </Text>
            </View>
          </View>

          {/* 2. Total Buying Cost */}
          <View style={[styles.valCard, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle}>Total Acquisition Cost</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#e2e8f0' }]}>
                <Ionicons name="wallet" size={18} color="#475569" />
              </View>
            </View>
            <Text style={styles.valAmount}>₹{buyingGoldValue.toLocaleString()}</Text>
            <View style={[styles.valBadge, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.valBadgeText, { color: '#64748b' }]}>
                Historical purchase benchmark
              </Text>
            </View>
          </View>

          {/* 3. Appreciation Gains */}
          <View style={[styles.valCard, styles.valCardSuccess, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={[styles.valTitle, { color: '#15803d' }]}>Appreciation Gains</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="trending-up" size={18} color="#16a34a" />
              </View>
            </View>
            <Text style={[styles.valAmount, { color: '#15803d' }]}>
              +{appreciationGains >= 0 ? '' : '-'}₹{Math.abs(appreciationGains).toLocaleString()}
            </Text>
            <View style={[styles.valBadge, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.valBadgeText, { color: '#15803d', fontWeight: '700' }]}>
                +{appreciationPct.toFixed(1)}% portfolio growth
              </Text>
            </View>
          </View>
        </View>

        {/* ─── SECTION 3: OPERATIONAL PORTFOLIO (4-COLUMN GRID ON DESKTOP) ─── */}
        <Text style={styles.sectionHeading}>Operational Portfolio</Text>
        <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
          {/* Customers */}
          <TouchableOpacity 
            style={[styles.metricCard, isDesktop && styles.metricCardDesktop]} 
            onPress={() => router.push('/(tabs)/users' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={styles.metricIconBox}>
                <Ionicons name="people" size={20} color={Colors.primaryDark} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal}>{dash.totalUsers}</Text>
            <Text style={styles.metricLabel}>Active Customers</Text>
            <Text style={styles.metricHint}>Registered borrowers</Text>
          </TouchableOpacity>

          {/* Bank Accounts */}
          <TouchableOpacity 
            style={[styles.metricCard, isDesktop && styles.metricCardDesktop]} 
            onPress={() => router.push('/(tabs)/bank-accounts' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="business" size={20} color="#0284c7" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal}>{dash.totalBankAccounts}</Text>
            <Text style={styles.metricLabel}>Bank Accounts</Text>
            <Text style={styles.metricHint}>Linked disbursement banks</Text>
          </TouchableOpacity>

          {/* Active Loans */}
          <TouchableOpacity 
            style={[styles.metricCard, isDesktop && styles.metricCardDesktop]} 
            onPress={() => router.push('/(tabs)/loans' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cash" size={20} color="#b45309" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal}>₹{(dash.totalLoanAmount / 1000).toFixed(0)}k</Text>
            <Text style={styles.metricLabel}>{dash.activeLoans} Active Loans</Text>
            <Text style={styles.metricHint}>Total disbursed capital</Text>
          </TouchableOpacity>

          {/* Pledged Ornaments */}
          <TouchableOpacity 
            style={[styles.metricCard, isDesktop && styles.metricCardDesktop]} 
            onPress={() => router.push('/(tabs)/ornaments' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal}>{dash.pledgedGrams.toFixed(1)}g</Text>
            <Text style={styles.metricLabel}>{dash.pledgedOrnamentsCount} Pledged Items</Text>
            <Text style={styles.metricHint}>Secured in bank vault</Text>
          </TouchableOpacity>
        </View>

        {/* ─── SECTION 4: BANK LIMIT UTILIZATION ─── */}
        <View style={styles.bankUtilCard}>
          <View style={styles.bankUtilHeader}>
            <View>
              <Text style={styles.bankUtilTitle}>Bank Loan Limit Utilization</Text>
              <Text style={styles.bankUtilSubText}>Overall credit line exposure across banks</Text>
            </View>
            <View style={styles.utilPill}>
              <Text style={styles.utilPillText}>{utilPercent}% Utilized</Text>
            </View>
          </View>

          <View style={styles.utilAmountsRow}>
            <View>
              <Text style={styles.utilAmountLabel}>Total Disbursed</Text>
              <Text style={styles.utilAmountVal}>₹{dash.totalLoanAmount.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.utilAmountLabel}>Eligible Limit</Text>
              <Text style={styles.utilAmountVal}>₹{dash.totalEligibleLoanAmount.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${utilPercent}%` }]} />
          </View>

          <View style={styles.utilFooter}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.bankUtilSub}>
              Available credit headroom for new loans: <Text style={{ color: Colors.success, fontWeight: '700' }}>₹{dash.totalAvailableLoanAmount.toLocaleString()}</Text>
            </Text>
          </View>
        </View>

        {/* ─── SECTION 5: QUICK ACTIONS GRID ─── */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={[styles.quickActionsGrid, (isDesktop || isTablet) && styles.quickActionsGridWide]}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/loans' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="add-circle" size={20} color="#b45309" />
            </View>
            <Text style={styles.actionTitle}>New Loan</Text>
            <Text style={styles.actionSub}>Create disbursement</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/users' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="person-add" size={20} color="#0284c7" />
            </View>
            <Text style={styles.actionTitle}>Add Customer</Text>
            <Text style={styles.actionSub}>Register KYC profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/ornaments' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef9c3' }]}>
              <Ionicons name="diamond" size={20} color="#854d0e" />
            </View>
            <Text style={styles.actionTitle}>Pledge Gold</Text>
            <Text style={styles.actionSub}>Deposit vault item</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/closure' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="receipt" size={20} color="#16a34a" />
            </View>
            <Text style={styles.actionTitle}>Repayment</Text>
            <Text style={styles.actionSub}>Record settlement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  refreshActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },

  // ─── RATES CARD ───
  goldRatesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  goldBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cityPill: {
    backgroundColor: '#fef08a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854d0e',
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  ratesGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  rateBoxFeatured: {
    backgroundColor: '#fffdf5',
    borderColor: '#facc15',
    borderWidth: 1.5,
  },
  rateBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rateKarat: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  rateAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rateAmountFeatured: {
    color: Colors.primaryDark,
    fontSize: 20,
  },
  rateUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  sovereignBox: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sovereignText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ─── HEADINGS ───
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },

  // ─── VALUATION GRID ───
  valGrid: {
    gap: 12,
    marginBottom: 24,
  },
  valGridRow: {
    flexDirection: 'row',
  },
  valCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  valCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  valCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  valTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  valBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  valBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },

  // ─── METRICS GRID ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricsGridDesktop: {
    flexWrap: 'nowrap',
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricCardDesktop: {
    minWidth: 0,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 3,
  },
  metricHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ─── BANK UTILIZATION ───
  bankUtilCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  bankUtilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bankUtilTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  bankUtilSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  utilPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  utilPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  utilAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  utilAmountLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  utilAmountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  barBg: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: 5,
  },
  utilFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankUtilSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // ─── QUICK ACTIONS GRID ───
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionsGridWide: {
    flexWrap: 'nowrap',
  },
  actionCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
