import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAppStore, calculateLoanPeriodInterest } from '../../services/store';
import { User, BankAccount, Ornament } from '../../types';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function NewLoanScreen() {
  const router = useRouter();
  const store = useAppStore();
  const users = store.users;
  const bankAccounts = store.bankAccounts.filter(bank => bank.UserId === form.UserId && bank.Status === 'Active');
  const ornaments = store.ornaments.filter(o => o.Status === 'Available' || o.Status === 'Released');
  const [selectedOrnaments, setSelectedOrnaments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    UserId: '',
    BankAccountId: '',
    LoanAmount: '',
    InterestRate: '9.5',
    InterestType: 'Simple',
    LoanPeriod: '12 Months',
    LoanDate: new Date().toISOString().split('T')[0],
    Remarks: '',
  });

  useEffect(() => {
    if (!form.UserId && users[0]) setForm(p => ({ ...p, UserId: users[0].UserId }));
    if (form.UserId && !bankAccounts.some(b => b.BankAccountId === form.BankAccountId)) {
      setForm(p => ({ ...p, BankAccountId: bankAccounts[0]?.BankAccountId || '' }));
    }
  }, [users, bankAccounts, form.UserId, form.BankAccountId]);

  const selectedBank = bankAccounts.find(b => b.BankAccountId === form.BankAccountId);
  const availableLimit = selectedBank ? Math.max(0, (selectedBank.MaxLoanAmount || 0) - (selectedBank.UtilizedLoanAmount || 0)) : 0;

  // Calculate pledged gold weights
  const pledgedItems = ornaments.filter(o => selectedOrnaments.includes(o.OrnamentId));
  const totalGrossWeight = pledgedItems.reduce((s, o) => s + (Number(o.GrossWeight) || 0), 0);
  const totalNetWeight = pledgedItems.reduce((s, o) => s + (Number(o.NetWeight) || 0), 0);
  const totalMarketVal = pledgedItems.reduce((s, o) => s + (Number(o.MarketValue) || 0), 0);

  // Financial charges
  const amount = parseFloat(form.LoanAmount) || 0;
  const processingFee = Math.round(amount * 0.005); // 0.5%
  const docCharge = amount > 0 ? 250 : 0;
  const insuranceCharge = amount > 0 ? 500 : 0;
  const upfrontCharges = processingFee + docCharge + insuranceCharge;
  const totalCharges = calculateLoanPeriodInterest({ ...form, InterestType: form.InterestType as 'Simple' | 'Compound', LoanAmount: amount, InterestRate: Number(form.InterestRate) || 0, DueDate: '' }) + processingFee;
  const netDisbursement = Math.max(0, amount - upfrontCharges);

  const toggleOrnament = (id: string) => {
    setSelectedOrnaments(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateLoan = async () => {
    if (!form.UserId) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    if (!form.BankAccountId) {
      Alert.alert('Validation', 'Please select a bank account. Add one for this customer if none exists.');
      return;
    }
    if (selectedOrnaments.length === 0) {
      Alert.alert('Validation', 'Please select at least one gold ornament to pledge.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Validation', 'Loan amount must be greater than ₹0.');
      return;
    }
    if (availableLimit > 0 && amount > availableLimit) {
      Alert.alert(
        'Limit Exceeded',
        `The requested loan amount of ₹${amount.toLocaleString()} exceeds the available limit of ₹${availableLimit.toLocaleString()} for this bank account.`
      );
      return;
    }

    setSubmitting(true);
    try {
      store.addLoan({
        ...form,
        LoanAmount: amount,
        InterestRate: parseFloat(form.InterestRate) || 9.5,
        BankName: selectedBank?.BankName || '',
        GrossWeight: totalGrossWeight,
        NetWeight: totalNetWeight,
        ProcessingFee: processingFee,
        DocumentCharge: docCharge,
        InsuranceCharge: insuranceCharge,
        TotalCharges: totalCharges,
        NetDisbursementAmount: netDisbursement,
        ornamentIds: selectedOrnaments,
      });

      Alert.alert('Success', 'Loan contract created in this local demo.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Originate Gold Loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Step 1: Select Customer */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>1. Select Borrower</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {users.map(u => (
              <TouchableOpacity
                key={u.UserId}
                style={[styles.chip, form.UserId === u.UserId && styles.chipActive]}
                onPress={() => setForm(p => ({ ...p, UserId: u.UserId }))}
              >
                <Text style={[styles.chipText, form.UserId === u.UserId && styles.chipTextActive]}>
                  {u.FullName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Step 2: Select Bank Account */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>2. Select Bank Account</Text>
          {bankAccounts.length === 0 ? (
            <Text style={styles.warnText}>No bank accounts registered for this customer.</Text>
          ) : (
            bankAccounts.map(b => {
              const maxL = b.MaxLoanAmount || 0;
              const util = b.UtilizedLoanAmount || 0;
              const avail = Math.max(0, maxL - util);
              const isSelected = form.BankAccountId === b.BankAccountId;

              return (
                <TouchableOpacity
                  key={b.BankAccountId}
                  style={[styles.bankChoice, isSelected && styles.bankChoiceActive]}
                  onPress={() => setForm(p => ({ ...p, BankAccountId: b.BankAccountId }))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankChoiceTitle}>{b.BankName}</Text>
                    <Text style={styles.bankChoiceSub}>Acc: •••• {b.AccountNumber.slice(-4)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.bankChoiceAvail, { color: Colors.success }]}>
                      Avail: ₹{avail.toLocaleString()}
                    </Text>
                    <Text style={styles.bankChoiceMax}>Limit: ₹{maxL.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Step 3: Select Ornaments to Pledge */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.stepTitle}>3. Select Ornaments ({selectedOrnaments.length})</Text>
            <Text style={styles.ornTotalPledged}>
              Net: {totalNetWeight.toFixed(1)}g (₹{totalMarketVal.toLocaleString()})
            </Text>
          </View>

          {ornaments.length === 0 ? (
            <Text style={styles.warnText}>No available ornaments in inventory to pledge.</Text>
          ) : (
            ornaments.map(o => {
              const isPledged = selectedOrnaments.includes(o.OrnamentId);

              return (
                <TouchableOpacity
                  key={o.OrnamentId}
                  style={[styles.ornChoice, isPledged && styles.ornChoiceActive]}
                  onPress={() => toggleOrnament(o.OrnamentId)}
                >
                  <Ionicons 
                    name={isPledged ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={isPledged ? Colors.primaryDark : Colors.textMuted} 
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.ornChoiceTitle}>{o.OrnamentName}</Text>
                    <Text style={styles.ornChoiceSub}>
                      {o.Purity} • Net Wt: {Number(o.NetWeight || 0).toFixed(2)}g • Val: ₹{(o.MarketValue || 0).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Step 4: Loan Financials */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>4. Loan Details & Terms</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Loan Amount (₹) *</Text>
            <TextInput
              style={[styles.input, { fontSize: 18, fontWeight: '700', color: Colors.primaryDark }]}
              placeholder="e.g. 150000"
              keyboardType="number-pad"
              value={form.LoanAmount}
              onChangeText={v => setForm(p => ({ ...p, LoanAmount: v }))}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Interest Rate (% p.a.)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={form.InterestRate}
                onChangeText={v => setForm(p => ({ ...p, InterestRate: v }))}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tenure</Text>
              <TextInput
                style={styles.input}
                value={form.LoanPeriod}
                onChangeText={v => setForm(p => ({ ...p, LoanPeriod: v }))}
              />
            </View>
          </View>

          {/* Breakdown Box */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Processing Fee (0.5%):</Text>
              <Text style={styles.breakVal}>₹{processingFee.toLocaleString()}</Text>
            </View>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Documentation Charge:</Text>
              <Text style={styles.breakVal}>₹{docCharge}</Text>
            </View>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Insurance Fee:</Text>
              <Text style={styles.breakVal}>₹{insuranceCharge}</Text>
            </View>
            <View style={[styles.breakRow, styles.breakTotalRow]}>
              <Text style={styles.breakTotalLabel}>Net Disbursement to Borrower:</Text>
              <Text style={styles.breakTotalVal}>₹{netDisbursement.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.disburseBtn} 
          onPress={handleCreateLoan}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="cash" size={20} color="#ffffff" />
              <Text style={styles.disburseBtnText}>
                Disburse ₹{netDisbursement.toLocaleString()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ornTotalPledged: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  bankChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    backgroundColor: Colors.surfaceSubtle,
  },
  bankChoiceActive: {
    borderColor: Colors.primary,
    backgroundColor: '#fffbeb',
  },
  bankChoiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bankChoiceSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bankChoiceAvail: {
    fontSize: 13,
    fontWeight: '700',
  },
  bankChoiceMax: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  ornChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ornChoiceActive: {
    backgroundColor: '#fffdf5',
  },
  ornChoiceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ornChoiceSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  warnText: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    gap: 6,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  breakVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  breakTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  breakTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  breakTotalVal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  disburseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  disburseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
