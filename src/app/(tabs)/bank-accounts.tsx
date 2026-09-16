import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, Alert, SafeAreaView, Platform, RefreshControl 
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { BankAccount } from '../../types';
import { DataTable, Column } from '../../components/DataTable';
import { SidebarTrigger } from '../../components/SidebarTrigger';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerField, FilePayload } from '../../components/ImagePickerField';
import { ImageViewModal } from '../../components/ImageViewModal';
import { api, getDriveImageUrl } from '../../services/api';

export default function BankAccountsScreen() {
  const store = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filesPayload, setFilesPayload] = useState<FilePayload[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await store.syncFromBackend(true);
    setRefreshing(false);
  };

  // Form State
  const [form, setForm] = useState({
    UserId: '',
    AccountHolderName: '',
    AccountNumber: '',
    BankName: 'State Bank of India',
    BranchName: '',
    City: 'Bengaluru',
    IFSCCode: '',
    AccountType: 'Savings',
    UPI_ID: '',
    MaxLoanAmount: '500000',
    UtilizedLoanAmount: '0',
    PassbookImage: '',
    Status: 'Active' as 'Active' | 'Inactive',
  });

  const maxNum = parseFloat(form.MaxLoanAmount) || 0;
  const utilNum = parseFloat(form.UtilizedLoanAmount) || 0;
  const availableCalc = Math.max(0, maxNum - utilNum);

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedAcc(null);
    setFilesPayload([]);
    setForm({
      UserId: store.users[0]?.UserId || 'U001',
      AccountHolderName: store.users[0]?.FullName || '',
      AccountNumber: '',
      BankName: 'State Bank of India',
      BranchName: '',
      City: 'Bengaluru',
      IFSCCode: '',
      AccountType: 'Savings',
      UPI_ID: '',
      MaxLoanAmount: '500000',
      UtilizedLoanAmount: '0',
      PassbookImage: '',
      Status: 'Active',
    });
    setModalVisible(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setIsEditing(true);
    setSelectedAcc(acc);
    setFilesPayload([]);
    setForm({
      UserId: acc.UserId || '',
      AccountHolderName: acc.AccountHolderName || '',
      AccountNumber: acc.AccountNumber || '',
      BankName: acc.BankName || '',
      BranchName: acc.BranchName || '',
      City: acc.City || 'Bengaluru',
      IFSCCode: acc.IFSCCode || '',
      AccountType: acc.AccountType || 'Savings',
      UPI_ID: acc.UPI_ID || '',
      MaxLoanAmount: String(acc.MaxLoanAmount || 0),
      UtilizedLoanAmount: String(acc.UtilizedLoanAmount || 0),
      PassbookImage: acc.PassbookImage || '',
      Status: acc.Status === 'Inactive' ? 'Inactive' : 'Active',
    });
    setModalVisible(true);
  };

  const openDetailModal = (acc: BankAccount) => {
    setSelectedAcc(acc);
    setDetailModalVisible(true);
  };

  const handleDelete = (acc: BankAccount) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to delete ${acc.BankName} (Acc: ${acc.AccountNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => store.deleteBankAccount(acc.BankAccountId)
        }
      ]
    );
  };

  const handleSave = () => {
    if (!form.AccountHolderName.trim()) {
      Alert.alert('Validation Error', 'Account Holder Name is required.');
      return;
    }
    if (!form.AccountNumber.trim()) {
      Alert.alert('Validation Error', 'Account Number is required.');
      return;
    }

    if (isEditing && selectedAcc) {
      store.updateBankAccount(selectedAcc.BankAccountId, {
        ...form,
        MaxLoanAmount: maxNum,
        UtilizedLoanAmount: utilNum,
        files: filesPayload,
      });
      Alert.alert('Success', 'Bank account updated.');
    } else {
      store.addBankAccount({
        ...form,
        MaxLoanAmount: maxNum,
        UtilizedLoanAmount: utilNum,
        files: filesPayload,
      });
      Alert.alert('Success', 'Bank account added.');
    }
    setModalVisible(false);
  };

  // Table Columns exactly matching bankAccountsTable in index.html:
  // ID | Holder Name | Account No. | Bank | City | Max Loan (₹) | Utilized (₹) | Available (₹) | Status | Actions
  const columns: Column<BankAccount>[] = [
    {
      key: 'BankAccountId',
      title: 'ID',
      width: 65,
      render: (b) => <Text style={styles.idText}>#{b.BankAccountId}</Text>,
    },
    {
      key: 'AccountHolderName',
      title: 'Holder Name',
      width: 140,
      render: (b) => <Text style={styles.primaryCellText} numberOfLines={1}>{b.AccountHolderName}</Text>,
    },
    {
      key: 'AccountNumber',
      title: 'Account No.',
      width: 130,
      render: (b) => <Text style={styles.cellText} numberOfLines={1}>{b.AccountNumber}</Text>,
    },
    {
      key: 'BankName',
      title: 'Bank',
      width: 140,
      render: (b) => {
        const directUrl = getDriveImageUrl(b.PassbookImage);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {b.PassbookImage ? (
              <TouchableOpacity onPress={() => b.PassbookImage && setPreviewImageUrl(b.PassbookImage)}>
                <Image source={{ uri: directUrl || b.PassbookImage }} style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#e2e8f0' }} contentFit="cover" />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.cellText, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>{b.BankName}</Text>
          </View>
        );
      },
    },
    {
      key: 'City',
      title: 'City',
      width: 90,
      render: (b) => <Text style={styles.cellText} numberOfLines={1}>{b.City || '—'}</Text>,
    },
    {
      key: 'MaxLoanAmount',
      title: 'Max Limit (₹)',
      width: 115,
      align: 'right',
      render: (b) => <Text style={styles.cellText}>₹{(b.MaxLoanAmount || 0).toLocaleString()}</Text>,
    },
    {
      key: 'UtilizedLoanAmount',
      title: 'Utilized (₹)',
      width: 115,
      align: 'right',
      render: (b) => (
        <Text style={[styles.cellText, { color: (b.UtilizedLoanAmount || 0) > 0 ? Colors.danger : Colors.textSecondary }]}>
          ₹{(b.UtilizedLoanAmount || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'AvailableLoanAmount',
      title: 'Available (₹)',
      width: 115,
      align: 'right',
      render: (b) => (
        <Text style={[styles.cellText, { fontWeight: '700', color: Colors.success }]}>
          ₹{(b.AvailableLoanAmount || Math.max(0, (b.MaxLoanAmount || 0) - (b.UtilizedLoanAmount || 0))).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'Status',
      title: 'Status',
      width: 85,
      align: 'center',
      render: (b) => (
        <Badge 
          label={b.Status} 
          variant={b.Status === 'Active' ? 'success' : 'default'} 
          size="sm" 
        />
      ),
    },
    {
      key: 'Actions',
      title: 'Actions',
      width: 95,
      align: 'center',
      render: (b) => (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openDetailModal(b)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={16} color="#0284c7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(b)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={16} color={Colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(b)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
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
        <DataTable
          headerLeft={<SidebarTrigger />}
          title="Bank Accounts"
          subtitle="Manage lending bank credit limits and account details"
          addButtonLabel="Add Account"
          onAddPress={openAddModal}
          columns={columns}
          data={store.bankAccounts}
          keyExtractor={(b) => b.BankAccountId}
          searchPlaceholder="Search bank, account, holder..."
          searchFilter={(b, q) => 
            Boolean(
              b.AccountHolderName.toLowerCase().includes(q) ||
              b.AccountNumber.includes(q) ||
              b.BankName.toLowerCase().includes(q) ||
              (b.City && b.City.toLowerCase().includes(q))
            )
          }
        />
      </ScrollView>

      {/* ADD / EDIT BANK ACCOUNT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Borrower Select */}
              <View style={styles.field}>
                <Text style={styles.label}>Select Borrower *</Text>
                {store.users.length === 0 ? (
                  <View style={{ backgroundColor: Colors.warningBg, padding: 10, borderRadius: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: Colors.warning, fontWeight: '500' }}>
                      ⚠️ No borrowers registered yet. Please add a customer in the Users tab first.
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    {store.users.map(u => (
                      <TouchableOpacity
                        key={u.UserId}
                        style={[styles.userChip, form.UserId === u.UserId && styles.userChipActive]}
                        onPress={() => setForm(p => ({ ...p, UserId: u.UserId, AccountHolderName: u.FullName }))}
                      >
                        <Text style={[styles.userChipText, form.UserId === u.UserId && styles.userChipTextActive]}>
                          {u.FullName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Account Holder Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.AccountHolderName}
                  onChangeText={v => setForm(p => ({ ...p, AccountHolderName: v }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Bank Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HDFC Bank"
                    value={form.BankName}
                    onChangeText={v => setForm(p => ({ ...p, BankName: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Account Number *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={form.AccountNumber}
                    onChangeText={v => setForm(p => ({ ...p, AccountNumber: v }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Branch Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.BranchName}
                    onChangeText={v => setForm(p => ({ ...p, BranchName: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="characters"
                    value={form.IFSCCode}
                    onChangeText={v => setForm(p => ({ ...p, IFSCCode: v }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={form.City}
                    onChangeText={v => setForm(p => ({ ...p, City: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. name@okaxis"
                    autoCapitalize="none"
                    value={form.UPI_ID}
                    onChangeText={v => setForm(p => ({ ...p, UPI_ID: v }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Account Type</Text>
                  <View style={styles.statusToggleRow}>
                    {(['Savings', 'Current'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.statusBtn, form.AccountType === t && styles.statusBtnActive]}
                        onPress={() => setForm(p => ({ ...p, AccountType: t }))}
                      >
                        <Text style={[styles.statusBtnText, form.AccountType === t && styles.statusBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusToggleRow}>
                    {(['Active', 'Inactive'] as const).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, form.Status === s && styles.statusBtnActive]}
                        onPress={() => setForm(p => ({ ...p, Status: s }))}
                      >
                        <Text style={[styles.statusBtnText, form.Status === s && styles.statusBtnTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Limit Calculations Box */}
              <View style={styles.calcBox}>
                <Text style={styles.calcBoxTitle}>Loan Limit Calculations</Text>
                
                <View style={styles.formRow}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Max Loan Limit (₹) *</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={form.MaxLoanAmount}
                      onChangeText={v => setForm(p => ({ ...p, MaxLoanAmount: v }))}
                    />
                  </View>

                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Utilized Loan (₹)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={form.UtilizedLoanAmount}
                      onChangeText={v => setForm(p => ({ ...p, UtilizedLoanAmount: v }))}
                    />
                  </View>
                </View>

                <View style={styles.calcResultRow}>
                  <Text style={styles.calcResultLabel}>Calculated Available Loan Amount:</Text>
                  <Text style={styles.calcResultVal}>₹{availableCalc.toLocaleString()}</Text>
                </View>
              </View>

              {/* Passbook / Cheque Leaf Image */}
              <ImagePickerField
                type="card"
                label="Passbook / Cheque Leaf Photo"
                helperText="Upload photo of bank passbook or cancelled cheque"
                value={form.PassbookImage}
                onChange={(url, files) => {
                  setForm(p => ({ ...p, PassbookImage: url }));
                  setFilesPayload(files);
                }}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Bank'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bank Account Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedAcc ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailName}>{selectedAcc.BankName}</Text>
                  <Text style={styles.detailCode}>Acc: {selectedAcc.AccountNumber} • IFSC: {selectedAcc.IFSCCode || 'N/A'}</Text>
                  <View style={{ marginTop: 6 }}>
                    <Badge label={selectedAcc.Status} variant={selectedAcc.Status === 'Active' ? 'success' : 'default'} />
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Account Information</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Holder:</Text> {selectedAcc.AccountHolderName}</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Branch:</Text> {selectedAcc.BranchName || 'Main'}, {selectedAcc.City}</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Account Type:</Text> {selectedAcc.AccountType}</Text>
                  {selectedAcc.UPI_ID ? <Text style={styles.detailRowText}><Text style={styles.bold}>UPI:</Text> {selectedAcc.UPI_ID}</Text> : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Limit Utilization</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Max Limit:</Text> ₹{(selectedAcc.MaxLoanAmount || 0).toLocaleString()}</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Utilized:</Text> ₹{(selectedAcc.UtilizedLoanAmount || 0).toLocaleString()}</Text>
                  <Text style={[styles.detailRowText, { color: Colors.success, fontWeight: '700' }]}>
                    Available: ₹{(selectedAcc.AvailableLoanAmount || Math.max(0, (selectedAcc.MaxLoanAmount || 0) - (selectedAcc.UtilizedLoanAmount || 0))).toLocaleString()}
                  </Text>
                </View>

                {selectedAcc.PassbookImage ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSecTitle}>Passbook / Cheque Leaf Document</Text>
                    <TouchableOpacity
                      onPress={() => selectedAcc.PassbookImage && setPreviewImageUrl(selectedAcc.PassbookImage)}
                      style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#f1f5f9', marginTop: 4 }}
                    >
                      <Image
                        source={{ uri: getDriveImageUrl(selectedAcc.PassbookImage) }}
                        style={{ width: '100%', height: 160 }}
                        contentFit="cover"
                      />
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>Tap to view full image</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.saveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN IMAGE PREVIEW */}
      <ImageViewModal
        visible={!!previewImageUrl}
        imageUrl={previewImageUrl}
        title="Passbook / Cheque Leaf Image"
        onClose={() => setPreviewImageUrl(null)}
      />
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
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  primaryCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cellText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: Platform.select({ web: '55%', default: '94%' }),
    maxWidth: 650,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  field: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
  },
  userChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  userChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  userChipTextActive: {
    color: '#ffffff',
  },
  calcBox: {
    backgroundColor: '#fefce8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginTop: 4,
  },
  calcBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fef08a',
    paddingTop: 8,
    marginTop: 4,
  },
  calcResultLabel: {
    fontSize: 12,
    color: '#854d0e',
    fontWeight: '600',
  },
  calcResultVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 14,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#713f12',
  },
  detailCode: {
    fontSize: 12,
    color: '#a16207',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  detailSecTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  detailRowText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  statusBtnActive: {
    backgroundColor: Colors.primaryDark,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusBtnTextActive: {
    color: '#ffffff',
  },
});
