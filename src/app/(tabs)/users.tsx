import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, Alert, SafeAreaView 
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { User } from '../../types';
import { DataTable, Column } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function UsersScreen() {
  const store = useAppStore();

  // Modals state
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [form, setForm] = useState({
    FullName: '',
    FatherHusbandName: '',
    CustomerCode: '',
    MobileNumber: '',
    AlternateMobileNumber: '',
    Email: '',
    DateOfBirth: '',
    Gender: 'Male',
    Occupation: '',
    AadhaarNumber: '',
    PANNumber: '',
    AddressLine1: '',
    AddressLine2: '',
    City: 'Bengaluru',
    State: 'Karnataka',
    Pincode: '560001',
    Status: 'Active' as 'Active' | 'Inactive',
  });

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setForm({
      FullName: '',
      FatherHusbandName: '',
      CustomerCode: `CUST-${100 + store.users.length + 1}`,
      MobileNumber: '',
      AlternateMobileNumber: '',
      Email: '',
      DateOfBirth: '',
      Gender: 'Male',
      Occupation: '',
      AadhaarNumber: '',
      PANNumber: '',
      AddressLine1: '',
      AddressLine2: '',
      City: 'Bengaluru',
      State: 'Karnataka',
      Pincode: '560001',
      Status: 'Active',
    });
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setForm({
      FullName: user.FullName || '',
      FatherHusbandName: user.FatherHusbandName || '',
      CustomerCode: user.CustomerCode || '',
      MobileNumber: user.MobileNumber || '',
      AlternateMobileNumber: user.AlternateMobileNumber || '',
      Email: user.Email || '',
      DateOfBirth: user.DateOfBirth || '',
      Gender: user.Gender || 'Male',
      Occupation: user.Occupation || '',
      AadhaarNumber: user.AadhaarNumber || '',
      PANNumber: user.PANNumber || '',
      AddressLine1: user.AddressLine1 || '',
      AddressLine2: user.AddressLine2 || '',
      City: user.City || 'Bengaluru',
      State: user.State || 'Karnataka',
      Pincode: user.Pincode || '560001',
      Status: user.Status === 'Inactive' ? 'Inactive' : 'Active',
    });
    setModalVisible(true);
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${user.FullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => store.deleteUser(user.UserId)
        }
      ]
    );
  };

  const handleSave = () => {
    if (!form.FullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!form.MobileNumber.trim() || form.MobileNumber.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (isEditing && selectedUser) {
      store.updateUser(selectedUser.UserId, form);
      Alert.alert('Success', 'Customer updated successfully.');
    } else {
      store.addUser(form);
      Alert.alert('Success', 'Customer registered successfully.');
    }
    setModalVisible(false);
  };

  // Table Columns exactly matching usersTable in index.html: ID | Name | Mobile | Status | Actions
  const columns: Column<User>[] = [
    {
      key: 'UserId',
      title: 'ID',
      width: 75,
      render: (u) => <Text style={styles.idText}>{u.UserId}</Text>,
    },
    {
      key: 'FullName',
      title: 'Name',
      width: 170,
      render: (u) => (
        <View>
          <Text style={styles.primaryCellText}>{u.FullName}</Text>
          {u.CustomerCode ? <Text style={styles.subCellText}>{u.CustomerCode}</Text> : null}
        </View>
      ),
    },
    {
      key: 'MobileNumber',
      title: 'Mobile',
      width: 120,
      render: (u) => <Text style={styles.cellText}>{u.MobileNumber}</Text>,
    },
    {
      key: 'Status',
      title: 'Status',
      width: 90,
      align: 'center',
      render: (u) => (
        <Badge 
          label={u.Status} 
          variant={u.Status === 'Active' ? 'success' : 'default'} 
          size="sm" 
        />
      ),
    },
    {
      key: 'Actions',
      title: 'Actions',
      width: 110,
      align: 'center',
      render: (u) => (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openDetailModal(u)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={16} color="#0284c7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(u)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={16} color={Colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(u)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DataTable
          title="Users / Customers"
          subtitle="Manage borrower registrations and KYC profiles"
          addButtonLabel="Add User"
          onAddPress={openAddModal}
          columns={columns}
          data={store.users}
          keyExtractor={(u) => u.UserId}
          searchPlaceholder="Search name, mobile, code..."
          searchFilter={(u, q) => 
            Boolean(
              u.FullName.toLowerCase().includes(q) ||
              u.MobileNumber.includes(q) ||
              (u.CustomerCode && u.CustomerCode.toLowerCase().includes(q))
            )
          }
        />
      </ScrollView>

      {/* ADD / EDIT USER MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  value={form.FullName}
                  onChangeText={v => setForm(p => ({ ...p, FullName: v }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Father / Husband Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Suresh Kumar"
                  value={form.FatherHusbandName}
                  onChangeText={v => setForm(p => ({ ...p, FatherHusbandName: v }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Customer Code</Text>
                  <TextInput
                    style={styles.input}
                    value={form.CustomerCode}
                    onChangeText={v => setForm(p => ({ ...p, CustomerCode: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.MobileNumber}
                    onChangeText={v => setForm(p => ({ ...p, MobileNumber: v }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Aadhaar Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12-digit UID"
                    keyboardType="number-pad"
                    value={form.AadhaarNumber}
                    onChangeText={v => setForm(p => ({ ...p, AadhaarNumber: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>PAN Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ABCDE1234F"
                    autoCapitalize="characters"
                    value={form.PANNumber}
                    onChangeText={v => setForm(p => ({ ...p, PANNumber: v }))}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.Email}
                  onChangeText={v => setForm(p => ({ ...p, Email: v }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street / Area"
                  value={form.AddressLine1}
                  onChangeText={v => setForm(p => ({ ...p, AddressLine1: v }))}
                />
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
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusToggleRow}>
                    {(['Active', 'Inactive'] as const).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, form.Status === s && styles.statusBtnActive]}
                        onPress={() => setForm(p => ({ ...p, Status: s }))}
                      >
                        <Text style={[styles.statusBtnText, form.Status === s && styles.statusBtnTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Customer'}</Text>
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
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailName}>{selectedUser.FullName}</Text>
                  <Text style={styles.detailCode}>ID: {selectedUser.UserId} • {selectedUser.CustomerCode}</Text>
                  <View style={{ marginTop: 6 }}>
                    <Badge label={selectedUser.Status} variant={selectedUser.Status === 'Active' ? 'success' : 'default'} />
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Contact Information</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Mobile:</Text> {selectedUser.MobileNumber}</Text>
                  {selectedUser.Email ? <Text style={styles.detailRowText}><Text style={styles.bold}>Email:</Text> {selectedUser.Email}</Text> : null}
                  {selectedUser.AddressLine1 ? <Text style={styles.detailRowText}><Text style={styles.bold}>Address:</Text> {selectedUser.AddressLine1}, {selectedUser.City}</Text> : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>KYC & Identity</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Aadhaar:</Text> {selectedUser.AadhaarNumber || 'Not provided'}</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>PAN:</Text> {selectedUser.PANNumber || 'Not provided'}</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Occupation:</Text> {selectedUser.Occupation || 'N/A'}</Text>
                </View>
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
    padding: 14,
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
  subCellText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
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
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
});
