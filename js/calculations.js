/**
 * Standard FV with compound interest and monthly contributions.
 * Effective annual rate = annualRate - annualFee (fee as drag).
 */
function projectStandard({ pv, annualRate, annualFee = 0, pmt = 0, months }) {
  const effectiveAnnual = annualRate - annualFee;
  const rm = effectiveAnnual / 12;
  if (rm === 0) return pv + pmt * months;
  const fv = pv * Math.pow(1 + rm, months) + pmt * ((Math.pow(1 + rm, months) - 1) / rm);
  return fv;
}

/**
 * Pension / Study Fund FV.
 * PMT derived from salary × contribution percentages, minus deposit fee.
 * Accumulation fee applied as annual drag on rate.
 */
function projectPension({ pv, annualRate, accumulationFee = 0, depositFee = 0, salary, employeeContrib, employerContrib, months }) {
  const pmtGross = salary * (employeeContrib + employerContrib);
  const pmtNet = pmtGross * (1 - depositFee);
  return projectStandard({ pv, annualRate, annualFee: accumulationFee, pmt: pmtNet, months });
}

/**
 * Bank deposit — simple or compound interest, no contributions.
 * If autoRenew is false, value flatlines at maturityMonths.
 */
function projectDeposit({ principal, annualRate, interestType = 'simple', months, maturityMonths = null, autoRenew = true }) {
  const effectiveMonths = (!autoRenew && maturityMonths !== null && months > maturityMonths)
    ? maturityMonths
    : months;
  if (interestType === 'simple') {
    return principal * (1 + annualRate * (effectiveMonths / 12));
  }
  return projectStandard({ pv: principal, annualRate, annualFee: 0, pmt: 0, months: effectiveMonths });
}

/** Returns holding annual rate as a decimal (0–1). */
function getHoldingRate(holding) {
  if (holding.projectionMode === 'market') return 0.10; // SPY ~10%
  if (holding.projectionMode === 'manual') return (holding.manualReturn || 0) / 100;
  return (holding.manualReturn || 7) / 100; // historical CAGR fallback
}

/**
 * Dispatch projection for any asset type.
 * Returns array of { month, value } for chart plotting.
 * All percentage fields in `asset.fields` are stored as RAW % (e.g. 7 = 7%).
 * This function converts to decimals before passing to projection math.
 */
function projectAsset(asset, totalMonths = 240) {
  const { type, fields } = asset;
  const points = [];
  const step = Math.max(1, Math.floor(totalMonths / 120));

  for (let m = 0; m <= totalMonths; m += step) {
    let fv;

    if (type === 'pension' || type === 'hashtalamut') {
      fv = projectPension({
        pv:              fields.currentValue || 0,
        annualRate:      (fields.expectedReturn || 0) / 100,
        accumulationFee: (fields.managementFee || 0) / 100,
        depositFee:      (fields.depFee || 0) / 100,
        salary:          fields.salary || 0,
        employeeContrib: (fields.employeeContrib || 0) / 100,
        employerContrib: (fields.employerContrib || 0) / 100,
        months: m
      });
    } else if (type === 'deposit') {
      const maturityDate = fields.maturityDate ? new Date(fields.maturityDate) : null;
      const maturityMonths = maturityDate
        ? Math.max(0, Math.round((maturityDate - new Date()) / (1000 * 60 * 60 * 24 * 30.44)))
        : null;
      fv = projectDeposit({
        principal:     fields.principal || 0,
        annualRate:    (fields.interestRate || 0) / 100,
        interestType:  fields.interestType || 'simple',
        months: m,
        maturityMonths,
        autoRenew: fields.autoRenew === 'true' || fields.autoRenew === true
      });
    } else if (type === 'portfolio') {
      const holdings = fields.holdings || [];
      const totalHoldingsValue = holdings.reduce((s, h) => s + (h.totalValue || 0), 0);
      const monthlyPmt = fields.monthlyContribution || 0;
      if (!holdings.length) {
        fv = 0;
      } else {
        fv = holdings.reduce((s, h) => {
          const hv = h.totalValue || 0;
          const weight = totalHoldingsValue > 0 ? hv / totalHoldingsValue : 0;
          return s + projectStandard({
            pv: hv,
            annualRate: getHoldingRate(h),
            annualFee: (fields.managementFee || 0) / 100,
            pmt: monthlyPmt * weight,
            months: m
          });
        }, 0);
      }
    } else {
      // gemel, kesafi, checking, custom
      fv = projectStandard({
        pv:         fields.currentValue || fields.balance || 0,
        annualRate: (fields.expectedReturn || fields.interestRate || 0) / 100,
        annualFee:  (fields.managementFee || 0) / 100,
        pmt:        fields.monthlyContribution || 0,
        months: m
      });
    }
    points.push({ month: m, value: Math.round(fv) });
  }
  return points;
}

/**
 * Sum effective monthly contributions across all assets.
 * Excludes checking accounts and deposits (no PMT).
 * Percentage fields are stored as RAW % — divide by 100 here.
 */
function totalMonthlyContribution(assets) {
  return assets.reduce((sum, a) => {
    const f = a.fields || {};
    if (a.type === 'checking' || a.type === 'deposit') return sum;
    if (a.type === 'pension' || a.type === 'hashtalamut') {
      return sum + (f.salary || 0) * (((f.employeeContrib || 0) + (f.employerContrib || 0)) / 100);
    }
    return sum + (f.monthlyContribution || 0);
  }, 0);
}

if (typeof module !== 'undefined') module.exports = { projectStandard, projectPension, projectDeposit, projectAsset, totalMonthlyContribution, getHoldingRate };
export { projectStandard, projectPension, projectDeposit, projectAsset, totalMonthlyContribution, getHoldingRate };
