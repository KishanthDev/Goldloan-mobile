import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'md' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: Colors.successBg, text: Colors.success };
      case 'warning':
        return { bg: Colors.warningBg, text: Colors.warning };
      case 'danger':
        return { bg: Colors.dangerBg, text: Colors.danger };
      case 'info':
        return { bg: Colors.infoBg, text: Colors.info };
      case 'gold':
        return { bg: '#fef9c3', text: '#854d0e' };
      default:
        return { bg: Colors.surfaceSubtle, text: Colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.text, { color: text }, size === 'sm' && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
    fontWeight: '600',
  },
});
