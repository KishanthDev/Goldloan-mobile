import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, Alert, SafeAreaView, Platform, RefreshControl 
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { Loan } from '../../types';
import { DataTable, Column } from '../../components/DataTable';
import { SidebarTrigger } from '../../components/SidebarTrigger';
import { Ionicons } from '@expo/vector-icons';

export default function ClosureScreen() {
  const store = useAppStore();

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [remarks, setRemarks] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await store.syncFromBackend(true);
    setRefreshing(false);
  };

  // Active loans eligible for closure
  const activeLoans = store.loans.filter(l => l.LoanStatus === 'Active');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openCloseModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setRemarks('');
    setConfirmModalVisible(true);
  };

  const handleConfirmClose = () => {
    if (!selectedLoan) return;

    store.closeAndReleaseLoan(selectedLoan.LoanId, remarks || 'Closed and ornaments released');
    const closedNumber = selectedLoan.LoanNumber;
    setConfirmModalVisible(false);
    setSelectedLoan(null);

    Alert.alert(
      'Loan Closed Successfully',
      `Loan ${closedNumber} has been successfully marked as Closed. All pledged ornaments have been released back to Available status in the vault.`
    );
  };

  // Find linked ornaments for selected loan
  const selectedOrnaments = selectedLoan?.ornamentIds 
    ? store.ornaments.filter(o => selectedLoan.ornamentIds?.includes(o.OrnamentId))
    : [];

  const selectedUser = selectedLoan 
    ? store.users.find(u => u.UserId === selectedLoan.UserId)
    : null;

  // Table Columns matching index.html:
  // Loan Number | Customer | Mobile | Amount | Date | Due Date | Ornaments | Action
  const columns: Column<Loan>[] = [
    {
      title: 'Loan Number',
      key: 'LoanNumber',
      width: 125,
      render: (loan) => {
        const dueDate = loan.DueDate ? new Date(loan.DueDate) : null;
        const isOverdue = dueDate ? dueDate < today : false;

        return (
          <View style={styles.loanNumberCell}>
            <Text style={styles.loanNumberText} numberOfLines={1}>{loan.LoanNumber}</Text>
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>OVERDUE</Text>
              </View>
            )}
          </View>
        );
      },
    },
    {
      title: 'Customer',
      key: 'CustomerName',
      width: 130,
      render: (loan) => {
        const u = store.users.find(user => user.UserId === loan.UserId);
        return <Text style={styles.customerText} numberOfLines={1}>{u ? u.FullName : 'Unknown'}</Text>;
      },
    },
    {
      title: 'Mobile',
      key: 'CustomerMobile',
      width: 105,
      render: (loan) => {
        const u = store.users.find(user => user.UserId === loan.UserId);
        return <Text style={styles.cellText} numberOfLines={1}>{u ? u.MobileNumber : 'N/A'}</Text>;
      },
    },
    {
      title: 'Amount',
      key: 'LoanAmount',
      width: 110,
      align: 'right',
      render: (loan) => (
        <Text style={styles.amountText}>₹{loan.LoanAmount.toLocaleString('en-IN')}</Text>
      ),
    },
    {
      title: 'Date',
      key: 'LoanDate',
      width: 95,
      render: (loan) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {loan.LoanDate ? new Date(loan.LoanDate).toLocaleDateString('en-GB') : '-'}
        </Text>
      ),
    },
    {
      title: 'Due Date',
      key: 'DueDate',
      width: 95,
      render: (loan) => {
        const dueDate = loan.DueDate ? new Date(loan.DueDate) : null;
        const isOverdue = dueDate ? dueDate < today : false;
        return (
          <Text style={[styles.cellText, isOverdue && styles.overdueDueText]} numberOfLines={1}>
            {loan.DueDate ? new Date(loan.DueDate).toLocaleDateString('en-GB') : '-'}
          </Text>
        );
      },
    },
    {
      title: 'Ornaments',
      key: 'ornamentIds',
      width: 90,
      align: 'center',
      render: (loan) => {
        const count = loan.ornamentIds ? loan.ornamentIds.length : 0;
        return (
          <View style={styles.ornamentBadge}>
            <Text style={styles.ornamentBadgeText}>{count} item(s)</Text>
          </View>
        );
      },
    },
    {
      title: 'Action',
      key: 'Actions',
      width: 125,
      align: 'center',
      render: (loan) => (
        <TouchableOpacity 
          style={styles.closeBtn}
          onPress={() => openCloseModal(loan)}
        >
          <Ionicons name="lock-closed-outline" size={14} color="#fff" />
          <Text style={styles.closeBtnText}>Close & Release</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Informational Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.brand[700]} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Closing a loan updates its status to <Text style={{fontWeight: '700'}}>Closed</Text>, automatically releases attached gold ornaments back to <Text style={{fontWeight: '700'}}>Available</Text> in vault, and restores the bank limit.
          </Text>
        </View>

        {/* DataTable */}
        <DataTable
          isLoading={store.isSyncing && store.loans.length === 0}
          headerLeft={<SidebarTrigger />}
          title="Loan Closure & Release"
          subtitle={`Settle active loans and release pledged ornaments (${activeLoans.length} active)`}
          columns={columns}
          data={activeLoans}
          searchPlaceholder="Search by Loan No, Customer, Mobile..."
          searchFilter={(loan, query) => {
            const u = store.users.find(user => user.UserId === loan.UserId);
            const term = `${loan.LoanNumber} ${u?.FullName || ''} ${u?.MobileNumber || ''} ${loan.BankName}`.toLowerCase();
            return term.includes(query.toLowerCase());
          }}
          keyExtractor={(loan) => loan.LoanId}
        />
      </ScrollView>

      {/* Confirmation & Remarks Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconWrapper}>
                  <Ionicons name="lock-closed" size={20} color={Colors.brand[700]} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Close Loan & Release</Text>
                  <Text style={styles.modalSubtitle}>{selectedLoan?.LoanNumber}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Customer & Loan Details Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer</Text>
                  <Text style={styles.summaryValue}>{selectedUser?.FullName || 'Unknown'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Mobile</Text>
                  <Text style={styles.summaryValue}>{selectedUser?.MobileNumber || 'N/A'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Principal Amount</Text>
                  <Text style={[styles.summaryValue, { color: Colors.brand[700], fontWeight: '700' }]}>
                    ₹{selectedLoan?.LoanAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bank Account</Text>
                  <Text style={styles.summaryValue}>{selectedLoan?.BankName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Loan Date</Text>
                  <Text style={styles.summaryValue}>
                    {selectedLoan?.LoanDate ? new Date(selectedLoan.LoanDate).toLocaleDateString('en-GB') : '-'}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>Due Date</Text>
                  <Text style={styles.summaryValue}>
                    {selectedLoan?.DueDate ? new Date(selectedLoan.DueDate).toLocaleDateString('en-GB') : '-'}
                  </Text>
                </View>
              </View>

              {/* Ornaments to be released */}
              <Text style={styles.sectionHeading}>
                Ornaments to Release ({selectedOrnaments.length})
              </Text>
              {selectedOrnaments.length > 0 ? (
                <View style={styles.ornamentList}>
                  {selectedOrnaments.map((orn) => (
                    <View key={orn.OrnamentId} style={styles.ornamentItem}>
                      <View style={styles.ornamentItemLeft}>
                        <Text style={styles.ornamentItemIcon}>💍</Text>
                        <View>
                          <Text style={styles.ornamentItemName}>{orn.OrnamentName}</Text>
                          <Text style={styles.ornamentItemDetail}>
                            {orn.Purity} • Gross: {orn.GrossWeight}g • Net: {orn.NetWeight}g
                          </Text>
                        </View>
                      </View>
                      <View style={styles.releaseTag}>
                        <Ionicons name="arrow-undo-outline" size={12} color="#16a34a" />
                        <Text style={styles.releaseTagText}>To Available</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noOrnamentsText}>No individual ornaments linked</Text>
              )}

              {/* Closure Remarks */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Closure Remarks / Settlement Notes
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={`Enter remarks for ${selectedUser?.FullName || 'customer'}'s loan closure...`}
                  placeholderTextColor={Colors.textMuted}
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmReleaseBtn}
                onPress={handleConfirmClose}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.confirmReleaseBtnText}>Close & Release</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 12,
    paddingBottom: 80,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.brand[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand[600],
    gap: 10,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.brand[900],
    lineHeight: 18,
  },
  loanNumberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loanNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  overdueBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
  },
  customerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  cellText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand[700],
  },
  overdueDueText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  ornamentBadge: {
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ornamentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#16a34a',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: Platform.select({ web: '55%', default: '94%' }),
    maxWidth: 650,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#fafafa',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.brand[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  ornamentList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  ornamentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ornamentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ornamentItemIcon: {
    fontSize: 18,
  },
  ornamentItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  ornamentItemDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  releaseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  releaseTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  noOrnamentsText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Colors.textDark,
    textAlignVertical: 'top',
    minHeight: 70,
    backgroundColor: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: '#fafafa',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmReleaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmReleaseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
