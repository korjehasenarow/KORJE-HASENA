// API Client for Karje Hasana Foundation

const API = {
  baseUrl: (typeof window !== 'undefined' && window.location.protocol === 'file:') ? 'http://localhost:3000' : '',

  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    const headers = options.headers || {};
    headers['Bypass-Tunnel-Reminder'] = 'true';

    try {
      const savedUser = localStorage.getItem('kh_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role && !headers['x-user-role']) headers['x-user-role'] = u.role;
        if (u.id && !headers['x-user-id']) headers['x-user-id'] = u.id;
      }
    } catch (e) {}

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'অনুরোধটি সম্পন্ন করা সম্ভব হয়নি।');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  login: (credentials) => API.request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  // Settings
  getSettings: () => API.request('/api/settings'),
  updateSettings: (settings) => API.request('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Public
  getPublicSummary: () => API.request('/api/public/summary'),
  submitPublicPayment: (formData) => API.request('/api/public/submit-payment', { method: 'POST', body: formData }),
  submitPublicApplication: (formData) => API.request('/api/public/submit-application', { method: 'POST', body: formData }),

  // Dashboard Stats
  getDashboardStats: () => API.request('/api/dashboard/stats'),

  // Donors
  getDonors: (params = '') => API.request('/api/donors' + (params ? '?' + params : '')),
  getFeaturedDonors: () => API.request('/api/public/featured-donors'),
  getDonor: (id) => API.request(`/api/donors/${id}`),
  createDonor: (data) => API.request('/api/donors', { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  updateDonor: (id, data) => API.request(`/api/donors/${id}`, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) }),
  deleteDonor: (id) => API.request(`/api/donors/${id}`, { method: 'DELETE' }),

  // Committee (Managing & Advisory Board)
  getCommittee: () => API.request('/api/committee'),
  addCommitteeMember: (formData) => API.request('/api/committee', { method: 'POST', body: formData }),
  updateCommitteeMember: (id, formData) => API.request(`/api/committee/${id}`, { method: 'PUT', body: formData }),
  deleteCommitteeMember: (id, params = '') => API.request(`/api/committee/${id}` + (params ? '?' + params : ''), { method: 'DELETE' }),

  // Donations
  getDonations: (params = '') => API.request('/api/donations' + (params ? '?' + params : '')),
  recordDonation: (data) => API.request('/api/donations', { method: 'POST', body: JSON.stringify(data) }),
  verifyDonation: (id, data) => API.request(`/api/donations/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),

  // bKash Submissions
  getBkashSubmissions: () => API.request('/api/bkash-submissions'),
  verifyBkashSubmission: (id, data) => API.request(`/api/bkash-submissions/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  rejectBkashSubmission: (id, data) => API.request(`/api/bkash-submissions/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),

  // Applications
  getApplications: (params = '') => API.request('/api/applications' + (params ? '?' + params : '')),
  getApplication: (id) => API.request(`/api/applications/${id}`),
  verifyApplication: (id, data) => API.request(`/api/applications/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  approveApplication: (id, data) => API.request(`/api/applications/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectApplication: (id, data) => API.request(`/api/applications/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),

  // Loans & Disbursements
  getLoans: (params = '') => API.request('/api/loans' + (params ? '?' + params : '')),
  getLoan: (id) => API.request(`/api/loans/${id}`),
  disburseLoan: (data) => API.request('/api/loans/disburse', { method: 'POST', body: JSON.stringify(data) }),
  extendLoan: (id, data) => API.request(`/api/loans/${id}/extend`, { method: 'POST', body: JSON.stringify(data) }),

  // Repayments
  recordRepayment: (data) => API.request('/api/repayments', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: () => API.request('/api/expenses'),
  createExpense: (data) => API.request('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Welfare & Humanitarian Relief Grants (এককালীন সহায়তা ও ত্রাণ)
  getWelfareGrants: (params = '') => API.request('/api/welfare-grants' + (params ? '?' + params : '')),
  getWelfareGrant: (id) => API.request(`/api/welfare-grants/${id}`),
  createWelfareGrant: (data) => API.request('/api/welfare-grants', { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  updateWelfareGrant: (id, data) => API.request(`/api/welfare-grants/${id}`, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) }),
  deleteWelfareGrant: (id, params = '') => API.request(`/api/welfare-grants/${id}` + (params ? '?' + params : ''), { method: 'DELETE' }),
  getPublicWelfareSummary: () => API.request('/api/public/welfare-summary'),

  // Transfers
  transferAccount: (data) => API.request('/api/transfers', { method: 'POST', body: JSON.stringify(data) }),

  // Accounts & Funds
  getAccounts: () => API.request('/api/accounts'),
  getFunds: () => API.request('/api/funds'),

  // Reports
  getCashbookReport: (params = '') => API.request('/api/reports/cashbook' + (params ? '?' + params : '')),
  getIncomeExpenditureReport: (params = '') => API.request('/api/reports/income-expenditure' + (params ? '?' + params : '')),
  getBalanceSheet: () => API.request('/api/reports/balance-sheet'),

  // Notifications
  getNotifications: () => API.request('/api/notifications'),
  markNotificationRead: (id) => API.request(`/api/notifications/${id}/read`, { method: 'POST' }),
  runReminderCheck: () => API.request('/api/notifications/run-check', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => API.request('/api/audit-logs'),

  // Restore Database
  restoreBackup: (formData) => API.request('/api/system/restore', { method: 'POST', body: formData })
};

// Global Bengali number formatter helper
function bnNum(num) {
  if (num === null || num === undefined) return '০';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = Number(num).toLocaleString('en-US');
  return String(formatted).replace(/[0-9]/g, w => bn[+w]);
}

// Global BDT Currency Formatter
function formatBDT(amount) {
  return '৳ ' + bnNum(amount);
}

// Global Helper: Get Asia/Dhaka Today in YYYY-MM-DD
function getDhakaDateStr(dateObj = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
    return parts; // 'YYYY-MM-DD'
  } catch (e) {
    // Fallback if Intl timeZone fails
    const d = new Date(dateObj.getTime() + (6 * 60 * 60 * 1000));
    return d.toISOString().split('T')[0];
  }
}

// Global Helper: Add days to YYYY-MM-DD
function addDaysToDateStr(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + parseInt(days || 0, 10));
  return d.toISOString().split('T')[0];
}

// Global Helper: Calculate difference in days between two YYYY-MM-DD strings
function getDaysDiff(futureDateStr, todayDateStr) {
  if (!futureDateStr || !todayDateStr) return 0;
  const d1 = new Date(futureDateStr + 'T00:00:00Z');
  const d2 = new Date(todayDateStr + 'T00:00:00Z');
  const diffTime = d1 - d2;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
