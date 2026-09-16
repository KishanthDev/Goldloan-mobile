import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, Alert, SafeAreaView, Platform, RefreshControl, Linking 
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../services/store';
import { getDriveDirectImageUrl } from '../../services/api';
import { Ornament } from '../../types';
import { DataTable, Column } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function OrnamentsScreen() {
  const store = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrn, setSelectedOrn] = useState<Ornament | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await store.syncFromBackend(true);
    setRefreshing(false);
  };

  // Form State
  const [form, setForm] = useState({
    UserId: '',
    OrnamentName: '',
    OrnamentType: 'Necklace',
    OrnamentCategory: 'Neckwear',
    Purity: '22K',
    GrossWeight: '',
    StoneWeight: '0',
    MetalWeight: '',
    BuyingPricePerGram: '8115',
    CurrentPricePerGram: '8850',
    HallmarkNumber: '',
    Quantity: '1',
    MakerName: '',
    EstimatedValue: '',
    OrnamentImages: '',
    Description: '',
    Remarks: '',
    Status: 'Available' as 'Available' | 'Pledged' | 'Released',
  });

  // EXACT calculations from calcOrnamentWeightsAndPrices in index.html:
  const gross = parseFloat(form.GrossWeight) || 0;
  const stone = parseFloat(form.StoneWeight) || 0;
  // If MetalWeight is manually specified, use it; otherwise gross - stone
  const metal = form.MetalWeight !== '' ? (parseFloat(form.MetalWeight) || 0) : Math.max(0, gross - stone);
  const buyingPrice = parseFloat(form.BuyingPricePerGram) || 0;
  const currentPrice = parseFloat(form.CurrentPricePerGram) || 0;

  // Buying Cost = Metal Weight × Buying Price/g
  const buyingCost = Math.round(metal * buyingPrice * 100) / 100;
  // Market Value = Metal Weight × Current Price/g
  const marketVal = Math.round(metal * currentPrice * 100) / 100;
  // Appreciation Value = Market Value − Buying Cost
  const apprVal = Math.round((marketVal - buyingCost) * 100) / 100;
  // Appreciation % = (Appreciation Value ÷ Buying Cost) × 100
  const apprPct = buyingCost > 0 ? Math.round(((apprVal / buyingCost) * 100) * 100) / 100 : 0;

  // On Purity Change: auto-set Current Price from live rates (onOrnamentPurityChange from index.html)
  const handlePuritySelect = (purity: string) => {
    let rate = 8115;
    if (purity === '24K') rate = store.goldRates?.gold24k?.rate1g || 8850;
    else if (purity === '18K') rate = store.goldRates?.gold18k?.rate1g || 6640;
    else rate = store.goldRates?.gold22k?.rate1g || 8115;

    setForm(p => ({
      ...p,
      Purity: purity,
      CurrentPricePerGram: String(rate),
      BuyingPricePerGram: String(rate),
    }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedOrn(null);
    const live22k = store.goldRates?.gold22k?.rate1g || 8115;
    const live24k = store.goldRates?.gold24k?.rate1g || 8850;

    setForm({
      UserId: store.users[0]?.UserId || '',
      OrnamentName: '',
      OrnamentType: 'Necklace',
      OrnamentCategory: 'Neckwear',
      Purity: '22K',
      GrossWeight: '',
      StoneWeight: '0',
      MetalWeight: '',
      BuyingPricePerGram: String(live22k),
      CurrentPricePerGram: String(live24k),
      HallmarkNumber: '',
      Quantity: '1',
      MakerName: '',
      EstimatedValue: '',
      OrnamentImages: '',
      Description: '',
      Remarks: '',
      Status: 'Available',
    });
    setModalVisible(true);
  };

  const openEditModal = (orn: Ornament) => {
    setIsEditing(true);
    setSelectedOrn(orn);
    setForm({
      UserId: orn.UserId || '',
      OrnamentName: orn.OrnamentName || '',
      OrnamentType: orn.OrnamentType || 'Necklace',
      OrnamentCategory: orn.OrnamentCategory || 'Neckwear',
      Purity: orn.Purity || '22K',
      GrossWeight: String(orn.GrossWeight || ''),
      StoneWeight: String(orn.StoneWeight || '0'),
      MetalWeight: String(orn.MetalWeight || orn.NetWeight || ''),
      BuyingPricePerGram: String(orn.BuyingPricePerGram || '0'),
      CurrentPricePerGram: String(orn.CurrentPricePerGram || '0'),
      HallmarkNumber: orn.HallmarkNumber || '',
      Quantity: String(orn.Quantity || '1'),
      MakerName: orn.MakerName || '',
      EstimatedValue: String(orn.EstimatedValue || ''),
      OrnamentImages: orn.OrnamentImages || '',
      Description: orn.Description || '',
      Remarks: orn.Remarks || '',
      Status: orn.Status === 'Pledged' ? 'Pledged' : (orn.Status === 'Released' ? 'Released' : 'Available'),
    });
    setModalVisible(true);
  };

  const openDetailModal = (orn: Ornament) => {
    setSelectedOrn(orn);
    setDetailModalVisible(true);
  };

  const handleDelete = (orn: Ornament) => {
    Alert.alert(
      'Delete Ornament',
      `Are you sure you want to delete ${orn.OrnamentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => store.deleteOrnament(orn.OrnamentId)
        }
      ]
    );
  };

  const handleSave = () => {
    if (!form.OrnamentName.trim()) {
      Alert.alert('Validation Error', 'Ornament Name is required.');
      return;
    }
    if (gross <= 0) {
      Alert.alert('Validation Error', 'Gross Weight must be greater than 0.');
      return;
    }

    if (isEditing && selectedOrn) {
      store.updateOrnament(selectedOrn.OrnamentId, {
        ...form,
        GrossWeight: gross,
        StoneWeight: stone,
        NetWeight: metal,
        MetalWeight: metal,
        BuyingPricePerGram: buyingPrice,
        CurrentPricePerGram: currentPrice,
        Quantity: parseInt(form.Quantity) || 1,
        EstimatedValue: parseFloat(form.EstimatedValue) || undefined,
      });
      Alert.alert('Success', 'Ornament updated.');
    } else {
      store.addOrnament({
        ...form,
        GrossWeight: gross,
        StoneWeight: stone,
        NetWeight: metal,
        MetalWeight: metal,
        BuyingPricePerGram: buyingPrice,
        CurrentPricePerGram: currentPrice,
        Quantity: parseInt(form.Quantity) || 1,
        EstimatedValue: parseFloat(form.EstimatedValue) || undefined,
      });
      Alert.alert('Success', 'Ornament added to vault.');
    }
    setModalVisible(false);
  };

  const getStatusVariant = (s: string) => {
    if (s === 'Available') return 'success';
    if (s === 'Pledged') return 'warning';
    if (s === 'Released') return 'info';
    return 'default';
  };

  // Table Columns matching index.html:
  // ID | Name | Type | Purity | Gross wt | Stone wt | Metal wt | Status | Buying price/grm | Total Price | Maker Name | Actions
  const columns: Column<Ornament>[] = [
    {
      key: 'OrnamentId',
      title: 'ID',
      width: 65,
      render: (o) => <Text style={styles.idText}>#{o.OrnamentId}</Text>,
    },
    {
      key: 'OrnamentName',
      title: 'Name',
      width: 145,
      render: (o) => (
        <View>
          <Text style={styles.primaryCellText} numberOfLines={1}>{o.OrnamentName}</Text>
          {o.HallmarkNumber ? <Text style={styles.subCellText} numberOfLines={1}>HM: {o.HallmarkNumber}</Text> : null}
        </View>
      ),
    },
    {
      key: 'OrnamentType',
      title: 'Type',
      width: 95,
      render: (o) => <Text style={styles.cellText} numberOfLines={1}>{o.OrnamentType || 'Jewelry'}</Text>,
    },
    {
      key: 'Purity',
      title: 'Purity',
      width: 75,
      align: 'center',
      render: (o) => <Badge label={o.Purity || '22K'} variant="gold" size="sm" />,
    },
    {
      key: 'GrossWeight',
      title: 'Gross wt',
      width: 85,
      align: 'right',
      render: (o) => <Text style={styles.cellText}>{Number(o.GrossWeight || 0).toFixed(2)}g</Text>,
    },
    {
      key: 'StoneWeight',
      title: 'Stone wt',
      width: 85,
      align: 'right',
      render: (o) => <Text style={styles.cellText}>{Number(o.StoneWeight || 0).toFixed(2)}g</Text>,
    },
    {
      key: 'MetalWeight',
      title: 'Metal wt',
      width: 90,
      align: 'right',
      render: (o) => (
        <Text style={[styles.cellText, { fontWeight: '700', color: Colors.primaryDark }]}>
          {Number(o.NetWeight || o.MetalWeight || 0).toFixed(2)}g
        </Text>
      ),
    },
    {
      key: 'Status',
      title: 'Status',
      width: 85,
      align: 'center',
      render: (o) => <Badge label={o.Status} variant={getStatusVariant(o.Status)} size="sm" />,
    },
    {
      key: 'BuyingPricePerGram',
      title: 'Buy Rate/g',
      width: 115,
      align: 'right',
      render: (o) => <Text style={styles.cellText}>₹{(o.BuyingPricePerGram || 0).toLocaleString()}</Text>,
    },
    {
      key: 'TotalPrice',
      title: 'Total Price',
      width: 110,
      align: 'right',
      render: (o) => (
        <Text style={[styles.cellText, { fontWeight: '700' }]}>
          ₹{(o.BuyingCost || o.TotalPrice || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'MakerName',
      title: 'Maker Name',
      width: 100,
      render: (o) => <Text style={styles.cellText} numberOfLines={1}>{o.MakerName || '—'}</Text>,
    },
    {
      key: 'Actions',
      title: 'Actions',
      width: 95,
      align: 'center',
      render: (o) => (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openDetailModal(o)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={16} color="#0284c7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(o)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={16} color={Colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(o)} style={styles.actionBtn}>
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
          title="Gold Vault (Ornaments)"
          subtitle="Inventory of pledged, available, and released gold jewelry"
          addButtonLabel="Add Ornament"
          onAddPress={openAddModal}
          columns={columns}
          data={store.ornaments}
          keyExtractor={(o) => o.OrnamentId}
          searchPlaceholder="Search ornament, hallmark, maker..."
          searchFilter={(o, q) => 
            Boolean(
              o.OrnamentName.toLowerCase().includes(q) ||
              (o.OrnamentType && o.OrnamentType.toLowerCase().includes(q)) ||
              (o.HallmarkNumber && o.HallmarkNumber.toLowerCase().includes(q)) ||
              (o.MakerName && o.MakerName.toLowerCase().includes(q))
            )
          }
        />
      </ScrollView>

      {/* ADD / EDIT ORNAMENT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Gold Ornament' : 'Add Gold Ornament'}
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
                        onPress={() => setForm(p => ({ ...p, UserId: u.UserId }))}
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
                <Text style={styles.label}>Ornament Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Traditional Temple Haram"
                  value={form.OrnamentName}
                  onChangeText={v => setForm(p => ({ ...p, OrnamentName: v }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Necklace, Bangle"
                    value={form.OrnamentType}
                    onChangeText={v => setForm(p => ({ ...p, OrnamentType: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Purity</Text>
                  <View style={styles.purityRow}>
                    {['24K', '22K', '18K'].map(k => (
                      <TouchableOpacity
                        key={k}
                        style={[styles.purityBtn, form.Purity === k && styles.purityBtnActive]}
                        onPress={() => handlePuritySelect(k)}
                      >
                        <Text style={[styles.purityBtnText, form.Purity === k && styles.purityBtnTextActive]}>
                          {k}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Weight Inputs */}
              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Gross Weight (g) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={form.GrossWeight}
                    onChangeText={v => setForm(p => ({ ...p, GrossWeight: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Stone Weight (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={form.StoneWeight}
                    onChangeText={v => setForm(p => ({ ...p, StoneWeight: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Metal / Net (g)</Text>
                  <TextInput
                    style={[styles.input, { fontWeight: '700', color: Colors.primaryDark }]}
                    placeholder={metal.toFixed(2)}
                    keyboardType="decimal-pad"
                    value={form.MetalWeight || (metal > 0 ? metal.toFixed(2) : '')}
                    onChangeText={v => setForm(p => ({ ...p, MetalWeight: v }))}
                  />
                </View>
              </View>

              {/* Rates */}
              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Buying Rate /g (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={form.BuyingPricePerGram}
                    onChangeText={v => setForm(p => ({ ...p, BuyingPricePerGram: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Current Rate /g (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={form.CurrentPricePerGram}
                    onChangeText={v => setForm(p => ({ ...p, CurrentPricePerGram: v }))}
                  />
                </View>
              </View>

              {/* Live Calculations Display Box */}
              <View style={styles.calcBox}>
                <Text style={styles.calcBoxTitle}>Automatic Valuation Formulas</Text>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Buying Cost ({metal.toFixed(2)}g × ₹{buyingPrice}):</Text>
                  <Text style={styles.calcVal}>₹{buyingCost.toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Market Value ({metal.toFixed(2)}g × ₹{currentPrice}):</Text>
                  <Text style={[styles.calcVal, { color: Colors.success }]}>₹{marketVal.toLocaleString()}</Text>
                </View>
                <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#fef08a', paddingTop: 6, marginTop: 4 }]}>
                  <Text style={styles.calcLabel}>Appreciation Gains:</Text>
                  <Text style={[styles.calcVal, { color: apprVal >= 0 ? Colors.success : Colors.danger }]}>
                    {apprVal >= 0 ? '+' : ''}₹{apprVal.toLocaleString()} ({apprPct.toFixed(2)}%)
                  </Text>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Hallmark Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HM916-2025"
                    autoCapitalize="characters"
                    value={form.HallmarkNumber}
                    onChangeText={v => setForm(p => ({ ...p, HallmarkNumber: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Maker / Jeweler Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tanishq, Malabar"
                    value={form.MakerName}
                    onChangeText={v => setForm(p => ({ ...p, MakerName: v }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Neckwear, Bangles"
                    value={form.OrnamentCategory}
                    onChangeText={v => setForm(p => ({ ...p, OrnamentCategory: v }))}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="number-pad"
                    value={form.Quantity}
                    onChangeText={v => setForm(p => ({ ...p, Quantity: v }))}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Estimated Value (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Auto: defaults to Market Value"
                  keyboardType="number-pad"
                  value={form.EstimatedValue}
                  onChangeText={v => setForm(p => ({ ...p, EstimatedValue: v }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Ornament description..."
                  multiline
                  numberOfLines={2}
                  value={form.Description}
                  onChangeText={v => setForm(p => ({ ...p, Description: v }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Google Drive / Image URLs</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. https://drive.google.com/file/d/... | https://..."
                  value={form.OrnamentImages}
                  onChangeText={v => setForm(p => ({ ...p, OrnamentImages: v }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Remarks</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Additional remarks..."
                  multiline
                  numberOfLines={2}
                  value={form.Remarks}
                  onChangeText={v => setForm(p => ({ ...p, Remarks: v }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusToggleRow}>
                    {(['Available', 'Pledged', 'Released'] as const).map(s => (
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
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Ornament'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEW ORNAMENT DETAIL MODAL */}
      <Modal visible={detailModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ornament Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedOrn ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailName}>{selectedOrn.OrnamentName}</Text>
                  <Text style={styles.detailCode}>ID: {selectedOrn.OrnamentId} • {selectedOrn.OrnamentType || 'Jewelry'}</Text>
                  {selectedOrn.OrnamentCategory ? <Text style={styles.detailSubCode}>{selectedOrn.OrnamentCategory}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Badge label={selectedOrn.Purity || '22K'} variant="gold" />
                    <Badge label={selectedOrn.Status} variant={getStatusVariant(selectedOrn.Status)} />
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Ornament Info</Text>
                  {selectedOrn.MakerName ? <Text style={styles.detailRowText}><Text style={styles.bold}>Maker:</Text> {selectedOrn.MakerName}</Text> : null}
                  {selectedOrn.HallmarkNumber ? <Text style={styles.detailRowText}><Text style={styles.bold}>Hallmark No.:</Text> {selectedOrn.HallmarkNumber}</Text> : null}
                  {selectedOrn.Quantity ? <Text style={styles.detailRowText}><Text style={styles.bold}>Quantity:</Text> {selectedOrn.Quantity}</Text> : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Weight Breakdown</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Gross Weight:</Text> {Number(selectedOrn.GrossWeight || 0).toFixed(2)} g</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Stone Weight:</Text> {Number(selectedOrn.StoneWeight || 0).toFixed(2)} g</Text>
                  <Text style={[styles.detailRowText, { color: Colors.primaryDark, fontWeight: '700' }]}>
                    Net Metal Weight: {Number(selectedOrn.NetWeight || selectedOrn.MetalWeight || 0).toFixed(2)} g
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Valuation & Financials</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Buying Cost:</Text> ₹{(selectedOrn.BuyingCost || selectedOrn.TotalPrice || 0).toLocaleString()} (@ ₹{selectedOrn.BuyingPricePerGram}/g)</Text>
                  <Text style={styles.detailRowText}><Text style={styles.bold}>Current Market Value:</Text> ₹{(selectedOrn.MarketValue || 0).toLocaleString()} (@ ₹{selectedOrn.CurrentPricePerGram}/g)</Text>
                  {selectedOrn.EstimatedValue ? <Text style={styles.detailRowText}><Text style={styles.bold}>Estimated Value:</Text> ₹{Number(selectedOrn.EstimatedValue).toLocaleString()}</Text> : null}
                  <Text style={[styles.detailRowText, { color: Colors.success, fontWeight: '700' }]}>
                    Appreciation Gains: +₹{(selectedOrn.AppreciationValue || 0).toLocaleString()} ({selectedOrn.AppreciationPercentage?.toFixed(2)}%)
                  </Text>
                </View>

                {selectedOrn.OrnamentImages ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSecTitle}>Google Drive Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                      {selectedOrn.OrnamentImages.split(' | ').filter(Boolean).map((imgUrl, i) => {
                        const directUrl = getDriveDirectImageUrl(imgUrl);
                        return (
                          <TouchableOpacity 
                            key={i} 
                            onPress={() => Linking.openURL(imgUrl)}
                            style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}
                          >
                            <Image
                              source={{ uri: directUrl || imgUrl }}
                              style={{ width: 140, height: 100, backgroundColor: '#f1f5f9' }}
                              contentFit="cover"
                            />
                            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 2, paddingHorizontal: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 9, textAlign: 'center' }}>Tap to view</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {(selectedOrn.Description || selectedOrn.Remarks) ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSecTitle}>Notes</Text>
                    {selectedOrn.Description ? <Text style={styles.detailRowText}><Text style={styles.bold}>Description:</Text> {selectedOrn.Description}</Text> : null}
                    {selectedOrn.Remarks ? <Text style={styles.detailRowText}><Text style={styles.bold}>Remarks:</Text> {selectedOrn.Remarks}</Text> : null}
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
    paddingBottom: 28,
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
  purityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  purityBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  purityBtnActive: {
    backgroundColor: '#fef08a',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  purityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  purityBtnTextActive: {
    color: '#854d0e',
  },
  calcBox: {
    backgroundColor: '#fefce8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 12,
    gap: 4,
  },
  calcBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854d0e',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 12,
    color: '#854d0e',
  },
  calcVal: {
    fontSize: 13,
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
  detailSubCode: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 1,
    fontStyle: 'italic',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
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
