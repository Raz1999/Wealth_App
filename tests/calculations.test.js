// tests/calculations.test.js
const { projectStandard, projectPension, projectDeposit, projectAsset, totalMonthlyContribution, computeRequiredMonthly } = require('../js/calculations.js');

// ─── Standard FV (gemel, kesafi, custom) ───
test('projectStandard: lump sum with no contributions', () => {
  // ₪100,000 at 12% annual for 12 months (1 year)
  const result = projectStandard({ pv: 100000, annualRate: 0.12, annualFee: 0, pmt: 0, months: 12 });
  expect(result).toBeCloseTo(112682, -1); // FV = 100000 * (1.01)^12
});

test('projectStandard: monthly contributions compound correctly', () => {
  // ₪0 start, ₪1000/month, 12% annual, 12 months
  const result = projectStandard({ pv: 0, annualRate: 0.12, annualFee: 0, pmt: 1000, months: 12 });
  expect(result).toBeCloseTo(12682, -1);
});

test('projectStandard: management fee reduces effective return', () => {
  const withFee    = projectStandard({ pv: 100000, annualRate: 0.10, annualFee: 0.01, pmt: 0, months: 120 });
  const withoutFee = projectStandard({ pv: 100000, annualRate: 0.10, annualFee: 0, pmt: 0, months: 120 });
  expect(withFee).toBeLessThan(withoutFee);
});

// ─── Pension ───
test('projectPension: contributions from salary', () => {
  // salary ₪10,000, 7% employee, 7.5% employer = ₪1,450/month gross
  // 0.5% deposit fee → net PMT = 1450 * 0.995 = 1442.75
  const result = projectPension({
    pv: 0, annualRate: 0.08, accumulationFee: 0.005, depositFee: 0.005,
    salary: 10000, employeeContrib: 0.07, employerContrib: 0.075, months: 12
  });
  expect(result).toBeGreaterThan(12 * 1442.75); // compounding adds to simple sum
  // effectiveAnnual = 0.08 - 0.005 = 0.075, rm = 0.075/12 = 0.00625
  // FV = 1442.75 * ((1.00625)^12 - 1) / 0.00625 ≈ 17925
  expect(result).toBeCloseTo(17925, -2);
});

// ─── Deposit ───
test('projectDeposit simple interest: FV = PV * (1 + r * n/12)', () => {
  const result = projectDeposit({ principal: 100000, annualRate: 0.04, interestType: 'simple', months: 24 });
  expect(result).toBeCloseTo(100000 * (1 + 0.04 * (24 / 12)), 0);
});

test('projectDeposit compound interest: same as standard no-PMT', () => {
  const compound = projectDeposit({ principal: 100000, annualRate: 0.04, interestType: 'compound', months: 24 });
  const standard = projectStandard({ pv: 100000, annualRate: 0.04, annualFee: 0, pmt: 0, months: 24 });
  expect(compound).toBeCloseTo(standard, 0);
});

// ─── totalMonthlyContribution ───
// NOTE: contribution fields are stored as RAW PERCENTAGES (e.g. 7 means 7%, not 0.07)
// totalMonthlyContribution divides by 100 internally.
test('totalMonthlyContribution: sums PMT across asset types', () => {
  const assets = [
    { type: 'gemel',       fields: { monthlyContribution: 1000 } },
    { type: 'custom',      fields: { monthlyContribution: 500 } },
    { type: 'checking',    fields: { balance: 10000 } },   // excluded
    { type: 'deposit',     fields: { principal: 50000 } }, // excluded
    { type: 'pension',     fields: { salary: 10000, employeeContrib: 7, employerContrib: 7.5 } },
  ];
  const total = totalMonthlyContribution(assets);
  expect(total).toBeCloseTo(1000 + 500 + 10000 * (7 + 7.5) / 100, 2);
});

describe('computeRequiredMonthly', () => {
  test('returns 0 when already on track', () => {
    const assets = [{ type: 'custom', fields: { currentValue: 10000000, expectedReturn: 7, monthlyContribution: 0 } }];
    const result = computeRequiredMonthly(assets, { targetMode: 'years', targetValue: 20, currentAge: 0, inflationRate: 0, targetAmount: 5000000 });
    expect(result).toBe(0);
  });

  test('returns positive PMT when gap exists at 0% rate', () => {
    const assets = [{ type: 'custom', fields: { currentValue: 0, expectedReturn: 0, monthlyContribution: 0 } }];
    const result = computeRequiredMonthly(assets, { targetMode: 'years', targetValue: 100/12, currentAge: 0, inflationRate: 0, targetAmount: 1200000 });
    expect(result).toBeCloseTo(12000, -2);
  });

  test('returns 0 when targetAmount is 0', () => {
    const result = computeRequiredMonthly([], { targetMode: 'years', targetValue: 20, currentAge: 0, inflationRate: 0, targetAmount: 0 });
    expect(result).toBe(0);
  });

  test('returns 0 when months is 0', () => {
    const result = computeRequiredMonthly([], { targetMode: 'years', targetValue: 0, currentAge: 0, inflationRate: 0, targetAmount: 1000000 });
    expect(result).toBe(0);
  });
});
