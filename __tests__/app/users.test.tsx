import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { User } from '../../src/types';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      textSecondary: '#64748b',
      textPrimary: '#0f172a',
      background: '#ffffff',
      placeholder: '#94a3b8',
    },
  }),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ isSuperAdmin: true }),
}));

jest.mock('../../src/context/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    danger: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    showToast: jest.fn(),
  }),
}));

jest.mock('../../src/services/api', () => ({
  getDriveImageUrl: jest.fn(() => ''),
}));

const USERS: User[] = [
  {
    UserId: 'U001',
    CustomerCode: 'GLC-2025-00124',
    FullName: 'Anil Kumar',
    FatherHusbandName: 'Rajesh Kumar',
    MobileNumber: '9876543210',
    AlternateMobileNumber: '9123456789',
    Email: 'anil.kumar@example.com',
    DateOfBirth: '1988-05-12',
    Gender: 'Male',
    Occupation: 'Business',
    AadhaarNumber: '123456789012',
    PANNumber: 'ABCDE1234F',
    AddressLine1: '#45, 2nd Cross',
    AddressLine2: 'Indiranagar',
    City: 'Bengaluru',
    State: 'Karnataka',
    Pincode: '560038',
    Status: 'Active',
  },
  {
    UserId: 'U002',
    CustomerCode: 'GLC-2025-00123',
    FullName: 'Sneha Patel',
    FatherHusbandName: 'Kiran Patel',
    MobileNumber: '8765432109',
    Email: 'sneha.patel@example.com',
    Status: 'Active',
  },
  {
    UserId: 'U003',
    CustomerCode: 'GLC-2025-00122',
    FullName: 'Ramesh Babu',
    MobileNumber: '9987654321',
    Status: 'Inactive',
  },
];

const mockStore = {
  users: USERS,
  loans: [],
  ornaments: [],
  bankAccounts: [],
  syncFromBackend: jest.fn(),
  addUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

jest.mock('../../src/services/store', () => ({
  useAppStore: () => mockStore,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UsersScreen = require('../../src/app/(tabs)/users').default;

describe('UsersScreen', () => {
  it('renders customer list matching blueprint with correct counts', () => {
    render(<UsersScreen />);
    expect(screen.getByText('Customers')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Anil Kumar')).toBeTruthy();
    expect(screen.getByText('Sneha Patel')).toBeTruthy();
    expect(screen.getByText('Ramesh Babu')).toBeTruthy();
  });

  it('renders filter pills with correct counts', () => {
    render(<UsersScreen />);
    expect(screen.getByText('All (3)')).toBeTruthy();
    expect(screen.getByText('Active (2)')).toBeTruthy();
    expect(screen.getByText('Inactive (1)')).toBeTruthy();
  });

  it('filters customers when inactive pill is pressed', () => {
    render(<UsersScreen />);
    fireEvent.press(screen.getByText('Inactive (1)'));

    expect(screen.getByText('Ramesh Babu')).toBeTruthy();
    expect(screen.queryByText('Anil Kumar')).toBeNull();
    expect(screen.queryByText('Sneha Patel')).toBeNull();
  });

  it('navigates to customer details when a customer card is pressed', () => {
    render(<UsersScreen />);
    fireEvent.press(screen.getByText('Anil Kumar'));

    expect(screen.getByText('Customer Details')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Bank Accounts')).toBeTruthy();
    expect(screen.getByText('Loans')).toBeTruthy();
  });
});
