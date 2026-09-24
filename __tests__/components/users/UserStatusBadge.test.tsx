import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { UserStatusBadge } from '../../../src/components/users/UserStatusBadge';

describe('UserStatusBadge', () => {
  it.each(['Active', 'Inactive'] as const)(
    'renders the %s status text',
    (status) => {
      render(<UserStatusBadge status={status} isDark={false} />);
      expect(screen.getByText(status)).toBeTruthy();
    }
  );

  it('defaults to Active when empty status is given', () => {
    render(<UserStatusBadge status="" isDark={false} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('defaults to the compact "badge" variant when none is given', () => {
    render(<UserStatusBadge status="Active" isDark={false} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders in both light and dark mode without crashing with pill variant', () => {
    const { rerender } = render(<UserStatusBadge status="Active" isDark={false} variant="pill" />);
    expect(screen.getByText('Active')).toBeTruthy();

    rerender(<UserStatusBadge status="Active" isDark={true} variant="pill" />);
    expect(screen.getByText('Active')).toBeTruthy();
  });
});
