// Main Application Controller for Karje Hasana Foundation

const App = {
  state: {
    org: {},
    summary: {},
    user: null, // Logged in user or null
    currentView: 'home',
    adminView: 'dashboard',
    stats: {},
    donors: [],
    donations: [],
    submissions: [],
    applications: [],
    loans: [],
    expenses: [],
    accounts: [],
    funds: [],
    notifications: [],
    transactions: [],
    auditLogs: [],
    reports: {},
    committee: []
  },

  async init() {
    try {
      // 1. Load Organization Settings
      const orgRes = await API.getSettings();
      if (orgRes.success) {
        this.state.org = orgRes.data;
        this.updateHeaderOrgInfo();
      }

      // 2. Load Public Summary & Committee
      const sumRes = await API.getPublicSummary();
      if (sumRes.success) {
        this.state.summary = sumRes.data;
      }

      const comRes = await API.getCommittee().catch(() => ({ success: false }));
      if (comRes && comRes.success) {
        this.state.committee = comRes.data || [];
      }

      // Preload donors, funds, accounts and loans
      const [donorsRes, fundsRes, accountsRes, loansRes] = await Promise.all([
        API.getDonors().catch(() => ({ success: false })),
        API.getFunds().catch(() => ({ success: false })),
        API.getAccounts().catch(() => ({ success: false })),
        API.getLoans().catch(() => ({ success: false }))
      ]);
      if (donorsRes && donorsRes.success) this.state.donors = donorsRes.data || [];
      if (fundsRes && fundsRes.success) this.state.funds = fundsRes.data || [];
      if (accountsRes && accountsRes.success) this.state.accounts = accountsRes.data || [];
      if (loansRes && loansRes.success) this.state.loans = loansRes.data || [];

      // 3. Check saved user session
      const savedUser = localStorage.getItem('kh_user');
      if (savedUser) {
        try {
          this.state.user = JSON.parse(savedUser);
        } catch (e) {
          localStorage.removeItem('kh_user');
        }
      }

      // 4. Render initial view
      this.navigate('home');

      // 5. Run scheduled notification check
      API.runReminderCheck().catch(() => {});

      // 6. Global click listener to close dropdown sub-menus & mobile menu on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
          document.querySelectorAll('.nav-dropdown.open').forEach(el => el.classList.remove('open'));
        }
        if (!e.target.closest('.main-header')) {
          const navLinks = document.querySelector('.nav-links');
          if (navLinks) navLinks.classList.remove('mobile-open');
        }
      });
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  async loadInitialData() {
    try {
      const [sumRes, comRes, donorsRes, fundsRes, accountsRes, loansRes] = await Promise.all([
        API.getPublicSummary().catch(() => ({ success: false })),
        API.getCommittee().catch(() => ({ success: false })),
        API.getDonors().catch(() => ({ success: false })),
        API.getFunds().catch(() => ({ success: false })),
        API.getAccounts().catch(() => ({ success: false })),
        API.getLoans().catch(() => ({ success: false }))
      ]);

      if (sumRes && sumRes.success) this.state.summary = sumRes.data;
      if (comRes && comRes.success) this.state.committee = comRes.data || [];
      if (donorsRes && donorsRes.success) this.state.donors = donorsRes.data || [];
      if (fundsRes && fundsRes.success) this.state.funds = fundsRes.data || [];
      if (accountsRes && accountsRes.success) this.state.accounts = accountsRes.data || [];
      if (loansRes && loansRes.success) this.state.loans = loansRes.data || [];
    } catch (err) {
      console.warn('loadInitialData warning:', err);
    }
  },


  updateHeaderOrgInfo() {
    const org = this.state.org;
    const nameEl = document.getElementById('headerOrgName');
    const locationEl = document.getElementById('headerOrgLocation');
    const phoneEl = document.getElementById('headerOrgPhone');
    const emailEl = document.getElementById('headerOrgEmail');
    const noticeBar = document.getElementById('phoneNoticeBar');

    if (nameEl) nameEl.textContent = org.name_bn || 'কর্জে হাসানা ফাউন্ডেশন';
    if (locationEl) locationEl.textContent = org.location || 'রৌমারী, কুড়িগ্রাম, বাংলাদেশ';
    if (phoneEl) {
      phoneEl.textContent = '📞 ০১৯৬৬-৪৪২৭৬৯';
      phoneEl.href = 'tel:' + (org.phone || '01966442769');
    }
    if (emailEl) {
      emailEl.textContent = org.email || 'shahalal.siraz@gmail.com';
      emailEl.href = 'mailto:' + (org.email || 'shahalal.siraz@gmail.com');
    }

    if (noticeBar) {
      noticeBar.classList.add('hidden');
    }
  },

  dismissNoticeBar() {
    const noticeBar = document.getElementById('phoneNoticeBar');
    if (noticeBar) noticeBar.classList.add('hidden');
  },

  // -------------------------------------------------------------
  // NAVIGATION & DROPDOWN CONTROLS
  // -------------------------------------------------------------
  _dropdownCloseTimer: null,

  openDropdown(container) {
    if (this._dropdownCloseTimer) {
      clearTimeout(this._dropdownCloseTimer);
      this._dropdownCloseTimer = null;
    }
    document.querySelectorAll('.nav-dropdown.open').forEach(el => {
      if (el !== container) el.classList.remove('open');
    });
    container.classList.add('open');
  },

  scheduleCloseDropdown(container) {
    if (this._dropdownCloseTimer) clearTimeout(this._dropdownCloseTimer);
    this._dropdownCloseTimer = setTimeout(() => {
      container.classList.remove('open');
    }, 350);
  },

  toggleDropdown(btn, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this._dropdownCloseTimer) clearTimeout(this._dropdownCloseTimer);
    const parent = btn.closest('.nav-dropdown');
    if (!parent) return;
    const wasOpen = parent.classList.contains('open');
    document.querySelectorAll('.nav-dropdown.open').forEach(el => el.classList.remove('open'));
    if (!wasOpen) {
      parent.classList.add('open');
    }
  },

  scrollToSection(sectionId) {
    // Close any open dropdowns & mobile menu
    document.querySelectorAll('.nav-dropdown.open').forEach(el => el.classList.remove('open'));
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.remove('mobile-open');

    const doScroll = () => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    if (this.state.currentView !== 'home') {
      this.navigate('home').then(() => {
        setTimeout(doScroll, 180);
      });
    } else {
      doScroll();
    }
  },

  // -------------------------------------------------------------
  // ROUTING
  // -------------------------------------------------------------
  async navigate(view) {
    this.state.currentView = view;
    const contentArea = document.getElementById('mainContentArea');
    if (!contentArea) return;

    // Update public nav link states
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Close any open dropdown sub-menus
    document.querySelectorAll('.nav-dropdown.open').forEach(el => el.classList.remove('open'));

    // Close mobile menu if open
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.remove('mobile-open');

    if (view === 'admin') {
      if (!this.state.user) {
        this.openLoginModal();
        return;
      }
      this.renderAdminLayout();
      return;
    }

    // Render Public Views
    if (view === 'home') {
      contentArea.innerHTML = Components.renderPublicHome(this.state.org, this.state.summary);
    } else if (view === 'about') {
      contentArea.innerHTML = Components.renderPublicAbout(this.state.org);
    } else if (view === 'objectives') {
      contentArea.innerHTML = Components.renderPublicObjectives(this.state.org);
    } else if (view === 'activities') {
      contentArea.innerHTML = Components.renderPublicActivities();
    } else if (view === 'donate') {
      contentArea.innerHTML = Components.renderPublicDonate(this.state.org);
    } else if (view === 'apply') {
      contentArea.innerHTML = Components.renderPublicApply(this.state.org);
    } else if (view === 'transparency') {
      contentArea.innerHTML = `<div style="text-align: center; padding: 60px 20px;"><div class="spinner"></div><p style="margin-top: 15px; font-weight:600; color:var(--primary-deep-green);">স্বচ্ছতা ও অডিট হিসাব বিবরণী লোড হচ্ছে...</p></div>`;
      try {
        const welfareRes = await API.getPublicWelfareSummary().catch(() => ({ success: false }));
        const welfareData = (welfareRes && welfareRes.success) ? welfareRes.data : null;
        contentArea.innerHTML = Components.renderPublicTransparency(this.state.org, this.state.summary, welfareData);
      } catch (e) {
        contentArea.innerHTML = Components.renderPublicTransparency(this.state.org, this.state.summary, null);
      }
    } else if (view === 'contact') {
      contentArea.innerHTML = Components.renderPublicContact(this.state.org);
    } else if (view === 'privacy') {
      contentArea.innerHTML = Components.renderPublicPrivacy();
    } else if (view === 'terms') {
      contentArea.innerHTML = Components.renderPublicTerms();
    } else if (view === 'constitution') {
      contentArea.innerHTML = Components.renderPublicConstitution(this.state.org);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // -------------------------------------------------------------
  // ADMIN DASHBOARD & MODULE ROUTING
  // -------------------------------------------------------------
  renderAdminLayout() {
    const contentArea = document.getElementById('mainContentArea');
    const u = this.state.user;

    contentArea.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="admin-sidebar-header">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color);">
              <img src="/assets/logo.png" alt="লোগো" style="width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid var(--accent-gold); object-fit: cover;">
              <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary-deep-green);">কর্জে হাসানা ফাউন্ডেশন</div>
            </div>
            <div class="admin-user-badge">
              <div class="admin-user-avatar" style="overflow: hidden; padding: 0;">
                ${(u.username === 'admin' || u.username === 'Shahalam69' || u.role === 'superadmin')
                  ? `<img src="/uploads/committee/member_1_shah_alam.jpg" alt="${u.full_name_bn}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.textContent='${u.full_name_bn.charAt(0)}';">` 
                  : u.full_name_bn.charAt(0)}
              </div>
              <div class="admin-user-info">
                <h5>${u.full_name_bn}</h5>
                <span>${this.getRoleTitleBn(u.role)}</span>
              </div>
            </div>
          </div>
          <button class="admin-menu-item active" data-admin-view="dashboard" onclick="App.navigateAdmin('dashboard')">
            <span>📊 ড্যাশবোর্ড</span>
          </button>
          <button class="admin-menu-item" data-admin-view="committee" onclick="App.navigateAdmin('committee')">
            <span>🏛️ পরিচালনা পরিষদ (২১+)</span>
          </button>
          <button class="admin-menu-item" data-admin-view="advisors" onclick="App.navigateAdmin('advisors')">
            <span>🎖️ উপদেষ্টা পরিষদ</span>
          </button>
          <button class="admin-menu-item" data-admin-view="donors" onclick="App.navigateAdmin('donors')">
            <span>👥 দাতা ব্যবস্থাপনা</span>
          </button>
          <button class="admin-menu-item" data-admin-view="donations" onclick="App.navigateAdmin('donations')">
            <span>❤️ অনুদান তালিকা ও রসিদ</span>
          </button>
          <button class="admin-menu-item" data-admin-view="bkash" onclick="App.navigateAdmin('bkash')">
            <span>📱 বিকাশ যাচাইকরণ</span>
            <span class="badge" id="adminBkashBadge" style="display:none;">0</span>
          </button>
          <button class="admin-menu-item" data-admin-view="applications" onclick="App.navigateAdmin('applications')">
            <span>📝 সহায়তা ও ঋণ আবেদন</span>
          </button>
          <button class="admin-menu-item" data-admin-view="disbursement" onclick="App.navigateAdmin('disbursement')">
            <span>🤝 ঋণ বিতরণ ও চুক্তিপত্র</span>
          </button>
          <button class="admin-menu-item" data-admin-view="repayments" onclick="App.navigateAdmin('repayments')">
            <span>🔄 ফেরত ও কিস্তি আদায়</span>
          </button>
          <button class="admin-menu-item" data-admin-view="alerts" onclick="App.navigateAdmin('alerts')">
            <span>⏰ ৩-দিনের তাগিদ ও বকেয়া</span>
            <span class="badge" id="adminOverdueBadge" style="display:none;">0</span>
          </button>
          <button class="admin-menu-item" data-admin-view="cashbook" onclick="App.navigateAdmin('cashbook')">
            <span>📖 দৈনিক ক্যাশবুক ও হিসাব</span>
          </button>
          <button class="admin-menu-item" data-admin-view="expenses" onclick="App.navigateAdmin('expenses')">
            <span>🧾 ব্যয় ব্যবস্থাপনা</span>
          </button>
          <button class="admin-menu-item" data-admin-view="welfare" onclick="App.navigateAdmin('welfare')">
            <span>🌾 ত্রাণ ও এককালীন সহায়তা</span>
          </button>
          <button class="admin-menu-item" data-admin-view="reports" onclick="App.navigateAdmin('reports')">
            <span>📑 আর্থিক রিপোর্ট ও ব্যালেন্স শিট</span>
          </button>
          <button class="admin-menu-item" data-admin-view="documents" onclick="App.navigateAdmin('documents')">
            <span>📜 নথি ও প্রত্যয়নপত্র প্রিন্ট</span>
          </button>
          <button class="admin-menu-item" data-admin-view="audit" onclick="App.navigateAdmin('audit')">
            <span>🔒 সিস্টেম অডিট লগ</span>
          </button>
          <button class="admin-menu-item" data-admin-view="settings" onclick="App.navigateAdmin('settings')">
            <span>⚙️ সংস্থা সেটিংস ও ব্যাকআপ</span>
          </button>
          <div style="margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border-light);">
            <button class="btn btn-outline btn-sm" style="width: 100%; color: #C62828; border-color: #C62828;" onclick="App.logout()">
              🚪 লগআউট
            </button>
          </div>
        </aside>
        <main class="admin-content" id="adminContentArea">
          <!-- Admin View Injected Here -->
        </main>
      </div>
    `;

    this.navigateAdmin('dashboard');
  },

  getRoleTitleBn(role) {
    const roles = {
      'superadmin': 'প্রতিষ্ঠাতা চেয়ারম্যান / সুপার এডমিন',
      'accountant': 'হিসাবরক্ষক (Accountant)',
      'verification_officer': 'মাঠ যাচাই কর্মকর্তা',
      'committee_member': 'অনুমোদন কমিটি সদস্য',
      'staff': 'সাধারণ কর্মী'
    };
    return roles[role] || role;
  },

  async navigateAdmin(adminView) {
    this.state.adminView = adminView;
    const adminArea = document.getElementById('adminContentArea');
    if (!adminArea) return;

    // Highlight active sidebar menu item
    document.querySelectorAll('.admin-menu-item').forEach(item => {
      item.classList.toggle('active', item.dataset.adminView === adminView);
    });

    adminArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #52665D;">তথ্য লোড হচ্ছে...</div>';

    try {
      if (adminView === 'dashboard') {
        const statsRes = await API.getDashboardStats();
        const comRes = await API.getCommittee().catch(() => ({ success: false }));
        if (comRes && comRes.success) {
          this.state.committee = comRes.data || [];
        }
        if (statsRes.success) {
          this.state.stats = statsRes.data;
          adminArea.innerHTML = Components.renderAdminDashboard(this.state.stats, this.state.org);
          // Render charts
          setTimeout(() => {
            DashboardCharts.renderIncomeExpense('incomeExpenseCanvas', this.state.stats.thisMonthDonations || 45000, this.state.stats.thisMonthExpenses || 12000);
            DashboardCharts.renderDonationTrend('donationTrendCanvas');
          }, 100);

          // Update badges
          const bkashBadge = document.getElementById('adminBkashBadge');
          const overdueBadge = document.getElementById('adminOverdueBadge');
          if (bkashBadge && this.state.stats.pendingBkashCount > 0) {
            bkashBadge.style.display = 'inline-block';
            bkashBadge.textContent = bnNum(this.state.stats.pendingBkashCount);
          }
          if (overdueBadge && this.state.stats.overdueCount > 0) {
            overdueBadge.style.display = 'inline-block';
            overdueBadge.textContent = bnNum(this.state.stats.overdueCount);
          }
        }
      } else if (adminView === 'committee') {
        const comRes = await API.getCommittee();
        if (comRes.success) {
          this.state.committee = comRes.data || [];
        }
        adminArea.innerHTML = AdminViews.renderCommittee(this.state.committee);
      } else if (adminView === 'advisors') {
        const comRes = await API.getCommittee();
        if (comRes.success) {
          this.state.committee = comRes.data || [];
        }
        adminArea.innerHTML = AdminViews.renderAdvisors(this.state.committee);
      } else if (adminView === 'donors') {
        const res = await API.getDonors();
        if (res.success) {
          this.state.donors = res.data;
          adminArea.innerHTML = AdminViews.renderDonors(this.state.donors);
        }
      } else if (adminView === 'donations') {
        const res = await API.getDonations();
        const accRes = await API.getAccounts();
        const fundRes = await API.getFunds();
        const donorsRes = await API.getDonors().catch(() => ({ success: false }));
        if (res.success) {
          this.state.donations = res.data;
          if (accRes && accRes.success) this.state.accounts = accRes.data || [];
          if (fundRes && fundRes.success) this.state.funds = fundRes.data || [];
          if (donorsRes && donorsRes.success) this.state.donors = donorsRes.data || [];
          adminArea.innerHTML = AdminViews.renderDonations(this.state.donations, this.state.funds, this.state.accounts);
        }
      } else if (adminView === 'bkash') {
        const res = await API.getBkashSubmissions();
        if (res.success) {
          this.state.submissions = res.data;
          adminArea.innerHTML = AdminViews.renderBkashSubmissions(this.state.submissions);
        }
      } else if (adminView === 'applications') {
        const res = await API.getApplications();
        if (res.success) {
          this.state.applications = res.data;
          adminArea.innerHTML = AdminViews.renderApplications(this.state.applications);
        }
      } else if (adminView === 'disbursement') {
        const appRes = await API.getApplications('status=অনুমোদিত');
        const accRes = await API.getAccounts();
        const fundRes = await API.getFunds();
        adminArea.innerHTML = AdminViews.renderDisbursement(appRes.data || [], accRes.data || [], fundRes.data || []);
      } else if (adminView === 'repayments') {
        const res = await API.getLoans();
        adminArea.innerHTML = AdminViews.renderRepayments(res.data || []);
      } else if (adminView === 'alerts') {
        const loanRes = await API.getLoans();
        const notifRes = await API.getNotifications();
        adminArea.innerHTML = AdminViews.renderAlerts(loanRes.data || [], notifRes.data || []);
      } else if (adminView === 'cashbook') {
        const trxRes = await API.getCashbookReport();
        const accRes = await API.getAccounts();
        const fundRes = await API.getFunds();
        adminArea.innerHTML = AdminViews.renderCashbook(trxRes.data?.transactions || [], accRes.data || [], fundRes.data || []);
      } else if (adminView === 'expenses') {
        const expRes = await API.getExpenses();
        adminArea.innerHTML = AdminViews.renderExpenses(expRes.data || []);
      } else if (adminView === 'welfare') {
        const grantsRes = await API.getWelfareGrants();
        const fundRes = await API.getFunds();
        const accRes = await API.getAccounts();
        this.state.welfareGrants = grantsRes.data || [];
        if (fundRes && fundRes.success) this.state.funds = fundRes.data || [];
        if (accRes && accRes.success) this.state.accounts = accRes.data || [];
        adminArea.innerHTML = AdminViews.renderWelfareGrants(this.state.welfareGrants, this.state.funds, this.state.accounts);
      } else if (adminView === 'reports') {
        const bsRes = await API.getBalanceSheet();
        this.state.reports = { balanceSheet: bsRes.data };
        adminArea.innerHTML = AdminViews.renderReports(this.state.reports);
      } else if (adminView === 'documents') {
        adminArea.innerHTML = AdminViews.renderDocuments(this.state.org);
      } else if (adminView === 'audit') {
        const auditRes = await API.getAuditLogs();
        adminArea.innerHTML = AdminViews.renderAuditLogs(auditRes.data || []);
      } else if (adminView === 'settings') {
        adminArea.innerHTML = AdminViews.renderSettings(this.state.org);
      }
    } catch (err) {
      adminArea.innerHTML = `<div class="alert-card danger">তথ্য লোড করতে সমস্যা হয়েছে: ${err.message}</div>`;
    }
  },

  // -------------------------------------------------------------
  // MODAL MANAGEMENT
  // -------------------------------------------------------------
  async openModal(typeOrTitle, dataOrHtml = {}) {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;

    // Direct HTML content modal support
    if (typeof dataOrHtml === 'string') {
      if (modalTitle) modalTitle.textContent = typeOrTitle;
      if (modalBody) modalBody.innerHTML = dataOrHtml;
      modal.classList.add('open');
      return;
    }

    const type = typeOrTitle;
    const data = dataOrHtml || {};

    if (type === 'donation') {
      if (!this.state.donors || this.state.donors.length === 0) {
        const donorsRes = await API.getDonors().catch(() => ({ success: false }));
        if (donorsRes && donorsRes.success) this.state.donors = donorsRes.data || [];
      }
      if (!this.state.funds || this.state.funds.length === 0) {
        const fundRes = await API.getFunds().catch(() => ({ success: false }));
        if (fundRes && fundRes.success) this.state.funds = fundRes.data || [];
      }
      if (!this.state.accounts || this.state.accounts.length === 0) {
        const accRes = await API.getAccounts().catch(() => ({ success: false }));
        if (accRes && accRes.success) this.state.accounts = accRes.data || [];
      }
    } else if (type === 'repayment') {
      if (!this.state.loans || this.state.loans.length === 0) {
        const loansRes = await API.getLoans().catch(() => ({ success: false }));
        if (loansRes && loansRes.success) this.state.loans = loansRes.data || [];
      }
    } else if (type === 'welfare_grant') {
      if (!this.state.funds || this.state.funds.length === 0) {
        const fundRes = await API.getFunds().catch(() => ({ success: false }));
        if (fundRes && fundRes.success) this.state.funds = fundRes.data || [];
      }
      if (!this.state.accounts || this.state.accounts.length === 0) {
        const accRes = await API.getAccounts().catch(() => ({ success: false }));
        if (accRes && accRes.success) this.state.accounts = accRes.data || [];
      }
    }

    if (type === 'donor') {
      modalTitle.textContent = '➕ নতুন দাতা ও শুভাকাঙ্ক্ষী নিবন্ধন';
      modalBody.innerHTML = `
        <form id="modalDonorForm" onsubmit="App.handleCreateDonor(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>দাতার নাম (বাংলায়) <span class="required">*</span></label>
              <input type="text" name="name_bn" class="form-control" required placeholder="দাতার পূর্ণ নাম">
            </div>
            <div class="form-group">
              <label>ইংরেজি নাম (ঐচ্ছিক)</label>
              <input type="text" name="name_en" class="form-control" placeholder="Name in English">
            </div>
            <div class="form-group">
              <label>মোবাইল নম্বর <span class="required">*</span></label>
              <input type="text" name="mobile" class="form-control" required placeholder="017xxxxxxxx">
            </div>
            <div class="form-group">
              <label>হোয়াটসঅ্যাপ নম্বর</label>
              <input type="text" name="whatsapp" class="form-control" placeholder="017xxxxxxxx">
            </div>
            <div class="form-group">
              <label>দাতার ক্যাটাগরি</label>
              <select name="category" class="form-control">
                <option value="এককালীন দাতা">এককালীন দাতা</option>
                <option value="মাসিক দাতা">মাসিক দাতা</option>
                <option value="নিয়মিত দাতা">নিয়মিত দাতা</option>
                <option value="বিশেষ দাতা">বিশেষ দাতা</option>
              </select>
            </div>
            <div class="form-group">
              <label>মাসিক দানের প্রতিশ্রুতি (যদি থাকে ৳)</label>
              <input type="number" name="commitment_amount" class="form-control" placeholder="0">
            </div>
          </div>
          <div class="form-group">
            <label>দাতার ছবি (ঐচ্ছিক)</label>
            <div style="display: flex; gap: 15px; align-items: center; background: var(--bg-page); padding: 10px; border-radius: var(--radius-sm); border: 1px dashed var(--primary-deep-green);">
              <div id="donorPhotoPreview" style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; overflow: hidden; flex-shrink: 0;">
                <span style="font-size: 24px;">👤</span>
              </div>
              <div style="flex: 1;">
                <input type="file" name="photo" id="donorPhotoInput" accept="image/*" class="form-control" onchange="App.previewDonorPhoto(event)">
                <small style="color: #666; font-size: 0.78rem;">পাসপোর্ট সাইজ বা স্পষ্ট ছবি নির্বাচন করুন</small>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>ঠিকানা</label>
            <input type="text" name="address" class="form-control" placeholder="যেমন: গ্রাম, ডাকঘর, উপজেলা, জেলা">
          </div>
          <div class="form-group" style="margin-top: 10px; background: #fffcf4; border: 1px solid #ffeeba; padding: 10px 12px; border-radius: 6px;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; color: #856404; margin: 0;">
              <input type="checkbox" name="show_on_website" value="1" checked style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
              <span>❤️ হোমপেজে সম্মানিত দাতা মণ্ডলী বক্সে সসম্মানে প্রদর্শন করুন</span>
            </label>
          </div>
          <div class="form-group">
            <label>মন্তব্য</label>
            <textarea name="notes" class="form-control" placeholder="অতিরিক্ত বিবরণ বা মন্তব্য..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">নিবন্ধন সম্পন্ন করুন</button>
        </form>
      `;
    } else if (type === 'donation') {
      const donors = this.state.donors || [];
      modalTitle.textContent = '💵 নতুন অনুদান গ্রহণ ও রসিদ তৈরি';
      modalBody.innerHTML = `
        <form id="modalDonationForm" onsubmit="App.handleRecordDonation(event)">
          <!-- দাতা নির্বাচন ড্রপডাউন -->
          <div class="form-group" style="background: #f4faf6; padding: 12px 14px; border-radius: 6px; border: 1.5px solid #075b3b33; margin-bottom: 16px;">
            <label style="font-weight: 700; color: #075B3B; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span>👤 নিবন্ধিত দাতা তালিকা থেকে নির্বাচন করুন:</span>
              <span style="font-size: 0.82rem; font-weight: normal; color: #555;">মোট দাতা: ${bnNum(donors.length)} জন</span>
            </label>
            <select id="modalDonorSelect" class="form-control" onchange="App.handleDonationDonorSelect(this.value)" style="font-weight: 600;">
              <option value="">-- দাতার তালিকা থেকে বেছে নিন --</option>
              ${donors.map(d => `
                <option value="${d.id}" data-name="${d.name_bn}" data-mobile="${d.mobile || ''}" data-commitment="${d.commitment_amount || ''}" ${(data.donor_id === d.id || data.donor_name === d.name_bn) ? 'selected' : ''}>
                  ${d.name_bn} — 📱 ${d.mobile || 'মোবাইল নেই'} (${d.category || 'এককালীন'})
                </option>
              `).join('')}
              <option value="NEW" ${data.donor_id === 'NEW' ? 'selected' : ''}>➕ তালিকায় নেই (নতুন অনিবন্ধিত দাতা)</option>
            </select>
            <small style="color: #555; display: block; margin-top: 5px;">
              💡 তালিকা থেকে নাম বেছে নিলে নাম ও মোবাইল স্বয়ংক্রিয়ভাবে বসে যাবে। নতুন কোনো ব্যক্তি হলে নিচের বক্সে সরাসরি নাম ও মোবাইল লিখুন (সিস্টেম তাকে স্বয়ংক্রিয়ভাবে দাতা হিসেবে সেভ করবে)।
            </small>
          </div>

          <input type="hidden" name="donor_id" id="modalDonorIdInput" value="${data.donor_id || ''}">
          <div class="form-grid">
            <div class="form-group">
              <label>দাতার নাম <span class="required">*</span></label>
              <input type="text" id="modalDonorNameInput" name="donor_name" class="form-control" required placeholder="দাতার পূর্ণ নাম" value="${data.donor_name || ''}">
            </div>
            <div class="form-group">
              <label>দাতার মোবাইল <span class="required">*</span></label>
              <input type="text" id="modalDonorMobileInput" name="donor_mobile" class="form-control" required placeholder="017xxxxxxxx" value="${data.donor_mobile || ''}">
            </div>
            <div class="form-group">
              <label>অনুদানের পরিমাণ (৳) <span class="required">*</span></label>
              <input type="number" name="amount" class="form-control" min="10" required placeholder="0.00" value="${data.amount || ''}">
            </div>
            <div class="form-group">
              <label>তারিখ <span class="required">*</span></label>
              <input type="date" name="date" class="form-control" value="${data.date || getDhakaDateStr()}" required>
            </div>
            <div class="form-group">
              <label>অনুদানের খাত / তহবিল <span class="required">*</span></label>
              <select name="fund_id" class="form-control" required>
                ${(this.state.funds && this.state.funds.length > 0) ? this.state.funds.map(f => `<option value="${f.id}" ${data.fund_id == f.id ? 'selected' : ''}>${f.name_bn}</option>`).join('') : `
                  <option value="1">সাধারণ অনুদান তহবিল</option>
                  <option value="2">সুদমুক্ত ধার ঘূর্ণায়মান তহবিল</option>
                  <option value="3">চিকিৎসা সহায়তা তহবিল</option>
                  <option value="4">শিক্ষা সহায়তা তহবিল</option>
                  <option value="5">জরুরি দুর্যোগ সহায়তা তহবিল</option>
                `}
              </select>
            </div>
            <div class="form-group">
              <label>জমার হিসাব <span class="required">*</span></label>
              <select name="financial_account_id" class="form-control" required>
                ${(this.state.accounts && this.state.accounts.length > 0) ? this.state.accounts.map(a => `<option value="${a.id}" ${data.financial_account_id == a.id ? 'selected' : ''}>${a.account_name_bn} (বর্তমান ব্যালেন্স: ৳ ${bnNum(a.current_balance)})</option>`).join('') : `
                  <option value="1">হাতে নগদ (Cash)</option>
                  <option value="2">সোনালী ব্যাংক পিএলসি</option>
                  <option value="3">বিকাশ / নগদ / রকেট হিসাব (01966442769)</option>
                `}
              </select>
            </div>
            <div class="form-group">
              <label>পদ্ধতি</label>
              <select name="payment_method" class="form-control">
                <option value="নগদ">নগদ</option>
                <option value="bKash / Nagad / Rocket Send Money">বিকাশ / নগদ / রকেট Send Money</option>
                <option value="ব্যাংক ডিপোজিট">ব্যাংক ডিপোজিট</option>
              </select>
            </div>
            <div class="form-group">
              <label>রেফারেন্স / TrxID</label>
              <input type="text" name="transaction_reference" class="form-control" placeholder="যদি থাকে (যেমন: TrxID)">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">✓ অনুদান নিশ্চিত করুন ও রসিদ তৈরি করুন</button>
        </form>
      `;
    } else if (type === 'repayment') {
      modalTitle.textContent = '🔄 সুদমুক্ত ধার ফেরত / কিস্তি আদায়';
      modalBody.innerHTML = `
        <form id="modalRepaymentForm" onsubmit="App.handleRecordRepayment(event)">
          <div class="form-group">
            <label>ধার গ্রহণকারী ও আইডি নির্বাচন করুন <span class="required">*</span></label>
            <select name="loan_id" id="repayLoanSelect" class="form-control" onchange="App.handleRepayLoanChange()" required>
              <option value="">নির্বাচন করুন...</option>
              ${this.state.loans.filter(l => l.outstanding_principal > 0).map(l => `
                <option value="${l.id}" data-max="${l.outstanding_principal}" data-applicant="${l.applicant_name}">
                  ${l.id} - ${l.applicant_name} (বকেয়া: ৳ ${bnNum(l.outstanding_principal)}, মেয়াদ শেষ: ${l.due_date})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>আদায়কৃত টাকার পরিমাণ (৳) <span class="required">*</span></label>
              <input type="number" name="amount" id="repayAmountInput" class="form-control" min="1" required>
            </div>
            <div class="form-group">
              <label>পরিশোধের তারিখ <span class="required">*</span></label>
              <input type="date" name="repayment_date" class="form-control" value="${getDhakaDateStr()}" required>
            </div>
            <div class="form-group">
              <label>জমার হিসাব <span class="required">*</span></label>
              <select name="received_in_account_id" class="form-control" required>
                <option value="1">হাতে নগদ (Cash)</option>
                <option value="2">সোনালী ব্যাংক পিএলসি</option>
                <option value="3">বিকাশ / নগদ / রকেট হিসাব (01966442769)</option>
              </select>
            </div>
            <div class="form-group">
              <label>পেমেন্ট মাধ্যম</label>
              <select name="payment_method" class="form-control">
                <option value="নগদ">নগদ</option>
                <option value="bKash / Nagad / Rocket Send Money">বিকাশ / নগদ / রকেট Send Money</option>
                <option value="ব্যাংক ডিপোজিট">ব্যাংক ডিপোজিট</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>রেফারেন্স / ট্রানজ্যাকশন আইডি (যদি থাকে)</label>
            <input type="text" name="transaction_reference" class="form-control">
          </div>
          <button type="submit" class="btn btn-gold" style="width:100%;">✓ ফেরত গ্রহণ ও রসিদ তৈরি করুন</button>
        </form>
      `;
    } else if (type === 'expense') {
      modalTitle.textContent = '🧾 নতুন অফিস বা পরিচালন ব্যয় এন্ট্রি';
      modalBody.innerHTML = `
        <form id="modalExpenseForm" onsubmit="App.handleRecordExpense(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>ব্যয়ের খাত / ক্যাটাগরি <span class="required">*</span></label>
              <select name="category" class="form-control" required>
                <option value="অফিস খরচ">অফিস খরচ</option>
                <option value="কার্যক্রম/প্রকল্প খরচ">কার্যক্রম/প্রকল্প খরচ</option>
                <option value="যাতায়াত ও পরিবহন">যাতায়াত ও পরিবহন</option>
                <option value="মুদ্রণ ও স্টেশনারি">মুদ্রণ ও স্টেশনারি</option>
                <option value="যোগাযোগ ও ইন্টারনেট">যোগাযোগ ও ইন্টারনেট</option>
                <option value="অন্যান্য ব্যয়">অন্যান্য ব্যয়</option>
              </select>
            </div>
            <div class="form-group">
              <label>টাকার পরিমাণ (৳) <span class="required">*</span></label>
              <input type="number" name="amount" class="form-control" min="1" required>
            </div>
            <div class="form-group">
              <label>প্রাপক ব্যক্তি / প্রতিষ্ঠান (ভেন্ডর) <span class="required">*</span></label>
              <input type="text" name="recipient_vendor" class="form-control" required>
            </div>
            <div class="form-group">
              <label>পরিশোধের হিসাব <span class="required">*</span></label>
              <select name="payment_account_id" class="form-control" required>
                <option value="1">হাতে নগদ (Cash in Hand)</option>
                <option value="2">সোনালী ব্যাংক পিএলসি</option>
                <option value="3">বিকাশ হিসাব</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>ব্যয়ের বিস্তারিত বিবরণ</label>
            <textarea name="description" class="form-control" required></textarea>
          </div>
          <button type="submit" class="btn btn-danger" style="width:100%;">ব্যয় অনুমোদন ও লিপিবদ্ধ করুন</button>
        </form>
      `;
    } else if (type === 'transfer') {
      modalTitle.textContent = '🔄 হিসাব স্থানান্তর (Inter-Account Transfer)';
      modalBody.innerHTML = `
        <form id="modalTransferForm" onsubmit="App.handleTransferAccount(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>উৎস হিসাব (যেখান থেকে টাকা যাবে) <span class="required">*</span></label>
              <select name="from_account_id" class="form-control" required>
                <option value="3">বিকাশ হিসাব (MFS)</option>
                <option value="1">হাতে নগদ (Cash)</option>
                <option value="2">সোনালী ব্যাংক পিএলসি</option>
              </select>
            </div>
            <div class="form-group">
              <label>গন্তব্য হিসাব (যেখানে জমা হবে) <span class="required">*</span></label>
              <select name="to_account_id" class="form-control" required>
                <option value="2">সোনালী ব্যাংক পিএলসি</option>
                <option value="1">হাতে নগদ (Cash)</option>
                <option value="3">বিকাশ হিসাব</option>
              </select>
            </div>
            <div class="form-group">
              <label>স্থানান্তরের পরিমাণ (৳) <span class="required">*</span></label>
              <input type="number" name="amount" class="form-control" min="1" required>
            </div>
            <div class="form-group">
              <label>রেফারেন্স নং</label>
              <input type="text" name="reference" class="form-control" placeholder="যেমন: ব্যাংক জমা স্লিপ">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">স্থানান্তর সম্পন্ন করুন</button>
        </form>
      `;
    } else if (type === 'committee_member') {
      const isSuperAdmin = this.state.user && (
        this.state.user.role === 'superadmin' ||
        this.state.user.username === 'Shahalam69' ||
        this.state.user.username === 'admin' ||
        String(this.state.user.id) === 'USR-001' ||
        String(this.state.user.id) === '1'
      );
      if (!isSuperAdmin) {
        alert('কমিটি সদস্য অন্তর্ভুক্তি, সম্পাদন বা পরিবর্তনের একক কর্তৃত্ব কেবলমাত্র সম্মানিত সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।');
        return;
      }

      const isEdit = !!data.id;
      modalTitle.textContent = isEdit ? '✏️ পরিচালনা পরিষদ / উপদেষ্টা সদস্যের তথ্য সম্পাদন' : '➕ নতুন পরিচালনা পরিষদ সদস্য (২১+) অন্তর্ভুক্তি';
      const selectedType = data.committee_type || 'পরিচালনা পরিষদ';

      modalBody.innerHTML = `
        <form id="modalCommitteeForm" onsubmit="App.handleSaveCommitteeMember(event)">
          <input type="hidden" name="id" value="${data.id || ''}">
          <input type="hidden" name="existing_photo" value="${data.photo_url || ''}">

          <div style="background: #e8f5ec; border: 1px solid #c8e6c9; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.86rem; color: #1b5e20;">
            🛡️ <strong>সুপার এডমিন কর্তৃত্ব:</strong> ২১+ সদস্য বিশিষ্ট পরিচালনা পরিষদ বা উপদেষ্টা পর্ষদের সদস্য সংযোজন ও তথ্য আপডেট করুন।
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>কমিটির ধরন (Committee Branch) <span class="required">*</span></label>
              <select name="committee_type" class="form-control" required style="font-weight: 600;">
                <option value="পরিচালনা পরিষদ" ${selectedType === 'পরিচালনা পরিষদ' ? 'selected' : ''}>🏛️ পরিচালনা পরিষদ (২১+ সদস্যের নির্বাহী পরিষদ)</option>
                <option value="উপদেষ্টা পরিষদ" ${selectedType === 'উপদেষ্টা পরিষদ' ? 'selected' : ''}>🎖️ উপদেষ্টা পরিষদ (সম্মানিত উপদেষ্টা)</option>
              </select>
            </div>

            <div class="form-group">
              <label>প্রদর্শন অগ্রাধিকার ক্রম (Display Order) <span class="required">*</span></label>
              <input type="number" name="display_order" class="form-control" value="${data.display_order || 1}" min="1" required placeholder="১, ২, ৩ ... ২১">
              <small style="color: #666; font-size: 0.78rem;">যেমন: সভাপতি = ১, সহ-সভাপতি = ২, সাধারণ সম্পাদক = ৩ ...</small>
            </div>

            <div class="form-group">
              <label>সদস্যের পুরো নাম (বাংলায়) <span class="required">*</span></label>
              <input type="text" name="name_bn" class="form-control" value="${data.name_bn || ''}" required placeholder="যেমন: জনাব মোঃ শাহ্ আলম ইসলাম">
            </div>

            <div class="form-group">
              <label>সদস্যের নাম (ইংরেজিতে - ঐচ্ছিক)</label>
              <input type="text" name="name_en" class="form-control" value="${data.name_en || ''}" placeholder="যেমন: MD SHAH ALAM">
            </div>

            <div class="form-group">
              <label>কমিটির পদবী <span class="required">*</span></label>
              <input type="text" name="designation_bn" list="committeeDesignationList" class="form-control" value="${data.designation_bn || ''}" required placeholder="তালিকা থেকে নির্বাচন বা টাইপ করুন...">
              <datalist id="committeeDesignationList">
                <option value="সভাপতি">
                <option value="সিনিয়র সহ-সভাপতি">
                <option value="সহ-সভাপতি (১)">
                <option value="সহ-সভাপতি (২)">
                <option value="সহ-সভাপতি (৩)">
                <option value="সাধারণ সম্পাদক">
                <option value="যুগ্ম সাধারণ সম্পাদক (১)">
                <option value="যুগ্ম সাধারণ সম্পাদক (২)">
                <option value="সাংগঠনিক সম্পাদক">
                <option value="সহ-সাংগঠনিক সম্পাদক">
                <option value="অর্থ ও কোষাধ্যক্ষ সম্পাদক">
                <option value="সহ-অর্থ সম্পাদক">
                <option value="প্রচার ও প্রকাশনা সম্পাদক">
                <option value="সহ-প্রচার সম্পাদক">
                <option value="দপ্তর সম্পাদক">
                <option value="সমাজকল্যাণ ও ত্রাণ সম্পাদক">
                <option value="শিক্ষা, সাহিত্য ও গবেষণা সম্পাদক">
                <option value="ধর্ম ও শরীয়াহ বিষয়ক সম্পাদক">
                <option value="স্বাস্থ্য ও চিকিৎসা বিষয়ক সম্পাদক">
                <option value="যুব ও ক্রীড়া বিষয়ক সম্পাদক">
                <option value="আন্তর্জাতিক ও প্রবাসী কল্যাণ সম্পাদক">
                <option value="তথ্য ও প্রযুক্তি বিষয়ক সম্পাদক">
                <option value="মহিলা বিষয়ক সম্পাদক">
                <option value="কার্যনির্বাহী সদস্য (১)">
                <option value="কার্যনির্বাহী সদস্য (২)">
                <option value="কার্যনির্বাহী সদস্য (৩)">
                <option value="কার্যনির্বাহী সদস্য (৪)">
                <option value="কার্যনির্বাহী সদস্য (৫)">
                <option value="কার্যনির্বাহী সদস্য (৬)">
                <option value="কার্যনির্বাহী সদস্য (৭)">
                <option value="কার্যনির্বাহী সদস্য (৮)">
                <option value="কার্যনির্বাহী সদস্য (৯)">
                <option value="কার্যনির্বাহী সদস্য (১০)">
                <option value="প্রধান উপদেষ্টা">
                <option value="শরীয়াহ উপদেষ্টা">
                <option value="সম্মানিত উপদেষ্টা">
              </datalist>
            </div>

            <div class="form-group">
              <label>ব্যক্তিগত পেশা (Personal Profession) <span class="required">*</span></label>
              <input type="text" name="profession" list="professionSuggestionsList" class="form-control" value="${data.profession || ''}" required placeholder="যেমন: ব্যবসায়ী, শিক্ষক, চিকিৎসক, প্রকৌশলী...">
              <datalist id="professionSuggestionsList">
                <option value="ব্যবসায়ী ও উদ্যোক্তা">
                <option value="ব্যবস্থাপনা পরিচালক (ম্যানেজিং ডিরেক্টর)">
                <option value="অধ্যক্ষ / শিক্ষক (ইসলামী শিক্ষাবিদ)">
                <option value="চিকিৎসক (এমবিবিএস / বিশেষজ্ঞ)">
                <option value="প্রকৌশলী (ইঞ্জিনিয়ার)">
                <option value="আইনজীবী (এডভোকেট)">
                <option value="ব্যাংকার">
                <option value="সরকারি কর্মকর্তা">
                <option value="বেসরকারি চাকরিজীবী">
                <option value="প্রবাসী রেমিট্যান্স যোদ্ধা">
                <option value="সমাজসেবক ও সংগঠক">
                <option value="ইসলামী চিন্তাবিদ ও খতিব">
                <option value="কৃষি ও খামার উদ্যোক্তা">
              </datalist>
            </div>

            <div class="form-group">
              <label>কল নম্বর (মোবাইল) <span class="required">*</span></label>
              <input type="text" name="mobile" class="form-control" value="${data.mobile || ''}" required placeholder="যেমন: 01966442769">
            </div>

            <div class="form-group">
              <label>হোয়াটসঅ্যাপ নম্বর (WhatsApp)</label>
              <input type="text" name="whatsapp" class="form-control" value="${data.whatsapp || data.mobile || ''}" placeholder="খালি রাখলে কল নম্বরটি যুক্ত হবে">
              <small style="color: #666; font-size: 0.78rem;">ওয়েবসাইটে ১-ক্লিকে সরাসরি চ্যাট করার জন্য ব্যবহৃত হবে</small>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
              <label>স্থায়ী / বর্তমান ঠিকানা <span class="required">*</span></label>
              <input type="text" name="address" class="form-control" value="${data.address || ''}" required placeholder="যেমন: রৌমারী, কুড়িগ্রাম">
            </div>

            <div class="form-group">
              <label>ইমেইল ঠিকানা (ঐচ্ছিক)</label>
              <input type="email" name="email" class="form-control" value="${data.email || ''}" placeholder="member@karjehasana.org">
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <label>সদস্যের ছবি (Upload Photo to Committee Folder)</label>
            <div style="display: flex; gap: 15px; align-items: center; margin-top: 6px; background: var(--bg-page); padding: 12px; border-radius: var(--radius-sm); border: 1px dashed var(--accent-gold);">
              <div id="committeePhotoPreview" style="width: 76px; height: 76px; border-radius: 50%; border: 3px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; overflow: hidden; flex-shrink: 0; box-shadow: 0 3px 8px rgba(0,0,0,0.12);">
                ${data.photo_url ? `<img src="${data.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size: 32px;">👤</span>`}
              </div>
              <div style="flex: 1;">
                <input type="file" name="photo" id="committeePhotoInput" accept="image/*" class="form-control" onchange="App.previewCommitteePhoto(event)">
                <small style="color: #555; display: block; margin-top: 5px;">ছবি নির্বাচন করলে সরাসরি সার্ভারের <code>public/uploads/committee/</code> ফোল্ডারে সেভ হবে এবং ওয়েবসাইটে প্রদর্শিত হবে।</small>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>সংক্ষিপ্ত পরিচিতি বা সাংগঠনিক ভূমিকা / দায়িত্ব (ঐচ্ছিক)</label>
            <textarea name="bio_bn" class="form-control" rows="2" placeholder="কমিটিতে দায়িত্ব বা সংক্ষিপ্ত পরিচিতি...">${data.bio_bn || ''}</textarea>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()" style="flex: 1; padding: 11px;">✕ বাতিল</button>
            <button type="submit" id="saveCommitteeSubmitBtn" class="btn btn-primary" style="flex: 2; padding: 11px; font-size: 1rem; font-weight: 700;">
              ${isEdit ? '✓ তথ্য হালনাগাদ করুন' : '✓ নতুন সদস্য সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      `;
    } else if (type === 'welfare_grant') {
      const isEdit = !!data.id;
      modalTitle.textContent = isEdit ? '✏️ ত্রাণ / এককালীন সহায়তার তথ্য সম্পাদন' : '🌾 নতুন ত্রাণ ও এককালীন সহায়তা প্রদান';
      const defaultFundId = data.fund_id || 5; // Emergency Fund default
      const defaultAccId = data.account_id || 1; // Cash default
      const defaultDate = data.date || getDhakaDateStr();

      modalBody.innerHTML = `
        <form id="modalWelfareGrantForm" onsubmit="App.handleSaveWelfareGrant(event)">
          <input type="hidden" name="id" value="${data.id || ''}">
          <input type="hidden" name="existing_photo" value="${data.photo_url || ''}">

          <div style="background: #FAF8F5; border: 1.5px solid #D9B84C; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.86rem; color: #7A5200; line-height: 1.5;">
            💡 <strong>অ-ফেরতযোগ্য সহায়তা নীতি:</strong> কর্জে হাসানা সুদমুক্ত ঘূর্ণায়মান ধারের বাইরে এটি এককালীন দান ও ত্রাণ। এটি সম্পন্ন করার সাথে সাথে নগদ/ব্যাংক ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে মাইনাস হয়ে ক্যাশবুক ও অডিট হিসাবে অন্তর্ভুক্ত হবে।
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>সহায়তার খাত / ক্যাটাগরি <span class="required">*</span></label>
              <select name="category" id="welfareCategorySelect" class="form-control" required style="font-weight: 600;" onchange="App.handleWelfareCategoryChange(this.value)">
                <option value="গৃহহীনদের ঘর নির্মাণ" ${data.category === 'গৃহহীনদের ঘর নির্মাণ' ? 'selected' : ''}>🏠 গৃহহীনদের ঘর নির্মাণ ও বাসস্থান মেরামত</option>
                <option value="খাদ্য ও নিত্যপণ্য বাজার সহায়তা" ${data.category === 'খাদ্য ও নিত্যপণ্য বাজার সহায়তা' ? 'selected' : ''}>🍚 খাদ্য ও এক মাসের বাজার সহায়তা</option>
                <option value="জরুরি চিকিৎসা সহায়তা" ${data.category === 'জরুরি চিকিৎসা সহায়তা' ? 'selected' : ''}>🏥 জরুরি চিকিৎসা সহায়তা ও ঔষধ প্রদান</option>
                <option value="শীতবস্ত্র ও কম্বল বিতরণ" ${data.category === 'শীতবস্ত্র ও কম্বল বিতরণ' ? 'selected' : ''}>🧣 শীতকালীন কম্বল ও বস্ত্র বিতরণ</option>
                <option value="দুর্যোগ ও বন্যা ত্রাণ" ${data.category === 'দুর্যোগ ও বন্যা ত্রাণ' ? 'selected' : ''}>🌊 দুর্যোগ ব্যবস্থাপনা ও বন্যা ত্রাণ</option>
                <option value="শিক্ষা সহায়তা ও উপকরণ" ${data.category === 'শিক্ষা সহায়তা ও উপকরণ' ? 'selected' : ''}>📚 শিক্ষা সহায়তা, বই-খাতা ও ফি</option>
                <option value="অন্যান্য" ${data.category === 'অন্যান্য' ? 'selected' : ''}>🤝 অন্যান্য জনকল্যাণমূলক সহায়তা</option>
              </select>
            </div>

            <div class="form-group">
              <label>সহায়তার পরিমাণ (৳) <span class="required">*</span></label>
              <input type="number" name="amount" class="form-control" value="${data.amount || ''}" min="1" required placeholder="যেমন: 25000" style="font-weight: 700; color: #C62828;">
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
              <label>সহায়তা / প্রকল্পের শিরোনাম <span class="required">*</span></label>
              <input type="text" name="title_bn" class="form-control" value="${data.title_bn || ''}" required placeholder="যেমন: নদীভাঙনে গৃহহীন ছমির উদ্দিনের টিনশেড ঘর নির্মাণ">
            </div>

            <div class="form-group">
              <label>সুবিধাভোগীর নাম / প্রতিনিধি <span class="required">*</span></label>
              <input type="text" name="beneficiary_name" class="form-control" value="${data.beneficiary_name || ''}" required placeholder="ব্যক্তি বা প্রতিনিধির নাম">
            </div>

            <div class="form-group">
              <label>উপকৃত পরিবার / ব্যক্তির সংখ্যা <span class="required">*</span></label>
              <input type="number" name="beneficiary_count" class="form-control" value="${data.beneficiary_count || 1}" min="1" required>
              <small style="color: #666; font-size: 0.78rem;">একক পরিবার হলে ১, গণবিতরণে মোট সংখ্যা</small>
            </div>

            <div class="form-group">
              <label>মোবাইল নম্বর (যদি থাকে)</label>
              <input type="text" name="beneficiary_mobile" class="form-control" value="${data.beneficiary_mobile || ''}" placeholder="017xxxxxxxx">
            </div>

            <div class="form-group">
              <label>জাতীয় পরিচয়পত্র (NID) নম্বর</label>
              <input type="text" name="beneficiary_nid" class="form-control" value="${data.beneficiary_nid || ''}" placeholder="এনআইডি বা জন্ম নিবন্ধন নম্বর">
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
              <label>ঠিকানা (গ্রাম / ওয়ার্ড / ইউনিয়ন / উপজেলা) <span class="required">*</span></label>
              <input type="text" name="beneficiary_address" class="form-control" value="${data.beneficiary_address || 'রৌমারী, কুড়িগ্রাম'}" required placeholder="যেমন: দাঁতভাঙ্গা, রৌমারী, কুড়িগ্রাম">
            </div>

            <div class="form-group">
              <label>প্রদেয় তহবিল (Fund Source) <span class="required">*</span></label>
              <select name="fund_id" id="modalWelfareFundSelect" class="form-control" required>
                ${(this.state.funds || []).map(f => `
                  <option value="${f.id}" ${defaultFundId == f.id ? 'selected' : ''}>
                    ${f.name_bn} (অবশিষ্ট: ৳ ${bnNum(f.current_balance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>পরিশোধের হিসাব (Payment Account) <span class="required">*</span></label>
              <select name="account_id" class="form-control" required>
                ${(this.state.accounts || []).map(a => `
                  <option value="${a.id}" ${defaultAccId == a.id ? 'selected' : ''}>
                    ${a.name_bn} (বর্তমান ব্যালেন্স: ৳ ${bnNum(a.current_balance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>বিতরণের তারিখ <span class="required">*</span></label>
              <input type="date" name="date" class="form-control" value="${defaultDate}" required>
            </div>

            <div class="form-group">
              <label>ভাউচার নম্বর (Voucher No.)</label>
              <input type="text" name="voucher_no" class="form-control" value="${data.voucher_no || ''}" placeholder="যেমন: VOUCH-AID-2026-0001 (খালি রাখলে অটো তৈরি হবে)" style="font-family: var(--font-en);">
            </div>
          </div>

          <div class="form-group">
            <label>বিস্তারিত উদ্দেশ্য ও বিবরণ <span class="required">*</span></label>
            <textarea name="description" class="form-control" rows="2" required placeholder="সহায়তার প্রেক্ষাপট, কেন এই সহায়তা প্রদান করা হলো ইত্যাদি...">${data.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label>বাস্তবায়ন ফলাফল ও পর্যবেক্ষণ মন্তব্য (Impact / Audit Notes)</label>
            <textarea name="impact_notes" class="form-control" rows="2" placeholder="যেমন: ঘর নির্মাণ সম্পন্নপূর্বক চাবি হস্তান্তর করা হয়েছে...">${data.impact_notes || ''}</textarea>
          </div>

          <div class="form-group">
            <label>প্রমাণক ছবি / বিতরণ মুহূর্ত / ভাউচার রসিদ (ছবি আপলোড)</label>
            <div style="display: flex; gap: 15px; align-items: center; background: var(--bg-page); padding: 12px; border-radius: var(--radius-sm); border: 1px dashed #075B3B;">
              <div id="welfarePhotoPreview" style="width: 72px; height: 72px; border-radius: 8px; border: 2px solid #D9B84C; display: flex; align-items: center; justify-content: center; background: #e8f5ec; overflow: hidden; flex-shrink: 0;">
                ${data.photo_url ? `<img src="${data.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size: 28px;">📷</span>`}
              </div>
              <div style="flex: 1;">
                <input type="file" name="photo" accept="image/*" class="form-control" onchange="App.previewWelfarePhoto(event)">
                <small style="color: #666; font-size: 0.78rem;">বিতরণের ছবি বা কেনাকাটার রসিদের স্পষ্ট ছবি সংযুক্ত করুন (অডিটের জন্য)</small>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>অনুমোদনকারী কর্তৃপক্ষ</label>
            <input type="text" name="approved_by" class="form-control" value="${data.approved_by || 'উপদেষ্টা পরিষদ ও পরিচালনা কমিটি'}" required>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()" style="flex: 1; padding: 11px;">✕ বাতিল</button>
            <button type="submit" id="saveWelfareSubmitBtn" class="btn btn-primary" style="flex: 2; padding: 11px; font-size: 1rem; font-weight: 700;">
              ${isEdit ? '✓ তথ্য হালনাগাদ করুন' : '🌾 ত্রাণ বিতরণ অনুমোদন ও ক্যাশবুকে সেভ করুন'}
            </button>
          </div>
        </form>
      `;
    }

    modal.classList.add('open');
  },

  closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
      modal.classList.remove('open');
      const container = modal.querySelector('.modal-container');
      if (container) container.style.maxWidth = '';
    }
  },

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------
  async handlePublicPaymentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
      const res = await API.submitPublicPayment(formData);
      alert(`ধন্যবাদ! আপনার অনুদানের তথ্য গৃহীত হয়েছে।\nসাবমিশন আইডি: ${res.submissionId}\nযাচাইয়ের পর ফাউন্ডেশন রসিদ ইস্যু করবে।`);
      form.reset();
      this.navigate('home');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  async handlePublicApplicationSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
      const res = await API.submitPublicApplication(formData);
      alert(`আলহামদুলিল্লাহ! আপনার আবেদনটি সফলভাবে জমা হয়েছে।\nআবেদন নম্বর: ${res.applicationId}\nঅনুগ্রহ করে নম্বরটি সংরক্ষণ করুন।`);
      form.reset();
      this.navigate('home');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  previewDonorPhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('donorPhotoPreview');
    if (file && preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    }
  },

  previewCommitteePhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('committeePhotoPreview');
    if (file && preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    }
  },

  async handleCreateDonor(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'সংরক্ষণ করা হচ্ছে...';
    }

    const formData = new FormData(form);
    const donorName = formData.get('name_bn') || '';
    const mobile = formData.get('mobile') || '';
    const commitmentAmount = formData.get('commitment_amount') || '';

    if (this.state.user) {
      formData.append('user_id', this.state.user.id || '');
      formData.append('user_name', this.state.user.full_name_bn || '');
    }

    try {
      const res = await API.createDonor(formData);
      await this.loadInitialData(); // Load newly registered donor into state immediately!

      this.closeModal();

      // Refresh admin donors view if open
      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin' && this.state.adminView === 'donors') {
        await this.navigateAdmin('donors');
      }

      const wantDeposit = confirm(`নতুন দাতা "${donorName}" সফলভাবে নিবন্ধিত হয়েছে!\n(দাতা আইডি: ${res.donorId})\n\nআপনি কি এখনই এই দাতার অনুদান (Donation) এন্ট্রি করতে চান?`);
      if (wantDeposit) {
        this.openModal('donation', {
          donor_id: res.donorId,
          donor_name: donorName,
          donor_mobile: mobile,
          amount: parseFloat(commitmentAmount) > 0 ? commitmentAmount : ''
        });
      } else {
        if (adminArea && this.state.currentView === 'admin') {
          await this.navigateAdmin('donors');
        }
      }
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
  },

  async openEditDonorModal(donorId) {
    let donor = (this.state.donors || []).find(d => String(d.id) === String(donorId));
    if (!donor) {
      const res = await API.getDonor(donorId).catch(() => null);
      if (res && res.data) donor = res.data;
    }
    if (!donor) return alert('দাতার তথ্য পাওয়া যায়নি।');

    const html = `
      <form id="modalEditDonorForm" onsubmit="App.handleUpdateDonor(event, '${donor.id}')">
        <div class="form-grid">
          <div class="form-group">
            <label>দাতার নাম (বাংলায়) <span class="required">*</span></label>
            <input type="text" name="name_bn" class="form-control" required value="${donor.name_bn || ''}">
          </div>
          <div class="form-group">
            <label>ইংরেজি নাম</label>
            <input type="text" name="name_en" class="form-control" value="${donor.name_en || ''}">
          </div>
          <div class="form-group">
            <label>মোবাইল নম্বর <span class="required">*</span></label>
            <input type="text" name="mobile" class="form-control" required value="${donor.mobile || ''}">
          </div>
          <div class="form-group">
            <label>হোয়াটসঅ্যাপ নম্বর</label>
            <input type="text" name="whatsapp" class="form-control" value="${donor.whatsapp || donor.mobile || ''}">
          </div>
          <div class="form-group">
            <label>দাতার ক্যাটাগরি</label>
            <select name="category" class="form-control">
              <option value="এককালীন দাতা" ${donor.category === 'এককালীন দাতা' ? 'selected' : ''}>এককালীন দাতা</option>
              <option value="মাসিক দাতা" ${donor.category === 'মাসিক দাতা' ? 'selected' : ''}>মাসিক দাতা</option>
              <option value="নিয়মিত দাতা" ${donor.category === 'নিয়মিত দাতা' ? 'selected' : ''}>নিয়মিত দাতা</option>
              <option value="বিশেষ দাতা" ${donor.category === 'বিশেষ দাতা' ? 'selected' : ''}>বিশেষ দাতা</option>
              <option value="আজীবন দাতা" ${donor.category === 'আজীবন দাতা' ? 'selected' : ''}>আজীবন দাতা</option>
            </select>
          </div>
          <div class="form-group">
            <label>প্রতিশ্রুতি / অনুদান পরিমাণ (৳)</label>
            <input type="number" name="commitment_amount" class="form-control" value="${donor.commitment_amount || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>দাতার ছবি পরিবর্তন/আপলোড</label>
          <div style="display: flex; gap: 15px; align-items: center; background: var(--bg-page); padding: 10px; border-radius: var(--radius-sm); border: 1px dashed var(--accent-gold);">
            <div id="donorPhotoPreview" style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; overflow: hidden; flex-shrink: 0;">
              ${donor.photo_url ? `<img src="${donor.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size: 26px;">👤</span>`}
            </div>
            <div style="flex: 1;">
              <input type="file" name="photo" id="donorPhotoInput" accept="image/*" class="form-control" onchange="App.previewDonorPhoto(event)">
              <small style="color: #666; font-size: 0.78rem;">নতুন ছবি নির্বাচন করলে পূর্বের ছবি প্রতিস্থাপিত হবে</small>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>ঠিকানা (গ্রাম, উপজেলা, জেলা)</label>
          <input type="text" name="address" class="form-control" value="${donor.address || ''}">
        </div>
        <div class="form-group" style="margin-top: 10px; background: #fffcf4; border: 1px solid #ffeeba; padding: 10px 12px; border-radius: 6px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; color: #856404; margin: 0;">
            <input type="checkbox" name="show_on_website" value="1" ${donor.show_on_website !== 0 ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
            <span>❤️ ওয়েবসাইটে ও হোমপেজের সম্মানিত দাতা মণ্ডলী বক্সে সসম্মানে প্রদর্শন করুন</span>
          </label>
        </div>
        <div class="form-group">
          <label>মন্তব্য</label>
          <textarea name="notes" class="form-control">${donor.notes || ''}</textarea>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 14px;">
          <button type="submit" class="btn btn-primary" style="flex: 1;">হালনাগাদ সংরক্ষণ করুন</button>
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">বাতিল</button>
        </div>
      </form>
    `;

    this.openModal(`✏️ দাতা ও ছবি সম্পাদনা: ${donor.name_bn}`, html);
  },

  async handleUpdateDonor(event, donorId) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const origText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'সংরক্ষণ করা হচ্ছে...';
    }

    const formData = new FormData(form);
    if (!form.querySelector('input[name="show_on_website"]:checked')) {
      formData.set('show_on_website', '0');
    } else {
      formData.set('show_on_website', '1');
    }
    if (this.state.user) {
      formData.append('user_id', this.state.user.id || '');
      formData.append('user_name', this.state.user.full_name_bn || '');
    }

    try {
      await API.updateDonor(donorId, formData);
      await this.loadInitialData();
      this.closeModal();

      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin' && this.state.adminView === 'donors') {
        await this.navigateAdmin('donors');
      }
      alert('দাতার তথ্য ও ছবি সফলভাবে হালনাগাদ করা হয়েছে!');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  },

  handleDonationDonorSelect(donorId) {
    const nameInput = document.getElementById('modalDonorNameInput');
    const mobileInput = document.getElementById('modalDonorMobileInput');
    const idInput = document.getElementById('modalDonorIdInput');
    const amountInput = document.querySelector('#modalDonationForm input[name="amount"]');

    if (!donorId || donorId === 'NEW') {
      if (idInput) idInput.value = '';
      if (donorId === 'NEW') {
        if (nameInput) { nameInput.value = ''; nameInput.focus(); }
        if (mobileInput) mobileInput.value = '';
      }
      return;
    }

    const donor = (this.state.donors || []).find(d => String(d.id) === String(donorId));
    if (donor) {
      if (idInput) idInput.value = donor.id;
      if (nameInput) nameInput.value = donor.name_bn;
      if (mobileInput) mobileInput.value = donor.mobile || '';
      if (amountInput && (!amountInput.value || parseFloat(amountInput.value) === 0) && donor.commitment_amount > 0) {
        amountInput.value = donor.commitment_amount;
      }
    }
  },

  openDonationForDonor(donorId) {
    const donor = (this.state.donors || []).find(d => String(d.id) === String(donorId));
    if (!donor) return;
    this.openModal('donation', {
      donor_id: donor.id,
      donor_name: donor.name_bn,
      donor_mobile: donor.mobile || '',
      amount: donor.commitment_amount > 0 ? donor.commitment_amount : ''
    });
  },

  deleteDonor(id, name) {
    this.openModal('⚠️ স্থায়ীভাবে অপসারণ নিশ্চিতকরণ', `
      <div style="text-align: center; padding: 15px 10px;">
        <div style="font-size: 52px; color: #dc3545; line-height: 1; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: #1b2e25; margin-bottom: 10px; font-size: 1.25rem;">আপনি কি এই দাতাকে চিরতরে মুছে ফেলতে চান?</h3>
        <p style="font-size: 1.05rem; color: #333; margin-bottom: 15px;">
          দাতার নাম: <strong style="color: #075b3b;">${name}</strong><br>
          <span style="font-size: 0.85rem; color: #777;">দাতা আইডি: ${id}</span>
        </p>
        <div style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 20px; line-height: 1.5; text-align: left;">
          🚨 <strong>সতর্কবার্তা:</strong> আপনি যদি নিচে <strong>"হ্যাঁ, চিরতরে মুছে ফেলুন"</strong> বাটনে ক্লিক করেন, তবে ডাটাবেজ থেকে এই দাতার সকল তথ্য স্থায়ীভাবে ডিলিট হয়ে যাবে। এই কাজটি আর কখনো ফিরিয়ে আনা যাবে না।
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()" style="border: 1px solid #aaa; color: #444; padding: 9px 20px;">✕ বাতিল করুন</button>
          <button type="button" id="confirmDeleteDonorBtn" class="btn btn-danger" style="background: #dc3545; color: white; border: none; padding: 9px 22px; font-weight: 600; cursor: pointer;" onclick="App.confirmDeleteDonor('${id}', '${(name || '').replace(/'/g, "\\'")}')">🗑️ হ্যাঁ, চিরতরে মুছে ফেলুন</button>
        </div>
      </div>
    `);
  },

  async confirmDeleteDonor(id, name) {
    const btn = document.getElementById('confirmDeleteDonorBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'মুছে ফেলা হচ্ছে...';
    }

    try {
      const res = await API.deleteDonor(id);
      this.closeModal();
      alert(`✓ দাতা "${name}" সফলভাবে চিরতরে মুছে ফেলা হয়েছে।`);
      await this.loadInitialData();
      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin' && this.state.adminView === 'donors') {
        await this.navigateAdmin('donors');
      }
    } catch (err) {
      alert(`মুছে ফেলতে সমস্যা হয়েছে: ${err.message}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🗑️ হ্যাঁ, চিরতরে মুছে ফেলুন';
      }
    }
  },

  async viewDonorProfile(donorId) {
    try {
      const res = await API.getDonor(donorId);
      const donor = res.data;
      if (!donor) return alert('দাতার তথ্য পাওয়া যায়নি।');

      const html = `
        <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; flex-shrink: 0; box-shadow: 0 3px 8px rgba(0,0,0,0.12);">
            ${donor.photo_url ? `<img src="${donor.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size: 38px;">👤</span>`}
          </div>
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 style="margin: 0; color: #075B3B; font-size: 1.3rem;">${donor.name_bn}</h3>
                ${donor.name_en ? `<div style="color: #666; font-size: 0.9rem;">${donor.name_en}</div>` : ''}
              </div>
              <button type="button" class="btn btn-gold" onclick="App.openDonationForDonor('${donor.id}')">
                💵 এই দাতার অনুদান জমা করুন
              </button>
            </div>
            <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 0.9rem;">
              <div><strong>আইডি:</strong> <code>${donor.id}</code></div>
              <div><strong>মোবাইল:</strong> <a href="tel:${donor.mobile}">${donor.mobile}</a></div>
              <div><strong>ক্যাটাগরি:</strong> <span class="status-badge active">${donor.category}</span></div>
              <div><strong>প্রতিশ্রুতি:</strong> ৳ ${bnNum(donor.commitment_amount || 0)} (${donor.frequency || 'এককালীন'})</div>
              ${donor.whatsapp ? `<div><strong>হোয়াটসঅ্যাপ:</strong> ${donor.whatsapp}</div>` : ''}
              ${donor.address ? `<div style="grid-column: 1 / -1;"><strong>ঠিকানা:</strong> ${donor.address}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">
          <div class="stat-card" style="padding: 12px;">
            <div class="stat-icon green">💰</div>
            <div class="stat-info">
              <h4>মোট প্রদত্ত অনুদান</h4>
              <div class="stat-value" style="color: #075B3B;">৳ ${bnNum(donor.totalDonated || 0)}</div>
            </div>
          </div>
          <div class="stat-card" style="padding: 12px;">
            <div class="stat-icon gold">📑</div>
            <div class="stat-info">
              <h4>অনুদানের সংখ্যা</h4>
              <div class="stat-value">${bnNum((donor.donations || []).length)} টি</div>
            </div>
          </div>
        </div>

        <h4 style="margin: 16px 0 8px 0; color: #075B3B;">📜 এই দাতার অনুদানের ইতিহাস:</h4>
        <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>রসিদ নম্বর</th>
                <th>তারিখ</th>
                <th>তহবিল / খাত</th>
                <th>পরিমাণ</th>
                <th>হিসাব ও মাধ্যম</th>
                <th>স্ট্যাটাস</th>
                <th>রসিদ</th>
              </tr>
            </thead>
            <tbody>
              ${(donor.donations || []).map(d => `
                <tr>
                  <td><code>${d.receipt_number}</code></td>
                  <td>${d.date}</td>
                  <td>${d.fund_name}</td>
                  <td style="font-weight: 700; color: #075B3B;">৳ ${bnNum(d.amount)}</td>
                  <td>${d.account_name} (${d.payment_method})</td>
                  <td><span class="status-badge ${d.status === 'নিশ্চিত' ? 'verified' : 'pending'}">${d.status}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('donation_receipt', '${d.id}')">🖨️</button>
                  </td>
                </tr>
              `).join('')}
              ${(!donor.donations || donor.donations.length === 0) ? `
                <tr><td colspan="7" style="text-align: center; color: #777;">এখনও কোনো অনুদান জমা দেওয়া হয়নি।</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      `;

      this.openModal(`👤 দাতার প্রোফাইল: ${donor.name_bn}`, html);
    } catch (err) {
      alert(`প্রোফাইল লোড ব্যর্থ: ${err.message}`);
    }
  },

  async handleSaveCommitteeMember(event) {
    event.preventDefault();
    const isSuperAdmin = this.state.user && (
      this.state.user.role === 'superadmin' ||
      this.state.user.username === 'Shahalam69' ||
      this.state.user.username === 'admin' ||
      String(this.state.user.id) === 'USR-001' ||
      String(this.state.user.id) === '1'
    );
    if (!isSuperAdmin) {
      alert('কমিটি সদস্য পরিবর্তনের একক কর্তৃত্ব কেবলমাত্র সুপার এডমিনের হাতে সংরক্ষিত।');
      return;
    }

    const form = event.target;
    const submitBtn = document.getElementById('saveCommitteeSubmitBtn');
    const origText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'সংরক্ষণ করা হচ্ছে...';
    }

    const formData = new FormData(form);
    const memberId = formData.get('id');
    const memberName = formData.get('name_bn');

    formData.append('user_id', this.state.user.id || 'USR-001');
    formData.append('user_name', this.state.user.full_name_bn || 'MD SHAH ALAM');
    formData.append('user_role', 'superadmin');

    try {
      if (memberId) {
        await API.updateCommitteeMember(memberId, formData);
        alert(`✓ পরিচালনা পরিষদ সদস্য "${memberName}"-এর তথ্য সফলভাবে হালনাগাদ হয়েছে!`);
      } else {
        await API.addCommitteeMember(formData);
        alert(`✓ পরিচালনা পরিষদে নতুন সদস্য "${memberName}" সফলভাবে যুক্ত হয়েছে!`);
      }
      this.closeModal();
      await this.loadInitialData();

      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin') {
        if (this.state.adminView === 'committee') {
          await this.navigateAdmin('committee');
        } else if (this.state.adminView === 'advisors') {
          await this.navigateAdmin('advisors');
        }
      }
    } catch (err) {
      alert(`সংরক্ষণ ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  },

  editCommitteeMember(id) {
    const isSuperAdmin = this.state.user && (
      this.state.user.role === 'superadmin' ||
      this.state.user.username === 'Shahalam69' ||
      this.state.user.username === 'admin' ||
      String(this.state.user.id) === 'USR-001' ||
      String(this.state.user.id) === '1'
    );
    if (!isSuperAdmin) {
      alert('কমিটি সদস্য তথ্য পরিবর্তনের ক্ষমতা কেবল সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।');
      return;
    }
    const member = (this.state.committee || []).find(m => String(m.id) === String(id));
    if (!member) {
      alert('সদস্য খুঁজে পাওয়া যায়নি।');
      return;
    }
    this.openModal('committee_member', member);
  },

  deleteCommitteeMember(id, name, designation) {
    const isSuperAdmin = this.state.user && (
      this.state.user.role === 'superadmin' ||
      this.state.user.username === 'Shahalam69' ||
      this.state.user.username === 'admin' ||
      String(this.state.user.id) === 'USR-001' ||
      String(this.state.user.id) === '1'
    );
    if (!isSuperAdmin) {
      alert('কমিটি সদস্য অপসারণের ক্ষমতা কেবল সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।');
      return;
    }

    const member = (this.state.committee || []).find(m => String(m.id) === String(id));
    const memberName = name || (member ? member.name_bn : 'এই সদস্য');
    const memberDesig = designation || (member ? member.designation_bn : 'কমিটি সদস্য');

    this.openModal('⚠️ পরিচালনা পরিষদ সদস্য স্থায়ীভাবে অপসারণ নিশ্চিতকরণ', `
      <div style="text-align: center; padding: 15px 10px;">
        <div style="font-size: 52px; color: #dc3545; line-height: 1; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: #1b2e25; margin-bottom: 10px; font-size: 1.25rem;">আপনি কি এই সদস্যকে চিরতরে মুছে ফেলতে চান?</h3>
        <p style="font-size: 1.05rem; color: #333; margin-bottom: 15px;">
          সদস্যের নাম: <strong style="color: #075b3b;">${memberName}</strong><br>
          <span style="font-size: 0.9rem; color: #555;">পদবী: <strong>${memberDesig}</strong></span><br>
          <span style="font-size: 0.8rem; color: #888;">সদস্য আইডি: #${id}</span>
        </p>
        <div style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 20px; line-height: 1.5; text-align: left;">
          🚨 <strong>সুপার এডমিন সতর্কতা:</strong> আপনি যদি নিচে <strong>"হ্যাঁ, চিরতরে মুছে ফেলুন"</strong> বাটনে চাপ দেন, তবে ডাটাবেজ থেকে এই সদস্যের সকল তথ্য ও ছবি স্থায়ীভাবে ডিলিট হয়ে যাবে। এই কাজটি আর কখনো ফিরিয়ে আনা যাবে না।
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()" style="border: 1px solid #aaa; color: #444; padding: 9px 20px;">✕ বাতিল করুন</button>
          <button type="button" id="confirmDeleteCommitteeBtn" class="btn btn-danger" style="background: #dc3545; color: white; border: none; padding: 9px 22px; font-weight: 600; cursor: pointer;" onclick="App.confirmDeleteCommitteeMember(${id}, '${(memberName || '').replace(/'/g, "\\'")}')">🗑️ হ্যাঁ, চিরতরে মুছে ফেলুন</button>
        </div>
      </div>
    `);
  },

  async confirmDeleteCommitteeMember(id, name) {
    const btn = document.getElementById('confirmDeleteCommitteeBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'মুছে ফেলা হচ্ছে...';
    }

    try {
      const params = new URLSearchParams({
        user_id: this.state.user ? this.state.user.id : 'USR-001',
        user_name: this.state.user ? this.state.user.full_name_bn : 'MD SHAH ALAM',
        user_role: 'superadmin'
      }).toString();

      await API.deleteCommitteeMember(id, params);
      this.closeModal();
      alert(`✓ সদস্য "${name}" সফলভাবে চিরতরে মুছে ফেলা হয়েছে।`);
      await this.loadInitialData();

      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin') {
        if (this.state.adminView === 'committee') {
          await this.navigateAdmin('committee');
        } else if (this.state.adminView === 'advisors') {
          await this.navigateAdmin('advisors');
        }
      }
    } catch (err) {
      alert(`মুছে ফেলতে সমস্যা হয়েছে: ${err.message}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🗑️ হ্যাঁ, চিরতরে মুছে ফেলুন';
      }
    }
  },

  searchExecutiveCommitteeTable(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#execCommitteeAdminTable .exec-committee-row');
    rows.forEach(r => {
      const text = r.getAttribute('data-search') || '';
      r.style.display = text.includes(q) ? '' : 'none';
    });
  },

  searchAdvisorsTable(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#advisorsAdminTable .adv-row');
    rows.forEach(r => {
      const text = r.getAttribute('data-search') || '';
      r.style.display = text.includes(q) ? '' : 'none';
    });
  },

  filterStatDetailRows(query, tableId) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  },

  // -------------------------------------------------------------
  // WELFARE GRANTS & RELIEF AID HANDLERS
  // -------------------------------------------------------------
  previewWelfarePhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('welfarePhotoPreview');
    if (file && preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    }
  },

  handleWelfareCategoryChange(category) {
    const fundSelect = document.getElementById('modalWelfareFundSelect');
    if (!fundSelect) return;
    if (category.includes('চিকিৎসা')) {
      fundSelect.value = '3'; // Medical Fund
    } else if (category.includes('শিক্ষা')) {
      fundSelect.value = '4'; // Education Fund
    } else if (category.includes('দুর্যোগ') || category.includes('বন্যা') || category.includes('শীত') || category.includes('কম্বল') || category.includes('ঘর')) {
      fundSelect.value = '5'; // Emergency Relief Fund
    } else {
      fundSelect.value = '1'; // General Fund
    }
  },

  async handleSaveWelfareGrant(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('saveWelfareSubmitBtn');
    const origText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'সংরক্ষণ করা হচ্ছে...';
    }

    const formData = new FormData(form);
    const grantId = formData.get('id');
    const title = formData.get('title_bn');

    formData.append('user_id', this.state.user ? this.state.user.id : 'admin');
    formData.append('user_name', this.state.user ? this.state.user.full_name_bn : 'Admin');
    formData.append('entered_by', this.state.user ? this.state.user.full_name_bn : 'হিসাব শাখা');

    try {
      if (grantId) {
        await API.updateWelfareGrant(grantId, formData);
        alert(`✓ "${title}"-এর তথ্য সফলভাবে হালনাগাদ করা হয়েছে!`);
      } else {
        const res = await API.createWelfareGrant(formData);
        alert(`✓ এককালীন ত্রাণ ও সহায়তা সফলভাবে সম্পন্ন এবং ক্যাশবুকে অন্তর্ভুক্ত হয়েছে!\nভাউচার নম্বর: ${res.voucher_no}`);
      }
      this.closeModal();
      await this.loadInitialData();

      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin') {
        if (this.state.adminView === 'welfare') {
          await this.navigateAdmin('welfare');
        } else if (this.state.adminView === 'dashboard') {
          await this.navigateAdmin('dashboard');
        } else if (this.state.adminView === 'cashbook') {
          await this.navigateAdmin('cashbook');
        }
      }
    } catch (err) {
      alert(`সংরক্ষণ ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  },

  async openEditWelfareModal(id) {
    try {
      const res = await API.getWelfareGrant(id);
      if (res && res.success && res.data) {
        this.openModal('welfare_grant', res.data);
      } else {
        alert('তথ্য পাওয়া যায়নি।');
      }
    } catch (err) {
      alert(`ত্রুটি: ${err.message}`);
    }
  },

  handleDeleteWelfareGrant(id, title) {
    const isSuperAdmin = this.state.user && (
      this.state.user.role === 'superadmin' ||
      this.state.user.username === 'Shahalam69' ||
      this.state.user.username === 'admin' ||
      String(this.state.user.id) === 'USR-001' ||
      String(this.state.user.id) === '1'
    );
    if (!isSuperAdmin) {
      alert('ত্রাণ বা অনুদান রেকর্ড মুছে ফেলার অনুমতি কেবল সুপার এডমিনের রয়েছে।');
      return;
    }

    this.openModal('⚠️ ত্রাণ ও সহায়তা রেকর্ড অপসারণ নিশ্চিতকরণ', `
      <div style="text-align: center; padding: 15px 10px;">
        <div style="font-size: 52px; color: #dc3545; line-height: 1; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: #1b2e25; margin-bottom: 10px; font-size: 1.25rem;">আপনি কি এই ত্রাণের রেকর্ড মুছে ফেলতে চান?</h3>
        <p style="font-size: 1.05rem; color: #333; margin-bottom: 15px;">
          শিরোনাম: <strong style="color: #075b3b;">${title}</strong><br>
          <span style="font-size: 0.85rem; color: #777;">আইডি: ${id}</span>
        </p>
        <div style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 20px; line-height: 1.5; text-align: left;">
          🚨 <strong>সতর্কবার্তা:</strong> এই রেকর্ড মুছে ফেললে ক্যাশবুক থেকে সংশ্লিষ্ট ডেবিট আউট লেনদেনটি মুছে যাবে এবং নগদ ব্যালেন্স স্বয়ংক্রিয়ভাবে পূর্বের অবস্থায় ফিরে যাবে।
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()" style="border: 1px solid #aaa; color: #444; padding: 9px 20px;">✕ বাতিল</button>
          <button type="button" id="confirmDeleteWelfareBtn" class="btn btn-danger" style="background: #dc3545; color: white; border: none; padding: 9px 22px; font-weight: 600; cursor: pointer;" onclick="App.confirmDeleteWelfareGrant('${id}', '${(title || '').replace(/'/g, "\\'")}')">🗑️ হ্যাঁ, মুছে ফেলুন</button>
        </div>
      </div>
    `);
  },

  async confirmDeleteWelfareGrant(id, title) {
    const btn = document.getElementById('confirmDeleteWelfareBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'মুছে ফেলা হচ্ছে...';
    }

    try {
      const params = new URLSearchParams({
        user_id: this.state.user ? this.state.user.id : 'USR-001',
        user_name: this.state.user ? this.state.user.full_name_bn : 'MD SHAH ALAM',
        user_role: 'superadmin'
      }).toString();

      await API.deleteWelfareGrant(id, params);
      this.closeModal();
      alert(`✓ "${title}" রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে।`);
      await this.loadInitialData();

      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin' && this.state.adminView === 'welfare') {
        await this.navigateAdmin('welfare');
      }
    } catch (err) {
      alert(`মুছে ফেলতে সমস্যা হয়েছে: ${err.message}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🗑️ হ্যাঁ, মুছে ফেলুন';
      }
    }
  },

  async viewWelfareVoucher(id) {
    try {
      const res = await API.getWelfareGrant(id);
      if (res && res.success && res.data) {
        const voucherHtml = DocumentGenerator.generateWelfareGrantVoucher(this.state.org || {}, res.data);
        this.openModal(`📄 অফিশিয়াল ত্রাণ ও সহায়তা ভাউচার (${res.data.voucher_no || res.data.id})`, `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button class="btn btn-primary btn-sm" onclick="App.printVoucherContent()">🖨️ ভাউচার রসিদ প্রিন্ট করুন</button>
            </div>
            <div id="voucherModalContent" style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #D3E4DB;">
              ${voucherHtml}
            </div>
          </div>
        `);
      } else {
        alert('ভাউচার লোড করা সম্ভব হয়নি।');
      }
    } catch (err) {
      alert(`ত্রুটি: ${err.message}`);
    }
  },

  printVoucherContent() {
    window.print();
  },

  filterWelfareGrants() {
    const cat = document.getElementById('welfareCategoryFilter')?.value || 'সব খাত';
    const q = (document.getElementById('welfareSearchInput')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#welfareGrantsTable tbody tr.welfare-grant-row');

    rows.forEach(r => {
      const rowCat = r.getAttribute('data-category') || '';
      const rowSearch = r.getAttribute('data-search') || '';

      const matchCat = (cat === 'সব খাত' || rowCat === cat);
      const matchSearch = (!q || rowSearch.includes(q));

      r.style.display = (matchCat && matchSearch) ? '' : 'none';
    });
  },

  openImagePreview(url, title) {
    this.openModal(`📷 ${title || 'প্রমাণক ছবি'}`, `
      <div style="text-align: center; padding: 10px;">
        <img src="${url}" alt="${title}" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
        <div style="margin-top: 12px; font-weight: 600; color: #075B3B;">${title || ''}</div>
        <div style="margin-top: 10px;">
          <a href="${url}" target="_blank" download class="btn btn-outline-green btn-sm">💾 সম্পূর্ণ ছবি ডাউনলোড</a>
        </div>
      </div>
    `);
  },

  // -------------------------------------------------------------
  // STAT CARDS INTERACTIVE DRILLDOWN MODAL
  // -------------------------------------------------------------
  async showStatDetailsModal(metricKey) {
    const modal = document.getElementById('globalModal');
    if (!modal) return;
    const container = modal.querySelector('.modal-container');
    if (container) container.style.maxWidth = '920px';

    this.openModal('তথ্য লোড হচ্ছে...', `
      <div style="text-align: center; padding: 40px; color: #52665D;">
        <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
        <div>বিস্তারিত তথ্য ও তালিকা লোড করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</div>
      </div>
    `);

    try {
      // 1. Preload latest stats and needed datasets
      const [statsRes, donorsRes, donationsRes, loansRes, expRes, accRes, subRes, appRes, trxRes] = await Promise.all([
        API.getDashboardStats().catch(() => null),
        API.getDonors().catch(() => null),
        API.getDonations().catch(() => null),
        API.getLoans().catch(() => null),
        API.getExpenses().catch(() => null),
        API.getAccounts().catch(() => null),
        API.getBkashSubmissions().catch(() => null),
        API.getApplications().catch(() => null),
        API.getCashbookReport().catch(() => null)
      ]);

      if (statsRes && statsRes.success) this.state.stats = statsRes.data;
      if (donorsRes && donorsRes.success) this.state.donors = donorsRes.data;
      if (donationsRes && donationsRes.success) this.state.donations = donationsRes.data;
      if (loansRes && loansRes.success) this.state.loans = loansRes.data;
      if (expRes && expRes.success) this.state.expenses = expRes.data;
      if (accRes && accRes.success) this.state.accounts = accRes.data;
      if (subRes && subRes.success) this.state.submissions = subRes.data;
      if (appRes && appRes.success) this.state.applications = appRes.data;

      const stats = this.state.stats || {};
      const donors = this.state.donors || [];
      const donations = this.state.donations || [];
      const loans = this.state.loans || [];
      const expenses = this.state.expenses || [];
      const accounts = this.state.accounts || [];
      const submissions = this.state.submissions || [];
      const applications = this.state.applications || [];
      const transactions = (trxRes && trxRes.data && trxRes.data.transactions) || (stats.recentTransactions || []);
      const todayStr = stats.todayStr || getDhakaDateStr();

      // -----------------------------------------------------------
      // METRIC 1: মোট তরল তহবিল (Total Liquid Balance)
      // "JEMON AMAR TOTAL BALANCE 20000 TAKA, AMI SEI BOX A CLICK KORLE JENO DEKHTE PAI K KOTO TAKA AMAY JOMA DIYECE"
      // -----------------------------------------------------------
      if (metricKey === 'totalLiquidBalance') {
        const verifiedDonations = donations.filter(d => d.status === 'নিশ্চিত');

        this.openModal('💼 মোট তরল তহবিল ও জমাকারীদের হিসাব বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Top Liquid Funds Banner -->
            <div style="background: linear-gradient(135deg, rgba(7, 91, 59, 0.08), rgba(7, 91, 59, 0.02)); border: 1.5px solid var(--primary-deep-green); border-radius: 10px; padding: 16px 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 0.85rem; color: #52665D; font-weight: 600;">💼 বর্তমান মোট তরল তহবিল স্থিতি:</span>
                  <div style="font-size: 1.85rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(stats.totalLiquidBalance)}</div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <div style="background: white; border: 1px solid #c8e6c9; border-radius: 8px; padding: 6px 12px; font-size: 0.85rem;">
                    💵 হাতে নগদ: <strong style="color: #075B3B;">৳ ${bnNum(stats.cashBalance)}</strong>
                  </div>
                  <div style="background: white; border: 1px solid #bbdefb; border-radius: 8px; padding: 6px 12px; font-size: 0.85rem;">
                    🏦 ব্যাংক হিসাব: <strong style="color: #0d47a1;">৳ ${bnNum(stats.bankBalance)}</strong>
                  </div>
                  <div style="background: white; border: 1px solid #ffe082; border-radius: 8px; padding: 6px 12px; font-size: 0.85rem;">
                    📱 বিকাশ/মোবাইল: <strong style="color: #8c6e14;">৳ ${bnNum(stats.bkashBalance)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Focus Section: কে কত টাকা জমা দিয়েছে (দাতার তালিকা ও জমার হিসাব) -->
            <div style="border-top: 2px dashed #c8e6c9; padding-top: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                <div>
                  <h4 style="margin: 0; color: #075B3B; font-size: 1.15rem; display: flex; align-items: center; gap: 6px;">
                    <span>👥</span> কে কত টাকা জমা দিয়েছে (দাতার তালিকা ও জমার হিসাব)
                  </h4>
                  <small style="color: #555;">মোট নিবন্ধিত শুভাকাঙ্ক্ষী ও দাতা: <strong>${bnNum(donors.length)} জন</strong> | মোট সংগৃহীত অনুদান: <strong>৳ ${bnNum(stats.totalDonations)}</strong></small>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <input type="text" class="form-control" placeholder="🔍 দাতার নাম বা মোবাইল দিয়ে খুঁজুন..." onkeyup="App.filterStatDetailRows(this.value, 'statLiquidDonorsTable')" style="max-width: 260px; padding: 6px 12px; font-size: 0.88rem;">
                  <button class="btn btn-primary btn-sm" onclick="App.openModal('donation')">➕ নতুন অনুদান জমা</button>
                </div>
              </div>

              <!-- Table 1: Donors Breakdown (Who deposited how much) -->
              <div class="table-responsive" style="max-height: 290px; overflow-y: auto; margin-bottom: 16px;">
                <table class="data-table" id="statLiquidDonorsTable">
                  <thead>
                    <tr>
                      <th style="width: 50px; text-align: center;">ক্রম</th>
                      <th>দাতার নাম (বাংলা ও ইংরেজি)</th>
                      <th>মোবাইল নম্বর</th>
                      <th>ক্যাটাগরি</th>
                      <th style="text-align: right;">মোট প্রকৃত জমা / দান</th>
                      <th style="text-align: center;">দান সংখ্যা</th>
                      <th style="text-align: center;">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${donors.map((d, idx) => `
                      <tr>
                        <td style="text-align: center; font-weight: 700; color: #555;">#${bnNum(idx + 1)}</td>
                        <td>
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #e8f5ec; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--accent-gold);">
                              ${d.photo_url ? `<img src="${d.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span>👤</span>`}
                            </div>
                            <div>
                              <strong style="color: #075B3B;">${d.name_bn}</strong>
                              ${d.name_en ? `<br><small style="color: #777;">${d.name_en}</small>` : ''}
                            </div>
                          </div>
                        </td>
                        <td>${d.mobile}</td>
                        <td><span class="status-badge active" style="font-size: 0.76rem;">${d.category || 'এককালীন'}</span></td>
                        <td style="text-align: right; font-weight: 800; color: #075B3B; font-size: 1.05rem;">৳ ${bnNum(d.totalDonated || 0)}</td>
                        <td style="text-align: center; font-weight: 600;">${bnNum(d.donationCount || 0)} বার</td>
                        <td style="text-align: center;">
                          <button class="btn btn-sm btn-gold" onclick="App.openDonationForDonor('${d.id}')" style="padding: 3px 8px; font-size: 0.78rem;">💵 জমা নিন</button>
                        </td>
                      </tr>
                    `).join('')}
                    ${donors.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777; padding: 20px;">কোনো দাতার তথ্য পাওয়া যায়নি।</td></tr>` : ''}
                  </tbody>
                </table>
              </div>

              <!-- Table 2: Recent Individual Verified Receipts -->
              <div style="font-weight: 700; color: #1B2E25; margin-bottom: 8px; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center;">
                <span>🕒 সাম্প্রতিক অনুদান ও জমার বিস্তারিত রসিদ লেজার:</span>
                <button class="btn btn-sm btn-outline-green" onclick="App.navigateAdmin('donations')" style="padding: 3px 10px; font-size: 0.78rem;">সকল রসিদ দেখুন ➔</button>
              </div>
              <div class="table-responsive" style="max-height: 220px; overflow-y: auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>রসিদ নং</th>
                      <th>তারিখ</th>
                      <th>দাতার নাম</th>
                      <th>জমার হিসাব</th>
                      <th>অনুদানের খাত</th>
                      <th style="text-align: right;">পরিমাণ</th>
                      <th>পদ্ধতি / TrxID</th>
                      <th style="text-align: center;">রসিদ প্রিন্ট</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${verifiedDonations.slice(0, 15).map(vd => `
                      <tr>
                        <td style="font-weight: 600; font-family: var(--font-en);">${vd.receipt_number}</td>
                        <td>${vd.date}</td>
                        <td><strong>${vd.donor_name}</strong></td>
                        <td>${vd.account_name}</td>
                        <td>${vd.fund_name}</td>
                        <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(vd.amount)}</td>
                        <td>${vd.payment_method} ${vd.transaction_reference ? `(${vd.transaction_reference})` : ''}</td>
                        <td style="text-align: center;">
                          <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('donation_receipt', '${vd.id}')" style="padding: 2px 8px; font-size: 0.75rem;">🖨️ রসিদ</button>
                        </td>
                      </tr>
                    `).join('')}
                    ${verifiedDonations.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777; padding: 15px;">কোনো অনুদানের রেকর্ড নেই।</td></tr>` : ''}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 2: বর্তমান নগদ ব্যালেন্স (Cash Balance)
      // -----------------------------------------------------------
      else if (metricKey === 'cashBalance') {
        const cashTrx = transactions.filter(t => t.account_id === 1 || String(t.account_name || '').includes('নগদ'));

        this.openModal('💵 বর্তমান নগদ ব্যালেন্স (Cash in Hand) ও ক্যাশবুক বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: linear-gradient(135deg, rgba(7, 91, 59, 0.08), rgba(7, 91, 59, 0.02)); border: 1.5px solid var(--primary-deep-green); border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 0.85rem; color: #52665D;">💵 হাতে নগদ মোট অবশিষ্ট ব্যালেন্স:</span>
                  <div style="font-size: 1.8rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(stats.cashBalance)}</div>
                </div>
                <button class="btn btn-outline-green btn-sm" onclick="App.navigateAdmin('cashbook')">📖 সম্পূর্ণ ক্যাশবুক ও নগদ খতিয়ান দেখুন</button>
              </div>
            </div>

            <div style="font-weight: 700; color: #075B3B;">🕒 সাম্প্রতিক নগদ লেনদেন (নগদ জমা ও নগদ খরচ):</div>
            <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>লেনদেনের ধরন</th>
                    <th>বিবরণ</th>
                    <th>ভাউচার / রেফারেন্স</th>
                    <th style="text-align: right;">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${cashTrx.map(t => `
                    <tr>
                      <td>${t.date}</td>
                      <td>
                        <span class="status-badge ${t.direction === 'IN' ? 'verified' : 'rejected'}">
                          ${t.direction === 'IN' ? 'নগদ জমা (+)' : 'নগদ প্রদান (-)'} [${t.type === 'WELFARE_GRANT' ? 'এককালীন অনুদান/ত্রাণ' : (t.type === 'DISBURSEMENT' ? 'ঋণ বিতরণ' : (t.type === 'REPAYMENT' ? 'ধার ফেরত' : (t.type === 'DONATION' ? 'অনুদান' : (t.type === 'EXPENSE' ? 'সাধারণ ব্যয়' : t.type))))}]
                        </span>
                      </td>
                      <td>${t.description_bn}</td>
                      <td style="font-family: var(--font-en);">${t.reference_no || 'N/A'}</td>
                      <td style="text-align: right; font-weight: 700; color: ${t.direction === 'IN' ? '#075B3B' : '#C62828'};">
                        ৳ ${bnNum(t.amount)}
                      </td>
                    </tr>
                  `).join('')}
                  ${cashTrx.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #777; padding: 20px;">কোনো নগদ লেনদেন পাওয়া যায়নি।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 3: ব্যাংক ব্যালেন্স (Bank Balance)
      // -----------------------------------------------------------
      else if (metricKey === 'bankBalance') {
        const bankAccounts = accounts.filter(a => a.account_type === 'ব্যাংক হিসাব' || a.id === 2);

        this.openModal('🏦 ব্যাংক ব্যালেন্স ও ব্যাংক একাউন্ট বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 110, 253, 0.02)); border: 1.5px solid #0d6efd; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 0.85rem; color: #0d6efd; font-weight: 600;">🏦 মোট ব্যাংক ব্যালেন্স:</span>
                  <div style="font-size: 1.8rem; font-weight: 800; color: #0a58ca;">৳ ${bnNum(stats.bankBalance)}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="App.openModal('transfer')">🔄 ব্যাংক স্থানান্তর এন্ট্রি</button>
              </div>
            </div>

            <div style="font-weight: 700; color: #0d47a1;">🏛️ অনুমোদিত ব্যাংক হিসাবসমূহের স্থিতি:</div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>হিসাবের নাম</th>
                    <th>হিসাব নম্বর</th>
                    <th>ব্যাংক ও শাখা</th>
                    <th style="text-align: right;">বর্তমান ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody>
                  ${bankAccounts.map(b => `
                    <tr>
                      <td><strong>${b.account_name_bn}</strong></td>
                      <td style="font-family: var(--font-en); font-weight: 600;">${b.account_number || 'N/A'}</td>
                      <td>${b.bank_name || 'সোনালী ব্যাংক পিএলসি'}, ${b.branch_name || 'রৌমারী শাখা'}</td>
                      <td style="text-align: right; font-weight: 800; color: #0a58ca; font-size: 1.1rem;">৳ ${bnNum(b.current_balance)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 4: বিকাশ/মোবাইল ব্যালেন্স (bKash Balance)
      // -----------------------------------------------------------
      else if (metricKey === 'bkashBalance') {
        this.openModal('📱 বিকাশ / নগদ / রকেট ব্যালেন্স বিবরণী (০১৯৬৬-৪৪২৭৬৯)', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: linear-gradient(135deg, rgba(226, 19, 110, 0.1), rgba(226, 19, 110, 0.02)); border: 1.5px solid #E2136E; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 0.85rem; color: #E2136E; font-weight: 600;">📱 অফিসিয়াল বিকাশ / নগদ স্থিতি:</span>
                  <div style="font-size: 1.8rem; font-weight: 800; color: #E2136E;">৳ ${bnNum(stats.bkashBalance)}</div>
                  <small style="color: #555;">নম্বর: <strong>01966442769 (Personal Send Money)</strong></small>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm" style="background:#E2136E; color:white;" onclick="App.navigateAdmin('bkash')">📱 বিকাশ যাচাইকরণ পোর্টাল</button>
                  <button class="btn btn-sm btn-outline-green" onclick="App.openModal('transfer')">🔄 ব্যাংক/ক্যাশ স্থানান্তর</button>
                </div>
              </div>
            </div>

            <div style="font-weight: 700; color: #E2136E;">🕒 সাম্প্রতিক যাচাইকৃত বিকাশ ও নগদ অনুদান:</div>
            <div class="table-responsive" style="max-height: 340px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>দাতার নাম ও মোবাইল</th>
                    <th>ট্রানজ্যাকশন আইডি (TrxID)</th>
                    <th>অনুদানের খাত</th>
                    <th style="text-align: right;">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${submissions.filter(s => s.verification_status === 'নিশ্চিত').map(s => `
                    <tr>
                      <td>${s.payment_date}</td>
                      <td><strong>${s.donor_name}</strong><br><small>${s.donor_mobile}</small></td>
                      <td style="font-family: var(--font-en); font-weight: 700; color: #075B3B;">${s.transaction_id}</td>
                      <td>${s.fund_category}</td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(s.amount)}</td>
                    </tr>
                  `).join('')}
                  ${submissions.filter(s => s.verification_status === 'নিশ্চিত').length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #777; padding: 20px;">কোনো বিকাশ জমার রেকর্ড নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 5: মোট অনুদান (Total Donations)
      // -----------------------------------------------------------
      else if (metricKey === 'totalDonations') {
        const verified = donations.filter(d => d.status === 'নিশ্চিত');

        this.openModal('❤️ মোট অনুদান (যাচাইকৃত) তালিকা ও রসিদসমূহ', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">মোট যাচাইকৃত অনুদান:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(stats.totalDonations)}</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="form-control" placeholder="🔍 রসিদ, দাতা বা মোবাইল..." onkeyup="App.filterStatDetailRows(this.value, 'statAllDonationsTable')" style="max-width: 260px; padding: 6px 12px;">
                <button class="btn btn-gold btn-sm" onclick="App.openModal('donation')">➕ নতুন অনুদান এন্ট্রি</button>
              </div>
            </div>

            <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
              <table class="data-table" id="statAllDonationsTable">
                <thead>
                  <tr>
                    <th>রসিদ নং</th>
                    <th>তারিখ</th>
                    <th>দাতার নাম ও মোবাইল</th>
                    <th>তহবিল / খাত</th>
                    <th>হিসাব</th>
                    <th style="text-align: right;">পরিমাণ (৳)</th>
                    <th>পদ্ধতি/রেফারেন্স</th>
                    <th style="text-align: center;">রসিদ</th>
                  </tr>
                </thead>
                <tbody>
                  ${verified.map(d => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${d.receipt_number}</td>
                      <td>${d.date}</td>
                      <td><strong>${d.donor_name}</strong><br><small>${d.donor_mobile || ''}</small></td>
                      <td>${d.fund_name}</td>
                      <td>${d.account_name}</td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(d.amount)}</td>
                      <td>${d.payment_method} ${d.transaction_reference ? `(${d.transaction_reference})` : ''}</td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('donation_receipt', '${d.id}')" style="padding: 2px 8px; font-size: 0.75rem;">🖨️ রসিদ</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 6: এই মাসের অনুদান (This Month Donations)
      // -----------------------------------------------------------
      else if (metricKey === 'thisMonthDonations') {
        const monthPrefix = todayStr.substring(0, 7);
        const thisMonth = donations.filter(d => d.status === 'নিশ্চিত' && (d.date || '').startsWith(monthPrefix));

        this.openModal('📅 এই চলতি মাসের অনুদান তালিকা ও বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">চলতি মাসে (${monthPrefix}) মোট প্রাপ্ত অনুদান:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(stats.thisMonthDonations)}</div>
              </div>
              <button class="btn btn-gold btn-sm" onclick="App.openModal('donation')">➕ নতুন অনুদান এন্ট্রি</button>
            </div>

            <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>রসিদ নং</th>
                    <th>তারিখ</th>
                    <th>দাতার নাম</th>
                    <th>খাত</th>
                    <th>জমার হিসাব</th>
                    <th style="text-align: right;">পরিমাণ (৳)</th>
                    <th>রসিদ</th>
                  </tr>
                </thead>
                <tbody>
                  ${thisMonth.map(d => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${d.receipt_number}</td>
                      <td>${d.date}</td>
                      <td><strong>${d.donor_name}</strong></td>
                      <td>${d.fund_name}</td>
                      <td>${d.account_name}</td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(d.amount)}</td>
                      <td>
                        <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('donation_receipt', '${d.id}')" style="padding: 2px 8px; font-size: 0.75rem;">🖨️ প্রিন্ট</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${thisMonth.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777; padding: 20px;">এই মাসে এখনো কোনো অনুদান লিপিবদ্ধ হয়নি।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 7: মোট বিতরণকৃত ধার (Total Disbursed Loans)
      // -----------------------------------------------------------
      else if (metricKey === 'totalDisbursed') {
        this.openModal('🤝 মোট বিতরণকৃত সুদমুক্ত ধার গ্রহীতাদের তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">মোট বিতরণকৃত সুদমুক্ত মূলধন:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(stats.totalDisbursed)}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.navigateAdmin('disbursement')">🤝 নতুন ধার বিতরণ পেজে যান</button>
            </div>

            <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতার নাম ও মোবাইল</th>
                    <th style="text-align: right;">মূল ঋণের পরিমাণ</th>
                    <th>বিতরণের তারিখ</th>
                    <th>পরিশোধের শেষ তারিখ</th>
                    <th>উদ্দেশ্য</th>
                    <th>স্ট্যাটাস</th>
                    <th>চুক্তিপত্র</th>
                  </tr>
                </thead>
                <tbody>
                  ${loans.map(l => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                      <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(l.original_principal)}</td>
                      <td>${l.disbursement_date}</td>
                      <td>${l.due_date}</td>
                      <td>${l.purpose || 'সাধারণ'}</td>
                      <td>
                        <span class="status-badge ${l.loan_status === 'সক্রিয়' ? 'active' : (l.loan_status === 'মেয়াদোত্তীর্ণ' ? 'overdue' : 'completed')}">
                          ${l.loan_status}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('loan_contract', '${l.id}')" style="padding: 2px 8px; font-size: 0.75rem;">📜 চুক্তিপত্র</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${loans.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777; padding: 20px;">কোনো ঋণ বিতরণের তথ্য নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 8: ফেরত পাওয়া মূল টাকা (Total Repaid)
      // -----------------------------------------------------------
      else if (metricKey === 'totalRepaid') {
        const repaidLoans = loans.filter(l => (l.total_principal_repaid || 0) > 0);

        this.openModal('🔄 ফেরত পাওয়া মূল টাকা ও কিস্তি আদায় বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">মোট ফেরত পাওয়া মূলধন:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #8c6e14;">৳ ${bnNum(stats.totalRepaid)}</div>
              </div>
              <button class="btn btn-gold btn-sm" onclick="App.openModal('repayment')">🔄 নতুন ফেরত এন্ট্রি</button>
            </div>

            <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতার নাম</th>
                    <th style="text-align: right;">মোট মূল ঋণ</th>
                    <th style="text-align: right;">ফেরত প্রাপ্ত মূলধন</th>
                    <th style="text-align: right;">অবশিষ্ট বকেয়া</th>
                    <th>স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  ${repaidLoans.map(l => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                      <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                      <td style="text-align: right;">৳ ${bnNum(l.original_principal)}</td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(l.total_principal_repaid)}</td>
                      <td style="text-align: right; color: ${l.outstanding_principal > 0 ? '#C62828' : '#777'};">৳ ${bnNum(l.outstanding_principal)}</td>
                      <td><span class="status-badge ${l.loan_status === 'সম্পূর্ণ পরিশোধিত' ? 'completed' : 'active'}">${l.loan_status}</span></td>
                    </tr>
                  `).join('')}
                  ${repaidLoans.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">কোনো ঋণ ফেরতের তথ্য নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 9: মোট বকেয়া ধার (Outstanding Loans)
      // -----------------------------------------------------------
      else if (metricKey === 'outstandingLoans') {
        const outstanding = loans.filter(l => (l.outstanding_principal || 0) > 0);

        this.openModal('⏳ মোট বকেয়া ধার (পাওনা মূলধন) ও গ্রহীতাদের তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: linear-gradient(135deg, rgba(200, 149, 44, 0.12), rgba(200, 149, 44, 0.03)); border: 1.5px solid #D9B84C; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 0.85rem; color: #8c6e14; font-weight: 600;">⏳ মোট বকেয়া পাওনা (ঘূর্ণায়মান তহবিল):</span>
                  <div style="font-size: 1.8rem; font-weight: 800; color: #8c6e14;">৳ ${bnNum(stats.outstandingLoans)}</div>
                </div>
                <button class="btn btn-gold btn-sm" onclick="App.openModal('repayment')">🔄 ফেরত / কিস্তি জমা নিন</button>
              </div>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতার নাম ও মোবাইল</th>
                    <th style="text-align: right;">মূল ঋণ</th>
                    <th style="text-align: right;">পরিশোধিত</th>
                    <th style="text-align: right; color:#C62828;">বকেয়া পাওনা (৳)</th>
                    <th>মেয়াদ শেষ</th>
                    <th style="text-align: center;">যোগাযোগ ও তাগিদ</th>
                  </tr>
                </thead>
                <tbody>
                  ${outstanding.map(l => {
                    const cleanPhone = (l.applicant_mobile || '').replace(/[^0-9]/g, '');
                    return `
                      <tr>
                        <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                        <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                        <td style="text-align: right;">৳ ${bnNum(l.original_principal)}</td>
                        <td style="text-align: right; color:#075B3B;">৳ ${bnNum(l.total_principal_repaid)}</td>
                        <td style="text-align: right; font-weight: 800; color: #C62828; font-size: 1.05rem;">৳ ${bnNum(l.outstanding_principal)}</td>
                        <td>${l.due_date}</td>
                        <td style="text-align: center;">
                          <div style="display: flex; gap: 4px; justify-content: center;">
                            ${cleanPhone ? `<a href="tel:${cleanPhone}" class="btn btn-sm btn-outline-green" style="padding: 2px 6px; font-size: 0.75rem;">📞 কল</a>` : ''}
                            ${cleanPhone ? `<a href="https://wa.me/88${cleanPhone}" target="_blank" class="btn btn-sm btn-gold" style="padding: 2px 6px; font-size: 0.75rem;">💬 WhatsApp</a>` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${outstanding.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #075B3B; padding: 20px;">✓ আলহামদুলিল্লাহ! কোনো বকেয়া ঋণ অবশিষ্ট নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 10: চলমান ঋণের সংখ্যা (Active Loans Count)
      // -----------------------------------------------------------
      else if (metricKey === 'activeLoansCount') {
        const activeLoans = loans.filter(l => l.loan_status === 'সক্রিয়' && l.outstanding_principal > 0);

        this.openModal('🏃 বর্তমানে চলমান সক্রিয় ঋণসমূহের তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">মোট চলমান সক্রিয় ঋণের সংখ্যা:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #075B3B;">${bnNum(stats.activeLoansCount)} টি</div>
              </div>
              <button class="btn btn-gold btn-sm" onclick="App.openModal('repayment')">🔄 ফেরত / কিস্তি এন্ট্রি</button>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতা</th>
                    <th style="text-align: right;">মূল ঋণ</th>
                    <th style="text-align: right;">অবশিষ্ট বকেয়া</th>
                    <th>বিতরণের তারিখ</th>
                    <th>মেয়াদ শেষ</th>
                    <th style="text-align: center;">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeLoans.map(l => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                      <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                      <td style="text-align: right;">৳ ${bnNum(l.original_principal)}</td>
                      <td style="text-align: right; font-weight: 700; color: #C62828;">৳ ${bnNum(l.outstanding_principal)}</td>
                      <td>${l.disbursement_date}</td>
                      <td>${l.due_date}</td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm btn-gold" onclick="App.openModal('repayment')" style="padding: 3px 8px; font-size: 0.78rem;">🔄 কিস্তি গ্রহণ</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${activeLoans.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777; padding: 20px;">বর্তমানে কোনো চলমান সক্রিয় ঋণ নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 11: আসন্ন ফেরতের সংখ্যা (Upcoming in 3 Days)
      // -----------------------------------------------------------
      else if (metricKey === 'upcomingCount') {
        const upcomingList = [];
        loans.forEach(l => {
          if (l.loan_status === 'সক্রিয়' && l.outstanding_principal > 0) {
            const diff = getDaysDiff(l.due_date, todayStr);
            if (diff > 0 && diff <= 3) {
              upcomingList.push({ ...l, daysLeft: diff });
            }
          }
        });

        this.openModal('⏰ আগামী ৩ দিনের মধ্যে ফেরতযোগ্য ধারের তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: var(--warning-amber-bg); border: 1.5px solid var(--warning-amber); border-radius: 8px; padding: 14px 18px;">
              <div style="font-weight: 700; color: #855300; font-size: 1.05rem;">
                আসন্ন ৩ দিনের মধ্যে মেয়াদ শেষ হতে যাওয়া ঋণের সংখ্যা: ${bnNum(upcomingList.length)} টি
              </div>
              <small style="color: #666;">সময়মতো পরিশোধের তাগিদ দিতে নিচে সরাসরি কল বা WhatsApp বার্তা পাঠান।</small>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতা</th>
                    <th>বকেয়া (৳)</th>
                    <th>পরিশোধের শেষ তারিখ</th>
                    <th>বাকি দিন</th>
                    <th style="text-align: center;">তাগিদ দিন</th>
                  </tr>
                </thead>
                <tbody>
                  ${upcomingList.map(l => {
                    const cleanPhone = (l.applicant_mobile || '').replace(/[^0-9]/g, '');
                    return `
                      <tr>
                        <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                        <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                        <td style="font-weight: 700; color: #C62828;">৳ ${bnNum(l.outstanding_principal)}</td>
                        <td>${l.due_date}</td>
                        <td><span class="status-badge pending">${bnNum(l.daysLeft)} দিন বাকি</span></td>
                        <td style="text-align: center;">
                          <div style="display: flex; gap: 6px; justify-content: center;">
                            ${cleanPhone ? `<a href="tel:${cleanPhone}" class="btn btn-sm btn-outline-green" style="padding: 3px 8px; font-size: 0.78rem;">📞 কল</a>` : ''}
                            ${cleanPhone ? `<a href="https://wa.me/88${cleanPhone}?text=${encodeURIComponent('আসসালামু আলাইকুম। কর্জে হাসানা ফাউন্ডেশন থেকে আপনার সুদমুক্ত ঋণের মেয়াদ আগামী ' + l.due_date + ' তারিখে শেষ হতে চলেছে। অনুগ্রহ করে যথাসময়ে পরিশোধের ব্যবস্থা করুন।')}" target="_blank" class="btn btn-sm btn-gold" style="padding: 3px 8px; font-size: 0.78rem;">💬 WhatsApp</a>` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${upcomingList.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #075B3B; padding: 20px;">✓ আগামী ৩ দিনের মধ্যে পরিশোধের নির্ধারিত কোনো ঋণ নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 12: আজ ফেরতের নির্ধারিত ধার (Due Today)
      // -----------------------------------------------------------
      else if (metricKey === 'dueTodayCount') {
        const dueTodayList = loans.filter(l => l.outstanding_principal > 0 && l.due_date === todayStr);

        this.openModal('🎯 আজকেই পরিশোধের নির্ধারিত ধারের তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: #fff8e1; border: 1.5px solid #ffe082; border-radius: 8px; padding: 14px 18px;">
              <div style="font-weight: 700; color: #855300; font-size: 1.05rem;">
                আজকের তারিখে (${todayStr}) পরিশোধযোগ্য ঋণ: ${bnNum(dueTodayList.length)} টি (মোট: ৳ ${bnNum(stats.dueTodayAmount || 0)})
              </div>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতা</th>
                    <th>বকেয়া (৳)</th>
                    <th>নির্ধারিত তারিখ</th>
                    <th style="text-align: center;">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  ${dueTodayList.map(l => {
                    const cleanPhone = (l.applicant_mobile || '').replace(/[^0-9]/g, '');
                    return `
                      <tr>
                        <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                        <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                        <td style="font-weight: 700; color: #C62828;">৳ ${bnNum(l.outstanding_principal)}</td>
                        <td><strong>${l.due_date}</strong> (আজ)</td>
                        <td style="text-align: center;">
                          <div style="display: flex; gap: 6px; justify-content: center;">
                            <button class="btn btn-sm btn-gold" onclick="App.openModal('repayment')" style="padding: 3px 8px; font-size: 0.78rem;">🔄 আদায় এন্ট্রি</button>
                            ${cleanPhone ? `<a href="tel:${cleanPhone}" class="btn btn-sm btn-outline-green" style="padding: 3px 8px; font-size: 0.78rem;">📞 কল</a>` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${dueTodayList.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #075B3B; padding: 20px;">✓ আজকেই পরিশোধের নির্ধারিত কোনো ঋণ নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 13: মেয়াদোত্তীর্ণ ধার (Overdue Loans)
      // -----------------------------------------------------------
      else if (metricKey === 'overdueCount') {
        const overdueList = stats.overdueList || loans.filter(l => l.outstanding_principal > 0 && l.due_date < todayStr);

        this.openModal('🚨 মেয়াদোত্তীর্ণ বকেয়া ধারের লাল সতর্কতা তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: var(--warning-red-bg); border: 2px solid var(--warning-red); border-radius: 8px; padding: 14px 18px;">
              <div style="font-weight: 700; color: #7b1212; font-size: 1.1rem;">
                🚨 জরুরি নোটিশ: ${bnNum(overdueList.length)}টি ধার মেয়াদোত্তীর্ণ হয়েছে! (মোট বকেয়া: ৳ ${bnNum(stats.overdueAmount || 0)})
              </div>
              <small style="color: #7b1212;">ঋণগ্রহীতা এবং জামিনদারের সাথে অবিলম্বে যোগাযোগ করে তহবিল পুনরুদ্ধারের পদক্ষেপ গ্রহণ করুন।</small>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ঋণ আইডি</th>
                    <th>গ্রহীতার নাম ও মোবাইল</th>
                    <th>বকেয়া পাওনা (৳)</th>
                    <th>মেয়াদ শেষের তারিখ</th>
                    <th>মেয়াদোত্তীর্ণের সময়</th>
                    <th style="text-align: center;">জরুরি তাগিদ</th>
                  </tr>
                </thead>
                <tbody>
                  ${overdueList.map(l => {
                    const daysOverdue = getDaysDiff(todayStr, l.due_date);
                    const cleanPhone = (l.applicant_mobile || '').replace(/[^0-9]/g, '');
                    return `
                      <tr>
                        <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                        <td><strong>${l.applicant_name}</strong><br><small>${l.applicant_mobile || ''}</small></td>
                        <td style="font-weight: 800; color: #C62828; font-size: 1.05rem;">৳ ${bnNum(l.outstanding_principal)}</td>
                        <td>${l.due_date}</td>
                        <td><span class="status-badge overdue">${bnNum(daysOverdue)} দিন অতিক্রান্ত</span></td>
                        <td style="text-align: center;">
                          <div style="display: flex; gap: 6px; justify-content: center;">
                            ${cleanPhone ? `<a href="tel:${cleanPhone}" class="btn btn-sm btn-danger" style="padding: 3px 8px; font-size: 0.78rem;">📞 কল</a>` : ''}
                            ${cleanPhone ? `<a href="https://wa.me/88${cleanPhone}?text=${encodeURIComponent('জরুরি নোটিশ: কর্জে হাসানা ফাউন্ডেশন থেকে আপনার গৃহীত ঋণ ' + l.due_date + ' তারিখে মেয়াদোত্তীর্ণ হয়েছে। অবিলম্বে অফিসে যোগাযোগ করে মূলধন পরিশোধ করুন।')}" target="_blank" class="btn btn-sm btn-gold" style="padding: 3px 8px; font-size: 0.78rem;">💬 WhatsApp</a>` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${overdueList.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #075B3B; padding: 20px;">✓ আলহামদুলিল্লাহ! কোনো মেয়াদোত্তীর্ণ ঋণ নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 14: এই মাসের অনুমোদিত ব্যয় (This Month Expenses)
      // -----------------------------------------------------------
      else if (metricKey === 'thisMonthExpenses') {
        const monthPrefix = todayStr.substring(0, 7);
        const thisMonthExp = expenses.filter(e => (e.date || '').startsWith(monthPrefix));

        this.openModal('🧾 এই মাসের অনুমোদিত ব্যয় বিবরণী', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">চলতি মাসে (${monthPrefix}) অনুমোদিত ব্যয়:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #C62828;">৳ ${bnNum(stats.thisMonthExpenses)}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.openModal('expense')">🧾 নতুন ব্যয় এন্ট্রি</button>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>খাত</th>
                    <th>বিবরণ ও ভেন্ডর</th>
                    <th>হিসাব</th>
                    <th>ভাউচার নং</th>
                    <th style="text-align: right;">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${thisMonthExp.map(e => `
                    <tr>
                      <td>${e.date}</td>
                      <td><span class="status-badge" style="background:#fde8e8; color:#9b1c1c;">${e.category}</span></td>
                      <td><strong>${e.description}</strong><br><small>${e.recipient_vendor || ''}</small></td>
                      <td>${e.account_name}</td>
                      <td style="font-family: var(--font-en); font-weight: 600;">${e.voucher_no || 'N/A'}</td>
                      <td style="text-align: right; font-weight: 700; color: #C62828;">৳ ${bnNum(e.amount)}</td>
                    </tr>
                  `).join('')}
                  ${thisMonthExp.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">এই মাসে কোনো ব্যয়ের এন্ট্রি নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 15: অপেক্ষমাণ পেমেন্ট যাচাই (Pending bKash Submissions)
      // -----------------------------------------------------------
      else if (metricKey === 'pendingBkashCount') {
        const pendingSubs = submissions.filter(s => s.verification_status === 'অপেক্ষমাণ');

        this.openModal('📱 অপেক্ষমাণ বিকাশ / নগদ পেমেন্ট যাচাইকরণ তালিকা', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">যাচাইয়ের অপেক্ষায় থাকা পেমেন্ট:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #855300;">${bnNum(pendingSubs.length)} টি</div>
              </div>
              <button class="btn btn-sm btn-outline-green" onclick="App.navigateAdmin('bkash')">📱 পূর্ণাঙ্গ যাচাইকরণ পোর্টালে যান ➔</button>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>দাতার নাম ও মোবাইল</th>
                    <th>প্রেরক বিকাশ</th>
                    <th>ট্রানজ্যাকশন আইডি (TrxID)</th>
                    <th>পরিমাণ</th>
                    <th>স্ক্রিনশট</th>
                    <th style="text-align: center;">যাচাই অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingSubs.map(s => `
                    <tr>
                      <td>${s.payment_date}</td>
                      <td><strong>${s.donor_name}</strong><br><small>${s.donor_mobile}</small></td>
                      <td>${s.sender_bkash_mobile || 'N/A'}</td>
                      <td style="font-family: var(--font-en); font-weight: 700; color: #075B3B;">${s.transaction_id}</td>
                      <td style="font-weight: 700; color: #075B3B;">৳ ${bnNum(s.amount)}</td>
                      <td>${s.screenshot_path ? `<a href="${s.screenshot_path}" target="_blank" class="btn btn-sm btn-outline">ছবি দেখুন</a>` : 'নেই'}</td>
                      <td style="text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                          <button class="btn btn-sm btn-primary" onclick="App.verifyBkashSubmissionAction('${s.id}')">✓ যাচাই ও ক্রেডিট</button>
                          <button class="btn btn-sm btn-danger" onclick="App.rejectBkashSubmissionAction('${s.id}')">✕ বাতিল</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                  ${pendingSubs.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #075B3B; padding: 20px;">✓ বর্তমানে কোনো অপেক্ষমাণ পেমেন্ট যাচাই বাকি নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

      // -----------------------------------------------------------
      // METRIC 16: অপেক্ষমাণ আবেদন (Pending Applications)
      // -----------------------------------------------------------
      else if (metricKey === 'pendingApplicationsCount') {
        const pendingApps = applications.filter(a => a.status !== 'অনুমোদিত' && a.status !== 'প্রত্যাখ্যাত');

        this.openModal('📑 অপেক্ষমাণ ঋণ ও সহায়তা আবেদনসমূহ', `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="font-size: 0.85rem; color: #52665D;">যাচাই ও অনুমোদনের অপেক্ষায় থাকা আবেদন:</span>
                <div style="font-size: 1.7rem; font-weight: 800; color: #0d47a1;">${bnNum(pendingApps.length)} টি</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.navigateAdmin('applications')">📝 পূর্ণাঙ্গ আবেদন ব্যবস্থাপনা পেজে যান ➔</button>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>আবেদন আইডি</th>
                    <th>আবেদনকারীর নাম ও মোবাইল</th>
                    <th>ধরন</th>
                    <th style="text-align: right;">প্রার্থিত ঋণ (৳)</th>
                    <th>উদ্দেশ্য</th>
                    <th>স্ট্যাটাস</th>
                    <th style="text-align: center;">যাচাই ও অনুমোদন</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingApps.map(a => `
                    <tr>
                      <td style="font-family: var(--font-en); font-weight: 600;">${a.id}</td>
                      <td><strong>${a.applicant_name}</strong><br><small>${a.applicant_mobile || ''}</small></td>
                      <td>${a.assistance_type || 'সুদমুক্ত ধার'}</td>
                      <td style="text-align: right; font-weight: 700; color: #075B3B;">৳ ${bnNum(a.requested_amount)}</td>
                      <td>${a.purpose}</td>
                      <td><span class="status-badge pending">${a.status}</span></td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm btn-outline-green" onclick="App.viewApplicationDetails('${a.id}')" style="padding: 3px 8px; font-size: 0.78rem;">🔍 বিস্তারিত ও যাচাই</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${pendingApps.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #075B3B; padding: 20px;">✓ বর্তমানে কোনো অপেক্ষমাণ আবেদন নেই।</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }

    } catch (err) {
      this.openModal('ত্রুটি', `<div class="alert-card danger">তথ্য লোড করতে সমস্যা হয়েছে: ${err.message}</div>`);
    }
  },

  filterPublicCommittee(type) {
    const cards = document.querySelectorAll('#publicCommitteeGrid .public-committee-card');
    const tabs = document.querySelectorAll('.btn-public-com-tab');
    tabs.forEach(t => {
      t.style.background = 'transparent';
      t.style.color = '#075B3B';
      t.style.border = '1px solid #075B3B';
      t.classList.remove('active');
    });

    if (type === 'all') {
      const b = document.getElementById('pubTabAll');
      if (b) { b.style.background = '#075B3B'; b.style.color = 'white'; b.classList.add('active'); }
      cards.forEach(c => c.style.display = '');
    } else if (type === 'পরিচালনা পরিষদ') {
      const b = document.getElementById('pubTabExec');
      if (b) { b.style.background = '#075B3B'; b.style.color = 'white'; b.classList.add('active'); }
      cards.forEach(c => {
        c.style.display = (c.getAttribute('data-type') === 'পরিচালনা পরিষদ') ? '' : 'none';
      });
    } else if (type === 'উপদেষ্টা পরিষদ') {
      const b = document.getElementById('pubTabAdv');
      if (b) { b.style.background = '#075B3B'; b.style.color = 'white'; b.classList.add('active'); }
      cards.forEach(c => {
        c.style.display = (c.getAttribute('data-type') === 'উপদেষ্টা পরিষদ') ? '' : 'none';
      });
    }
  },

  async handleRecordDonation(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'সংরক্ষণ করা হচ্ছে...';
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;
    data.recorded_by = this.state.user?.full_name_bn;

    if (!data.donor_id && this.state.donors) {
      const match = this.state.donors.find(d => d.name_bn === data.donor_name || (data.donor_mobile && d.mobile === data.donor_mobile));
      if (match) data.donor_id = match.id;
    }

    try {
      const res = await API.recordDonation(data);
      alert(`অনুদান রেকর্ড সম্পন্ন! রসিদ নম্বর: ${res.receiptNumber}`);
      this.closeModal();
      await this.loadInitialData();

      // Refresh admin view if open
      const adminArea = document.getElementById('adminContentArea');
      if (adminArea && this.state.currentView === 'admin') {
        if (this.state.adminView === 'donations') {
          await this.navigateAdmin('donations');
        } else if (this.state.adminView === 'dashboard') {
          await this.navigateAdmin('dashboard');
        } else if (this.state.adminView === 'donors') {
          await this.navigateAdmin('donors');
        }
      }
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
  },

  async handleRecordRepayment(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;
    data.recorded_by = this.state.user?.full_name_bn;

    try {
      const res = await API.recordRepayment(data);
      alert(`ফেরত গ্রহণ সম্পন্ন! রসিদ নম্বর: ${res.receiptNumber}\n${res.message}`);
      this.closeModal();
      await this.loadInitialData();
      this.navigateAdmin('repayments');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  async handleRecordExpense(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;
    data.entered_by = this.state.user?.full_name_bn;

    try {
      const res = await API.createExpense(data);
      alert(`ব্যয় লিপিবদ্ধ সম্পন্ন! ভাউচার নং: ${res.voucherNumber}`);
      this.closeModal();
      this.navigateAdmin('expenses');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  async handleTransferAccount(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;
    data.recorded_by = this.state.user?.full_name_bn;

    try {
      await API.transferAccount(data);
      alert('হিসাব স্থানান্তর সফলভাবে সম্পন্ন হয়েছে।');
      this.closeModal();
      this.navigateAdmin('cashbook');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  async handleSettingsUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.phone_verified_warning = form.phone_verified_warning ? form.phone_verified_warning.checked : false;
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;

    try {
      await API.updateSettings(data);
      alert('সংস্থার সেটিংস সফলভাবে সংরক্ষিত হয়েছে।');
      this.state.org = { ...this.state.org, ...data };
      this.updateHeaderOrgInfo();
      this.navigateAdmin('settings');
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
    }
  },

  async handleRestoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('আপনি কি নিশ্চিত যে ডাটাবেজ রিস্টোর করতে চান? এটি বর্তমান ডেটাকে প্রতিস্থাপন করবে।')) {
      return;
    }

    const formData = new FormData();
    formData.append('backup_file', file);
    formData.append('user_id', this.state.user?.id || 'admin');
    formData.append('user_name', this.state.user?.full_name_bn || 'Admin');

    try {
      await API.restoreBackup(formData);
      alert('ডাটাবেজ সফলভাবে রিস্টোর হয়েছে! পেজটি পুনরায় লোড হবে।');
      window.location.reload();
    } catch (err) {
      alert(`রিস্টোর ব্যর্থ: ${err.message}`);
    }
  },

  async verifyBkashSubmissionAction(id) {
    if (!confirm('আপনি কি নিশ্চিত যে এই TrxID যাচাই করে অ্যাকাউন্টে ক্রেডিট করতে চান?')) return;
    try {
      await API.verifyBkashSubmission(id, {
        user_id: this.state.user?.id,
        user_name: this.state.user?.full_name_bn
      });
      alert('বিকাশ পেমেন্ট যাচাই করা হয়েছে এবং অনুদান রসিদ তৈরি হয়েছে!');
      this.navigateAdmin('bkash');
    } catch (err) {
      alert(`যাচাই ব্যর্থ: ${err.message}`);
    }
  },

  async rejectBkashSubmissionAction(id) {
    const reason = prompt('বাতিলের কারণ লিখুন:', 'ভুল ট্রানজ্যাকশন আইডি বা পেমেন্ট অপ্রাপ্তি');
    if (!reason) return;
    try {
      await API.rejectBkashSubmission(id, {
        reason,
        user_id: this.state.user?.id,
        user_name: this.state.user?.full_name_bn
      });
      alert('পেমেন্ট আবেদন বাতিল করা হয়েছে।');
      this.navigateAdmin('bkash');
    } catch (err) {
      alert(`ব্যর্থ: ${err.message}`);
    }
  },

  // -------------------------------------------------------------
  // LOAN DISBURSEMENT MODAL WITH AUTOMATIC MATURITY CALCULATOR
  // -------------------------------------------------------------
  openDisburseModal(appId) {
    const app = this.state.applications.find(a => a.id === appId);
    if (!app) return;

    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `🤝 সুদমুক্ত ধার বিতরণ ও চুক্তিপত্র সম্পাদন: ${app.applicant_name}`;
    const todayStr = getDhakaDateStr();

    modalBody.innerHTML = `
      <form id="disburseLoanForm" onsubmit="App.handleDisburseSubmit(event)">
        <input type="hidden" name="application_id" value="${app.id}">
        <div class="alert-card info">
          <div>
            <strong>স্বয়ংক্রিয় মেয়াদ ও পরিশোধের তারিখ গণনাকারী:</strong><br>
            প্রকৃত বিতরণের তারিখের সাথে অনুমোদিত মেয়াদের দিন যোগ করে স্বয়ংক্রিয়ভাবে পরিপক্বতা তারিখ নির্ধারিত হবে।
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>গ্রহীতার নাম:</label>
            <input type="text" class="form-control" value="${app.applicant_name}" disabled>
          </div>
          <div class="form-group">
            <label>বিতরণযোগ্য মূলধন (৳) <span class="required">*</span></label>
            <input type="number" name="disbursed_amount" class="form-control" value="${app.approved_amount || app.requested_amount}" required>
          </div>
          <div class="form-group">
            <label>প্রকৃত বিতরণের তারিখ <span class="required">*</span></label>
            <input type="date" name="actual_disbursement_date" id="disbDateInput" class="form-control" value="${todayStr}" onchange="App.calculateMaturityDate()" required>
          </div>
          <div class="form-group">
            <label>অনুমোদিত মেয়াদ (দিন) <span class="required">*</span></label>
            <select name="approved_duration_days" id="disbDurationSelect" class="form-control" onchange="App.calculateMaturityDate()" required>
              <option value="10" ${app.approved_duration_days == 10 ? 'selected' : ''}>১০ দিন</option>
              <option value="15" ${app.approved_duration_days == 15 ? 'selected' : ''}>১৫ দিন</option>
              <option value="20" ${app.approved_duration_days == 20 ? 'selected' : ''}>২০ দিন</option>
              <option value="30" ${app.approved_duration_days == 30 ? 'selected' : ''}>৩০ দিন</option>
              <option value="45">৪৫ দিন</option>
              <option value="60">৬০ দিন</option>
            </select>
          </div>
        </div>

        <div style="background: var(--primary-light-green); border: 2px solid var(--primary-deep-green); padding: 14px; border-radius: 8px; margin-bottom: 18px; text-align: center;">
          <div style="font-size: 0.9rem; color: #075B3B;">গণনাকৃত চূড়ান্ত ফেরতের শেষ তারিখ (Maturity Due Date):</div>
          <div id="calculatedDueDateText" style="font-size: 1.5rem; font-weight: 800; color: #075B3B; margin-top: 4px;">
            -
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>বিতরণের হিসাব (যেখান থেকে টাকা যাবে) <span class="required">*</span></label>
            <select name="disbursed_from_account_id" class="form-control" required>
              <option value="1">হাতে নগদ (Cash in Hand)</option>
              <option value="2">সোনালী ব্যাংক পিএলসি</option>
              <option value="3">বিকাশ হিসাব</option>
            </select>
          </div>
          <div class="form-group">
            <label>তহবিলের উৎস</label>
            <select name="fund_id" class="form-control" required>
              <option value="2">সুদমুক্ত ধার ঘূর্ণায়মান তহবিল</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem;">
          ✓ সুদমুক্ত ধার বিতরণ সম্পন্ন করুন ও চুক্তিপত্র তৈরি করুন
        </button>
      </form>
    `;

    modal.classList.add('open');
    this.calculateMaturityDate();
  },

  calculateMaturityDate() {
    const dateInput = document.getElementById('disbDateInput');
    const durationSelect = document.getElementById('disbDurationSelect');
    const resultText = document.getElementById('calculatedDueDateText');
    if (!dateInput || !durationSelect || !resultText) return;

    const disbDate = dateInput.value || getDhakaDateStr();
    const days = parseInt(durationSelect.value, 10) || 30;
    const dueDate = addDaysToDateStr(disbDate, days);
    resultText.textContent = dueDate + ` (${bnNum(days)} দিন মেয়াদ)`;
  },

  async handleDisburseSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.user_id = this.state.user?.id;
    data.user_name = this.state.user?.full_name_bn;
    data.disbursed_by = this.state.user?.full_name_bn;

    try {
      const res = await API.disburseLoan(data);
      alert(`সুদমুক্ত ধার বিতরণ সফলভাবে সম্পন্ন হয়েছে!\nধার আইডি: ${res.loanId}\nফেরতের শেষ তারিখ: ${res.dueDate}`);
      this.closeModal();
      this.navigateAdmin('repayments');
      // Prompt to view agreement
      this.printDocument('loan_agreement', res.loanId);
    } catch (err) {
      alert(`বিতরণ ব্যর্থ: ${err.message}`);
    }
  },

  // -------------------------------------------------------------
  // PRINT DOCUMENT VIEWER
  // -------------------------------------------------------------
  async printDocument(docType, id) {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = '🖨️ অফিসিয়াল বাংলা নথি ও রসিদ প্রিভিউ';

    try {
      let docHtml = '';
      if (docType === 'donation_receipt') {
        const don = this.state.donations.find(d => d.id === id) || (await API.getDonations()).data.find(d => d.id === id);
        docHtml = DocumentGenerator.generateDonationReceipt(this.state.org, don);
      } else if (docType === 'loan_agreement') {
        const loanRes = await API.getLoan(id);
        docHtml = DocumentGenerator.generateLoanAgreement(this.state.org, loanRes.data);
      } else if (docType === 'loan_clearance') {
        const loanRes = await API.getLoan(id);
        docHtml = DocumentGenerator.generateLoanClearanceCertificate(this.state.org, loanRes.data);
      } else if (docType === 'sample_application') {
        docHtml = DocumentGenerator.generateApplicationForm(this.state.org, {
          id: 'APP-SAMPLE-01',
          applicant_name: 'মোঃ রফিকুল ইসলাম',
          father_husband_name: 'মোঃ আব্দুল করিম',
          mother_name: 'রোকেয়া বেগম',
          mobile: '01712345678',
          present_address: 'গ্রাম: চর শৌলমারী, রৌমারী, কুড়িগ্রাম',
          occupation: 'ক্ষুদ্র দোকানদার',
          monthly_income: 9000,
          requested_amount: 15000,
          purpose: 'দোকানের মালামাল বৃদ্ধি',
          requested_duration_days: 30,
          created_at: getDhakaDateStr()
        });
      } else if (docType === 'sample_agreement') {
        docHtml = DocumentGenerator.generateLoanAgreement(this.state.org, {
          id: 'LOAN-SAMPLE-01',
          agreement_number: 'AGR-LOAN-2026-001',
          applicant_name: 'মোছাঃ ফাতেমা খাতুন',
          father_husband_name: 'মোঃ শফিকুল ইসলাম',
          applicant_mobile: '01912345678',
          present_address: 'রৌমারী বাজার, কুড়িগ্রাম',
          original_principal: 10000,
          approved_duration_days: 30,
          actual_disbursement_date: getDhakaDateStr(),
          due_date: addDaysToDateStr(getDhakaDateStr(), 30),
          repayment_method: 'বিকাশ Send Money / নগদ',
          fund_name: 'সুদমুক্ত ধার ঘূর্ণায়মান তহবিল'
        });
      } else if (docType === 'sample_clearance') {
        docHtml = DocumentGenerator.generateLoanClearanceCertificate(this.state.org, {
          id: 'LOAN-SAMPLE-01',
          applicant_name: 'মোঃ শহিদুল ইসলাম',
          father_husband_name: 'মৃত আব্দুর রহমান',
          present_address: 'যাদুরচর, রৌমারী',
          original_principal: 12000,
          actual_disbursement_date: '2026-08-10'
        });
      } else if (docType === 'sample_balancesheet') {
        const bsRes = await API.getBalanceSheet();
        docHtml = DocumentGenerator.generateBalanceSheetDocument(this.state.org, bsRes.data);
      }

      modalBody.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:12px;" class="no-print">
          <button class="btn btn-primary" onclick="window.print()">🖨️ প্রিন্ট করুন (Print / Save as PDF)</button>
        </div>
        ${docHtml}
      `;
      modal.classList.add('open');
    } catch (err) {
      alert(`নথি প্রস্তুত করতে সমস্যা হয়েছে: ${err.message}`);
    }
  },

  // -------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------
  openLoginModal() {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = '🔐 কর্মকর্তা ও এডমিন লগইন';
    modalBody.innerHTML = `
      <form id="loginForm" onsubmit="App.handleLogin(event)">
        <div class="form-group">
          <label>ব্যবহারকারীর নাম (Username) <span class="required">*</span></label>
          <input type="text" name="username" class="form-control" placeholder="ব্যবহারকারীর নাম লিখুন" required autocomplete="username">
        </div>
        <div class="form-group">
          <label>পাসওয়ার্ড (Password) <span class="required">*</span></label>
          <input type="password" name="password" class="form-control" placeholder="পাসওয়ার্ড লিখুন" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">লগইন করুন</button>
      </form>
    `;
    modal.classList.add('open');
  },

  async handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const creds = {
      username: form.username.value,
      password: form.password.value
    };

    try {
      const res = await API.login(creds);
      this.state.user = res.user;
      localStorage.setItem('kh_user', JSON.stringify(res.user));
      this.closeModal();
      this.renderAdminLayout();
    } catch (err) {
      alert(`লগইন ব্যর্থ: ${err.message}`);
    }
  },

  logout() {
    this.state.user = null;
    localStorage.removeItem('kh_user');
    this.navigate('home');
  },

  // -------------------------------------------------------------
  // UTILITIES
  // -------------------------------------------------------------
  copyToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      alert(successMsg || 'কপি করা হয়েছে: ' + text);
    }).catch(() => {
      prompt('কপি করতে নিচের নম্বরটি নির্বাচন করুন:', text);
    });
  },

  toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.toggle('mobile-open');
  },

  async runAlertCheck() {
    try {
      const res = await API.runReminderCheck();
      alert(`অ্যালার্ট চেক সম্পন্ন!\nসক্রিয় ঋণ: ${res.activeLoansCount} টি\nনতুন তৈরি তাগিদ: ${res.remindersCreated} টি\nমেয়াদোত্তীর্ণ ঋণ: ${res.overdueCount} টি`);
      this.navigateAdmin('alerts');
    } catch (err) {
      alert(`ব্যর্থ: ${err.message}`);
    }
  },

  openMemberDetailsModal(memberId) {
    const id = Number(memberId);
    const roleData = (window.COMMITTEE_ROLES_DATA && window.COMMITTEE_ROLES_DATA[id]) || {};
    const dbMember = (this.state.committee || []).find(m => m.id === id || m.display_order === id) || {};

    const nameBn = dbMember.name_bn || roleData.name_bn || 'পরিচালনা পরিষদ সদস্য';
    const nameEn = dbMember.name_en || roleData.name_en || '';
    const designationBn = dbMember.designation_bn || roleData.designation_bn || 'সম্মানিত সদস্য';
    const committeeType = dbMember.committee_type || 'পরিচালনা পরিষদ';
    const profession = dbMember.profession || roleData.profession || '';
    const address = dbMember.address || roleData.address || '';
    const proposedRole = dbMember.bio_bn || roleData.proposed_role || `${committeeType} সদস্য হিসেবে সার্বিক সাংগঠনিক দিকনির্দেশনা ও মানবতার কল্যাণে অবদান।`;
    const duties = (roleData.duties && roleData.duties.length) ? roleData.duties : (dbMember.bio_bn ? [dbMember.bio_bn] : ['ফাউন্ডেশনের লক্ষ্য, আদর্শ ও সুদমুক্ত কর্জে হাসানা কার্যক্রম বাস্তবায়নে কার্যকর ভূমিকা পালন।']);
    const specialPolicy = roleData.special_policy || null;
    const mobile = dbMember.mobile || roleData.mobile || '01966442769';
    const whatsapp = dbMember.whatsapp || roleData.whatsapp || mobile;
    const email = dbMember.email || roleData.email || '';
    const photoUrl = dbMember.photo_url || roleData.photo_url || '/assets/logo.png';
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const cleanWa = whatsapp.replace(/[^0-9]/g, '');
    const orderNum = bnNum(dbMember.display_order || id || 1);

    const html = `
      <div class="member-detail-modal-wrap" style="text-align: left;">
        <!-- Header Profile Banner -->
        <div style="display: flex; gap: 18px; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--accent-gold); overflow: hidden; background: #E8F5EC; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(7, 91, 59, 0.15); flex-shrink: 0;">
            <img src="${photoUrl}" alt="${nameBn}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/assets/logo.png';">
          </div>
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge" style="background: var(--primary-deep-green); color: white; font-size: 0.78rem; padding: 4px 10px; font-weight: 600; border-radius: 12px;">
                ${committeeType} #${orderNum}
              </span>
              ${profession ? `
                <span class="badge" style="background: #fff8e1; color: #8c6e14; border: 1px solid #ffe082; font-size: 0.78rem; padding: 4px 10px; font-weight: 600; border-radius: 12px;">
                  👔 ${profession}
                </span>
              ` : ''}
            </div>
            <h3 style="font-size: 1.35rem; color: var(--primary-deep-green); font-weight: 700; margin: 0 0 4px 0; line-height: 1.3;">
              ${nameBn}
            </h3>
            ${nameEn ? `<div style="font-size: 0.88rem; color: #718096; font-weight: 600; margin-bottom: 6px;">${nameEn}</div>` : ''}
            <div style="font-size: 0.92rem; color: var(--text-dark); font-weight: 600; line-height: 1.4; background: var(--bg-page); padding: 6px 10px; border-radius: 6px; border-left: 3px solid var(--accent-gold); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span>${designationBn}</span>
              ${address ? `<span style="font-size: 0.82rem; color: #666; font-weight: 500;">📍 ${address}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Proposed Core Role Highlight Box -->
        <div style="background: linear-gradient(135deg, rgba(7, 91, 59, 0.05) 0%, rgba(200, 149, 44, 0.08) 100%); border: 1px solid rgba(200, 149, 44, 0.35); border-left: 4px solid var(--accent-gold); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #8c6e14; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> সাংগঠনিক ভূমিকা ও দায়িত্ব
          </div>
          <div style="font-size: 1.02rem; font-weight: 700; color: var(--primary-deep-green); line-height: 1.5;">
            ${proposedRole}
          </div>
        </div>

        <!-- Detailed Duties & Responsibilities List -->
        <div style="margin-bottom: 18px;">
          <h4 style="font-size: 1.02rem; color: var(--primary-deep-green); font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📋</span> কার্যপরিধি ও অঙ্গীকার:
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${duties.map((duty, idx) => `
              <div style="display: flex; align-items: flex-start; gap: 12px; background: var(--bg-page); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 14px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--primary-deep-green); color: white; font-size: 0.82rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;">
                  ${bnNum(idx + 1)}
                </span>
                <p style="margin: 0; font-size: 0.93rem; color: var(--text-dark); line-height: 1.6; flex: 1;">
                  ${duty}
                </p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Special Policy / Directive Notice if exists -->
        ${specialPolicy ? `
          <div style="background: #FFF8E1; border: 1px solid #FFE082; border-left: 4px solid #FFA000; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
            <div style="font-weight: 700; color: #E65100; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>⚖️</span> গুরুত্বপূর্ণ সাংগঠনিক ও শরীয়াহ দিকনির্দেশনা
            </div>
            <p style="margin: 0; font-size: 0.92rem; color: #5D4037; line-height: 1.6;">
              ${specialPolicy}
            </p>
          </div>
        ` : ''}

        <!-- Direct Contact Footer -->
        <div style="background: #F4F8F5; border-radius: 8px; padding: 14px 16px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="color: var(--text-muted); font-size: 0.84rem;">সরাসরি যোগাযোগ:</div>
            <div style="display: flex; gap: 12px; align-items: center; margin-top: 2px; flex-wrap: wrap;">
              ${mobile ? `
                <a href="tel:${cleanMobile}" style="color: var(--primary-deep-green); font-weight: 700; text-decoration: none; font-size: 0.95rem;">
                  📞 ${mobile}
                </a>
              ` : ''}
              ${address ? `<span style="font-size: 0.82rem; color: #555;">📍 ${address}</span>` : ''}
            </div>
            ${email ? `<div style="font-size: 0.82rem; color: #718096; margin-top: 2px;">✉️ ${email}</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${mobile ? `
              <a href="tel:${cleanMobile}" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 4px;">
                📞 কল করুন
              </a>
            ` : ''}
            ${cleanWa ? `
              <a href="https://wa.me/88${cleanWa}" target="_blank" class="btn btn-sm btn-gold" style="display: inline-flex; align-items: center; gap: 4px;">
                💬 WhatsApp
              </a>
            ` : ''}
            <button type="button" class="btn btn-sm btn-outline" onclick="App.closeModal()">
              ✕ বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    `;

    this.openModal(`📋 ${committeeType} সদস্যের বিস্তারিত পরিচিতি ও দায়িত্ব`, html);
  },

  scrollToSection(sectionId) {
    if (this.state.currentView !== 'home') {
      this.navigate('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  switchMapView(viewType) {
    const graphicContainer = document.getElementById('officeMapGraphicContainer');
    const liveContainer = document.getElementById('officeMapLiveContainer');
    const tabGraphic = document.getElementById('tabMapGraphic');
    const tabLive = document.getElementById('tabMapLive');

    if (viewType === 'live') {
      if (graphicContainer) graphicContainer.style.display = 'none';
      if (liveContainer) liveContainer.style.display = 'block';
      if (tabGraphic) tabGraphic.classList.remove('active');
      if (tabLive) tabLive.classList.add('active');
    } else {
      if (graphicContainer) graphicContainer.style.display = 'block';
      if (liveContainer) liveContainer.style.display = 'none';
      if (tabGraphic) tabGraphic.classList.add('active');
      if (tabLive) tabLive.classList.remove('active');
    }
  },

  openMapModal() {
    const content = `
      <div style="text-align: center;">
        <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <span class="badge" style="background: rgba(7, 91, 59, 0.1); color: var(--primary-deep-green); font-size: 0.9rem; padding: 6px 12px; font-weight: 600;">
            📍 লাইফ কেয়ার হাসপাতাল ও সংলগ্ন ল্যান্ডমার্ক নকশা (রৌমারী, কুড়িগ্রাম)
          </span>
          <a href="https://www.google.com/maps/search/?api=1&query=Brahmaputra+Filling+Station+Rowmari" target="_blank" class="btn btn-sm btn-gold">
            🧭 গুগল ম্যাপসে নেভিগেশন চালু করুন ➔
          </a>
        </div>
        <div style="border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #f8faf9; box-shadow: var(--shadow-sm); position: relative; margin-bottom: 14px;">
          <img src="/assets/office_map.png" alt="লাইফ কেয়ার হাসপাতাল ও সংলগ্ন ল্যান্ডমার্ক ম্যাপ রৌমারী" style="width: 100%; height: auto; max-height: 60vh; object-fit: contain; display: block; margin: 0 auto;">
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; text-align: left; font-size: 0.88rem;">
          <div style="background: var(--bg-page); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #E53935;">
            <strong>🏥 লাইফ কেয়ার হাসপাতাল:</strong> ফাউন্ডেশনের মূল কার্যালয় ও ঋণ সেবা
          </div>
          <div style="background: var(--bg-page); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #1E88E5;">
            <strong>⛽ ব্রহ্মপুত্র ফিলিং স্টেশন:</strong> প্রধান পেট্রোল পাম্প ল্যান্ডমার্ক
          </div>
          <div style="background: var(--bg-page); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #43A047;">
            <strong>🚌 রিফাত পরিবহন কাউন্টার:</strong> দূরপাল্লার বাস কাউন্টার
          </div>
          <div style="background: var(--bg-page); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #FBC02D;">
            <strong>🛣️ Z4608 রোড:</strong> রৌমারী শাপলা চত্বর - স্থলবন্দর সড়ক
          </div>
        </div>
      </div>
    `;
    this.openModal('🗺️ প্রধান কার্যালয় সুনির্দিষ্ট অবস্থান ও ল্যান্ডমার্ক নকশা (রৌমারী, কুড়িগ্রাম)', content);
  },

  filterPublicWelfareCategory(category, btn) {
    if (btn) {
      document.querySelectorAll('.public-welfare-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.classList.add('btn-outline-green');
      });
      btn.classList.add('active');
      btn.classList.remove('btn-outline-green');
    }
    const rows = document.querySelectorAll('.public-welfare-row');
    rows.forEach(row => {
      const rowCat = row.dataset.category || '';
      if (category === 'all' || rowCat === category) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  },

  filterPublicWelfareList(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.public-welfare-row');
    rows.forEach(row => {
      const text = (row.textContent || '').toLowerCase();
      if (!q || text.includes(q)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
};

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  const globalModal = document.getElementById('globalModal');
  if (globalModal) {
    globalModal.addEventListener('click', (e) => {
      if (e.target === globalModal) App.closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') App.closeModal();
  });
});

