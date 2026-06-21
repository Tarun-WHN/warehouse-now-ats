import type {
  SalaryStructure, SalaryComponent, SalaryCategory, PayoutFrequency,
} from './types';

// Pure, dependency-free salary math — safe to import on both client and server.

export interface ComputedComponent {
  name: string;
  category: SalaryCategory;
  monthly: number;
  annual: number;
}

export interface SalaryComputation {
  basic: number;
  earnings: ComputedComponent[];
  employer: ComputedComponent[];
  deductions: ComputedComponent[];
  grossMonthly: number; grossAnnual: number;
  employerMonthly: number; employerAnnual: number;
  deductionsMonthly: number; deductionsAnnual: number;
  ctcMonthly: number; ctcAnnual: number;   // ctcAnnual includes annualised variable pay
  netMonthly: number; netAnnual: number;
  variableEnabled: boolean;
  variablePerPayout: number;
  variableAnnual: number;
  variableFrequency: PayoutFrequency;
}

const PAYOUTS: Record<PayoutFrequency, number> = {
  Monthly: 12, Quarterly: 4, 'Half-Yearly': 2, Annually: 1,
};

export function formatINR(n: number): string {
  return Math.round(n || 0).toLocaleString('en-IN');
}

export function computeSalary(structure?: SalaryStructure | null): SalaryComputation {
  const comps: SalaryComponent[] = structure?.components || [];

  // Basic = the fixed earning named "Basic" (anchor for percent-of-basic components).
  const basicComp = comps.find(c => c.category === 'earning' && c.mode === 'fixed' && /basic/i.test(c.name));
  const basic = basicComp ? Number(basicComp.value) || 0 : 0;

  const evalMonthly = (c: SalaryComponent): number =>
    c.mode === 'fixed' ? (Number(c.value) || 0) : ((Number(c.value) || 0) / 100) * basic;

  const mk = (c: SalaryComponent): ComputedComponent => {
    const monthly = Math.round(evalMonthly(c));
    return { name: c.name || '', category: c.category, monthly, annual: monthly * 12 };
  };

  const earnings = comps.filter(c => c.category === 'earning').map(mk);
  const employer = comps.filter(c => c.category === 'employer').map(mk);
  const deductions = comps.filter(c => c.category === 'deduction').map(mk);

  const sum = (arr: ComputedComponent[], k: 'monthly' | 'annual') => arr.reduce((t, x) => t + x[k], 0);

  const grossMonthly = sum(earnings, 'monthly');
  const employerMonthly = sum(employer, 'monthly');
  const deductionsMonthly = sum(deductions, 'monthly');
  const ctcMonthly = grossMonthly + employerMonthly;
  const netMonthly = grossMonthly - deductionsMonthly;

  const v = structure?.variable;
  const variableEnabled = !!v?.enabled;
  const variablePerPayout = variableEnabled ? (Number(v?.amount) || 0) : 0;
  const variableFrequency: PayoutFrequency = v?.frequency || 'Annually';
  const variableAnnual = variableEnabled ? variablePerPayout * PAYOUTS[variableFrequency] : 0;

  return {
    basic, earnings, employer, deductions,
    grossMonthly, grossAnnual: grossMonthly * 12,
    employerMonthly, employerAnnual: employerMonthly * 12,
    deductionsMonthly, deductionsAnnual: deductionsMonthly * 12,
    ctcMonthly, ctcAnnual: ctcMonthly * 12 + variableAnnual,
    netMonthly, netAnnual: netMonthly * 12,
    variableEnabled, variablePerPayout, variableAnnual, variableFrequency,
  };
}

export function defaultStructure(): SalaryStructure {
  return {
    components: [
      { name: 'Basic', category: 'earning', mode: 'fixed', value: 0 },
      { name: 'HRA', category: 'earning', mode: 'percent_basic', value: 40 },
      { name: 'Special Allowance', category: 'earning', mode: 'fixed', value: 0 },
      { name: 'Employer PF', category: 'employer', mode: 'percent_basic', value: 12 },
      { name: 'Employee PF', category: 'deduction', mode: 'percent_basic', value: 12 },
      { name: 'Professional Tax', category: 'deduction', mode: 'fixed', value: 200 },
    ],
    variable: { enabled: false, amount: 0, frequency: 'Annually' },
  };
}
