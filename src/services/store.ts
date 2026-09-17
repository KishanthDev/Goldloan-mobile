import { useState, useEffect } from 'react';
import { User, BankAccount, Ornament, Loan, Payment, GoldRateData, DashboardData } from '../types';
import { 
  mockUsers, mockBankAccounts, mockOrnaments, 
  mockLoans, mockPayments, mockGoldRates, mockDashboardData 
} from './mockData';
import { api } from './api';
import { ApiConfig } from '../config/api';
import { cache, CacheTTL } from './cache';

// Global in-memory state so changes persist across screen transitions (clean empty start - no mock data)
let usersState: User[] = [];
let bankAccountsState: BankAccount[] = [];
let ornamentsState: Ornament[] = [];
let loansState: Loan[] = [];
let paymentsState: Payment[] = [];
let goldRatesState: GoldRateData = { ...mockGoldRates };

let isSyncing = false;
let lastSyncedAt: string | null = null;
let lastSyncTimestamp = 0;
let hasInitialized = false;
let isCacheHydrated = false;
let syncError: string | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

/**
 * Hydrate in-memory state from L2 persistent storage (AsyncStorage) immediately on boot.
 * Delivers instant offline UI before any network requests complete.
 */
export async function hydrateFromCache() {
  if (isCacheHydrated) return;
  try {
    const [cachedUsers, cachedBanks, cachedOrns, cachedLoans, cachedPayments, cachedRates] = await Promise.all([
      cache.get<User[]>('users_list', true),
      cache.get<BankAccount[]>('bank_accounts_all', true),
      cache.get<Ornament[]>('ornaments_all', true),
      cache.get<Loan[]>('loans_all', true),
      cache.get<Payment[]>('payments_all', true),
      cache.get<GoldRateData>('gold_rates_bangalore', true),
    ]);

    // Only wipe if specifically the legacy hardcoded mock user exists with matching CUST-001
    if (cachedUsers.data && cachedUsers.data.some(u => u.FullName === 'Rajesh Sharma' && u.CustomerCode === 'CUST-001')) {
      await cache.clearAll();
      usersState = [];
      bankAccountsState = [];
      ornamentsState = [];
      loansState = [];
      paymentsState = [];
      isCacheHydrated = true;
      notify();
      return;
    }

    let updated = false;
    if (cachedUsers.data && cachedUsers.data.length > 0) {
      usersState = cachedUsers.data;
      updated = true;
    }
    if (cachedBanks.data && cachedBanks.data.length > 0) {
      bankAccountsState = cachedBanks.data;
      updated = true;
    }
    if (cachedOrns.data && cachedOrns.data.length > 0) {
      ornamentsState = cachedOrns.data;
      updated = true;
    }
    if (cachedLoans.data && cachedLoans.data.length > 0) {
      loansState = cachedLoans.data;
      updated = true;
    }
    if (cachedPayments.data && cachedPayments.data.length > 0) {
      paymentsState = cachedPayments.data;
      updated = true;
    }
    if (cachedRates.data) {
      goldRatesState = cachedRates.data;
      updated = true;
    }

    isCacheHydrated = true;
    if (updated) notify();
  } catch (e) {
    console.warn('[Store] hydrateFromCache warning:', e);
  }
}

export async function syncFromBackend(force: boolean = false) {
  if (isSyncing && !force) return;
  if (ApiConfig.isMockMode()) return;

  const now = Date.now();
  // Prevent spamming requests within 10 seconds unless user explicitly requested (e.g. pull-to-refresh)
  if (!force && now - lastSyncTimestamp < 10000) return;

  if (!isCacheHydrated) {
    await hydrateFromCache();
  }

  isSyncing = true;
  syncError = null;
  notify();

  try {
    // 1. First attempt fast unified sync (1 round trip)
    const syncRes = await api.getInitialSyncData(force);
    if (syncRes.success && syncRes.data) {
      const data = syncRes.data;
      if (Array.isArray(data.users)) usersState = data.users;
      if (Array.isArray(data.bankAccounts)) bankAccountsState = data.bankAccounts;
      if (Array.isArray(data.ornaments)) ornamentsState = data.ornaments;
      if (Array.isArray(data.loans)) loansState = data.loans;
      if (Array.isArray(data.payments)) paymentsState = data.payments;
      if (data.goldRates) goldRatesState = data.goldRates;

      lastSyncedAt = new Date().toLocaleTimeString();
      lastSyncTimestamp = Date.now();
      syncError = null;
      return;
    }

    // 2. Resilient fallback using Promise.allSettled so individual failures don't fail the whole sync
    const results = await Promise.allSettled([
      api.getUsers(force),
      api.getBankAccounts(undefined, force),
      api.getOrnaments(undefined, force),
      api.getLoans(undefined, undefined, force),
      api.getPayments(undefined, force),
      api.getGoldRates(force),
    ]);

    const [usersRes, banksRes, ornsRes, loansRes, paymentsRes, ratesRes] = results;

    if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) usersState = usersRes.value;
    if (banksRes.status === 'fulfilled' && Array.isArray(banksRes.value)) bankAccountsState = banksRes.value;
    if (ornsRes.status === 'fulfilled' && Array.isArray(ornsRes.value)) ornamentsState = ornsRes.value;
    if (loansRes.status === 'fulfilled' && Array.isArray(loansRes.value)) loansState = loansRes.value;
    if (paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)) paymentsState = paymentsRes.value;
    if (ratesRes.status === 'fulfilled' && ratesRes.value?.data) goldRatesState = ratesRes.value.data;

    lastSyncedAt = new Date().toLocaleTimeString();
    lastSyncTimestamp = Date.now();
  } catch (err: any) {
    console.warn('[Store] syncFromBackend warning:', err?.message || err);
    syncError = 'Live sync offline - using cached data';
  } finally {
    isSyncing = false;
    notify();
  }
}

function nextId<T>(prefix: string, values: T[], key: keyof T) {
  const highest = values.reduce((max, value) => {
    const numeric = Number(String(value[key] ?? '').replace(prefix, ''));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

export function calculateLoanPeriodInterest(loan: Partial<Loan>) {
  const principal = Number(loan.LoanAmount) || 0;
  const annualRate = Number(loan.InterestRate) || 0;
  if (principal <= 0 || annualRate <= 0) return 0;

  let months = Number(String(loan.LoanPeriod || '').replace(/[^0-9.]/g, '')) || 0;
  if (!months && loan.LoanDate && loan.DueDate) {
    const start = new Date(loan.LoanDate).getTime();
    const end = new Date(loan.DueDate).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
    }
  }
  months = months || 1;
  const interest = loan.InterestType === 'Compound'
    ? principal * (Math.pow(1 + annualRate / 1200, months) - 1)
    : principal * (annualRate / 100) * (months / 12);
  return Math.round(interest * 100) / 100;
}

export function useAppStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);

    if (!hasInitialized) {
      hasInitialized = true;
      hydrateFromCache().then(() => syncFromBackend());
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // --- Calculations ---

  const calculateUserBankUtilization = (userId: string, bankAccountId: string) => {
    return loansState
      .filter(l => l.LoanStatus === 'Active' && l.UserId === userId && l.BankAccountId === bankAccountId)
      .reduce((sum, l) => sum + (Number(l.LoanAmount) || 0), 0);
  };

  const getDashboardData = (): DashboardData => {
    const activeUsers = usersState.filter(u => u.Status === 'Active');
    const activeBanks = bankAccountsState.filter(b => b.Status === 'Active');
    const activeLoans = loansState.filter(l => l.LoanStatus === 'Active');
    const closedLoans = loansState.filter(l => l.LoanStatus === 'Closed');

    const pledgedOrnaments = ornamentsState.filter(o => o.Status === 'Pledged');
    const pledgedOrnamentsCount = pledgedOrnaments.length;
    const pledgedGrams = pledgedOrnaments.reduce((sum, o) => sum + (Number(o.GrossWeight) || 0), 0);

    const totalLoanAmount = activeLoans.reduce((sum, l) => sum + (Number(l.LoanAmount) || 0), 0);
    const totalEligibleLoanAmount = activeBanks.reduce((sum, b) => sum + (Number(b.MaxLoanAmount) || 0), 0);
    const totalAvailableLoanAmount = activeBanks.reduce((sum, b) => {
      const maxL = Number(b.MaxLoanAmount) || 0;
      const util = calculateUserBankUtilization(b.UserId, b.BankAccountId);
      return sum + Math.max(0, maxL - util);
    }, 0);

    let totalGoldWeight = 0;
    let totalBuyingGoldValue = 0;
    ornamentsState.forEach(o => {
      if (o.Status !== 'Deleted') {
        const wt = Number(o.NetWeight) || Number(o.MetalWeight) || Math.max(0, Number(o.GrossWeight) - Number(o.StoneWeight || 0));
        const rate = Number(o.BuyingPricePerGram) || 0;
        totalGoldWeight += wt;
        totalBuyingGoldValue += rate > 0 ? (rate * wt) : (Number(o.BuyingCost) || Number(o.TotalPrice) || 0);
      }
    });

    return {
      totalUsers: activeUsers.length,
      totalBankAccounts: activeBanks.length,
      totalOrnaments: ornamentsState.filter(o => o.Status !== 'Deleted').length,
      pledgedOrnamentsCount,
      pledgedGrams,
      activeLoans: activeLoans.length,
      closedLoans: closedLoans.length,
      totalLoanAmount,
      totalEligibleLoanAmount,
      totalAvailableLoanAmount,
      totalGoldWeight,
      totalBuyingGoldValue,
      recentTransactions: paymentsState.slice(-5).reverse(),
    };
  };

  // --- CRUD: Users ---

  const addUser = (userData: Partial<User> & { files?: any[] }) => {
    const tempId = nextId('U', usersState, 'UserId');
    const newUser: User = {
      UserId: tempId,
      CustomerCode: userData.CustomerCode || `CUST-${100 + usersState.length + 1}`,
      FullName: userData.FullName || 'New User',
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
      CustomerPhoto: userData.CustomerPhoto || '',
      Status: (userData.Status as any) || 'Active',
      CreatedDate: new Date().toISOString(),
    };
    usersState = [newUser, ...usersState];
    cache.set('users_list', usersState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.addUser(userData).then(res => {
        if (res.success && res.data) {
          usersState = usersState.map(u => u.UserId === tempId ? { ...u, ...res.data } : u);
          cache.set('users_list', usersState, CacheTTL.LISTS);
          notify();
        }
      }).catch(err => console.warn('[Store] addUser error:', err));
    }

    return newUser;
  };

  const updateUser = (userId: string, updated: Partial<User> & { files?: any[] }) => {
    usersState = usersState.map(u => u.UserId === userId ? { ...u, ...updated, UpdatedDate: new Date().toISOString() } : u);
    cache.set('users_list', usersState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.updateUser(userId, updated).catch(err => console.warn('[Store] updateUser error:', err));
    }
  };

  const deleteUser = (userId: string) => {
    usersState = usersState.filter(u => u.UserId !== userId);
    cache.set('users_list', usersState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.deleteUser(userId).catch(err => console.warn('[Store] deleteUser error:', err));
    }
  };

  // --- CRUD: Bank Accounts ---

  const addBankAccount = (accData: Partial<BankAccount> & { files?: any[] }) => {
    const tempId = nextId('BA', bankAccountsState, 'BankAccountId');
    const max = Number(accData.MaxLoanAmount) || 0;
    const util = Number(accData.UtilizedLoanAmount) || 0;
    const newAcc: BankAccount = {
      BankAccountId: tempId,
      UserId: accData.UserId || usersState[0]?.UserId || 'U001',
      AccountHolderName: accData.AccountHolderName || '',
      AccountNumber: accData.AccountNumber || '',
      BankName: accData.BankName || '',
      BranchName: accData.BranchName || '',
      City: accData.City || 'Bengaluru',
      IFSCCode: accData.IFSCCode || '',
      AccountType: accData.AccountType || 'Savings',
      UPI_ID: accData.UPI_ID || '',
      PassbookImage: accData.PassbookImage || '',
      Status: (accData.Status as any) || 'Active',
      CreatedDate: new Date().toISOString(),
      MaxLoanAmount: max,
      UtilizedLoanAmount: util,
      AvailableLoanAmount: Math.max(0, max - util),
    };
    bankAccountsState = [newAcc, ...bankAccountsState];
    cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.addBankAccount(accData).then(res => {
        if (res.success && res.data) {
          bankAccountsState = bankAccountsState.map(b => b.BankAccountId === tempId ? { ...b, ...res.data } : b);
          cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
          notify();
        }
      }).catch(err => console.warn('[Store] addBankAccount error:', err));
    }

    return newAcc;
  };

  const updateBankAccount = (accId: string, updated: Partial<BankAccount> & { files?: any[] }) => {
    bankAccountsState = bankAccountsState.map(b => {
      if (b.BankAccountId === accId) {
        const merged = { ...b, ...updated, UpdatedDate: new Date().toISOString() };
        const max = Number(merged.MaxLoanAmount) || 0;
        const util = Number(merged.UtilizedLoanAmount) || 0;
        merged.AvailableLoanAmount = Math.max(0, max - util);
        return merged;
      }
      return b;
    });
    cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.updateBankAccount(accId, updated).catch(err => console.warn('[Store] updateBankAccount error:', err));
    }
  };

  const deleteBankAccount = (accId: string) => {
    bankAccountsState = bankAccountsState.filter(b => b.BankAccountId !== accId);
    cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.deleteBankAccount(accId).catch(err => console.warn('[Store] deleteBankAccount error:', err));
    }
  };

  // --- CRUD: Ornaments ---

  const addOrnament = (ornData: Partial<Ornament> & { files?: any[] }) => {
    const tempId = nextId('ORN', ornamentsState, 'OrnamentId');
    const gross = Number(ornData.GrossWeight) || 0;
    const stone = Number(ornData.StoneWeight) || 0;
    const metal = ornData.MetalWeight !== undefined && ornData.MetalWeight !== null 
      ? Number(ornData.MetalWeight) 
      : Math.max(0, gross - stone);
    const net = metal;
    const buyingPrice = Number(ornData.BuyingPricePerGram) || 0;
    const currentPrice = Number(ornData.CurrentPricePerGram) || 0;
    const buyingCost = Math.round(net * buyingPrice * 100) / 100;
    const marketValue = Math.round(net * currentPrice * 100) / 100;
    const apprVal = Math.round((marketValue - buyingCost) * 100) / 100;
    const apprPct = buyingCost > 0 ? Math.round(((apprVal / buyingCost) * 100) * 100) / 100 : 0;

    const newOrn: Ornament = {
      OrnamentId: tempId,
      UserId: ornData.UserId || usersState[0]?.UserId || '',
      OrnamentName: ornData.OrnamentName || 'Gold Jewelry',
      OrnamentType: ornData.OrnamentType || 'Necklace',
      OrnamentCategory: ornData.OrnamentCategory || 'Neckwear',
      Description: ornData.Description || '',
      GrossWeight: gross,
      StoneWeight: stone,
      NetWeight: net,
      MetalWeight: metal,
      Purity: ornData.Purity || '22K',
      HallmarkNumber: ornData.HallmarkNumber || '',
      Quantity: Number(ornData.Quantity) || 1,
      BuyingPricePerGram: buyingPrice,
      CurrentPricePerGram: currentPrice,
      BuyingCost: buyingCost,
      TotalPrice: buyingCost,
      MarketValue: marketValue,
      AppreciationValue: apprVal,
      AppreciationPercentage: apprPct,
      MakerName: ornData.MakerName || '',
      EstimatedValue: Number(ornData.EstimatedValue) || marketValue || buyingCost,
      OrnamentImages: ornData.OrnamentImages || '',
      Remarks: ornData.Remarks || '',
      Status: (ornData.Status as any) || 'Available',
    };
    ornamentsState = [newOrn, ...ornamentsState];
    cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.addOrnament(ornData).then(res => {
        if (res.success && res.data) {
          ornamentsState = ornamentsState.map(o => o.OrnamentId === tempId ? { ...o, ...res.data } : o);
          cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
          notify();
        }
      }).catch(err => console.warn('[Store] addOrnament error:', err));
    }

    return newOrn;
  };

  const updateOrnament = (ornId: string, updated: Partial<Ornament> & { files?: any[] }) => {
    ornamentsState = ornamentsState.map(o => {
      if (o.OrnamentId === ornId) {
        const merged = { ...o, ...updated };
        const gross = Number(merged.GrossWeight) || 0;
        const stone = Number(merged.StoneWeight) || 0;
        const metal = merged.MetalWeight !== undefined && merged.MetalWeight !== null 
          ? Number(merged.MetalWeight) 
          : Math.max(0, gross - stone);
        const net = metal;
        const buyingPrice = Number(merged.BuyingPricePerGram) || 0;
        const currentPrice = Number(merged.CurrentPricePerGram) || 0;
        const buyingCost = Math.round(net * buyingPrice * 100) / 100;
        const marketValue = Math.round(net * currentPrice * 100) / 100;
        const apprVal = Math.round((marketValue - buyingCost) * 100) / 100;
        const apprPct = buyingCost > 0 ? Math.round(((apprVal / buyingCost) * 100) * 100) / 100 : 0;

        return {
          ...merged,
          GrossWeight: gross,
          StoneWeight: stone,
          NetWeight: net,
          MetalWeight: metal,
          BuyingCost: buyingCost,
          TotalPrice: buyingCost,
          MarketValue: marketValue,
          AppreciationValue: apprVal,
          AppreciationPercentage: apprPct,
        };
      }
      return o;
    });
    cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.updateOrnament(ornId, updated).catch(err => console.warn('[Store] updateOrnament error:', err));
    }
  };

  const deleteOrnament = (ornId: string) => {
    ornamentsState = ornamentsState.filter(o => o.OrnamentId !== ornId);
    cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.deleteOrnament(ornId).catch(err => console.warn('[Store] deleteOrnament error:', err));
    }
  };

  // --- CRUD: Loans ---

  const addLoan = (loanData: any) => {
    const tempId = nextId('L', loansState, 'LoanId');
    const amount = Number(loanData.LoanAmount) || 0;
    const procFee = Number(loanData.ProcessingFee) || 0;
    const docCharge = Number(loanData.DocumentCharge) || 0;
    const insCharge = Number(loanData.InsuranceCharge) || 0;
    const netDisb = amount - (procFee + docCharge + insCharge);
    const selectedOrnaments = ornamentsState.filter(o => (loanData.ornamentIds || []).includes(o.OrnamentId));
    const grossWeight = Number(loanData.GrossWeight) || selectedOrnaments.reduce((sum, o) => sum + (Number(o.GrossWeight) || 0), 0);
    const netWeight = Number(loanData.NetWeight) || selectedOrnaments.reduce((sum, o) => sum + (Number(o.MetalWeight ?? o.NetWeight) || 0), 0);
    const totalCharges = calculateLoanPeriodInterest({
      LoanAmount: amount,
      InterestRate: Number(loanData.InterestRate) || 0,
      InterestType: loanData.InterestType || 'Simple',
      LoanPeriod: loanData.LoanPeriod || '',
      LoanDate: loanData.LoanDate,
      DueDate: loanData.DueDate,
    }) + procFee;

    const newLoan: Loan = {
      LoanId: tempId,
      LoanNumber: loanData.LoanNumber || `LN-${new Date().getFullYear()}-${tempId}`,
      UserId: loanData.UserId,
      BankAccountId: loanData.BankAccountId,
      BankName: loanData.BankName || 'Bank',
      LoanDate: loanData.LoanDate || new Date().toISOString().split('T')[0],
      LoanAmount: amount,
      InterestRate: Number(loanData.InterestRate) || 9.5,
      InterestType: loanData.InterestType || 'Simple',
      LoanPeriod: loanData.LoanPeriod || '12 Months',
      GrossWeight: grossWeight,
      NetWeight: netWeight,
      ProcessingFee: procFee,
      DocumentCharge: docCharge,
      InsuranceCharge: insCharge,
      TotalCharges: Number(loanData.TotalCharges) || totalCharges,
      NetDisbursementAmount: netDisb,
      DueDate: loanData.DueDate || '',
      LoanStatus: 'Active',
      Remarks: loanData.Remarks || '',
      CreatedDate: new Date().toISOString(),
      ornamentIds: loanData.ornamentIds || [],
    };

    if (loanData.ornamentIds && loanData.ornamentIds.length > 0) {
      ornamentsState = ornamentsState.map(o => 
        loanData.ornamentIds.includes(o.OrnamentId) ? { ...o, Status: 'Pledged' } : o
      );
    }

    loansState = [newLoan, ...loansState];
    bankAccountsState = bankAccountsState.map(b => {
      const utilized = calculateUserBankUtilization(b.UserId, b.BankAccountId);
      return { ...b, UtilizedLoanAmount: utilized, AvailableLoanAmount: Math.max(0, b.MaxLoanAmount - utilized) };
    });
    cache.set('loans_all', loansState, CacheTTL.LISTS);
    cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
    cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.addLoan(loanData).then(res => {
        if (res.success && res.data) {
          loansState = loansState.map(l => l.LoanId === tempId ? { ...l, ...res.data } : l);
          cache.set('loans_all', loansState, CacheTTL.LISTS);
          notify();
        }
      }).catch(err => console.warn('[Store] addLoan error:', err));
    }

    return newLoan;
  };

  const updateLoan = (loanId: string, updated: Partial<Loan>) => {
    loansState = loansState.map(l => l.LoanId === loanId ? { ...l, ...updated, UpdatedDate: new Date().toISOString() } : l);
    cache.set('loans_all', loansState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.updateLoan(loanId, updated).catch(err => console.warn('[Store] updateLoan error:', err));
    }
  };

  const closeAndReleaseLoan = (loanId: string, remarks: string) => {
    const targetLoan = loansState.find(l => l.LoanId === loanId);
    if (!targetLoan) return;

    loansState = loansState.map(l => l.LoanId === loanId ? {
      ...l,
      LoanStatus: 'Closed',
      ClosedDate: new Date().toISOString(),
      ClosureRemarks: remarks,
    } : l);

    if (targetLoan.ornamentIds && targetLoan.ornamentIds.length > 0) {
      ornamentsState = ornamentsState.map(o => 
        targetLoan.ornamentIds?.includes(o.OrnamentId) ? {
          ...o,
          Status: 'Released',
          ReleaseDate: new Date().toISOString(),
          ReleasedLoanId: loanId,
        } : o
      );
    }

    bankAccountsState = bankAccountsState.map(b => {
      const utilized = calculateUserBankUtilization(b.UserId, b.BankAccountId);
      return { ...b, UtilizedLoanAmount: utilized, AvailableLoanAmount: Math.max(0, b.MaxLoanAmount - utilized) };
    });

    cache.set('loans_all', loansState, CacheTTL.LISTS);
    cache.set('ornaments_all', ornamentsState, CacheTTL.LISTS);
    cache.set('bank_accounts_all', bankAccountsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.closeAndReleaseLoan(loanId, remarks).catch(err => console.warn('[Store] closeAndReleaseLoan error:', err));
    }
  };

  // --- CRUD: Payments ---

  const addPayment = (payData: Partial<Payment>) => {
    const tempId = `PAY${String(paymentsState.length + 1).padStart(3, '0')}`;
    const newPay: Payment = {
      PaymentId: tempId,
      LoanId: payData.LoanId || '',
      PaymentDate: payData.PaymentDate || new Date().toISOString().split('T')[0],
      PaymentType: payData.PaymentType || 'Interest',
      PrincipalAmount: Number(payData.PrincipalAmount) || 0,
      InterestAmount: Number(payData.InterestAmount) || 0,
      PenaltyAmount: Number(payData.PenaltyAmount) || 0,
      TotalPaidAmount: Number(payData.TotalPaidAmount) || 0,
      PaymentMethod: payData.PaymentMethod || 'UPI',
      TransactionReference: payData.TransactionReference || '',
      Remarks: payData.Remarks || '',
      CreatedDate: new Date().toISOString(),
    };
    paymentsState = [newPay, ...paymentsState];
    cache.set('payments_all', paymentsState, CacheTTL.LISTS);
    notify();

    if (!ApiConfig.isMockMode()) {
      api.addPayment(payData).then(res => {
        if (res.success && res.data) {
          paymentsState = paymentsState.map(p => p.PaymentId === tempId ? { ...p, ...res.data } : p);
          cache.set('payments_all', paymentsState, CacheTTL.LISTS);
          notify();
        }
      }).catch(err => console.warn('[Store] addPayment error:', err));
    }

    return newPay;
  };

  return {
    users: usersState,
    bankAccounts: bankAccountsState,
    ornaments: ornamentsState,
    loans: loansState,
    payments: paymentsState,
    goldRates: goldRatesState,
    dashboardData: getDashboardData(),
    isSyncing,
    lastSyncedAt,
    syncError,
    syncFromBackend,
    addUser,
    updateUser,
    deleteUser,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addOrnament,
    updateOrnament,
    deleteOrnament,
    addLoan,
    updateLoan,
    closeAndReleaseLoan,
    addPayment,
    calculateUserBankUtilization,
    clearCache: async () => {
      await cache.clearAll();
      await syncFromBackend(true);
    },
  };
}
