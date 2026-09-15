import { ApiConfig } from '../config/api';
import { cache, CacheTTL } from './cache';
import { 
  User, BankAccount, Ornament, Loan, Payment, 
  DashboardData, GoldRateData, ApiResponse 
} from '../types';
import { 
  mockDashboardData, mockGoldRates, mockUsers, 
  mockBankAccounts, mockOrnaments, mockLoans, mockPayments 
} from './mockData';

class ApiService {
  /**
   * Universal HTTP POST request to Google Apps Script Web App
   * Uses text/plain to prevent CORS preflight blocks on mobile/web with GAS redirects
   */
  private async postToGas<T>(action: string, payload: any = {}): Promise<ApiResponse<T>> {
    const url = ApiConfig.getApiUrl();
    if (!url) {
      return { success: false, error: "Google Apps Script Web App URL not configured." };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error(`[API] Error calling action "${action}":`, error);
      return { success: false, error: error.message || "Network request failed" };
    }
  }

  /**
   * Universal HTTP GET request to Google Apps Script Web App
   */
  private async getFromGas<T>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
    const baseUrl = ApiConfig.getApiUrl();
    if (!baseUrl) {
      return { success: false, error: "Google Apps Script Web App URL not configured." };
    }

    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const url = `${baseUrl}?${query}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error(`[API] Error GET "${action}":`, error);
      return { success: false, error: error.message || "Network request failed" };
    }
  }

  // ─── DASHBOARD & RATES ───

  async getDashboardData(forceRefresh: boolean = false): Promise<{ data: DashboardData; isCached: boolean }> {
    const CACHE_KEY = 'dashboard_kpis';

    if (!forceRefresh) {
      const cached = await cache.get<DashboardData>(CACHE_KEY);
      if (cached.data) {
        return { data: cached.data, isCached: true };
      }
    }

    if (ApiConfig.isMockMode()) {
      await cache.set(CACHE_KEY, mockDashboardData, CacheTTL.DASHBOARD);
      return { data: mockDashboardData, isCached: false };
    }

    const res = await this.getFromGas<DashboardData>('getDashboardData');
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.DASHBOARD);
      return { data: res.data, isCached: false };
    }

    // Fallback to stale cache if network fails
    const stale = await cache.get<DashboardData>(CACHE_KEY, true);
    if (stale.data) {
      return { data: stale.data, isCached: true };
    }

    return { data: mockDashboardData, isCached: false };
  }

  async getGoldRates(forceRefresh: boolean = false): Promise<{ data: GoldRateData; isCached: boolean }> {
    const CACHE_KEY = 'gold_rates_bangalore';

    if (!forceRefresh) {
      const cached = await cache.get<GoldRateData>(CACHE_KEY);
      if (cached.data) {
        return { data: cached.data, isCached: true };
      }
    }

    if (ApiConfig.isMockMode()) {
      await cache.set(CACHE_KEY, mockGoldRates, CacheTTL.GOLD_RATES);
      return { data: mockGoldRates, isCached: false };
    }

    const res = await this.getFromGas<GoldRateData>('getGoldRates');
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.GOLD_RATES);
      return { data: res.data, isCached: false };
    }

    const stale = await cache.get<GoldRateData>(CACHE_KEY, true);
    if (stale.data) {
      return { data: stale.data, isCached: true };
    }

    return { data: mockGoldRates, isCached: false };
  }

  // ─── USERS / CUSTOMERS ───

  async getUsers(forceRefresh: boolean = false): Promise<User[]> {
    const CACHE_KEY = 'users_list';

    if (!forceRefresh) {
      const cached = await cache.get<User[]>(CACHE_KEY);
      if (cached.data) return cached.data;
    }

    if (ApiConfig.isMockMode()) {
      await cache.set(CACHE_KEY, mockUsers, CacheTTL.LISTS);
      return mockUsers;
    }

    const res = await this.getFromGas<User[]>('getUsers');
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<User[]>(CACHE_KEY, true);
    return stale.data || mockUsers;
  }

  async addUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    if (ApiConfig.isMockMode()) {
      const newUser: User = {
        UserId: `U${String(mockUsers.length + 1).padStart(3, '0')}`,
        CustomerCode: `CUST-${100 + mockUsers.length + 1}`,
        FullName: userData.FullName || 'New Customer',
        MobileNumber: userData.MobileNumber || '',
        Email: userData.Email,
        AadhaarNumber: userData.AadhaarNumber,
        PANNumber: userData.PANNumber,
        City: userData.City || 'Bengaluru',
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
      };
      mockUsers.unshift(newUser);
      await cache.invalidate('users');
      await cache.invalidate('dashboard');
      return { success: true, data: newUser };
    }

    const res = await this.postToGas<User>('addUser', { userData });
    if (res.success) {
      await cache.invalidate('users');
      await cache.invalidate('dashboard');
    }
    return res;
  }

  // ─── BANK ACCOUNTS ───

  async getBankAccounts(userId?: string, forceRefresh: boolean = false): Promise<BankAccount[]> {
    const CACHE_KEY = userId ? `bank_accounts_${userId}` : 'bank_accounts_all';

    if (!forceRefresh) {
      const cached = await cache.get<BankAccount[]>(CACHE_KEY);
      if (cached.data) return cached.data;
    }

    if (ApiConfig.isMockMode()) {
      const data = userId ? mockBankAccounts.filter(b => b.UserId === userId) : mockBankAccounts;
      await cache.set(CACHE_KEY, data, CacheTTL.LISTS);
      return data;
    }

    const res = await this.getFromGas<BankAccount[]>('getBankAccounts', userId ? { userId } : {});
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<BankAccount[]>(CACHE_KEY, true);
    return stale.data || mockBankAccounts;
  }

  async addBankAccount(accountData: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    if (ApiConfig.isMockMode()) {
      const newAcc: BankAccount = {
        BankAccountId: `BA${String(mockBankAccounts.length + 1).padStart(3, '0')}`,
        UserId: accountData.UserId || 'U001',
        AccountHolderName: accountData.AccountHolderName || '',
        AccountNumber: accountData.AccountNumber || '',
        BankName: accountData.BankName || '',
        IFSCCode: accountData.IFSCCode || '',
        MaxLoanAmount: Number(accountData.MaxLoanAmount) || 500000,
        UtilizedLoanAmount: 0,
        AvailableLoanAmount: Number(accountData.MaxLoanAmount) || 500000,
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
      };
      mockBankAccounts.push(newAcc);
      await cache.invalidate('bank_accounts');
      await cache.invalidate('dashboard');
      return { success: true, data: newAcc };
    }

    const res = await this.postToGas<BankAccount>('addBankAccount', { accountData });
    if (res.success) {
      await cache.invalidate('bank_accounts');
      await cache.invalidate('dashboard');
    }
    return res;
  }

  // ─── ORNAMENTS ───

  async getOrnaments(userId?: string, forceRefresh: boolean = false): Promise<Ornament[]> {
    const CACHE_KEY = userId ? `ornaments_${userId}` : 'ornaments_all';

    if (!forceRefresh) {
      const cached = await cache.get<Ornament[]>(CACHE_KEY);
      if (cached.data) return cached.data;
    }

    if (ApiConfig.isMockMode()) {
      const data = userId ? mockOrnaments.filter(o => o.UserId === userId) : mockOrnaments;
      await cache.set(CACHE_KEY, data, CacheTTL.LISTS);
      return data;
    }

    const res = await this.getFromGas<Ornament[]>('getOrnaments', userId ? { userId } : {});
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<Ornament[]>(CACHE_KEY, true);
    return stale.data || mockOrnaments;
  }

  async addOrnament(ornamentData: Partial<Ornament>): Promise<ApiResponse<Ornament>> {
    if (ApiConfig.isMockMode()) {
      const gross = Number(ornamentData.GrossWeight) || 0;
      const stone = Number(ornamentData.StoneWeight) || 0;
      const net = Math.max(0, gross - stone);
      const buyPrice = Number(ornamentData.BuyingPricePerGram) || 8100;
      const curPrice = Number(ornamentData.CurrentPricePerGram) || 8850;
      const cost = Math.round(net * buyPrice);
      const market = Math.round(net * curPrice);

      const newOrnament: Ornament = {
        OrnamentId: `ORN${String(mockOrnaments.length + 1).padStart(3, '0')}`,
        UserId: ornamentData.UserId,
        OrnamentName: ornamentData.OrnamentName || 'Gold Jewelry',
        OrnamentType: ornamentData.OrnamentType || 'Necklace',
        GrossWeight: gross,
        StoneWeight: stone,
        NetWeight: net,
        MetalWeight: net,
        Purity: ornamentData.Purity || '22K',
        HallmarkNumber: ornamentData.HallmarkNumber,
        Quantity: Number(ornamentData.Quantity) || 1,
        BuyingPricePerGram: buyPrice,
        CurrentPricePerGram: curPrice,
        BuyingCost: cost,
        TotalPrice: cost,
        MarketValue: market,
        AppreciationValue: market - cost,
        AppreciationPercentage: cost > 0 ? ((market - cost) / cost) * 100 : 0,
        Status: 'Available',
        Remarks: ornamentData.Remarks,
      };

      mockOrnaments.unshift(newOrnament);
      await cache.invalidate('ornaments');
      await cache.invalidate('dashboard');
      return { success: true, data: newOrnament };
    }

    const res = await this.postToGas<Ornament>('addOrnament', { ornamentData });
    if (res.success) {
      await cache.invalidate('ornaments');
      await cache.invalidate('dashboard');
    }
    return res;
  }

  // ─── LOANS ───

  async getLoans(userId?: string, status?: string, forceRefresh: boolean = false): Promise<Loan[]> {
    const CACHE_KEY = `loans_${userId || 'all'}_${status || 'all'}`;

    if (!forceRefresh) {
      const cached = await cache.get<Loan[]>(CACHE_KEY);
      if (cached.data) return cached.data;
    }

    if (ApiConfig.isMockMode()) {
      let data = [...mockLoans];
      if (userId) data = data.filter(l => l.UserId === userId);
      if (status) data = data.filter(l => l.LoanStatus === status);
      await cache.set(CACHE_KEY, data, CacheTTL.LISTS);
      return data;
    }

    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (status) params.status = status;

    const res = await this.getFromGas<Loan[]>('getLoans', params);
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<Loan[]>(CACHE_KEY, true);
    return stale.data || mockLoans;
  }

  async addLoan(loanData: any): Promise<ApiResponse<Loan>> {
    if (ApiConfig.isMockMode()) {
      const amount = Number(loanData.LoanAmount) || 0;
      const newLoan: Loan = {
        LoanId: `L${String(mockLoans.length + 1).padStart(3, '0')}`,
        LoanNumber: loanData.LoanNumber || `LN-2025-${String(mockLoans.length + 1).padStart(3, '0')}`,
        UserId: loanData.UserId,
        BankAccountId: loanData.BankAccountId,
        BankName: loanData.BankName || 'Bank',
        LoanDate: loanData.LoanDate || new Date().toISOString().split('T')[0],
        LoanAmount: amount,
        InterestRate: Number(loanData.InterestRate) || 9.5,
        InterestType: loanData.InterestType || 'Simple',
        LoanPeriod: loanData.LoanPeriod || '12 Months',
        GrossWeight: Number(loanData.GrossWeight) || 0,
        NetWeight: Number(loanData.NetWeight) || 0,
        ProcessingFee: Number(loanData.ProcessingFee) || 0,
        DocumentCharge: Number(loanData.DocumentCharge) || 0,
        InsuranceCharge: Number(loanData.InsuranceCharge) || 0,
        TotalCharges: Number(loanData.TotalCharges) || 0,
        NetDisbursementAmount: Number(loanData.NetDisbursementAmount) || amount,
        DueDate: loanData.DueDate || '',
        LoanStatus: 'Active',
        Remarks: loanData.Remarks || '',
        ornamentIds: loanData.ornamentIds || [],
      };

      // Mark ornaments as pledged
      if (loanData.ornamentIds) {
        mockOrnaments.forEach(o => {
          if (loanData.ornamentIds.includes(o.OrnamentId)) {
            o.Status = 'Pledged';
          }
        });
      }

      // Update bank account utilization
      const bank = mockBankAccounts.find(b => b.BankAccountId === loanData.BankAccountId);
      if (bank) {
        bank.UtilizedLoanAmount += amount;
        bank.AvailableLoanAmount = Math.max(0, bank.MaxLoanAmount - bank.UtilizedLoanAmount);
      }

      mockLoans.unshift(newLoan);
      await cache.invalidate('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');
      await cache.invalidate('dashboard');

      return { success: true, data: newLoan };
    }

    const res = await this.postToGas<Loan>('addLoan', { loanData });
    if (res.success) {
      await cache.invalidate('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');
      await cache.invalidate('dashboard');
    }
    return res;
  }

  async addPayment(paymentData: Partial<Payment>): Promise<ApiResponse<Payment>> {
    if (ApiConfig.isMockMode()) {
      const newPay: Payment = {
        PaymentId: `PAY${String(mockPayments.length + 1).padStart(3, '0')}`,
        LoanId: paymentData.LoanId || '',
        PaymentDate: paymentData.PaymentDate || new Date().toISOString().split('T')[0],
        PaymentType: paymentData.PaymentType || 'Interest',
        PrincipalAmount: Number(paymentData.PrincipalAmount) || 0,
        InterestAmount: Number(paymentData.InterestAmount) || 0,
        PenaltyAmount: Number(paymentData.PenaltyAmount) || 0,
        TotalPaidAmount: Number(paymentData.TotalPaidAmount) || 0,
        PaymentMethod: paymentData.PaymentMethod || 'UPI',
        TransactionReference: paymentData.TransactionReference,
        Remarks: paymentData.Remarks,
        CreatedDate: new Date().toISOString(),
      };
      mockPayments.unshift(newPay);
      await cache.invalidate('dashboard');
      return { success: true, data: newPay };
    }

    const res = await this.postToGas<Payment>('addPayment', { paymentData });
    if (res.success) {
      await cache.invalidate('dashboard');
    }
    return res;
  }

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const url = ApiConfig.getApiUrl();
      if (!url) {
        return { ok: false, message: 'URL is empty', latencyMs: 0 };
      }
      const res = await fetch(`${url}?action=getDashboardData`);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, message: 'Connection successful', latencyMs };
      }
      return { ok: false, message: `Server returned status ${res.status}`, latencyMs };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Connection failed', latencyMs: Date.now() - start };
    }
  }
}

export const api = new ApiService();
