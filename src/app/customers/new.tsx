import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { Ionicons } from '@expo/vector-icons';

export default function NewCustomerScreen() {
  const router = useRouter();
  const store = useAppStore();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    FullName: '',
    FatherHusbandName: '',
    MobileNumber: '',
    Email: '',
    AadhaarNumber: '',
    PANNumber: '',
    AddressLine1: '',
    City: 'Bengaluru',
    State: 'Karnataka',
    Pincode: '560001',
    Occupation: '',
  });

  const updateField = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    if (!form.FullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!form.MobileNumber.trim() || form.MobileNumber.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      store.addUser(form);
      Alert.alert('Success', 'Customer registered in this local demo.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
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
        <Text style={styles.navTitle}>Register Customer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Kumar"
            placeholderTextColor={Colors.textMuted}
            value={form.FullName}
            onChangeText={v => updateField('FullName', v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Father / Husband Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Suresh Kumar"
            placeholderTextColor={Colors.textMuted}
            value={form.FatherHusbandName}
            onChangeText={v => updateField('FatherHusbandName', v)}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.MobileNumber}
              onChangeText={v => updateField('MobileNumber', v)}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="customer@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.Email}
              onChangeText={v => updateField('Email', v)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              placeholder="12-digit UIDAI"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={14}
              value={form.AadhaarNumber}
              onChangeText={v => updateField('AadhaarNumber', v)}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>PAN Card Number</Text>
            <TextInput
              style={styles.input}
              placeholder="ABCDE1234F"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={10}
              value={form.PANNumber}
              onChangeText={v => updateField('PANNumber', v)}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address Line</Text>
          <TextInput
            style={styles.input}
            placeholder="Door #, Street, Area"
            placeholderTextColor={Colors.textMuted}
            value={form.AddressLine1}
            onChangeText={v => updateField('AddressLine1', v)}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={form.City}
              onChangeText={v => updateField('City', v)}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              value={form.Pincode}
              onChangeText={v => updateField('Pincode', v)}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Occupation</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Business, Salaried, Trader"
            placeholderTextColor={Colors.textMuted}
            value={form.Occupation}
            onChangeText={v => updateField('Occupation', v)}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Save Customer</Text>
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
  fieldGroup: {
    marginBottom: 14,
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
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
