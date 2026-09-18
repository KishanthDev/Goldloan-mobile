import { User, BankAccount, Ornament, Loan, Payment, DashboardData, GoldRateData, AdminUser } from '../types';

export const mockGoldRates: GoldRateData = {
  location: "Bangalore",
  updatedAt: new Date().toISOString(),
  displayDate: "Today (Live Scrape)",
  gold24k: { rate1g: 8850, change: 45, direction: "up" },
  gold22k: { rate1g: 8115, change: 40, direction: "up" },
  gold18k: { rate1g: 6640, change: 35, direction: "up" },
};

export const mockUsers: User[] = [];
export const mockBankAccounts: BankAccount[] = [];

export const mockOrnaments: Ornament[] = [];

export const mockLoans: Loan[] = [];
export const mockPayments: Payment[] = [];

export const mockAdminUsers: AdminUser[] = [
  { AdminId: 'ADM-001', Username: 'admin', Role: 'SuperAdmin', Status: 'Active' },
  { AdminId: 'ADM-002', Username: 'staff', Role: 'User', Status: 'Active' },
];

export const mockDashboardData: DashboardData = {
  totalUsers: 0,
  totalBankAccounts: 0,
  totalOrnaments: 0,
  pledgedOrnamentsCount: 0,
  pledgedGrams: 0,
  activeLoans: 0,
  closedLoans: 0,
  totalLoanAmount: 0,
  totalEligibleLoanAmount: 0,
  totalAvailableLoanAmount: 0,
  totalGoldWeight: 0,
  totalBuyingGoldValue: 0,
  recentTransactions: [],
};
