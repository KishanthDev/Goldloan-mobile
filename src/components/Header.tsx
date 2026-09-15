import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ApiConfig } from '../config/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
}) => {
  const isMock = ApiConfig.isMockMode();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightGroup}>
        <View style={[styles.statusTag, isMock ? styles.mockTag : styles.liveTag]}>
          <View style={[styles.statusDot, isMock ? styles.mockDot : styles.liveDot]} />
          <Text style={[styles.statusText, isMock ? styles.mockText : styles.liveText]}>
            {isMock ? 'Demo Mode' : 'Live Sheets'}
          </Text>
        </View>

        {onRefresh ? (
          <TouchableOpacity 
            onPress={onRefresh} 
            disabled={isRefreshing}
            style={styles.refreshBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="sync" 
              size={18} 
              color={Colors.primary} 
              style={isRefreshing ? styles.spinning : undefined} 
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  mockTag: {
    backgroundColor: '#fef3c7',
  },
  liveTag: {
    backgroundColor: '#dcfce7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mockDot: {
    backgroundColor: '#d97706',
  },
  liveDot: {
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mockText: {
    color: '#92400e',
  },
  liveText: {
    color: '#166534',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinning: {
    opacity: 0.5,
  },
});
