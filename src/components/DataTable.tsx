import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, LayoutChangeEvent 
} from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface Column<T> {
  key: string;
  title: string;
  width?: number;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  onAddPress?: () => void;
  addButtonLabel?: string;
  title?: string;
  subtitle?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = 'Search records...',
  searchFilter,
  onAddPress,
  addButtonLabel = 'Add New',
  title,
  subtitle,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [wrapperWidth, setWrapperWidth] = useState(0);

  const filteredData = data.filter(item => {
    if (!search.trim() || !searchFilter) return true;
    return searchFilter(item, search.toLowerCase().trim());
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(startIdx, startIdx + pageSize);

  // Measure container layout to guarantee full width
  const handleWrapperLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - wrapperWidth) > 1) {
      setWrapperWidth(w);
    }
  };

  // Base sum of column widths
  const totalBaseWidth = useMemo(() => {
    return columns.reduce((acc, col) => acc + (col.width || 120), 0);
  }, [columns]);

  // Scaled column widths: if container is wider than totalBaseWidth, stretch columns to 100% full width
  const effectiveColWidths = useMemo(() => {
    if (!wrapperWidth || wrapperWidth <= totalBaseWidth) {
      return columns.map(col => col.width || 120);
    }
    const scale = wrapperWidth / totalBaseWidth;
    let accumulated = 0;
    return columns.map((col, idx) => {
      if (idx === columns.length - 1) {
        return Math.max(col.width || 120, wrapperWidth - accumulated);
      }
      const scaled = Math.floor((col.width || 120) * scale);
      accumulated += scaled;
      return scaled;
    });
  }, [columns, wrapperWidth, totalBaseWidth]);

  // Effective table total width
  const tableContentWidth = useMemo(() => {
    return Math.max(wrapperWidth, totalBaseWidth);
  }, [wrapperWidth, totalBaseWidth]);

  const isScrollable = wrapperWidth > 0 && totalBaseWidth > wrapperWidth;

  return (
    <View style={styles.container}>
      {/* Top Header Row (Title & Add Button) */}
      {(title || onAddPress) ? (
        <View style={styles.topHeader}>
          <View style={styles.titleWrapper}>
            {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
          </View>

          {onAddPress ? (
            <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.addBtnText}>{addButtonLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Toolbar: Search + Page size */}
      <View style={styles.toolbar}>
        <View style={styles.pageSizeBox}>
          <Text style={styles.toolLabel}>Show</Text>
          {[5, 10, 20].map(sz => (
            <TouchableOpacity
              key={sz}
              style={[styles.sizeBtn, pageSize === sz && styles.sizeBtnActive]}
              onPress={() => { setPageSize(sz); setPage(1); }}
            >
              <Text style={[styles.sizeBtnText, pageSize === sz && styles.sizeBtnTextActive]}>
                {sz}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.toolLabel}>entries</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={Colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={t => { setSearch(t); setPage(1); }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Mobile Horizontal Scroll Hint */}
      {isScrollable && (
        <View style={styles.scrollHintBar}>
          <Ionicons name="swap-horizontal" size={13} color={Colors.primaryDark} />
          <Text style={styles.scrollHintText}>
            Scroll sideways to view all {columns.length} columns
          </Text>
        </View>
      )}

      {/* Responsive Horizontal Scroll Table */}
      <View style={styles.tableWrapper} onLayout={handleWrapperLayout}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          nestedScrollEnabled={true}
          contentContainerStyle={{ minWidth: '100%', flexGrow: 1 }}
        >
          <View style={{ width: tableContentWidth, minWidth: '100%' }}>
            {/* Header Row */}
            <View style={[styles.headerRow, { width: tableContentWidth, minWidth: '100%' }]}>
              {columns.map((col, idx) => (
                <View 
                  key={`${col.key}_${idx}`} 
                  style={[
                    styles.th, 
                    { width: effectiveColWidths[idx] },
                    col.align === 'center' && { alignItems: 'center' },
                    col.align === 'right' && { alignItems: 'flex-end' },
                  ]}
                >
                  <Text style={styles.thText}>{col.title}</Text>
                </View>
              ))}
            </View>

            {/* Table Rows */}
            {pageData.length === 0 ? (
              <View style={[styles.emptyRow, { width: tableContentWidth, minWidth: '100%' }]}>
                <Text style={styles.emptyText}>No records found.</Text>
              </View>
            ) : (
              pageData.map((item, rowIdx) => {
                const isEven = rowIdx % 2 === 0;
                return (
                  <View 
                    key={keyExtractor(item)} 
                    style={[
                      styles.tr, 
                      !isEven && styles.trAlt,
                      { width: tableContentWidth, minWidth: '100%' }
                    ]}
                  >
                    {columns.map((col, idx) => (
                      <View 
                        key={`${col.key}_${idx}`} 
                        style={[
                          styles.td, 
                          { width: effectiveColWidths[idx] },
                          col.align === 'center' && { alignItems: 'center', justifyContent: 'center' },
                          col.align === 'right' && { alignItems: 'flex-end', justifyContent: 'center' },
                        ]}
                      >
                        {col.render ? (
                          col.render(item, rowIdx)
                        ) : (
                          <Text style={styles.tdText} numberOfLines={1}>
                            {(item as any)[col.key] !== undefined && (item as any)[col.key] !== null 
                              ? String((item as any)[col.key]) 
                              : '—'}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      {/* Pagination Footer */}
      <View style={styles.paginationRow}>
        <Text style={styles.pageInfoText}>
          Showing {filteredData.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + pageSize, filteredData.length)} of {filteredData.length} entries
        </Text>

        <View style={styles.pageBtns}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? Colors.textMuted : Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.pageCurText}>{currentPage} / {totalPages}</Text>

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? Colors.textMuted : Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
    flexShrink: 0,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageSizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sizeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sizeBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  sizeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sizeBtnTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    minWidth: 160,
  },
  searchInput: {
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 0,
    flex: 1,
  },
  scrollHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  scrollHintText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  tableWrapper: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 120,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  th: {
    paddingHorizontal: 10,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#ffffff',
  },
  trAlt: {
    backgroundColor: '#fafbfc',
  },
  td: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tdText: {
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  emptyRow: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageInfoText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  pageBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageCurText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
