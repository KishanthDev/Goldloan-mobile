import { useState, useEffect } from 'react';
import { User, BankAccount, Ornament, Loan, Payment, GoldRateData, DashboardData } from '../types';
import { 
  mockUsers, mockBankAccounts, mockOrnaments, 
  mockLoans, mockPayments, mockGoldRates, mockDashboardData 
} from './mockData';

// Global in-memory state so changes persist across screen transitions
let usersState: User[] = [...mockUsers];
let bankAccountsState: BankAccount[] = [...mockBankAccounts];
let ornamentsState: Ornament[] = [...mockOrnaments];
let loansState: Loan[] = [...mockLoans];
let paymentsState: Payment[] = [...mockPayments];
let goldRatesState: GoldRateData = { ...mockGoldRates };

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
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

  const addUser = (userData: Partial<User>) => {
    const id = nextId('U', usersState, 'UserId');
    const newUser: User = {
      UserId: id,
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
    notify();
    return newUser;
  };

  const updateUser = (userId: string, updated: Partial<User>) => {
    usersState = usersState.map(u => u.UserId === userId ? { ...u, ...updated, UpdatedDate: new Date().toISOString() } : u);
    notify();
  };

  const deleteUser = (userId: string) => {
    usersState = usersState.filter(u => u.UserId !== userId);
    notify();
  };

  // --- CRUD: Bank Accounts ---

  const addBankAccount = (accData: Partial<BankAccount>) => {
    const id = nextId('BA', bankAccountsState, 'BankAccountId');
    const max = Number(accData.MaxLoanAmount) || 0;
    const util = Number(accData.UtilizedLoanAmount) || 0;
    const newAcc: BankAccount = {
      BankAccountId: id,
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
    notify();
    return newAcc;
  };

  const updateBankAccount = (accId: string, updated: Partial<BankAccount>) => {
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
    notify();
  };

  const deleteBankAccount = (accId: string) => {
    bankAccountsState = bankAccountsState.filter(b => b.BankAccountId !== accId);
    notify();
  };

  // --- CRUD: Ornaments ---

  const addOrnament = (ornData: Partial<Ornament>) => {
    const id = nextId('ORN', ornamentsState, 'OrnamentId');
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
      OrnamentId: id,
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
    notify();
    return newOrn;
  };

  const updateOrnament = (ornId: string, updated: Partial<Ornament>) => {
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
    notify();
  };

  const deleteOrnament = (ornId: string) => {
    ornamentsState = ornamentsState.filter(o => o.OrnamentId !== ornId);
    notify();
  };

  // --- CRUD: Loans ---

  const addLoan = (loanData: any) => {
    const id = nextId('L', loansState, 'LoanId');
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
      LoanId: id,
      LoanNumber: loanData.LoanNumber || `LN-${new Date().getFullYear()}-${id}`,
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
      // Kept aligned with the source UI: period interest + processing fee.
      TotalCharges: Number(loanData.TotalCharges) || totalCharges,
      NetDisbursementAmount: netDisb,
      DueDate: loanData.DueDate || '',
      LoanStatus: 'Active',
      Remarks: loanData.Remarks || '',
      CreatedDate: new Date().toISOString(),
      ornamentIds: loanData.ornamentIds || [],
    };

    // Mark selected ornaments as Pledged
    if (loanData.ornamentIds && loanData.ornamentIds.length > 0) {
      ornamentsState = ornamentsState.map(o => 
        loanData.ornamentIds.includes(o.OrnamentId) ? { ...o, Status: 'Pledged' } : o
      );
    }

    loansState = [newLoan, ...loansState];
    // Always derive utilisation from active loans rather than trusting an old value.
    bankAccountsState = bankAccountsState.map(b => {
      const utilized = calculateUserBankUtilization(b.UserId, b.BankAccountId);
      return { ...b, UtilizedLoanAmount: utilized, AvailableLoanAmount: Math.max(0, b.MaxLoanAmount - utilized) };
    });
    notify();
    return newLoan;
  };

  const updateLoan = (loanId: string, updated: Partial<Loan>) => {
    loansState = loansState.map(l => l.LoanId === loanId ? { ...l, ...updated, UpdatedDate: new Date().toISOString() } : l);
    notify();
  };

  const closeAndReleaseLoan = (loanId: string, remarks: string) => {
    const targetLoan = loansState.find(l => l.LoanId === loanId);
    if (!targetLoan) return;

    // Mark loan as closed
    loansState = loansState.map(l => l.LoanId === loanId ? {
      ...l,
      LoanStatus: 'Closed',
      ClosedDate: new Date().toISOString(),
      ClosureRemarks: remarks,
    } : l);

    // Release all pledged ornaments back to Available
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

    // Restore bank account availability from the remaining active loans.
    bankAccountsState = bankAccountsState.map(b => {
      const utilized = calculateUserBankUtilization(b.UserId, b.BankAccountId);
      return { ...b, UtilizedLoanAmount: utilized, AvailableLoanAmount: Math.max(0, b.MaxLoanAmount - utilized) };
    });

    notify();
  };

  // --- CRUD: Payments ---

  const addPayment = (payData: Partial<Payment>) => {
    const id = `PAY${String(paymentsState.length + 1).padStart(3, '0')}`;
    const newPay: Payment = {
      PaymentId: id,
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
    notify();
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
  };
}
