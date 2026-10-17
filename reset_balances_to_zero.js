const db = require('./db.js');
const fs = require('fs');
const path = require('path');

async function resetToZero() {
  await db.getDb();

  console.log('[RESET] Starting database balance reset to 0...');

  db.transaction(({ run }) => {
    // 1. Delete all operational mock and test data
    run('DELETE FROM loan_extensions;');
    run('DELETE FROM repayments;');
    run('DELETE FROM loans;');
    run('DELETE FROM applications;');
    run('DELETE FROM applicants;');
    run('DELETE FROM payment_submissions;');
    run('DELETE FROM donations;');
    run('DELETE FROM donors;');
    run('DELETE FROM expenses;');
    run('DELETE FROM welfare_grants;');
    run('DELETE FROM account_transfers;');
    run('DELETE FROM transactions;');
    run('DELETE FROM notifications;');
    run('DELETE FROM audit_logs;');

    // 2. Reset opening balances of all financial accounts and funds to 0.00
    run('UPDATE financial_accounts SET opening_balance = 0.0;');
    run('UPDATE funds SET opening_balance = 0.0;');
  });

  // Clean demo/test upload files from public/uploads (preserving committee directory)
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      if (f.startsWith('photo-') || f.startsWith('test-') || f.startsWith('demo-')) {
        try {
          fs.unlinkSync(path.join(uploadsDir, f));
          console.log('[RESET] Removed test upload:', f);
        } catch (e) {}
      }
    }
  }

  // Also clean welfare uploads if any
  const welfareDir = path.join(__dirname, 'public', 'uploads', 'welfare');
  if (fs.existsSync(welfareDir)) {
    const wFiles = fs.readdirSync(welfareDir);
    for (const f of wFiles) {
      try {
        fs.unlinkSync(path.join(welfareDir, f));
        console.log('[RESET] Removed welfare test upload:', f);
      } catch (e) {}
    }
  }

  console.log('[RESET] All balances, transactions, and demo data successfully reset to 0.');

  // Verification queries
  const donorsCount = db.get('SELECT count(*) as c FROM donors').c;
  const donTotal = db.get('SELECT coalesce(sum(amount), 0) as s FROM donations').s;
  const loansDisbursed = db.get('SELECT coalesce(sum(original_principal), 0) as s FROM loans').s;
  const loansRepaid = db.get('SELECT coalesce(sum(total_principal_repaid), 0) as s FROM loans').s;
  const welfareTotal = db.get('SELECT coalesce(sum(amount), 0) as s FROM welfare_grants').s;
  const welfareBeneficiaries = db.get('SELECT coalesce(sum(beneficiary_count), 0) as s FROM welfare_grants').s;
  const txCount = db.get('SELECT count(*) as c FROM transactions').c;
  const totalOpening = db.get('SELECT coalesce(sum(opening_balance), 0) as s FROM financial_accounts').s;

  console.log('====================================');
  console.log('       VERIFICATION SUMMARY         ');
  console.log('====================================');
  console.log('👥 নিবন্ধিত শুভাকাঙ্ক্ষী ও দাতা:', donorsCount, 'জন');
  console.log('💰 মোট প্রাপ্ত অনুদান: ৳', donTotal);
  console.log('🤝 বিতরণকৃত সুদমুক্ত ধার: ৳', loansDisbursed);
  console.log('🔄 ফেরতপ্রাপ্ত মূলধন: ৳', loansRepaid);
  console.log('🌾 এককালীন ত্রাণ ও সহায়তা: ৳', welfareTotal);
  console.log('👨‍👩‍👧‍👦 উপকৃত পরিবার ও ব্যক্তি:', welfareBeneficiaries, 'জন');
  console.log('📝 মোট লেনদেন সংখ্যা:', txCount, 'টি');
  console.log('💼 একাউন্ট ব্যালেন্স (Opening): ৳', totalOpening);
  console.log('====================================');
}

resetToZero().catch(console.error);
