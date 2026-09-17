import { ApiConfig } from '../config/api';
import { cache, CacheTTL } from './cache';
import { 
  User, BankAccount, Ornament, Loan, Payment, 
  DashboardData, GoldRateData, ApiResponse, InitialSyncData 
} from '../types';
import { 
  mockDashboardData, mockGoldRates, mockUsers, 
  mockBankAccounts, mockOrnaments, mockLoans, mockPayments 
} from './mockData';

/**
 * Helper to convert Google Drive sharing links to direct image thumbnail URLs
 * for rendering inside React Native Image and expo-image components.
 */
export function getDriveDirectImageUrl(driveUrl?: string | null): string | undefined {
  if (!driveUrl) return undefined;
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return driveUrl;
}

export const getDriveImageUrl = getDriveDirectImageUrl;

class ApiService {
  /**
   * Helper to convert Google Drive sharing links to direct image thumbnail URLs
   */
  getDriveImageUrl = getDriveDirectImageUrl;

  /**
   * Universal HTTP request to Google Apps Script Web App
   * Always appends action query parameter to preserve action during Google redirects.
   * Uses GET for queries and POST for mutations with automatic fallback.
   */
  async callGas<T>(action: string, payload: any = {}, preferredMethod: 'POST' | 'GET' = 'GET'): Promise<ApiResponse<T>> {
    const baseUrl = ApiConfig.getApiUrl();
    if (!baseUrl) {
      return { success: false, error: "Google Apps Script Web App URL not configured." };
    }

    const methods: ('GET' | 'POST')[] = preferredMethod === 'GET' ? ['GET', 'POST'] : ['POST', 'GET'];

    for (const method of methods) {
      try {
        let response: Response;
        const separator = baseUrl.includes('?') ? '&' : '?';

        if (method === 'POST') {
          // Always keep action in URL query so Google 302 redirect preserves the action
          const urlWithAction = `${baseUrl}${separator}action=${encodeURIComponent(action)}`;
          response = await fetch(urlWithAction, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action, ...payload }),
          });
        } else {
          // For GET, append action and any scalar payload properties as query parameters
          const queryParams: Record<string, string> = { action };
          for (const [k, v] of Object.entries(payload)) {
            if (v !== undefined && v !== null && typeof v !== 'object') {
              queryParams[k] = String(v);
            }
          }
          const query = new URLSearchParams(queryParams).toString();
          response = await fetch(`${baseUrl}${separator}${query}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            // If response indicates action was dropped on redirect, try the fallback method!
            if (parsed.success === false && parsed.error === 'No action specified in request') {
              console.warn(`[API] ${method} returned 'No action specified in request', attempting fallback method...`);
              continue;
            }
            return parsed;
          }
        } catch {
          if (text.includes('Script function not found: doPost')) {
            console.warn('[API] Google Apps Script requires redeployment with updated Code.js (doPost not yet active in cloud).');
            continue;
          }
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            continue;
          }
          return { success: false, error: "Server returned non-JSON: " + text.slice(0, 100) };
        }
      } catch (error: any) {
        console.warn(`[API] ${method} attempt failed for "${action}": ${error.message || 'Network error'}`);
      }
    }

    return { success: false, error: `Network request failed for "${action}". Please check your internet connection.` };
  }

  private async postToGas<T>(action: string, payload: any = {}): Promise<ApiResponse<T>> {
    return this.callGas<T>(action, payload, 'POST');
  }

  private async getFromGas<T>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
    return this.callGas<T>(action, params, 'GET');
  }

  /**
   * Fetch all app data in a single unified round-trip with intelligent caching
   */
  async getInitialSyncData(forceRefresh: boolean = false): Promise<ApiResponse<InitialSyncData>> {
    const CACHE_KEY = 'initial_sync_data';

    if (!forceRefresh) {
      const cached = await cache.get<InitialSyncData>(CACHE_KEY);
      if (cached.data) {
        return { success: true, data: cached.data, isCached: true };
      }
    }

    if (ApiConfig.isMockMode()) {
      const mockData: InitialSyncData = {
        users: mockUsers,
        bankAccounts: mockBankAccounts,
        ornaments: mockOrnaments,
        loans: mockLoans,
        payments: mockPayments,
        goldRates: mockGoldRates,
      };
      await cache.set(CACHE_KEY, mockData, CacheTTL.SYNC_DATA);
      return { success: true, data: mockData, isCached: false };
    }

    const res = await this.callGas<InitialSyncData>('getInitialSyncData', {}, 'GET');
    if (res.success && res.data) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.SYNC_DATA);
      // Pre-populate individual entity caches
      if (res.data.users) await cache.set('users_list', res.data.users, CacheTTL.LISTS);
      if (res.data.bankAccounts) await cache.set('bank_accounts_all', res.data.bankAccounts, CacheTTL.LISTS);
      if (res.data.ornaments) await cache.set('ornaments_all', res.data.ornaments, CacheTTL.LISTS);
      if (res.data.loans) await cache.set('loans_all', res.data.loans, CacheTTL.LISTS);
      if (res.data.payments) await cache.set('payments_all', res.data.payments, CacheTTL.LISTS);
      if (res.data.goldRates) await cache.set('gold_rates_bangalore', res.data.goldRates, CacheTTL.GOLD_RATES);
      return { success: true, data: res.data, isCached: false };
    }

    // Network request failed - fall back to stale cache
    const stale = await cache.get<InitialSyncData>(CACHE_KEY, true);
    if (stale.data) {
      return { success: true, data: stale.data, isCached: true, isFallback: true };
    }

    return res;
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

  async addUser(userData: Partial<User> & { files?: any[] }): Promise<ApiResponse<User>> {
    if (ApiConfig.isMockMode()) {
      const newUser: User = {
        UserId: `U${String(mockUsers.length + 1).padStart(3, '0')}`,
        CustomerCode: userData.CustomerCode || `CUST-${100 + mockUsers.length + 1}`,
        FullName: userData.FullName || 'New Customer',
        FatherHusbandName: userData.FatherHusbandName || '',
        MobileNumber: userData.MobileNumber || '',
        AlternateMobileNumber: userData.AlternateMobileNumber || '',
        Email: userData.Email || '',
        DateOfBirth: userData.DateOfBirth || '',
        Gender: userData.Gender || 'Male',
        AadhaarNumber: userData.AadhaarNumber || '',
        PANNumber: userData.PANNumber || '',
        AddressLine1: userData.AddressLine1 || '',
        AddressLine2: userData.AddressLine2 || '',
        City: userData.City || 'Bengaluru',
        State: userData.State || 'Karnataka',
        Pincode: userData.Pincode || '560001',
        Occupation: userData.Occupation || '',
        CustomerPhoto: '',
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
      };
      mockUsers.unshift(newUser);
      await cache.invalidateEntity('users');
      return { success: true, data: newUser };
    }

    const res = await this.postToGas<User>('addUser', { userData });
    if (res.success) {
      await cache.invalidateEntity('users');
    }
    return res;
  }

  async updateUser(userId: string, userData: Partial<User> & { files?: any[] }): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockUsers.findIndex(u => u.UserId === userId);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...userData, UpdatedDate: new Date().toISOString() };
      }
      await cache.invalidateEntity('users');
      return { success: true, data: 'User updated' };
    }

    const res = await this.postToGas('updateUser', { userId, userData });
    if (res.success) {
      await cache.invalidateEntity('users');
    }
    return res;
  }

  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockUsers.findIndex(u => u.UserId === userId);
      if (idx !== -1) mockUsers.splice(idx, 1);
      await cache.invalidateEntity('users');
      return { success: true, data: 'User deleted' };
    }

    const res = await this.postToGas('deleteUser', { userId });
    if (res.success) {
      await cache.invalidateEntity('users');
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
    if (res.success && Array.isArray(res.data)) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<BankAccount[]>(CACHE_KEY, true);
    return stale.data || mockBankAccounts;
  }

  async addBankAccount(accountData: Partial<BankAccount> & { files?: any[] }): Promise<ApiResponse<BankAccount>> {
    if (ApiConfig.isMockMode()) {
      const newAcc: BankAccount = {
        BankAccountId: `BA${String(mockBankAccounts.length + 1).padStart(3, '0')}`,
        UserId: accountData.UserId || 'U001',
        AccountHolderName: accountData.AccountHolderName || '',
        AccountNumber: accountData.AccountNumber || '',
        BankName: accountData.BankName || '',
        BranchName: accountData.BranchName || '',
        City: accountData.City || 'Bengaluru',
        IFSCCode: accountData.IFSCCode || '',
        AccountType: accountData.AccountType || 'Savings',
        UPI_ID: accountData.UPI_ID || '',
        MaxLoanAmount: Number(accountData.MaxLoanAmount) || 500000,
        UtilizedLoanAmount: 0,
        AvailableLoanAmount: Number(accountData.MaxLoanAmount) || 500000,
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
      };
      mockBankAccounts.unshift(newAcc);
      await cache.invalidateEntity('bank_accounts');
      return { success: true, data: newAcc };
    }

    const res = await this.postToGas<BankAccount>('addBankAccount', { accountData });
    if (res.success) {
      await cache.invalidateEntity('bank_accounts');
    }
    return res;
  }

  async updateBankAccount(accountId: string, accountData: Partial<BankAccount> & { files?: any[] }): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockBankAccounts.findIndex(b => b.BankAccountId === accountId);
      if (idx !== -1) {
        mockBankAccounts[idx] = { ...mockBankAccounts[idx], ...accountData, UpdatedDate: new Date().toISOString() };
      }
      await cache.invalidateEntity('bank_accounts');
      return { success: true, data: 'Bank account updated' };
    }

    const res = await this.postToGas('updateBankAccount', { accountId, accountData });
    if (res.success) {
      await cache.invalidateEntity('bank_accounts');
    }
    return res;
  }

  async deleteBankAccount(accountId: string): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockBankAccounts.findIndex(b => b.BankAccountId === accountId);
      if (idx !== -1) mockBankAccounts.splice(idx, 1);
      await cache.invalidateEntity('bank_accounts');
      return { success: true, data: 'Bank account deleted' };
    }

    const res = await this.postToGas('deleteBankAccount', { accountId });
    if (res.success) {
      await cache.invalidateEntity('bank_accounts');
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
    if (res.success && Array.isArray(res.data)) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<Ornament[]>(CACHE_KEY, true);
    return stale.data || mockOrnaments;
  }

  async getAvailableOrnaments(): Promise<Ornament[]> {
    if (ApiConfig.isMockMode()) {
      return mockOrnaments.filter(o => o.Status === 'Available' || o.Status === 'Released');
    }

    const res = await this.getFromGas<Ornament[]>('getAvailableOrnaments');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  async addOrnament(ornamentData: Partial<Ornament> & { files?: any[] }): Promise<ApiResponse<Ornament>> {
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
        OrnamentCategory: ornamentData.OrnamentCategory || 'Neckwear',
        Description: ornamentData.Description || '',
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
        MakerName: ornamentData.MakerName || '',
        EstimatedValue: ornamentData.EstimatedValue || market,
        Status: 'Available',
        Remarks: ornamentData.Remarks,
      };

      mockOrnaments.unshift(newOrnament);
      await cache.invalidateEntity('ornaments');
      return { success: true, data: newOrnament };
    }

    const res = await this.postToGas<Ornament>('addOrnament', { ornamentData });
    if (res.success) {
      await cache.invalidateEntity('ornaments');
    }
    return res;
  }

  async updateOrnament(ornamentId: string, ornamentData: Partial<Ornament> & { files?: any[] }): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockOrnaments.findIndex(o => o.OrnamentId === ornamentId);
      if (idx !== -1) {
        mockOrnaments[idx] = { ...mockOrnaments[idx], ...ornamentData };
      }
      await cache.invalidateEntity('ornaments');
      return { success: true, data: 'Ornament updated' };
    }

    const res = await this.postToGas('updateOrnament', { ornamentId, ornamentData });
    if (res.success) {
      await cache.invalidateEntity('ornaments');
    }
    return res;
  }

  async deleteOrnament(ornamentId: string): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const idx = mockOrnaments.findIndex(o => o.OrnamentId === ornamentId);
      if (idx !== -1) mockOrnaments.splice(idx, 1);
      await cache.invalidateEntity('ornaments');
      return { success: true, data: 'Ornament deleted' };
    }

    const res = await this.postToGas('deleteOrnament', { ornamentId });
    if (res.success) {
      await cache.invalidateEntity('ornaments');
    }
    return res;
  }

  async deleteOrnamentImage(ornamentId: string, imageUrl: string): Promise<ApiResponse<any>> {
    const res = await this.postToGas('deleteOrnamentImage', { ornamentId, imageUrl });
    if (res.success) {
      await cache.invalidateEntity('ornaments');
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
    if (res.success && Array.isArray(res.data)) {
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

      if (loanData.ornamentIds) {
        mockOrnaments.forEach(o => {
          if (loanData.ornamentIds.includes(o.OrnamentId)) {
            o.Status = 'Pledged';
          }
        });
      }

      const bank = mockBankAccounts.find(b => b.BankAccountId === loanData.BankAccountId);
      if (bank) {
        bank.UtilizedLoanAmount += amount;
        bank.AvailableLoanAmount = Math.max(0, bank.MaxLoanAmount - bank.UtilizedLoanAmount);
      }

      mockLoans.unshift(newLoan);
      await cache.invalidateEntity('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');

      return { success: true, data: newLoan };
    }

    const res = await this.postToGas<Loan>('addLoan', { loanData });
    if (res.success) {
      await cache.invalidateEntity('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');
    }
    return res;
  }

  async updateLoan(loanId: string, loanData: Partial<Loan>): Promise<ApiResponse<any>> {
    const res = await this.postToGas('updateLoan', { loanId, loanData });
    if (res.success) {
      await cache.invalidateEntity('loans');
    }
    return res;
  }

  async closeAndReleaseLoan(loanId: string, closureRemarks: string): Promise<ApiResponse<any>> {
    if (ApiConfig.isMockMode()) {
      const l = mockLoans.find(loan => loan.LoanId === loanId);
      if (l) {
        l.LoanStatus = 'Closed';
        l.ClosedDate = new Date().toISOString();
        l.ClosureRemarks = closureRemarks;
      }
      await cache.invalidateEntity('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');
      return { success: true, data: 'Loan closed' };
    }

    const res = await this.postToGas('closeAndReleaseLoan', { loanId, closureRemarks });
    if (res.success) {
      await cache.invalidateEntity('loans');
      await cache.invalidate('ornaments');
      await cache.invalidate('bank_accounts');
    }
    return res;
  }

  // ─── PAYMENTS ───

  async getPayments(loanId?: string, forceRefresh: boolean = false): Promise<Payment[]> {
    const CACHE_KEY = loanId ? `payments_loan_${loanId}` : 'payments_all';

    if (!forceRefresh) {
      const cached = await cache.get<Payment[]>(CACHE_KEY);
      if (cached.data && Array.isArray(cached.data)) return cached.data;
    }

    if (ApiConfig.isMockMode()) {
      const data = loanId ? mockPayments.filter(p => p.LoanId === loanId) : mockPayments;
      await cache.set(CACHE_KEY, data, CacheTTL.LISTS);
      return data;
    }

    const res = await this.getFromGas<Payment[]>('getPayments', loanId ? { loanId } : {});
    if (res.success && Array.isArray(res.data)) {
      await cache.set(CACHE_KEY, res.data, CacheTTL.LISTS);
      return res.data;
    }

    const stale = await cache.get<Payment[]>(CACHE_KEY, true);
    if (stale.data && Array.isArray(stale.data)) {
      return stale.data;
    }

    return loanId ? mockPayments.filter(p => p.LoanId === loanId) : mockPayments;
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
      await cache.invalidate('payments');
      await cache.invalidate('initial_sync_data');
      await cache.invalidate('dashboard');
      return { success: true, data: newPay };
    }

    const res = await this.postToGas<Payment>('addPayment', { paymentData });
    if (res.success) {
      await cache.invalidate('payments');
      await cache.invalidate('initial_sync_data');
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
      const res = await fetch(`${url}?action=testConnection`);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.success) {
            return { ok: true, message: 'Connected to Google Apps Script Web App', latencyMs };
          }
          return { ok: false, message: json.error || 'Server error', latencyMs };
        } catch {
          return { ok: false, message: 'Invalid response from server', latencyMs };
        }
      }
      return { ok: false, message: `Server returned status ${res.status}`, latencyMs };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Connection failed', latencyMs: Date.now() - start };
    }
  }
}

export const api = new ApiService();
api.getDriveImageUrl = getDriveDirectImageUrl;

