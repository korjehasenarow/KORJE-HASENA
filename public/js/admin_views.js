// Admin Module Views for Karje Hasana Foundation

const AdminViews = {
  // 1. Donor Management
  renderDonors(donors = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">👥 সম্মানিত দাতা ও শুভাকাঙ্ক্ষী ব্যবস্থাপনা</div>
          <button class="btn btn-primary btn-sm" onclick="App.openModal('donor')">➕ নতুন দাতা যোগ করুন</button>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
          <input type="text" id="donorSearchInput" class="form-control" style="max-width: 280px;" placeholder="নাম, আইডি বা মোবাইল দিয়ে খুঁজুন..." onkeyup="App.filterDonors()">
          <select id="donorCategorySelect" class="form-control" style="max-width: 200px;" onchange="App.filterDonors()">
            <option value="">সকল ক্যাটাগরি</option>
            <option value="মাসিক দাতা">মাসিক দাতা</option>
            <option value="এককালীন দাতা">এককালীন দাতা</option>
            <option value="নিয়মিত দাতা">নিয়মিত দাতা</option>
            <option value="বিশেষ দাতা">বিশেষ দাতা</option>
          </select>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="donorsTable">
            <thead>
              <tr>
                <th>দাতা আইডি</th>
                <th>নাম (বাংলা)</th>
                <th>মোবাইল নম্বর</th>
                <th>ক্যাটাগরি</th>
                <th>প্রতিশ্রুতি/ফ্রিকোয়েন্সি</th>
                <th>মোট প্রকৃত দান</th>
                <th>দান সংখ্যা</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${donors.map(d => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${d.id}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 38px; height: 38px; border-radius: 50%; background: #E8F5EC; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--accent-gold); flex-shrink: 0;">
                        ${d.photo_url ? `<img src="${d.photo_url}" alt="${d.name_bn}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:18px;">👤</span>`}
                      </div>
                      <div>
                        <span style="font-weight: 600; color: #075B3B;">${d.name_bn}</span>
                        ${d.name_en ? `<br><small style="color:#777;">${d.name_en}</small>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>${d.mobile}</td>
                  <td><span class="status-badge active">${d.category}</span></td>
                  <td>৳ ${bnNum(d.commitment_amount || 0)} (${d.frequency || 'এককালীন'})</td>
                  <td style="font-weight: 700; color: #075B3B;">৳ ${bnNum(d.totalDonated || 0)}</td>
                  <td>${bnNum(d.donationCount || 0)} টি</td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-sm btn-gold" onclick="App.openDonationForDonor('${d.id}')" title="এই দাতার অনুদান জমা করুন">💵 অনুদান জমা</button>
                      <button class="btn btn-sm btn-outline-green" onclick="App.viewDonorProfile('${d.id}')">প্রোফাইল</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${donors.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777;">কোনো দাতার তথ্য পাওয়া যায়নি।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 2. Donation Management (Strictly separated from loans!)
  renderDonations(donations = [], funds = [], accounts = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">❤️ অনুদান ব্যবস্থাপনা (Donation Tracking)</div>
          <button class="btn btn-gold btn-sm" onclick="App.openModal('donation')">➕ নতুন অনুদান এন্ট্রি</button>
        </div>
        <div class="alert-card info" style="padding: 10px 14px; margin-bottom: 14px;">
          <small>⚠️ <strong>হিসাববিজ্ঞানের মৌলিক নিয়ম:</strong> অনুদান কখনোই ফেরতযোগ্য ধার নয় এবং ধারের মূলধন ফেরত নতুন অনুদান নয়। শুধুমাত্র যাচাইকৃত অনুদানই তহবিলে জমা হয়।</small>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>রসিদ নম্বর</th>
                <th>তারিখ</th>
                <th>দাতার নাম</th>
                <th>মোবাইল</th>
                <th>তহবিল / খাত</th>
                <th>হিসাব</th>
                <th>পরিমাণ</th>
                <th>পদ্ধতি/TrxID</th>
                <th>স্ট্যাটাস</th>
                <th>রসিদ প্রিন্ট</th>
              </tr>
            </thead>
            <tbody>
              ${donations.map(d => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${d.receipt_number}</td>
                  <td>${d.date}</td>
                  <td style="font-weight: 600;">${d.donor_name}</td>
                  <td>${d.donor_mobile || 'N/A'}</td>
                  <td>${d.fund_name}</td>
                  <td>${d.account_name}</td>
                  <td style="font-weight: 700; color: #075B3B;">৳ ${bnNum(d.amount)}</td>
                  <td>${d.payment_method} ${d.transaction_reference ? `(${d.transaction_reference})` : ''}</td>
                  <td>
                    <span class="status-badge ${d.status === 'নিশ্চিত' ? 'verified' : 'pending'}">${d.status}</span>
                  </td>
                  <td>
                    ${d.status === 'নিশ্চিত' ? `
                      <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('donation_receipt', '${d.id}')">🖨️ রসিদ</button>
                    ` : `
                      <button class="btn btn-sm btn-gold" onclick="App.verifyDonationAction('${d.id}')">✓ যাচাই</button>
                    `}
                  </td>
                </tr>
              `).join('')}
              ${donations.length === 0 ? `<tr><td colspan="10" style="text-align: center; color: #777;">কোনো অনুদানের রেকর্ড নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 3. bKash Send Money Submissions Verification Portal
  renderBkashSubmissions(submissions = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📱 বিকাশ / নগদ / রকেট Send Money যাচাইকরণ পোর্টাল (01966442769)</div>
        </div>
        <div class="alert-card warning">
          <div>
            <strong>সতর্কতা:</strong> শুধুমাত্র প্রেরক ফরম পূরণ করলেই টাকা জমা হয় না। ফাউন্ডেশনের ব্যাংক/বিকাশ স্টেটমেন্টের সাথে TrxID মিলিয়ে নিশ্চিত হওয়ার পরই 'যাচাই ও ক্রেডিট' বাটনে চাপ দিন। ডুপ্লিকেট TrxID স্বয়ংক্রিয়ভাবে ব্লক করা হয়।
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>আইডি</th>
                <th>তারিখ</th>
                <th>দাতার নাম ও মোবাইল</th>
                <th>প্রেরক বিকাশ নং</th>
                <th>ট্রানজ্যাকশন আইডি (TrxID)</th>
                <th>পরিমাণ</th>
                <th>অনুদানের খাত</th>
                <th>স্ক্রিনশট</th>
                <th>স্ট্যাটাস</th>
                <th>যাচাই অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${submissions.map(s => `
                <tr>
                  <td style="font-family: var(--font-en);">${s.id}</td>
                  <td>${s.payment_date}</td>
                  <td><strong>${s.donor_name}</strong><br><small>${s.donor_mobile}</small></td>
                  <td>${s.sender_bkash_mobile || 'N/A'}</td>
                  <td style="font-family: var(--font-en); font-weight: 700; color: #075B3B;">${s.transaction_id}</td>
                  <td style="font-weight: 700; font-size: 1.05rem; color: #075B3B;">৳ ${bnNum(s.amount)}</td>
                  <td>${s.fund_category}</td>
                  <td>
                    ${s.screenshot_path ? `<a href="${s.screenshot_path}" target="_blank" class="btn btn-sm btn-outline">ছবি দেখুন</a>` : 'নেই'}
                  </td>
                  <td>
                    <span class="status-badge ${s.verification_status === 'নিশ্চিত' ? 'verified' : (s.verification_status === 'প্রত্যাখ্যাত' ? 'rejected' : 'pending')}">
                      ${s.verification_status}
                    </span>
                  </td>
                  <td>
                    ${s.verification_status === 'অপেক্ষমাণ' ? `
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-sm btn-primary" onclick="App.verifyBkashSubmissionAction('${s.id}')">✓ যাচাই ও ক্রেডিট</button>
                        <button class="btn btn-sm btn-danger" onclick="App.rejectBkashSubmissionAction('${s.id}')">✕ বাতিল</button>
                      </div>
                    ` : `
                      <small style="color: #666;">সম্পন্ন (${s.verified_by || 'Admin'})</small>
                    `}
                  </td>
                </tr>
              `).join('')}
              ${submissions.length === 0 ? `<tr><td colspan="10" style="text-align: center; color: #777;">কোনো বিকাশ পেমেন্ট জমা নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 4. Applications & Verification & Committee Approval
  renderApplications(applications = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📝 ঋণ ও সহায়তা আবেদনপত্র ব্যবস্থাপনা</div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('apply')">➕ নতুন আবেদন ফরম</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>আবেদন নং</th>
                <th>তারিখ</th>
                <th>আবেদনকারীর নাম</th>
                <th>মোবাইল</th>
                <th>পেশা ও আয়</th>
                <th>সহায়তার ধরন</th>
                <th>আবেদিত টাকা</th>
                <th>প্রস্তাবিত মেয়াদ</th>
                <th>স্ট্যাটাস</th>
                <th>ব্যবস্থা গ্রহণ</th>
              </tr>
            </thead>
            <tbody>
              ${applications.map(a => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${a.id}</td>
                  <td>${a.created_at?.split('T')[0]}</td>
                  <td><strong>${a.applicant_name}</strong></td>
                  <td>${a.applicant_mobile}</td>
                  <td>${a.occupation || 'N/A'} (৳ ${bnNum(a.monthly_income || 0)})</td>
                  <td><span class="status-badge active">${a.assistance_type}</span></td>
                  <td style="font-weight: 700; color: #075B3B;">৳ ${bnNum(a.requested_amount)}</td>
                  <td>${bnNum(a.requested_duration_days || 30)} দিন</td>
                  <td>
                    <span class="status-badge ${a.status === 'অনুমোদিত' || a.status === 'অর্থ বিতরণ হয়েছে' ? 'verified' : (a.status === 'প্রত্যাখ্যাত' ? 'rejected' : 'pending')}">
                      ${a.status}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-sm btn-outline-green" onclick="App.viewApplicationDetails('${a.id}')">পর্যালোচনা</button>
                      ${a.status === 'জমা হয়েছে' || a.status === 'যাচাইাধীন' ? `
                        <button class="btn btn-sm btn-gold" onclick="App.openVerifyModal('${a.id}')">মাঠ যাচাই</button>
                        <button class="btn btn-sm btn-primary" onclick="App.openApproveModal('${a.id}')">অনুমোদন</button>
                      ` : ''}
                      ${a.status === 'অনুমোদিত' ? `
                        <button class="btn btn-sm btn-primary" onclick="App.openDisburseModal('${a.id}')">🤝 অর্থ বিতরণ</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${applications.length === 0 ? `<tr><td colspan="10" style="text-align: center; color: #777;">কোনো আবেদন জমা নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 5. Loan Disbursement Module (Automatic Maturity Date Calculator: 10, 15, 20, 30 days)
  renderDisbursement(approvedApps = [], accounts = [], funds = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🤝 অনুমোদিত ঋণ বিতরণ ও চুক্তিপত্র সম্পাদন</div>
        </div>
        <div class="alert-card info">
          <div>
            <strong>গুরুত্বপূর্ণ:</strong> আবেদন অনুমোদন করলেই অর্থ হ্রাস পায় না। এই মডিউলে প্রকৃত বিতরণের তারিখ এবং নির্ধারিত মেয়াদ (১০, ১৫, ২০, ৩০ দিন বা কাস্টম) নির্বাচনের মাধ্যমে হিসাব থেকে টাকা বিতরণ ও সুদমুক্ত চুক্তিপত্র তৈরি হয়।
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>আবেদন নং</th>
                <th>গ্রহীতার নাম</th>
                <th>মোবাইল</th>
                <th>অনুমোদিত পরিমাণ</th>
                <th>অনুমোদিত মেয়াদ</th>
                <th>অনুমোদনকারী</th>
                <th>বিতরণ ও চুক্তিপত্র</th>
              </tr>
            </thead>
            <tbody>
              ${approvedApps.map(a => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${a.id}</td>
                  <td><strong>${a.applicant_name}</strong></td>
                  <td>${a.applicant_mobile}</td>
                  <td style="font-weight: 800; font-size: 1.1rem; color: #075B3B;">৳ ${bnNum(a.approved_amount || a.requested_amount)}</td>
                  <td>${bnNum(a.approved_duration_days || a.requested_duration_days || 30)} দিন</td>
                  <td>${a.approved_by || 'অনুমোদন কমিটি'}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="App.openDisburseModal('${a.id}')">
                      🤝 অর্থ বিতরণ রেকর্ড করুন ➔
                    </button>
                  </td>
                </tr>
              `).join('')}
              ${approvedApps.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777;">বিতরণের অপেক্ষায় কোনো অনুমোদিত আবেদন নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 6. Repayments (Full / Partial Repayments & Extensions)
  renderRepayments(loans = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔄 সুদমুক্ত ধার ফেরত ও কিস্তি আদায় ব্যবস্থাপনা</div>
          <button class="btn btn-gold btn-sm" onclick="App.openModal('repayment')">➕ ফেরত এন্ট্রি</button>
        </div>
        <div class="alert-card info" style="padding: 10px 14px;">
          <small>⚠️ <strong>হিসাববিজ্ঞানের সূত্র:</strong> বর্তমান অবশিষ্ট বকেয়া = মূল বিতরণকৃত মূলধন - যাচাইকৃত মোট ফেরত। ধার পরিশোধ কখনোই কোনো অনুদান বা আয় নয়, এটি সম্পদ রূপান্তর (ক্যাশ বৃদ্ধি ও ঋণ পাওনা হ্রাস)।</small>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ধার আইডি</th>
                <th>গ্রহীতার নাম</th>
                <th>মোবাইল</th>
                <th>মূল ধার</th>
                <th>পরিশোধিত মোট</th>
                <th>অবশিষ্ট বকেয়া</th>
                <th>ফেরতের শেষ তারিখ</th>
                <th>অবস্থা</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${loans.map(l => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${l.id}</td>
                  <td><strong>${l.applicant_name}</strong></td>
                  <td>${l.applicant_mobile}</td>
                  <td>৳ ${bnNum(l.original_principal)}</td>
                  <td style="color: #075B3B; font-weight: 600;">৳ ${bnNum(l.total_principal_repaid)}</td>
                  <td style="font-weight: 800; color: ${l.outstanding_principal <= 0 ? '#075B3B' : '#C62828'};">
                    ৳ ${bnNum(l.outstanding_principal)}
                  </td>
                  <td style="font-weight: 600;">${l.due_date}</td>
                  <td>
                    <span class="status-badge ${l.loan_status === 'সম্পূর্ণ পরিশোধিত' ? 'completed' : (l.loan_status === 'মেয়াদোত্তীর্ণ' ? 'overdue' : 'active')}">
                      ${l.loan_status}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 4px;">
                      ${l.outstanding_principal > 0 ? `
                        <button class="btn btn-sm btn-gold" onclick="App.openRepayModalForLoan('${l.id}')">ফেরত</button>
                        <button class="btn btn-sm btn-outline" style="color:#333; border-color:#ccc;" onclick="App.openExtendModal('${l.id}')">মেয়াদ বৃদ্ধি</button>
                      ` : `
                        <button class="btn btn-sm btn-outline-green" onclick="App.printDocument('loan_clearance', '${l.id}')">📜 দায়মুক্তি সনদ</button>
                      `}
                      <button class="btn btn-sm btn-outline" style="color:#333;" onclick="App.printDocument('loan_agreement', '${l.id}')">চুক্তিপত্র</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${loans.length === 0 ? `<tr><td colspan="9" style="text-align: center; color: #777;">কোনো ধারের রেকর্ড পাওয়া যায়নি।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 7. Repayment Alerts (3-Day Due, Today Due, Overdue RED Area)
  renderAlerts(loans = [], notifications = []) {
    const todayStr = getDhakaDateStr();
    const overdueLoans = loans.filter(l => l.outstanding_principal > 0 && l.due_date < todayStr);
    const dueTodayLoans = loans.filter(l => l.outstanding_principal > 0 && l.due_date === todayStr);
    const upcomingLoans = loans.filter(l => {
      const diff = getDaysDiff(l.due_date, todayStr);
      return l.outstanding_principal > 0 && diff > 0 && diff <= 3;
    });

    return `
      <!-- Overdue Red Section -->
      <div class="card" style="border: 2px solid var(--warning-red);">
        <div class="card-header" style="background: var(--warning-red-bg);">
          <div class="card-title" style="color: var(--warning-red);">
            🚨 মেয়াদোত্তীর্ণ বকেয়া ধারের তালিকা (জরুরি পুনরুদ্ধার অঞ্চল)
          </div>
          <span class="badge" style="background: var(--warning-red); color: white; padding: 4px 10px; border-radius: 12px;">
            ${bnNum(overdueLoans.length)} টি মেয়াদোত্তীর্ণ
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr style="background: #fde8e8;">
                <th>ধার আইডি</th>
                <th>গ্রহীতার নাম</th>
                <th>মোবাইল নম্বর</th>
                <th>বকেয়া মূলধন</th>
                <th>নির্ধারিত ফেরতের তারিখ</th>
                <th>অতিক্রান্ত দিন</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${overdueLoans.map(l => {
                const daysOverdue = Math.abs(getDaysDiff(l.due_date, todayStr));
                return `
                  <tr>
                    <td style="font-family: var(--font-en); font-weight: 700;">${l.id}</td>
                    <td><strong>${l.applicant_name}</strong></td>
                    <td><a href="tel:${l.applicant_mobile}" style="color: #075B3B; font-weight: 700;">📞 ${l.applicant_mobile}</a></td>
                    <td style="font-weight: 800; color: #C62828; font-size: 1.1rem;">৳ ${bnNum(l.outstanding_principal)}</td>
                    <td>${l.due_date}</td>
                    <td style="color: #C62828; font-weight: 800;">${bnNum(daysOverdue)} দিন বাকি পেরিয়েছে</td>
                    <td>
                      <button class="btn btn-sm btn-gold" onclick="App.openRepayModalForLoan('${l.id}')">ফেরত গ্রহণ</button>
                      <button class="btn btn-sm btn-outline" style="color:#444;" onclick="App.openExtendModal('${l.id}')">মেয়াদ বৃদ্ধি</button>
                    </td>
                  </tr>
                `;
              }).join('')}
              ${overdueLoans.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #075B3B; font-weight: 600;">আলহামদুলিল্লাহ! কোনো মেয়াদোত্তীর্ণ ঋণ বকেয়া নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3-Day Reminders & Today Due -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">⏰ আগামী ৩ দিনের মধ্যে পরিশোধের নির্ধারিত ধার</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ধার আইডি</th>
                <th>গ্রহীতার নাম</th>
                <th>মোবাইল নম্বর</th>
                <th>বকেয়া টাকা</th>
                <th>ফেরতের শেষ তারিখ</th>
                <th>অবস্থা</th>
                <th>ব্যবস্থা</th>
              </tr>
            </thead>
            <tbody>
              ${dueTodayLoans.map(l => `
                <tr style="background: var(--warning-amber-bg);">
                  <td style="font-family: var(--font-en); font-weight: 700;">${l.id}</td>
                  <td><strong>${l.applicant_name}</strong></td>
                  <td>${l.applicant_mobile}</td>
                  <td style="font-weight: 800; color: #855300;">৳ ${bnNum(l.outstanding_principal)}</td>
                  <td><strong>${l.due_date}</strong></td>
                  <td><span class="status-badge" style="background:#fde68a; color:#854d0e;">⚠️ আজকেই ফেরতের তারিখ</span></td>
                  <td><button class="btn btn-sm btn-gold" onclick="App.openRepayModalForLoan('${l.id}')">ফেরত গ্রহণ</button></td>
                </tr>
              `).join('')}
              ${upcomingLoans.map(l => {
                const diff = getDaysDiff(l.due_date, todayStr);
                return `
                  <tr>
                    <td style="font-family: var(--font-en);">${l.id}</td>
                    <td><strong>${l.applicant_name}</strong></td>
                    <td>${l.applicant_mobile}</td>
                    <td style="font-weight: 700;">৳ ${bnNum(l.outstanding_principal)}</td>
                    <td>${l.due_date}</td>
                    <td><span class="status-badge pending">আর ${bnNum(diff)} দিন বাকি</span></td>
                    <td><button class="btn btn-sm btn-gold" onclick="App.openRepayModalForLoan('${l.id}')">ফেরত গ্রহণ</button></td>
                  </tr>
                `;
              }).join('')}
              ${dueTodayLoans.length === 0 && upcomingLoans.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777;">আগামী ৩ দিনে কোনো ধার ফেরত নির্ধারিত নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 8. Cashbook & Accounts
  renderCashbook(transactions = [], accounts = [], funds = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📖 দৈনিক ও মাসিক ক্যাশবুক (Cashbook Ledger)</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-primary" onclick="App.openModal('transfer')">🔄 হিসাব স্থানান্তর</button>
            <button class="btn btn-sm btn-outline-green" onclick="window.print()">🖨️ ক্যাশবুক প্রিন্ট</button>
          </div>
        </div>
        <!-- Financial Accounts Balances Overview -->
        <div class="stats-grid" style="margin-bottom: 20px;">
          ${accounts.map(a => `
            <div class="stat-card">
              <div class="stat-icon ${a.account_type === 'cash' ? 'green' : (a.account_type === 'bank' ? 'blue' : 'gold')}">
                ${a.account_type === 'cash' ? '💵' : (a.account_type === 'bank' ? '🏦' : '📱')}
              </div>
              <div class="stat-info">
                <h4>${a.name_bn}</h4>
                <div class="stat-value">৳ ${bnNum(a.current_balance)}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>লেনদেন আইডি</th>
                <th>হিসাব</th>
                <th>ধরন</th>
                <th>জমা (+ প্রাপ্তি)</th>
                <th>খরচ (- প্রদান)</th>
                <th>রেফারেন্স</th>
                <th>বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td style="font-family: var(--font-en); font-size: 0.85rem;">${t.id}</td>
                  <td>${t.account_name}</td>
                  <td>${t.type}</td>
                  <td style="font-weight: 700; color: #075B3B;">
                    ${t.direction === 'IN' ? `+ ৳ ${bnNum(t.amount)}` : '-'}
                  </td>
                  <td style="font-weight: 700; color: #C62828;">
                    ${t.direction === 'OUT' ? `- ৳ ${bnNum(t.amount)}` : '-'}
                  </td>
                  <td>${t.reference_no || 'N/A'}</td>
                  <td>${t.description_bn}</td>
                </tr>
              `).join('')}
              ${transactions.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777;">কোনো লেনদেন পাওয়া যায়নি।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 9. Expenses
  renderExpenses(expenses = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🧾 ব্যয় ব্যবস্থাপনা (Expense Vouchers)</div>
          <button class="btn btn-danger btn-sm" onclick="App.openModal('expense')">➕ নতুন ব্যয় এন্ট্রি</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ভাউচার নং</th>
                <th>তারিখ</th>
                <th>খাত / ক্যাটাগরি</th>
                <th>প্রাপক / ভেন্ডর</th>
                <th>পরিশোধের হিসাব</th>
                <th>পরিমাণ</th>
                <th>বিবরণ</th>
                <th>অনুমোদনকারী</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map(e => `
                <tr>
                  <td style="font-family: var(--font-en); font-weight: 600;">${e.voucher_receipt_number || e.id}</td>
                  <td>${e.date}</td>
                  <td><span class="status-badge overdue">${e.category}</span></td>
                  <td><strong>${e.recipient_vendor}</strong></td>
                  <td>${e.account_name}</td>
                  <td style="font-weight: 800; color: #C62828;">৳ ${bnNum(e.amount)}</td>
                  <td>${e.description}</td>
                  <td>${e.approved_by || 'হিসাব শাখা'}</td>
                </tr>
              `).join('')}
              ${expenses.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777;">কোনো ব্যয়ের রেকর্ড নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 10. Financial Reports & Balance Sheet
  renderReports(reports = {}) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📑 সমন্বিত আর্থিক প্রতিবেদন ও ব্যালেন্স শিট</div>
          <button class="btn btn-outline-green btn-sm" onclick="window.print()">🖨️ প্রিন্ট করুন</button>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <button class="btn btn-primary btn-sm" onclick="App.switchReportTab('balancesheet')">পূর্ণাঙ্গ ব্যালেন্স শিট</button>
          <button class="btn btn-outline-green btn-sm" onclick="App.switchReportTab('income_expenditure')">আয়-ব্যয় বিবরণী</button>
          <button class="btn btn-outline-green btn-sm" onclick="App.switchReportTab('cashbook')">ক্যাশবুক সামারি</button>
        </div>
        <div id="reportContentArea">
          <!-- Render Balance Sheet Document by default -->
          ${reports.balanceSheet ? DocumentGenerator.generateBalanceSheetDocument(App.state.org, reports.balanceSheet) : 'প্রতিবেদন প্রস্তুত হচ্ছে...'}
        </div>
      </div>
    `;
  },

  // 11. Document Center (All 15 Official Documents)
  renderDocuments(org) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 অফিসিয়াল বাংলা নথি ও প্রত্যয়নপত্র প্রিন্ট সেন্টার</div>
        </div>
        <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 20px;">
          নিচের তালিকা থেকে যে কোনো অফিসিয়াল নথি বা রসিদ নির্বাচন করে সরাসরি প্রিন্ট বা পিডিএফ হিসেবে সংরক্ষণ করুন:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div class="stat-card" style="cursor: pointer;" onclick="App.printDocument('sample_application')">
            <div class="stat-icon green">📝</div>
            <div class="stat-info">
              <h4>১. ঋণ/সহায়তা আবেদন ফরম</h4>
              <span class="btn btn-sm btn-outline-green" style="margin-top: 6px;">প্রিন্ট ফরম</span>
            </div>
          </div>
          <div class="stat-card" style="cursor: pointer;" onclick="App.printDocument('sample_agreement')">
            <div class="stat-icon gold">🤝</div>
            <div class="stat-info">
              <h4>৫. সুদমুক্ত ধার চুক্তিপত্র</h4>
              <span class="btn btn-sm btn-gold" style="margin-top: 6px;">চুক্তিপত্র প্রিন্ট</span>
            </div>
          </div>
          <div class="stat-card" style="cursor: pointer;" onclick="App.printDocument('sample_clearance')">
            <div class="stat-icon blue">📜</div>
            <div class="stat-info">
              <h4>৯. সম্পূর্ণ পরিশোধের সনদ</h4>
              <span class="btn btn-sm btn-outline-green" style="margin-top: 6px;">সনদ প্রিন্ট</span>
            </div>
          </div>
          <div class="stat-card" style="cursor: pointer;" onclick="App.printDocument('sample_balancesheet')">
            <div class="stat-icon green">📊</div>
            <div class="stat-info">
              <h4>১৫. পূর্ণাঙ্গ ব্যালেন্স শিট</h4>
              <span class="btn btn-sm btn-primary" style="margin-top: 6px;">ব্যালেন্স শিট প্রিন্ট</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 12. Audit Logs
  renderAuditLogs(logs = []) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔒 সিস্টেম অডিট লগ (Audit Trail & Activity Log)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>সময় ও তারিখ</th>
                <th>ব্যবহারকারী</th>
                <th>কার্যক্রম (Action)</th>
                <th>মডিউল</th>
                <th>রেকর্ড আইডি</th>
                <th>আইপি ঠিকানা</th>
                <th>বিস্তারিত বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td>${l.timestamp?.replace('T', ' ').substring(0, 19)}</td>
                  <td><strong>${l.user_name}</strong></td>
                  <td><span class="status-badge ${l.action === 'CREATE' ? 'active' : (l.action === 'DELETE_ATTEMPT' ? 'rejected' : 'pending')}">${l.action}</span></td>
                  <td>${l.module}</td>
                  <td style="font-family: var(--font-en);">${l.record_id || 'N/A'}</td>
                  <td style="font-family: var(--font-en); font-size: 0.85rem;">${l.ip_address}</td>
                  <td>${l.details}</td>
                </tr>
              `).join('')}
              ${logs.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: #777;">কোনো অডিট লগ রেকর্ড নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 13. Organization Settings & Backup
  renderSettings(org) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚙️ সংস্থা সেটিংস ও ডাটাবেজ ব্যাকআপ</div>
        </div>
        <!-- 10-Digit Phone Flag Notice (Mandatory from prompt) -->
        ${org.phone_verified_warning ? `
          <div class="alert-card warning">
            <div>
              <strong>টেলিফোন নম্বর যাচাই সংক্রান্ত নোটিশ:</strong><br>
              সংস্থার সরবরাহকৃত টেলিফোন নম্বরটিতে (<strong>${org.phone}</strong>) ১০টি অঙ্ক রয়েছে। বাংলাদেশে সচরাচর ১১ অঙ্কের মোবাইল নম্বর ব্যবহৃত হয়। অনুগ্রহ করে নম্বরটি যাচাই করে প্রয়োজনবোধে নিচে সংশোধন করুন।
            </div>
          </div>
        ` : ''}

        <form id="orgSettingsForm" onsubmit="App.handleSettingsUpdate(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>সংস্থার নাম (বাংলায়)</label>
              <input type="text" name="name_bn" class="form-control" value="${org.name_bn || ''}" required>
            </div>
            <div class="form-group">
              <label>সংস্থার নাম (ইংরেজিতে)</label>
              <input type="text" name="name_en" class="form-control" value="${org.name_en || ''}" required>
            </div>
            <div class="form-group">
              <label>অবস্থান</label>
              <input type="text" name="location" class="form-control" value="${org.location || ''}" required>
            </div>
            <div class="form-group">
              <label>কার্যালয়ের ঠিকানা</label>
              <input type="text" name="address" class="form-control" value="${org.address || ''}" required>
            </div>
            <div class="form-group">
              <label>প্রতিষ্ঠাতা ও চেয়ারম্যানের নাম</label>
              <input type="text" name="chairman_name" class="form-control" value="${org.chairman_name || ''}" required>
            </div>
            <div class="form-group">
              <label>মোবাইল / টেলিফোন নম্বর</label>
              <input type="text" name="phone" class="form-control" value="${org.phone || ''}" required>
            </div>
            <div class="form-group">
              <label>হোয়াটসঅ্যাপ নম্বর</label>
              <input type="text" name="whatsapp" class="form-control" value="${org.whatsapp || ''}" required>
            </div>
            <div class="form-group">
              <label>বিকাশ Send Money নম্বর</label>
              <input type="text" name="bkash_number" class="form-control" value="${org.bkash_number || ''}" required>
            </div>
            <div class="form-group">
              <label>অফিসিয়াল ইমেইল</label>
              <input type="email" name="email" class="form-control" value="${org.email || ''}" required>
            </div>
          </div>
          <div class="form-group">
            <label>বিকাশ অনুদান প্রদানের নির্দেশনা</label>
            <textarea name="bkash_instructions" class="form-control" rows="3">${org.bkash_instructions || ''}</textarea>
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="phone_verified_warning" ${org.phone_verified_warning ? 'checked' : ''}>
              টেলিফোন নম্বরের সতর্কবার্তা প্রদর্শন রাখুন
            </label>
          </div>
          <button type="submit" class="btn btn-primary">সেটিংস সংরক্ষণ করুন</button>
        </form>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid var(--border-color);">

        <h4 style="color: var(--primary-deep-green); margin-bottom: 12px;">💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর</h4>
        <div style="display: flex; gap: 14px; flex-wrap: wrap;">
          <a href="/api/system/backup" class="btn btn-gold" download>
            📥 সম্পূর্ণ ডাটাবেজ ব্যাকআপ ডাউনলোড করুন (.sqlite)
          </a>
          <button class="btn btn-outline-green" onclick="document.getElementById('restoreFileInput').click()">
            📤 ব্যাকআপ রিস্টোর করুন
          </button>
          <input type="file" id="restoreFileInput" style="display: none;" accept=".sqlite" onchange="App.handleRestoreBackup(event)">
        </div>
      </div>
    `;
  },

  // 14. Advisory Board & Committee Members Management (Admin / Super Admin Control)
  renderCommittee(committee = []) {
    const isAdmin = App.state.user && (App.state.user.role === 'superadmin' || App.state.user.role === 'admin' || App.state.user.username === 'admin' || App.state.user.username === 'Shahalam69');
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">👥 সম্মানিত উপদেষ্টা মণ্ডলী ও পরিচালনা পরিষদ ব্যবস্থাপনা</div>
          ${isAdmin ? `
            <button class="btn btn-primary btn-sm" onclick="App.openModal('committee_member')">➕ নতুন উপদেষ্টা / সদস্য যোগ করুন</button>
          ` : `
            <span style="font-size:0.85rem; color:#777;">উপদেষ্টা ও সদস্য পরিবর্তনের ক্ষমতা কেবল এডমিন / সুপার এডমিনের</span>
          `}
        </div>
        <div class="alert-card info">
          <div>
            <strong>উপদেষ্টা পরিষদ ও পরিচালনা পর্ষদ সংক্রান্ত নির্দেশনা:</strong><br>
            এখানে প্রদর্শিত সম্মানিত সদস্যদের তথ্য ও ছবি সরাসরি এডমিন ড্যাশবোর্ড ও পাবলিক পোর্টালে দৃশ্যমান থাকে। সদস্যদের সংযোজন, বিয়োজন, পদবি বা ছবি পরিবর্তনের পূর্ণ ক্ষমতা এডমিনের (প্রতিষ্ঠাতা চেয়ারম্যান MD SHAH ALAM) নিয়ন্ত্রণে সংরক্ষিত।
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 60px;">ক্রম</th>
                <th style="width: 70px;">ছবি</th>
                <th>নাম (বাংলা ও ইংরেজি)</th>
                <th>পদবি</th>
                <th>মোবাইল নম্বর</th>
                <th>ইমেইল</th>
                <th>অবস্থা</th>
                ${isAdmin ? `<th style="width: 170px;">অ্যাকশন</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${committee.map(m => `
                <tr>
                  <td style="font-weight:700; text-align:center;">${bnNum(m.display_order || 1)}</td>
                  <td>
                    <div style="width: 46px; height: 46px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; background: #e8f5ec; margin: 0 auto;">
                      ${m.photo_url ? `<img src="${m.photo_url}" alt="${m.name_bn}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:22px;">👤</span>`}
                    </div>
                  </td>
                  <td>
                    <strong style="color: #075B3B;">${m.name_bn}</strong>
                    ${m.name_en ? `<br><small style="color:#777;">${m.name_en}</small>` : ''}
                  </td>
                  <td><span class="status-badge active" style="font-weight:600;">${m.designation_bn}</span></td>
                  <td>${m.mobile || 'N/A'}</td>
                  <td>${m.email || 'N/A'}</td>
                  <td><span class="status-badge ${m.is_active ? 'verified' : 'rejected'}">${m.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span></td>
                  ${isAdmin ? `
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-sm btn-outline-green" onclick="App.editCommitteeMember(${m.id})">✏️ সম্পাদনা</button>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteCommitteeMember(${m.id})">🗑️ অপসারণ</button>
                      </div>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
              ${committee.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: #777;">কোনো কমিটি সদস্যের তথ্য নেই।</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
