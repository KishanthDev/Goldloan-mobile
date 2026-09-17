import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, useWindowDimensions, ActivityIndicator 
} from 'react-native';
import { Skeleton } from '../../components/Skeleton';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';
import { Env } from '../../config/env';
import { Ionicons } from '@expo/vector-icons';
import { SidebarTrigger } from '../../components/SidebarTrigger';

export default function DashboardScreen() {
  const router = useRouter();
  const store = useAppStore();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const isDesktop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;
  const isCompact = width < 540;

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
    <View style={styles.screenRoot}>
      {/* ─── DASHBOARD TOP ACTION BAR (Protected, Never Overflows) ─── */}
      <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
        <View style={styles.topBarTitleGroup}>
          <SidebarTrigger />
          <View style={styles.topBarTextWrapper}>
            <Text style={styles.pageTitle} numberOfLines={1}>Financial Overview</Text>
            <Text style={styles.pageSubtitle} numberOfLines={1} ellipsizeMode="tail">
              Real-time portfolio valuation & gold vault status
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshActionBtn} activeOpacity={0.7}>
          <Ionicons name="refresh" size={15} color={Colors.primaryDark} />
          <Text style={styles.refreshActionText}>Sync Rates & Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* ─── INITIAL SYNC SKELETON LOADER (When cache is empty & syncing) ─── */}
        {store.isSyncing && store.users.length === 0 && store.loans.length === 0 ? (
          <View style={{ gap: 20 }}>
            {/* Syncing Pill Notice */}
            <View style={styles.syncNoticePill}>
              <ActivityIndicator size="small" color={Colors.primaryDark} />
              <Text style={styles.syncNoticeText}>Loading portfolio data from Google Sheets...</Text>
            </View>

            {/* Rates Card Skeleton */}
            <View style={styles.goldRatesCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton width={200} height={20} />
                <Skeleton width={80} height={20} />
              </View>
              <View style={{ gap: 10 }}>
                <Skeleton width="100%" height={90} borderRadius={12} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Skeleton width="50%" height={80} borderRadius={12} style={{ flex: 1 }} />
                  <Skeleton width="50%" height={80} borderRadius={12} style={{ flex: 1 }} />
                </View>
              </View>
            </View>

            {/* Valuation Skeleton */}
            <Skeleton width={180} height={16} style={{ marginBottom: -8 }} />
            <View style={{ gap: 12 }}>
              <Skeleton width="100%" height={95} borderRadius={14} />
              <Skeleton width="100%" height={95} borderRadius={14} />
              <Skeleton width="100%" height={95} borderRadius={14} />
            </View>

            {/* Operational Metrics Skeleton */}
            <Skeleton width={180} height={16} style={{ marginBottom: -8 }} />
            {isDesktop ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width="25%" height={105} borderRadius={14} style={{ flex: 1 }} />
                <Skeleton width="25%" height={105} borderRadius={14} style={{ flex: 1 }} />
                <Skeleton width="25%" height={105} borderRadius={14} style={{ flex: 1 }} />
                <Skeleton width="25%" height={105} borderRadius={14} style={{ flex: 1 }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
                <Skeleton width="48.5%" height={105} borderRadius={14} />
                <Skeleton width="48.5%" height={105} borderRadius={14} />
                <Skeleton width="48.5%" height={105} borderRadius={14} />
                <Skeleton width="48.5%" height={105} borderRadius={14} />
              </View>
            )}
          </View>
        ) : (
          <>
        {/* ─── SECTION 1: LIVE GOLD RATES (RESPONSIVE HERO ON MOBILE) ─── */}
        <View style={styles.goldRatesCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.goldBadgeIcon}>
                <Ionicons name="trending-up" size={16} color={Colors.primaryDark} />
              </View>
              <Text style={styles.cardSectionTitle} numberOfLines={1}>
                {Env.LOCATION_BENCHMARK} Live Gold Benchmark
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <View style={styles.cityPill}>
                <Text style={styles.cityPillText}>Live 24K/22K/18K</Text>
              </View>
              <Text style={styles.dateLabel} numberOfLines={1}>
                {rates?.displayDate || 'Updated Today'}
              </Text>
            </View>
          </View>

          {isCompact ? (
            // ─── MOBILE RESPONSIVE LAYOUT (Featured 22K Hero + 2-Col 24K/18K) ───
            <View style={styles.ratesMobileContainer}>
              {/* Featured 22K Standard Hero Card */}
              <View style={[styles.rateBox, styles.rateBoxFeatured, styles.rateBoxHero]}>
                <View style={styles.heroHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                    <Text style={[styles.rateKarat, styles.rateKaratFeatured]} numberOfLines={1}>
                      22K Standard (916)
                    </Text>
                    <View style={[styles.miniBadge, { backgroundColor: Colors.primaryDark }]}>
                      <Text style={[styles.miniBadgeText, { color: '#ffffff' }]}>Primary</Text>
                    </View>
                  </View>
                  <View style={[styles.sovereignBox, { backgroundColor: '#fef3c7', marginTop: 0 }]}>
                    <Text style={[styles.sovereignText, { color: '#92400e', fontWeight: '700' }]} numberOfLines={1}>
                      8g Sovereign: ₹{(live22kRate * 8).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroAmountRow}>
                  <Text style={[styles.rateAmount, styles.rateAmountFeatured]}>
                    ₹{live22kRate.toLocaleString()}
                  </Text>
                  <Text style={styles.rateUnitHero}>per 1g</Text>
                </View>
              </View>

              {/* 24K and 18K Secondary Side-by-Side */}
              <View style={styles.ratesTwoColRow}>
                {/* 24K Pure Gold */}
                <View style={[styles.rateBox, { flex: 1 }]}>
                  <View style={styles.rateBoxHeader}>
                    <Text style={styles.rateKarat} numberOfLines={1}>24K Pure (999)</Text>
                    <View style={[styles.miniBadge, { backgroundColor: '#fef08a' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#854d0e' }]}>99.9%</Text>
                    </View>
                  </View>
                  <Text style={styles.rateAmount} numberOfLines={1}>₹{live24kRate.toLocaleString()}</Text>
                  <Text style={styles.rateUnit}>per 1g</Text>
                  <View style={styles.sovereignBox}>
                    <Text style={styles.sovereignText} numberOfLines={1}>8g: ₹{(live24kRate * 8).toLocaleString()}</Text>
                  </View>
                </View>

                {/* 18K Hallmarked */}
                <View style={[styles.rateBox, { flex: 1 }]}>
                  <View style={styles.rateBoxHeader}>
                    <Text style={styles.rateKarat} numberOfLines={1}>18K Gold (750)</Text>
                    <View style={[styles.miniBadge, { backgroundColor: '#fed7aa' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#9a3412' }]}>75.0%</Text>
                    </View>
                  </View>
                  <Text style={styles.rateAmount} numberOfLines={1}>₹{live18kRate.toLocaleString()}</Text>
                  <Text style={styles.rateUnit}>per 1g</Text>
                  <View style={styles.sovereignBox}>
                    <Text style={styles.sovereignText} numberOfLines={1}>8g: ₹{(live18kRate * 8).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // ─── DESKTOP/TABLET 3-COLUMN ROW ───
            <View style={styles.ratesGridRow}>
              {/* 24K Pure Gold */}
              <View style={styles.rateBox}>
                <View style={styles.rateBoxHeader}>
                  <Text style={styles.rateKarat} numberOfLines={1}>24K Pure (999)</Text>
                  <View style={[styles.miniBadge, { backgroundColor: '#fef08a' }]}>
                    <Text style={[styles.miniBadgeText, { color: '#854d0e' }]}>99.9%</Text>
                  </View>
                </View>
                <Text style={styles.rateAmount} numberOfLines={1}>₹{live24kRate.toLocaleString()}</Text>
                <Text style={styles.rateUnit}>per 1g</Text>
                <View style={styles.sovereignBox}>
                  <Text style={styles.sovereignText} numberOfLines={1}>8g: ₹{(live24kRate * 8).toLocaleString()}</Text>
                </View>
              </View>

              {/* 22K Jewelry Standard (Featured) */}
              <View style={[styles.rateBox, styles.rateBoxFeatured]}>
                <View style={styles.rateBoxHeader}>
                  <Text style={[styles.rateKarat, { color: Colors.primaryDark }]} numberOfLines={1}>
                    22K Standard (916)
                  </Text>
                  <View style={[styles.miniBadge, { backgroundColor: Colors.primaryDark }]}>
                    <Text style={[styles.miniBadgeText, { color: '#ffffff' }]}>Primary</Text>
                  </View>
                </View>
                <Text style={[styles.rateAmount, styles.rateAmountFeatured]} numberOfLines={1}>
                  ₹{live22kRate.toLocaleString()}
                </Text>
                <Text style={styles.rateUnit}>per 1g</Text>
                <View style={[styles.sovereignBox, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.sovereignText, { color: '#92400e', fontWeight: '700' }]} numberOfLines={1}>
                    8g Sovereign: ₹{(live22kRate * 8).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* 18K Hallmarked */}
              <View style={styles.rateBox}>
                <View style={styles.rateBoxHeader}>
                  <Text style={styles.rateKarat} numberOfLines={1}>18K Gold (750)</Text>
                  <View style={[styles.miniBadge, { backgroundColor: '#fed7aa' }]}>
                    <Text style={[styles.miniBadgeText, { color: '#9a3412' }]}>75.0%</Text>
                  </View>
                </View>
                <Text style={styles.rateAmount} numberOfLines={1}>₹{live18kRate.toLocaleString()}</Text>
                <Text style={styles.rateUnit}>per 1g</Text>
                <View style={styles.sovereignBox}>
                  <Text style={styles.sovereignText} numberOfLines={1}>8g: ₹{(live18kRate * 8).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ─── SECTION 2: GOLD VAULT VALUATION (3-COLUMN GRID) ─── */}
        <Text style={styles.sectionHeading}>Gold Vault Valuation</Text>
        <View style={[styles.valGrid, (isDesktop || isTablet) && styles.valGridRow]}>
          {/* 1. Current Market Value */}
          <View style={[styles.valCard, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle} numberOfLines={1}>Current Market Value</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="diamond" size={18} color="#b45309" />
              </View>
            </View>
            <Text style={styles.valAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              ₹{currentGoldValue.toLocaleString()}
            </Text>
            <View style={styles.valBadge}>
              <Text style={styles.valBadgeText} numberOfLines={1} ellipsizeMode="tail">
                {totalGoldWeight.toFixed(2)}g net wt @ ₹{live22kRate}/g
              </Text>
            </View>
          </View>

          {/* 2. Total Buying Cost */}
          <View style={[styles.valCard, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle} numberOfLines={1}>Total Acquisition Cost</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#e2e8f0' }]}>
                <Ionicons name="wallet" size={18} color="#475569" />
              </View>
            </View>
            <Text style={styles.valAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              ₹{buyingGoldValue.toLocaleString()}
            </Text>
            <View style={[styles.valBadge, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.valBadgeText, { color: Colors.textSecondary }]} numberOfLines={1}>
                Historical purchase benchmark
              </Text>
            </View>
          </View>

          {/* 3. Unrealized Appreciation */}
          <View style={[styles.valCard, styles.valCardSuccess, (isDesktop || isTablet) && { flex: 1 }]}>
            <View style={styles.valCardTop}>
              <Text style={[styles.valTitle, { color: '#166534' }]} numberOfLines={1}>Appreciation Gains</Text>
              <View style={[styles.valIconBox, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="trending-up" size={18} color="#16a34a" />
              </View>
            </View>
            <Text style={[styles.valAmount, { color: '#15803d' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              +{appreciationGains >= 0 ? '₹' : '-₹'}{Math.abs(appreciationGains).toLocaleString()}
            </Text>
            <View style={[styles.valBadge, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.valBadgeText, { color: '#166534' }]} numberOfLines={1}>
                +{appreciationPct.toFixed(1)}% portfolio growth
              </Text>
            </View>
          </View>
        </View>

        {/* ─── SECTION 3: OPERATIONAL PORTFOLIO (4-COLUMN GRID ON DESKTOP) ─── */}
        <Text style={styles.sectionHeading}>Operational Portfolio</Text>
        <View style={isDesktop ? styles.metricsGridDesktop : styles.metricsGridMobile}>
          {/* Customers */}
          <TouchableOpacity 
            style={isDesktop ? styles.metricCardDesktop : styles.metricCardMobile} 
            onPress={() => router.push('/(tabs)/users' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={styles.metricIconBox}>
                <Ionicons name="people" size={20} color={Colors.primaryDark} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {dash.totalUsers}
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>Active Customers</Text>
            <Text style={styles.metricHint} numberOfLines={1}>Registered borrowers</Text>
          </TouchableOpacity>

          {/* Bank Accounts */}
          <TouchableOpacity 
            style={isDesktop ? styles.metricCardDesktop : styles.metricCardMobile} 
            onPress={() => router.push('/(tabs)/bank-accounts' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="business" size={20} color="#0284c7" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {dash.totalBankAccounts}
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>Bank Accounts</Text>
            <Text style={styles.metricHint} numberOfLines={1}>Linked disbursement banks</Text>
          </TouchableOpacity>

          {/* Active Loans */}
          <TouchableOpacity 
            style={isDesktop ? styles.metricCardDesktop : styles.metricCardMobile} 
            onPress={() => router.push('/(tabs)/loans' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cash" size={20} color="#b45309" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              ₹{(dash.totalLoanAmount / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>{dash.activeLoans} Active Loans</Text>
            <Text style={styles.metricHint} numberOfLines={1}>Total disbursed capital</Text>
          </TouchableOpacity>

          {/* Pledged Ornaments */}
          <TouchableOpacity 
            style={isDesktop ? styles.metricCardDesktop : styles.metricCardMobile} 
            onPress={() => router.push('/(tabs)/ornaments' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.metricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {dash.pledgedGrams.toFixed(1)}g
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>{dash.pledgedOrnamentsCount} Pledged Items</Text>
            <Text style={styles.metricHint} numberOfLines={1}>Secured in bank vault</Text>
          </TouchableOpacity>
        </View>

        {/* ─── SECTION 4: BANK LIMIT UTILIZATION ─── */}
        <View style={styles.bankUtilCard}>
          <View style={styles.bankUtilHeader}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.bankUtilTitle} numberOfLines={1}>Bank Loan Limit Utilization</Text>
              <Text style={styles.bankUtilSubText} numberOfLines={1}>Overall credit line exposure across banks</Text>
            </View>
            <View style={styles.utilPill}>
              <Text style={styles.utilPillText}>{utilPercent}% Utilized</Text>
            </View>
          </View>

          <View style={styles.utilAmountsRow}>
            <View>
              <Text style={styles.utilAmountLabel}>Total Disbursed</Text>
              <Text style={styles.utilAmountVal} numberOfLines={1}>₹{dash.totalLoanAmount.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.utilAmountLabel}>Eligible Limit ({Env.MAX_LTV_PERCENT}% LTV)</Text>
              <Text style={styles.utilAmountVal} numberOfLines={1}>₹{dash.totalEligibleLoanAmount.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${utilPercent}%` }]} />
          </View>

          <View style={styles.utilFooter}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.bankUtilSub} numberOfLines={1} ellipsizeMode="tail">
              Available credit headroom: <Text style={{ color: Colors.success, fontWeight: '700' }}>₹{dash.totalAvailableLoanAmount.toLocaleString()}</Text>
            </Text>
          </View>
        </View>

        {/* ─── SECTION 5: QUICK ACTIONS GRID (4-IN-A-ROW ON DESKTOP, 2x2 ON MOBILE) ─── */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={isDesktop ? styles.quickActionsGridDesktop : styles.quickActionsGridMobile}>
          <TouchableOpacity 
            style={isDesktop ? styles.actionCardDesktop : styles.actionCardMobile} 
            onPress={() => router.push('/loans/new' as any)} 
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef08a' }]}>
              <Ionicons name="add-circle" size={20} color={Colors.primaryDark} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>New Loan</Text>
            <Text style={styles.actionSub} numberOfLines={1}>Disburse collateral</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={isDesktop ? styles.actionCardDesktop : styles.actionCardMobile} 
            onPress={() => router.push('/customers/new' as any)} 
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="person-add" size={20} color="#0284c7" />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Add Customer</Text>
            <Text style={styles.actionSub} numberOfLines={1}>Register borrower</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={isDesktop ? styles.actionCardDesktop : styles.actionCardMobile} 
            onPress={() => router.push('/ornaments/new' as any)} 
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="diamond" size={20} color="#b45309" />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Pledge Gold</Text>
            <Text style={styles.actionSub} numberOfLines={1}>Deposit vault item</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={isDesktop ? styles.actionCardDesktop : styles.actionCardMobile} 
            onPress={() => router.push('/(tabs)/closure' as any)} 
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="receipt" size={20} color="#16a34a" />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Repayment</Text>
            <Text style={styles.actionSub} numberOfLines={1}>Record settlement</Text>
          </TouchableOpacity>
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  topBarTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
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
    flexShrink: 0,
  },
  refreshActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  container: {
    flex: 1,
  },
  syncNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  syncNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
  },
  topBarDesktop: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
    width: '100%',
  },
  contentDesktop: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    maxWidth: '100%',
    alignSelf: 'stretch',
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 180,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  goldBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    flexShrink: 0,
  },
  cityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854d0e',
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    flexShrink: 0,
  },

  // ─── RATES LAYOUTS (MOBILE VS DESKTOP) ───
  ratesMobileContainer: {
    gap: 10,
  },
  ratesTwoColRow: {
    flexDirection: 'row',
    gap: 10,
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
    minWidth: 0,
  },
  rateBoxFeatured: {
    backgroundColor: '#fffdf5',
    borderColor: '#facc15',
    borderWidth: 1.5,
  },
  rateBoxHero: {
    alignItems: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rateUnitHero: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  rateBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
    width: '100%',
  },
  rateKarat: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  rateKaratFeatured: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    flexShrink: 0,
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
    fontSize: 22,
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
    maxWidth: '100%',
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
    minWidth: 0,
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
    flex: 1,
    marginRight: 6,
  },
  valIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  valAmount: {
    fontSize: 22,
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
    maxWidth: '100%',
  },
  valBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },

  // ─── METRICS GRID (2x2 on Mobile, 4 in a row on Desktop) ───
  metricsGridDesktop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  metricsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 20,
    width: '100%',
  },
  metricCardDesktop: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricCardMobile: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricVal: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
    flex: 1,
  },
  metricHint: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ─── BANK UTILIZATION ───
  bankUtilCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  bankUtilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
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
    flexShrink: 0,
  },
  utilPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  utilAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
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
    flex: 1,
  },

  // ─── QUICK ACTIONS GRID (2x2 on Mobile, 4 in a row on Desktop) ───
  quickActionsGridDesktop: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  quickActionsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  actionCardDesktop: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionCardMobile: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionSub: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
