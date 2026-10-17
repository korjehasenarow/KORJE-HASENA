// Comprehensive Automated Test Suite for Karje Hasana Foundation

const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('  STARTING TEST SUITE: KARJE HASENA FOUNDATION');
  console.log('========================================================\n');

  // 1. Settings & Initial Info
  console.log('--- Testing Organization Information ---');
  const orgRes = await request('GET', '/api/settings');
  assert(orgRes.status === 200, 'Settings endpoint returns 200');
  assert(orgRes.data.data.name_bn === 'কর্জে হাসানা ফাউন্ডেশন', 'Organization name in Bengali is correct');
  assert(orgRes.data.data.chairman_name === 'MD SHAH ALAM', 'Founder & Chairman name is MD SHAH ALAM');
  assert(orgRes.data.data.phone === '01966442769', 'Contact phone number is 01966442769');

  // 2. Scenario A: Donor Registration and Donation
  console.log('\n--- Scenario A: Donor Registration and Donation ---');
  const donorRes = await request('POST', '/api/donors', {
    name_bn: 'মোঃ আব্দুল করিম',
    name_en: 'Md Abdul Karim',
    mobile: '01711223344',
    category: 'মাসিক দাতা',
    frequency: 'মাসিক',
    commitment_amount: 2000,
    address: 'রৌমারী বাজার, কুড়িগ্রাম',
    user_id: '1',
    user_name: 'MD SHAH ALAM'
  });
  assert(donorRes.status === 200 && donorRes.data.success, 'Donor registered successfully');
  const donorId = donorRes.data.donorId;
  assert(donorId.startsWith('DON-'), `Generated donor ID: ${donorId}`);

  // Initial cash balance
  const statsBeforeDon = (await request('GET', '/api/dashboard/stats')).data.data;
  const initialCash = statsBeforeDon.cashBalance;

  // Record donation
  const donRes = await request('POST', '/api/donations', {
    donor_id: donorId,
    donor_name: 'মোঃ আব্দুল করিম',
    donor_mobile: '01711223344',
    amount: 5000,
    date: '2026-10-14',
    fund_id: 1, // General Fund
    financial_account_id: 1, // Cash
    payment_method: 'নগদ',
    user_id: '1',
    user_name: 'MD SHAH ALAM'
  });
  assert(donRes.status === 200 && donRes.data.success, 'Donation recorded successfully');
  assert(donRes.data.receiptNumber.startsWith('REC-DON-'), `Generated donation receipt: ${donRes.data.receiptNumber}`);

  // Confirm cash balance increased by 5000
  const statsAfterDon = (await request('GET', '/api/dashboard/stats')).data.data;
  assert(statsAfterDon.cashBalance === initialCash + 5000, `Cash balance correctly increased by ৳5000 (Before: ${initialCash}, After: ${statsAfterDon.cashBalance})`);

  // Confirm appears in donor profile
  const donorProfile = (await request('GET', `/api/donors/${donorId}`)).data.data;
  assert(donorProfile.totalDonated === 5000, `Donor profile reflects verified donation total: ৳${donorProfile.totalDonated}`);

  // 3. Scenario B: Manual bKash Payment Workflow
  console.log('\n--- Scenario B: Manual bKash Payment Submission & Verification ---');
  const trxId = 'BKTRX' + Date.now().toString().slice(-6);
  const paySubRes = await request('POST', '/api/public/submit-payment', {
    donor_name: 'হাজী মোঃ শহীদুল্লাহ',
    donor_mobile: '01812345678',
    bkash_number_used: '01966442769',
    sender_bkash_mobile: '01812345678',
    transaction_id: trxId,
    amount: 3000,
    fund_category: 'সাধারণ অনুদান',
    payment_date: '2026-10-14'
  });
  assert(paySubRes.status === 200 && paySubRes.data.success, 'Public bKash Send Money submission created');
  const subId = paySubRes.data.submissionId;

  // Verify it is pending
  const subsList = (await request('GET', '/api/bkash-submissions')).data.data;
  const createdSub = subsList.find(s => s.id === subId);
  assert(createdSub && createdSub.verification_status === 'অপেক্ষমাণ', 'Payment submission is in pending (অপেক্ষমাণ) state');

  // Verify bKash balance before verification
  const bkashBalBefore = (await request('GET', '/api/dashboard/stats')).data.data.bkashBalance;

  // Admin verifies payment
  const verifyRes = await request('POST', `/api/bkash-submissions/${subId}/verify`, {
    user_id: '1',
    user_name: 'MD SHAH ALAM'
  });
  assert(verifyRes.status === 200 && verifyRes.data.success, 'Admin verified bKash payment');

  // Check bKash balance increased
  const bkashBalAfter = (await request('GET', '/api/dashboard/stats')).data.data.bkashBalance;
  assert(bkashBalAfter === bkashBalBefore + 3000, `bKash account balance correctly updated by ৳3000 (Before: ${bkashBalBefore}, After: ${bkashBalAfter})`);

  // Attempt duplicate TrxID
  const dupRes = await request('POST', '/api/public/submit-payment', {
    donor_name: 'অন্য ব্যক্তি',
    donor_mobile: '01999999999',
    transaction_id: trxId, // Duplicate!
    amount: 1000
  });
  assert(dupRes.status === 409, `Duplicate transaction ID correctly rejected with 409 Conflict: ${dupRes.data.message}`);

  // 4. Scenario C: Application, Verification, Approval, Loan Disbursement
  console.log('\n--- Scenario C: Loan Application, Approval, and Disbursement ---');
  const appSubRes = await request('POST', '/api/public/submit-application', {
    name_bn: 'মোঃ মোবারক হোসেন',
    father_husband_name: 'মকবুল হোসেন',
    mother_name: 'আলেয়া বেগম',
    mobile: '01798765432',
    present_address: 'যাদুরচর, রৌমারী, কুড়িগ্রাম',
    occupation: 'ছোট মুদি দোকানি',
    monthly_income: 8500,
    assistance_type: 'সুদমুক্ত ধার',
    requested_amount: 10000,
    requested_duration_days: 15,
    purpose: 'দোকানের মালামাল পাইকারি ক্রয়'
  });
  assert(appSubRes.status === 200 && appSubRes.data.success, 'Public loan application submitted');
  const appId = appSubRes.data.applicationId;

  // Field Verification
  const verFieldRes = await request('POST', `/api/applications/${appId}/verify`, {
    notes: 'সরেজমিনে দোকান পরিদর্শন করা হয়েছে। আবেদনকারী সৎ ও শ্রমজীবী। সুপারিশকৃত।',
    officer_name: 'মোস্তাফিজুর রহমান (মাঠ কর্মকর্তা)',
    recommendation: 'অনুমোদনের সুপারিশ'
  });
  assert(verFieldRes.status === 200, 'Field verification report submitted');

  // Committee Approval
  const appApproveRes = await request('POST', `/api/applications/${appId}/approve`, {
    approved_amount: 10000,
    approved_duration_days: 15,
    approver_name: 'MD SHAH ALAM (চেয়ারম্যান)',
    notes: '১০,০০০ টাকা ১৫ দিনের জন্য সম্পূর্ণ সুদমুক্ত ধার অনুমোদন করা হলো।'
  });
  assert(appApproveRes.status === 200, 'Application approved by committee');

  // Loan Disbursement
  const cashBeforeDisb = (await request('GET', '/api/dashboard/stats')).data.data.cashBalance;
  const disbRes = await request('POST', '/api/loans/disburse', {
    application_id: appId,
    disbursed_from_account_id: 1, // Cash
    fund_id: 2, // Revolving Loan Fund
    actual_disbursement_date: '2026-10-14',
    approved_duration_days: 15,
    disbursed_amount: 10000,
    disbursed_by: 'MD SHAH ALAM'
  });
  assert(disbRes.status === 200 && disbRes.data.success, 'Loan disbursed successfully');
  const loanId = disbRes.data.loanId;
  assert(disbRes.data.dueDate === '2026-10-29', `Automatic maturity calculation verified: 2026-10-14 + 15 days = ${disbRes.data.dueDate}`);

  // Confirm cash decreased and loan receivables increased
  const statsAfterDisb = (await request('GET', '/api/dashboard/stats')).data.data;
  assert(statsAfterDisb.cashBalance === cashBeforeDisb - 10000, `Cash correctly decreased by ৳10000 upon disbursement`);
  assert(statsAfterDisb.outstandingLoans >= 10000, `Outstanding loan receivables correctly tracked: ৳${statsAfterDisb.outstandingLoans}`);

  // 5. Scenario D: 3-Day Repayment Reminder Check
  console.log('\n--- Scenario D: 3-Day Repayment Reminder Scheduling ---');
  // First reminder run
  const notifRun1 = await request('POST', '/api/notifications/run-check');
  assert(notifRun1.status === 200 && notifRun1.data.success, 'Scheduled notification engine ran');

  // Second run -> Should not create duplicate
  const notifRun2 = await request('POST', '/api/notifications/run-check');
  assert(notifRun2.data.remindersCreated === 0, 'Duplicate notification prevention verified: 0 duplicates created');

  // 6. Scenario E: Partial Repayment
  console.log('\n--- Scenario E: Partial Repayment Tracking ---');
  const partialRepayRes = await request('POST', '/api/repayments', {
    loan_id: loanId,
    amount: 4000,
    repayment_date: '2026-10-14',
    received_in_account_id: 1,
    payment_method: 'নগদ',
    recorded_by: 'হিসাবরক্ষক'
  });
  assert(partialRepayRes.status === 200 && partialRepayRes.data.success, 'Partial repayment of ৳4000 recorded');
  assert(partialRepayRes.data.isFullyRepaid === false, 'Loan remains active after partial repayment');
  assert(partialRepayRes.data.outstandingPrincipal === 6000, `Outstanding principal correctly calculated: 10000 - 4000 = ৳${partialRepayRes.data.outstandingPrincipal}`);

  // 7. Scenario F: Full Repayment & Loan Closure
  console.log('\n--- Scenario F: Final Repayment and Full Loan Closure ---');
  const finalRepayRes = await request('POST', '/api/repayments', {
    loan_id: loanId,
    amount: 6000,
    repayment_date: '2026-10-14',
    received_in_account_id: 1,
    payment_method: 'নগদ',
    recorded_by: 'হিসাবরক্ষক'
  });
  assert(finalRepayRes.status === 200 && finalRepayRes.data.success, 'Final repayment of ৳6000 recorded');
  assert(finalRepayRes.data.isFullyRepaid === true, 'Loan marked as fully repaid (সম্পূর্ণ পরিশোধিত)');
  assert(finalRepayRes.data.outstandingPrincipal === 0, 'Outstanding principal is ৳0');

  // Verify loan status in database
  const loanRecord = (await request('GET', `/api/loans/${loanId}`)).data.data;
  assert(loanRecord.loan_status === 'সম্পূর্ণ পরিশোধিত', 'Loan status is updated to সম্পূর্ণ পরিশোধিত');

  // 8. Scenario G: Financial Reconciliation & Balance Sheet
  console.log('\n--- Scenario G: Financial Reconciliation & Balance Sheet ---');
  // Record an expense
  const expRes = await request('POST', '/api/expenses', {
    category: 'অফিস খরচ',
    amount: 1500,
    payment_account_id: 1,
    recipient_vendor: 'রৌমারী প্রিন্টার্স',
    description: 'রসিদ বই ও আবেদন ফরম মুদ্রণ',
    entered_by: 'হিসাবরক্ষক'
  });
  assert(expRes.status === 200 && expRes.data.success, 'Expense recorded');

  // Inter-account transfer (e.g. bKash to Bank)
  const trfRes = await request('POST', '/api/transfers', {
    from_account_id: 3, // bKash
    to_account_id: 2, // Bank
    amount: 2000,
    reference: 'TRF-BKASH-BANK-01',
    recorded_by: 'হিসাব শাখা'
  });
  assert(trfRes.status === 200 && trfRes.data.success, 'Account transfer recorded');

  // Check Balance Sheet
  const bsRes = await request('GET', '/api/reports/balance-sheet');
  assert(bsRes.status === 200 && bsRes.data.success, 'Balance sheet generated');
  assert(bsRes.data.data.isBalanced === true, `Balance sheet is completely reconciled: Assets = Liabilities + Equity (Balanced: ${bsRes.data.data.isBalanced})`);

  // 9. Scenario H: Audit Logs
  console.log('\n--- Scenario H: Audit Trail Verification ---');
  const auditRes = await request('GET', '/api/audit-logs');
  assert(auditRes.status === 200 && auditRes.data.data.length > 5, `Audit logs recorded ${auditRes.data.data.length} actions with timestamps and users`);

  // 10. Scenario I: Advisory Board & Committee Members
  console.log('\n--- Scenario I: Advisory Board & Committee Verification ---');
  const comRes = await request('GET', '/api/committee');
  assert(comRes.status === 200 && comRes.data.success, 'Committee endpoint returns 200');
  assert(comRes.data.data.length >= 9, `At least 9 advisory board & committee members present (Count: ${comRes.data.data.length})`);
  assert(comRes.data.data.some(m => m.name_bn.includes('শাহ্ আলম')), 'Founder Chairman MD SHAH ALAM is present');
  assert(comRes.data.data.some(m => m.name_bn.includes('মোকছেদ আলী')), 'Principal Moksed Ali is present');
  assert(comRes.data.data.some(m => m.name_bn.includes('আল আমিন অনিক')), 'CEO Al Amin Onik is present');

  console.log('\n========================================================');
  console.log('  ALL END-TO-END TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
