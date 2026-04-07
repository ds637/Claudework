// ============================================================
// SMSF Property Investment Calculation Engine
// ============================================================

// --- STAMP DUTY CALCULATORS (All 8 Australian States/Territories) ---

function calcBracket(price, brackets) {
  for (let i = 0; i < brackets.length; i++) {
    const { min, max, base, rate } = brackets[i];
    if (price <= max || max === Infinity) {
      return base + (price - min) * rate;
    }
  }
  return 0;
}

export function calcStampDutyNSW(price) {
  const brackets = [
    { min: 0, max: 16000, base: 0, rate: 0.0125 },
    { min: 16000, max: 35000, base: 200, rate: 0.015 },
    { min: 35000, max: 93000, base: 485, rate: 0.0175 },
    { min: 93000, max: 351000, base: 1500, rate: 0.035 },
    { min: 351000, max: 1168000, base: 10530, rate: 0.045 },
    { min: 1168000, max: Infinity, base: 47330, rate: 0.055 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyVIC(price) {
  const brackets = [
    { min: 0, max: 25000, base: 0, rate: 0.014 },
    { min: 25000, max: 130000, base: 350, rate: 0.024 },
    { min: 130000, max: 960000, base: 2870, rate: 0.06 },
    { min: 960000, max: Infinity, base: 52670, rate: 0.055 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyQLD(price) {
  const brackets = [
    { min: 0, max: 75000, base: 0, rate: 0.015 },
    { min: 75000, max: 540000, base: 1050, rate: 0.035 },
    { min: 540000, max: 1000000, base: 17325, rate: 0.045 },
    { min: 1000000, max: Infinity, base: 38025, rate: 0.0575 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutySA(price) {
  const brackets = [
    { min: 0, max: 12000, base: 0, rate: 0.01 },
    { min: 12000, max: 30000, base: 120, rate: 0.02 },
    { min: 30000, max: 50000, base: 480, rate: 0.03 },
    { min: 50000, max: 100000, base: 1080, rate: 0.035 },
    { min: 100000, max: 200000, base: 2830, rate: 0.04 },
    { min: 200000, max: 250000, base: 6830, rate: 0.0425 },
    { min: 250000, max: 300000, base: 8955, rate: 0.0475 },
    { min: 300000, max: 500000, base: 11330, rate: 0.05 },
    { min: 500000, max: Infinity, base: 21330, rate: 0.055 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyWA(price) {
  const brackets = [
    { min: 0, max: 120000, base: 0, rate: 0.019 },
    { min: 120000, max: 150000, base: 2280, rate: 0.0285 },
    { min: 150000, max: 360000, base: 3135, rate: 0.038 },
    { min: 360000, max: 725000, base: 11115, rate: 0.0475 },
    { min: 725000, max: Infinity, base: 28453, rate: 0.0515 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyTAS(price) {
  if (price <= 3000) return 50;
  const brackets = [
    { min: 3000, max: 25000, base: 50, rate: 0.0175 },
    { min: 25000, max: 75000, base: 435, rate: 0.025 },
    { min: 75000, max: 200000, base: 1685, rate: 0.035 },
    { min: 200000, max: 375000, base: 6060, rate: 0.04 },
    { min: 375000, max: 725000, base: 13060, rate: 0.0425 },
    { min: 725000, max: Infinity, base: 27935, rate: 0.045 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyACT(price) {
  const brackets = [
    { min: 0, max: 260000, base: 0, rate: 0.012 },
    { min: 260000, max: 300000, base: 3120, rate: 0.0232 },
    { min: 300000, max: 500000, base: 4048, rate: 0.04 },
    { min: 500000, max: 750000, base: 12048, rate: 0.055 },
    { min: 750000, max: 1000000, base: 25798, rate: 0.0575 },
    { min: 1000000, max: 1455000, base: 40173, rate: 0.064 },
    { min: 1455000, max: Infinity, base: 69293, rate: 0.073 },
  ];
  return calcBracket(price, brackets);
}

export function calcStampDutyNT(price) {
  if (price <= 525000) return 0;
  return price * 0.0495;
}

export function calcStampDuty(price, state) {
  const calculators = {
    NSW: calcStampDutyNSW,
    VIC: calcStampDutyVIC,
    QLD: calcStampDutyQLD,
    SA: calcStampDutySA,
    WA: calcStampDutyWA,
    TAS: calcStampDutyTAS,
    ACT: calcStampDutyACT,
    NT: calcStampDutyNT,
  };
  const calc = calculators[state];
  return calc ? Math.round(calc(price)) : 0;
}

// --- LOAN CALCULATIONS ---

export function calcMonthlyPaymentPI(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calcMonthlyPaymentIO(principal, annualRate) {
  if (principal <= 0 || annualRate <= 0) return 0;
  return principal * (annualRate / 100 / 12);
}

export function generateAmortisationSchedule(principal, annualRate, years, ioPeriodYears = 0) {
  const schedule = [];
  let balance = principal;
  const r = annualRate / 100;

  for (let year = 1; year <= years; year++) {
    const isIO = year <= ioPeriodYears;
    const interest = balance * r;

    let payment, principalPaid;
    if (isIO) {
      payment = interest;
      principalPaid = 0;
    } else {
      const remainingYears = years - year + 1;
      const monthlyPmt = calcMonthlyPaymentPI(balance, annualRate, remainingYears);
      payment = monthlyPmt * 12;
      principalPaid = payment - interest;
    }

    const closingBalance = Math.max(0, balance - principalPaid);

    schedule.push({
      year,
      openingBalance: balance,
      payment: Math.round(payment),
      interest: Math.round(interest),
      principal: Math.round(principalPaid),
      closingBalance: Math.round(closingBalance),
      isIO,
    });

    balance = closingBalance;
    if (balance <= 0) break;
  }

  return schedule;
}

// --- CONTRIBUTION CAPS ---

export const CONCESSIONAL_CAP = 30000;
export const NON_CONCESSIONAL_CAP = 120000;
export const TOTAL_SUPER_BALANCE_THRESHOLD = 1900000;
export const SG_RATE = 0.115; // 11.5%

// --- PENSION DRAWDOWN MINIMUMS ---

export function getMinPensionDrawdown(age) {
  if (age < 65) return 0.04;
  if (age <= 74) return 0.05;
  if (age <= 79) return 0.06;
  if (age <= 84) return 0.07;
  if (age <= 89) return 0.09;
  if (age <= 94) return 0.11;
  return 0.14;
}

// --- PRESERVATION AGE ---

export function getPreservationAge(dob) {
  if (!dob) return 60;
  const year = new Date(dob).getFullYear();
  if (year <= 1960) return 55;
  if (year <= 1961) return 56;
  if (year <= 1962) return 57;
  if (year <= 1963) return 58;
  if (year <= 1964) return 59;
  return 60;
}

// --- PROPERTY GROWTH ---

export function futureValue(presentValue, rate, years) {
  return presentValue * Math.pow(1 + rate / 100, years);
}

// --- EQUITY RELEASE ---

export function availableEquity(currentValue, targetLVR, currentLoan) {
  return Math.max(0, currentValue * (targetLVR / 100) - currentLoan);
}

// --- FORMATTING ---

export function formatCurrency(value, showDecimals = false) {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-AU', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  if (value < 0) return `($${formatted})`;
  return `$${formatted}`;
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('en-AU');
}

// --- YIELD CALCULATIONS ---

export function grossYield(annualRent, purchasePrice) {
  if (!purchasePrice) return 0;
  return (annualRent / purchasePrice) * 100;
}

export function netYield(netRent, purchasePrice) {
  if (!purchasePrice) return 0;
  return (netRent / purchasePrice) * 100;
}

export function rentalCoverageRatio(netRent, annualRepayment) {
  if (!annualRepayment) return 0;
  return netRent / annualRepayment;
}

// --- READINESS SCORE ---

export function calcReadinessScore(compliance, cashFlow, liquidity, stressTest, yieldScore) {
  return Math.round(
    (compliance || 0) * 0.30 +
    (cashFlow || 0) * 0.25 +
    (liquidity || 0) * 0.20 +
    (stressTest || 0) * 0.15 +
    (yieldScore || 0) * 0.10
  );
}
