import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { ApiConfig } from '../../config/api';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();
  const store = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const dash = store.dashboardData;
  const rates = store.goldRates;

  // Gold Valuation Calculations (exact logic from updateGoldValuationDashboardCards in index.html)
  const totalGoldWeight = dash.totalGoldWeight || 0;
  const buyingGoldValue = Math.round(dash.totalBuyingGoldValue || 0);
  const live22kRate = rates?.gold22k?.rate1g || 8115;
  const currentGoldValue = Math.round(totalGoldWeight * live22kRate);
  const appreciationGains = currentGoldValue - buyingGoldValue;
  const appreciationPct = buyingGoldValue > 0 ? ((appreciationGains / buyingGoldValue) * 100) : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await store.syncFromBackend(true);
    setRefreshing(false);
  };

  const isLive = !ApiConfig.isMockMode();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Brand Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandEmoji}>🪙</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Gold Loan Tracker</Text>
            <Text style={styles.brandSubtitle}>Bangalore Gold Valuation System</Text>
          </View>
        </View>
        <View style={[styles.demoBadge, isLive && styles.liveBadge]}>
          <Text style={[styles.demoBadgeText, isLive && styles.liveBadgeText]}>
            {isLive ? 'Live Sheets' : 'Demo Active'}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* LIVE GOLD RATES CARD (GOODRETURNS BANGALORE) */}
        <View style={styles.goldCard}>
          <View style={styles.goldCardHeader}>
            <View style={styles.goldTitleRow}>
              <Ionicons name="trending-up" size={18} color={Colors.primaryDark} />
              <Text style={styles.goldCardTitle}>Live Gold Rates</Text>
              <View style={styles.cityBadge}>
                <Text style={styles.cityBadgeText}>Bangalore</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={14} color={Colors.textSecondary} />
              <Text style={styles.refreshText}>{rates.displayDate}</Text>
            </TouchableOpacity>
          </View>

          {/* 3 side-by-side Gold Rate Cards */}
          <View style={styles.ratesGrid}>
            {/* 24K */}
            <View style={styles.rateBox}>
              <View style={styles.rateBoxHeader}>
                <Text style={styles.rateKarat}>24K Gold</Text>
                <View style={[styles.miniBadge, { backgroundColor: '#fef08a' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#854d0e' }]}>99.9%</Text>
                </View>
              </View>
              <Text style={styles.rateAmount}>₹{rates.gold24k.rate1g.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per gram</Text>
              <View style={styles.changeBadge}>
                <Ionicons name="arrow-up" size={11} color={Colors.success} />
                <Text style={styles.changeText}>+₹{rates.gold24k.change}</Text>
              </View>
            </View>

            {/* 22K (Featured Jewelry) */}
            <View style={[styles.rateBox, styles.rateBoxFeatured]}>
              <View style={styles.rateBoxHeader}>
                <Text style={[styles.rateKarat, { color: Colors.primaryDark }]}>22K Standard</Text>
                <View style={[styles.miniBadge, { backgroundColor: Colors.primaryDark }]}>
                  <Text style={[styles.miniBadgeText, { color: '#ffffff' }]}>91.6%</Text>
                </View>
              </View>
              <Text style={[styles.rateAmount, styles.rateAmountFeatured]}>₹{rates.gold22k.rate1g.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per gram</Text>
              <View style={styles.changeBadge}>
                <Ionicons name="arrow-up" size={11} color={Colors.success} />
                <Text style={styles.changeText}>+₹{rates.gold22k.change}</Text>
              </View>
            </View>

            {/* 18K */}
            <View style={styles.rateBox}>
              <View style={styles.rateBoxHeader}>
                <Text style={styles.rateKarat}>18K Gold</Text>
                <View style={[styles.miniBadge, { backgroundColor: '#fed7aa' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#9a3412' }]}>75.0%</Text>
                </View>
              </View>
              <Text style={styles.rateAmount}>₹{rates.gold18k.rate1g.toLocaleString()}</Text>
              <Text style={styles.rateUnit}>per gram</Text>
              <View style={styles.changeBadge}>
                <Ionicons name="arrow-up" size={11} color={Colors.success} />
                <Text style={styles.changeText}>+₹{rates.gold18k.change}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3 GOLD VALUATION CARDS (Current Value, Buying Value, Appreciation Gains) */}
        <Text style={styles.sectionHeading}>Gold Vault Valuation</Text>
        <View style={styles.valGrid}>
          {/* Current Market Value */}
          <View style={styles.valCard}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle}>Current Market Value</Text>
              <Ionicons name="diamond-outline" size={18} color={Colors.primaryDark} />
            </View>
            <Text style={styles.valAmount}>₹{currentGoldValue.toLocaleString()}</Text>
            <Text style={styles.valSub}>{totalGoldWeight.toFixed(2)}g @ ₹{live22kRate}/g (22K)</Text>
          </View>

          {/* Buying Cost Value */}
          <View style={styles.valCard}>
            <View style={styles.valCardTop}>
              <Text style={styles.valTitle}>Total Buying Cost</Text>
              <Ionicons name="wallet-outline" size={18} color="#475569" />
            </View>
            <Text style={styles.valAmount}>₹{buyingGoldValue.toLocaleString()}</Text>
            <Text style={styles.valSub}>Total cost paid at time of purchase</Text>
          </View>

          {/* Appreciation Gains */}
          <View style={[styles.valCard, styles.valCardSuccess]}>
            <View style={styles.valCardTop}>
              <Text style={[styles.valTitle, { color: '#15803d' }]}>Appreciation Gains</Text>
              <Ionicons name="trending-up-outline" size={18} color="#15803d" />
            </View>
            <Text style={[styles.valAmount, { color: '#15803d' }]}>
              +{appreciationGains >= 0 ? '' : '-'}₹{Math.abs(appreciationGains).toLocaleString()}
            </Text>
            <Text style={[styles.valSub, { color: '#16a34a', fontWeight: '600' }]}>
              +{appreciationPct.toFixed(1)}% total portfolio gain
            </Text>
          </View>
        </View>

        {/* OPERATIONAL METRICS (Customers, Banks, Active Loans, Pledged Ornaments) */}
        <Text style={styles.sectionHeading}>Operational Portfolio</Text>
        <View style={styles.metricsGrid}>
          {/* Customers */}
          <TouchableOpacity 
            style={styles.metricCard} 
            onPress={() => router.push('/(tabs)/users' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.metricIconBox}>
              <Ionicons name="people" size={20} color={Colors.primaryDark} />
            </View>
            <Text style={styles.metricVal}>{dash.totalUsers}</Text>
            <Text style={styles.metricLabel}>Customers</Text>
          </TouchableOpacity>

          {/* Banks */}
          <TouchableOpacity 
            style={styles.metricCard} 
            onPress={() => router.push('/(tabs)/bank-accounts' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="business" size={20} color="#0284c7" />
            </View>
            <Text style={styles.metricVal}>{dash.totalBankAccounts}</Text>
            <Text style={styles.metricLabel}>Bank Accounts</Text>
          </TouchableOpacity>

          {/* Active Loans */}
          <TouchableOpacity 
            style={styles.metricCard} 
            onPress={() => router.push('/(tabs)/loans' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="cash" size={20} color="#b45309" />
            </View>
            <Text style={styles.metricVal}>₹{(dash.totalLoanAmount / 1000).toFixed(0)}k</Text>
            <Text style={styles.metricLabel}>{dash.activeLoans} Active Loans</Text>
          </TouchableOpacity>

          {/* Pledged Gold */}
          <TouchableOpacity 
            style={styles.metricCard} 
            onPress={() => router.push('/(tabs)/ornaments' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
            </View>
            <Text style={styles.metricVal}>{dash.pledgedGrams.toFixed(1)}g</Text>
            <Text style={styles.metricLabel}>{dash.pledgedOrnamentsCount} Pledged Items</Text>
          </TouchableOpacity>
        </View>

        {/* Bank Utilization Progress */}
        <View style={styles.bankUtilCard}>
          <View style={styles.bankUtilHeader}>
            <Text style={styles.bankUtilTitle}>Bank Loan Limit Utilization</Text>
            <Text style={styles.bankUtilNums}>
              ₹{dash.totalLoanAmount.toLocaleString()} / ₹{dash.totalEligibleLoanAmount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.barBg}>
            <View 
              style={[
                styles.barFill, 
                { width: `${dash.totalEligibleLoanAmount > 0 ? Math.min(100, (dash.totalLoanAmount / dash.totalEligibleLoanAmount) * 100) : 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.bankUtilSub}>
            Available headroom for new loans: <Text style={{ color: Colors.success, fontWeight: '700' }}>₹{dash.totalAvailableLoanAmount.toLocaleString()}</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  brandEmoji: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  demoBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  liveBadge: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  liveBadgeText: {
    color: '#166534',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  goldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  goldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goldCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cityBadge: {
    backgroundColor: '#fef08a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854d0e',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  ratesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rateBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  rateBoxFeatured: {
    backgroundColor: '#fffdf5',
    borderColor: Colors.primary,
    elevation: 1,
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
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  rateAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rateAmountFeatured: {
    color: Colors.primaryDark,
  },
  rateUnit: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  valGrid: {
    gap: 10,
    marginBottom: 20,
  },
  valCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  valCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  valTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  valAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  valSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bankUtilCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankUtilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankUtilTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bankUtilNums: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  barBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: 4,
  },
  bankUtilSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
