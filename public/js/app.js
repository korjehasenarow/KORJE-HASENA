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
      contentArea.innerHTML = Components.renderPublicTransparency(this.state.org, this.state.summary);
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
            <span>👥 উপদেষ্টা মণ্ডলী ও কমিটি</span>
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
        if (res.success) {
          this.state.donations = res.data;
          adminArea.innerHTML = AdminViews.renderDonations(this.state.donations, fundRes.data, accRes.data);
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
  openModal(typeOrTitle, dataOrHtml = {}) {
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
      const isAdmin = this.state.user && (this.state.user.role === 'superadmin' || this.state.user.role === 'admin' || this.state.user.username === 'admin' || this.state.user.username === 'Shahalam69');
      if (!isAdmin) {
        alert('উপদেষ্টা ও কমিটি সদস্য পরিবর্তনের ক্ষমতা কেবল এডমিন / সুপার এডমিনের হাতে সংরক্ষিত।');
        return;
      }
      modalTitle.textContent = data.id ? '✏️ উপদেষ্টা / পরিচালনা পরিষদ সদস্য তথ্য সম্পাদন' : '➕ নতুন উপদেষ্টা / পরিচালনা পরিষদ সদস্য অন্তর্ভুক্তি';
      modalBody.innerHTML = `
        <form id="modalCommitteeForm" onsubmit="App.handleSaveCommitteeMember(event)">
          <input type="hidden" name="id" value="${data.id || ''}">
          <input type="hidden" name="existing_photo" value="${data.photo_url || ''}">
          <div class="form-grid">
            <div class="form-group">
              <label>সদস্যের নাম (বাংলায়) <span class="required">*</span></label>
              <input type="text" name="name_bn" class="form-control" value="${data.name_bn || ''}" required placeholder="যেমন: MD SHAH ALAM">
            </div>
            <div class="form-group">
              <label>ইংরেজি নাম (ঐচ্ছিক)</label>
              <input type="text" name="name_en" class="form-control" value="${data.name_en || ''}" placeholder="MD SHAH ALAM">
            </div>
            <div class="form-group">
              <label>সংস্থার পদবি <span class="required">*</span></label>
              <input type="text" name="designation_bn" class="form-control" value="${data.designation_bn || ''}" required placeholder="যেমন: প্রতিষ্ঠাতা চেয়ারম্যান / সহ-সভাপতি">
            </div>
            <div class="form-group">
              <label>মোবাইল নম্বর <span class="required">*</span></label>
              <input type="text" name="mobile" class="form-control" value="${data.mobile || ''}" required placeholder="01966442769">
            </div>
            <div class="form-group">
              <label>ইমেইল ঠিকানা</label>
              <input type="email" name="email" class="form-control" value="${data.email || ''}" placeholder="shahalal.siraz@gmail.com">
            </div>
            <div class="form-group">
              <label>প্রদর্শন অগ্রাধিকার ক্রম (Display Order)</label>
              <input type="number" name="display_order" class="form-control" value="${data.display_order || 1}" min="1">
            </div>
          </div>
          <div class="form-group">
            <label>সদস্যের ছবি (Upload Photo to Committee Folder)</label>
            <div style="display: flex; gap: 15px; align-items: center; margin-top: 6px; background: var(--bg-page); padding: 10px; border-radius: var(--radius-sm); border: 1px dashed var(--accent-gold);">
              <div id="committeePhotoPreview" style="width: 70px; height: 70px; border-radius: 50%; border: 2.5px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                ${data.photo_url ? `<img src="${data.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size: 28px;">👤</span>`}
              </div>
              <div style="flex: 1;">
                <input type="file" name="photo" id="committeePhotoInput" accept="image/*" class="form-control" onchange="App.previewCommitteePhoto(event)">
                <small style="color: #666; display: block; margin-top: 4px;">ছবিটি সরাসরি সার্ভারের <code>public/uploads/committee/</code> ফোল্ডারে সংরক্ষিত হবে এবং ড্যাশবোর্ডে দৃশ্যমান হবে।</small>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>সংক্ষিপ্ত পরিচিতি বা বায়ো (ঐচ্ছিক)</label>
            <textarea name="bio_bn" class="form-control" rows="2" placeholder="সংক্ষিপ্ত পরিচিতি...">${data.bio_bn || ''}</textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 1rem;">
            ${data.id ? '✓ তথ্য হালনাগাদ করুন' : '✓ নতুন সদস্য সংরক্ষণ করুন'}
          </button>
        </form>
      `;
    }

    modal.classList.add('open');
  },

  closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) modal.classList.remove('open');
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
    const formData = new FormData(event.target);
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

      const wantDeposit = confirm(`নতুন দাতা "${donorName}" সফলভাবে নিবন্ধিত হয়েছে!\n\nআপনি কি এখনই এই দাতার অনুদান (Donation) এন্ট্রি করতে চান?`);
      if (wantDeposit) {
        this.openModal('donation', {
          donor_id: res.donorId,
          donor_name: donorName,
          donor_mobile: mobile,
          amount: parseFloat(commitmentAmount) > 0 ? commitmentAmount : ''
        });
      } else {
        this.closeModal();
        this.navigateAdmin('donors');
      }
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
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
    const isAdmin = this.state.user && (this.state.user.role === 'superadmin' || this.state.user.role === 'admin' || this.state.user.username === 'admin' || this.state.user.username === 'Shahalam69');
    if (!isAdmin) {
      alert('উপদেষ্টা ও কমিটি সদস্য পরিবর্তনের ক্ষমতা কেবল এডমিন / সুপার এডমিনের হাতে সংরক্ষিত।');
      return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const memberId = formData.get('id');
    formData.append('user_id', this.state.user.id || '');
    formData.append('user_name', this.state.user.full_name_bn || '');
    formData.append('user_role', this.state.user.role || '');

    try {
      if (memberId) {
        await API.updateCommitteeMember(memberId, formData);
        alert('উপদেষ্টা / কমিটি সদস্যের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        await API.addCommitteeMember(formData);
        alert('উপদেষ্টা মণ্ডলী / পরিচালনা পরিষদে নতুন সদস্য সফলভাবে যুক্ত করা হয়েছে।');
      }
      this.closeModal();
      const comRes = await API.getCommittee();
      if (comRes.success) {
        this.state.committee = comRes.data || [];
      }
      if (this.state.adminView === 'committee') {
        this.navigateAdmin('committee');
      } else {
        this.navigateAdmin('dashboard');
      }
    } catch (err) {
      alert(`ব্যর্থ: ${err.message}`);
    }
  },

  editCommitteeMember(id) {
    const isAdmin = this.state.user && (this.state.user.role === 'superadmin' || this.state.user.role === 'admin' || this.state.user.username === 'admin' || this.state.user.username === 'Shahalam69');
    if (!isAdmin) {
      alert('উপদেষ্টা ও কমিটি সদস্য পরিবর্তনের ক্ষমতা কেবল এডমিন / সুপার এডমিনের হাতে সংরক্ষিত।');
      return;
    }
    const member = (this.state.committee || []).find(m => m.id == id);
    if (!member) {
      alert('সদস্য খুঁজে পাওয়া যায়নি।');
      return;
    }
    this.openModal('committee_member', member);
  },

  async deleteCommitteeMember(id) {
    const isAdmin = this.state.user && (this.state.user.role === 'superadmin' || this.state.user.role === 'admin' || this.state.user.username === 'admin' || this.state.user.username === 'Shahalam69');
    if (!isAdmin) {
      alert('উপদেষ্টা ও কমিটি সদস্য অপসারণের ক্ষমতা কেবল এডমিন / সুপার এডমিনের হাতে সংরক্ষিত।');
      return;
    }
    const member = (this.state.committee || []).find(m => m.id == id);
    const memberName = member ? member.name_bn : 'এই সদস্যকে';
    if (!confirm(`আপনি কি নিশ্চিত যে "${memberName}"-কে উপদেষ্টা / পরিচালনা পরিষদ থেকে অপসারণ করতে চান?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        user_id: this.state.user.id || '',
        user_name: this.state.user.full_name_bn || '',
        user_role: this.state.user.role || ''
      }).toString();
      await API.deleteCommitteeMember(id, params);
      alert('সদস্য সফলভাবে অপসারিত হয়েছে।');
      const comRes = await API.getCommittee();
      if (comRes.success) {
        this.state.committee = comRes.data || [];
      }
      if (this.state.adminView === 'committee') {
        this.navigateAdmin('committee');
      } else {
        this.navigateAdmin('dashboard');
      }
    } catch (err) {
      alert(`অপসারণ ব্যর্থ: ${err.message}`);
    }
  },

  async handleRecordDonation(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
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
      if (this.state.view === 'admin') {
        this.navigateAdmin('donations');
      } else {
        this.render();
      }
    } catch (err) {
      alert(`সমস্যা হয়েছে: ${err.message}`);
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

    const nameBn = roleData.name_bn || dbMember.name_bn || 'উপদেষ্টা পরিষদ সদস্য';
    const nameEn = roleData.name_en || dbMember.name_en || '';
    const designationBn = roleData.designation_bn || dbMember.designation_bn || 'সম্মানিত উপদেষ্টা';
    const proposedRole = roleData.proposed_role || dbMember.bio_bn || 'উপদেষ্টা পরিষদ সদস্য হিসেবে সার্বিক দিকনির্দেশনা ও পরামর্শ প্রদান।';
    const duties = (roleData.duties && roleData.duties.length) ? roleData.duties : (dbMember.bio_bn ? [dbMember.bio_bn] : ['ফাউন্ডেশনের লক্ষ্য ও উদ্দেশ্য বাস্তবায়নে কার্যকর ভূমিকা পালন।']);
    const specialPolicy = roleData.special_policy || null;
    const mobile = dbMember.mobile || roleData.mobile || '01966442769';
    const email = dbMember.email || roleData.email || '';
    const photoUrl = dbMember.photo_url || roleData.photo_url || '/assets/logo.png';
    const cleanMobile = mobile.replace(/[^0-9]/g, '');

    const bnNumerals = ['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০'];

    const html = `
      <div class="member-detail-modal-wrap" style="text-align: left;">
        <!-- Header Profile Banner -->
        <div style="display: flex; gap: 18px; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--accent-gold); overflow: hidden; background: #E8F5EC; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(7, 91, 59, 0.15); flex-shrink: 0;">
            <img src="${photoUrl}" alt="${nameBn}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/assets/logo.png';">
          </div>
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <span class="badge" style="background: var(--primary-deep-green); color: white; font-size: 0.78rem; padding: 3px 8px; font-weight: 600;">
                উপদেষ্টা পর্ষদ #${bnNumerals[id - 1] || id}
              </span>
              <span class="badge" style="background: rgba(200, 149, 44, 0.15); color: #8c6e14; font-size: 0.78rem; padding: 3px 8px; font-weight: 600;">
                ✓ অনুমোদিত কার্যপরিধি
              </span>
            </div>
            <h3 style="font-size: 1.35rem; color: var(--primary-deep-green); font-weight: 700; margin: 0 0 4px 0; line-height: 1.3;">
              ${nameBn}
            </h3>
            ${nameEn ? `<div style="font-size: 0.88rem; color: #718096; font-weight: 600; margin-bottom: 6px;">${nameEn}</div>` : ''}
            <div style="font-size: 0.92rem; color: var(--text-dark); font-weight: 600; line-height: 1.4; background: var(--bg-page); padding: 6px 10px; border-radius: 6px; border-left: 3px solid var(--accent-gold);">
              ${designationBn}
            </div>
          </div>
        </div>

        <!-- Proposed Core Role Highlight Box -->
        <div style="background: linear-gradient(135deg, rgba(7, 91, 59, 0.05) 0%, rgba(200, 149, 44, 0.08) 100%); border: 1px solid rgba(200, 149, 44, 0.35); border-left: 4px solid var(--accent-gold); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #8c6e14; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> প্রস্তাবিত দায়িত্ব ও মূল ভূমিকা
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--primary-deep-green); line-height: 1.5;">
            ${proposedRole}
          </div>
        </div>

        <!-- Detailed Duties & Responsibilities List -->
        <div style="margin-bottom: 18px;">
          <h4 style="font-size: 1.02rem; color: var(--primary-deep-green); font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📋</span> বিস্তারিত কার্যবিবরণী ও দায়িত্বসমূহ:
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${duties.map((duty, idx) => `
              <div style="display: flex; align-items: flex-start; gap: 12px; background: var(--bg-page); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 14px; transition: transform 0.15s ease;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--primary-deep-green); color: white; font-size: 0.82rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;">
                  ${bnNumerals[idx] || (idx + 1)}
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
            <span style="color: var(--text-muted); font-size: 0.88rem;">সরাসরি যোগাযোগ:</span>
            <a href="tel:${mobile}" style="color: var(--primary-deep-green); font-weight: 700; text-decoration: none; margin-left: 6px; font-size: 1rem;">
              📞 ${mobile}
            </a>
            ${email ? `<div style="font-size: 0.82rem; color: #718096; margin-top: 2px;">✉️ ${email}</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="tel:${mobile}" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 4px;">
              📞 কল করুন
            </a>
            <a href="https://wa.me/88${cleanMobile}" target="_blank" class="btn btn-sm btn-gold" style="display: inline-flex; align-items: center; gap: 4px;">
              💬 হোয়াটসঅ্যাপ
            </a>
            <button type="button" class="btn btn-sm btn-outline" onclick="App.closeModal()">
              ✕ বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    `;

    this.openModal(`📋 উপদেষ্টা পরিষদ সদস্যের দায়িত্ব ও কার্যবিবরণী`, html);
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

