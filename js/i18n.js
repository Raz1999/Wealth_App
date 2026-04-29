const strings = {
  he: {
    'nav.logo':           'MyWealth',
    'nav.addAsset':       '+ הוסף נכס',
    'nav.lang':           'EN',
    'dashboard.title':    'הנכסים שלי',
    'dashboard.total':    'סה"כ שווי נכסים',
    'dashboard.forecast': 'תחזית ב-{years} שנה',
    'dashboard.avgReturn':'תשואה שנתית ממוצעת',
    'dashboard.monthlyPmt':'הפקדה חודשית כוללת',
    'dashboard.openSim':  'פתח סימולטור',
    'dashboard.simSub':   'שנה הפקדות, תשואה, וראה את ההשפעה',
    'chart.5y':  '5Y', 'chart.20y': '20Y', 'chart.30y': '30Y',
    'chart.today': 'היום',
    'asset.edit':   'עריכה',
    'asset.delete': 'מחיקה',
    'asset.save':   'שמור',
    'asset.cancel': 'ביטול',
    'asset.addHolding': '+ הוסף נייר',
    'asset.simulate':   'סמלץ נכס זה',
    'type.portfolio':     'תיק השקעות',
    'type.pension':       'קרן פנסיה',
    'type.gemel':         'קופת גמל להשקעה',
    'type.kesafi':        'קרן כספית',
    'type.checking':      'עובר ושב',
    'type.deposit':       'פיקדון / חיסכון',
    'type.hashtalamut':   'קרן השתלמות',
    'type.custom':        'נכס חופשי',
    'field.currentValue':     'שווי נוכחי (₪)',
    'field.expectedReturn':   'תשואה שנתית צפויה (%)',
    'field.managementFee':    'דמי ניהול (%)',
    'field.monthlyContrib':   'הפקדה חודשית (₪)',
    'field.company':          'שם חברה',
    'field.track':            'מסלול',
    'field.broker':           'ברוקר',
    'field.salary':           'שכר ברוטו חודשי (₪)',
    'field.employeeContrib':  'הפרשת עובד (%)',
    'field.employerContrib':  'הפרשת מעביד (%)',
    'field.accFee':           'דמי ניהול מצבירה (%)',
    'field.depFee':           'דמי ניהול מהפקדה (%)',
    'field.bank':             'בנק',
    'field.balance':          'יתרה נוכחית (₪)',
    'field.interestRate':     'ריבית שנתית (%)',
    'field.interestType':     'סוג ריבית',
    'field.interestSimple':   'פשוטה',
    'field.interestCompound': 'דריבית',
    'field.maturityDate':     'מועד פירעון',
    'field.autoRenew':        'חידוש אוטומטי',
    'field.principal':        'קרן (₪)',
    'field.liquidityDate':    'תאריך נזילות',
    'field.description':      'תיאור',
    'field.name':             'שם',
    'field.icon':             "סמל (אימוג'י)",
    'new.pickType':           'בחר סוג נכס',
    'new.pickTypeSubtitle':   'איזה מוצר פיננסי תרצה להוסיף?',
  },
  en: {
    'nav.logo':           'MyWealth',
    'nav.addAsset':       '+ Add Asset',
    'nav.lang':           'עב',
    'dashboard.title':    'My Assets',
    'dashboard.total':    'Total Net Worth',
    'dashboard.forecast': '{years}Y Forecast',
    'dashboard.avgReturn':'Avg Annual Return',
    'dashboard.monthlyPmt':'Total Monthly Contribution',
    'dashboard.openSim':  'Open Simulator',
    'dashboard.simSub':   'Change contributions, return, and see the impact',
    'chart.5y':  '5Y', 'chart.20y': '20Y', 'chart.30y': '30Y',
    'chart.today': 'Today',
    'asset.edit':   'Edit',
    'asset.delete': 'Delete',
    'asset.save':   'Save',
    'asset.cancel': 'Cancel',
    'asset.addHolding': '+ Add Holding',
    'asset.simulate':   'Simulate this asset',
    'type.portfolio':     'Investment Portfolio',
    'type.pension':       'Pension Fund',
    'type.gemel':         'Investment Provident Fund',
    'type.kesafi':        'Money Market Fund',
    'type.checking':      'Checking Account',
    'type.deposit':       'Bank Deposit',
    'type.hashtalamut':   'Study Fund',
    'type.custom':        'Custom Asset',
    'field.currentValue':     'Current Value (₪)',
    'field.expectedReturn':   'Expected Annual Return (%)',
    'field.managementFee':    'Management Fee (%)',
    'field.monthlyContrib':   'Monthly Contribution (₪)',
    'field.company':          'Company Name',
    'field.track':            'Track',
    'field.broker':           'Broker',
    'field.salary':           'Gross Monthly Salary (₪)',
    'field.employeeContrib':  'Employee Contribution (%)',
    'field.employerContrib':  'Employer Contribution (%)',
    'field.accFee':           'Fee from Accumulation (%)',
    'field.depFee':           'Fee from Deposits (%)',
    'field.bank':             'Bank',
    'field.balance':          'Current Balance (₪)',
    'field.interestRate':     'Annual Interest Rate (%)',
    'field.interestType':     'Interest Type',
    'field.interestSimple':   'Simple',
    'field.interestCompound': 'Compound',
    'field.maturityDate':     'Maturity Date',
    'field.autoRenew':        'Auto-Renew',
    'field.principal':        'Principal (₪)',
    'field.liquidityDate':    'Liquidity Date',
    'field.description':      'Description',
    'field.name':             'Name',
    'field.icon':             'Icon (emoji)',
    'new.pickType':           'Choose Asset Type',
    'new.pickTypeSubtitle':   'What type of financial product would you like to add?',
  }
};

let currentLang = 'he';

function getLanguage() { return currentLang; }

function setLanguage(lang) {
  if (!strings[lang]) return;
  currentLang = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
  }
}

function t(key, vars = {}) {
  let str = strings[currentLang]?.[key] ?? key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)); });
  return str;
}

// CommonJS export for Jest; browser uses ES module default
if (typeof module !== 'undefined') module.exports = { t, setLanguage, getLanguage };
export { t, setLanguage, getLanguage };
