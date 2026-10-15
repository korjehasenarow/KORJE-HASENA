const db = require('./db.js');

async function resetToZero() {
  await db.getDb();

  console.log('[RESET] Starting database balance reset to 0...');

  db.transaction(({ run }) => {
    // 1. Delete all operational mock data
    run('DELETE FROM loan_extensions;');
    run('DELETE FROM repayments;');
    run('DELETE FROM loans;');
    run('DELETE FROM applications;');
    run('DELETE FROM applicants;');
    run('DELETE FROM payment_submissions;');
    run('DELETE FROM donations;');
    run('DELETE FROM donors;');
    run('DELETE FROM expenses;');
    run('DELETE FROM account_transfers;');
    run('DELETE FROM transactions;');
    run('DELETE FROM notifications;');

    // 2. Reset opening balances of all financial accounts and funds to 0.00
    run('UPDATE financial_accounts SET opening_balance = 0.0;');
    run('UPDATE funds SET opening_balance = 0.0;');

    // 3. Clear audit logs as well for clean start
    run('DELETE FROM audit_logs;');
  });

  console.log('[RESET] Balances successfully reset to 0.');

  // Verify
  const donorsCount = db.get('SELECT count(*) as c FROM donors').c;
  const donTotal = db.get('SELECT coalesce(sum(amount), 0) as s FROM donations').s;
  const loansDisbursed = db.get('SELECT coalesce(sum(original_principal), 0) as s FROM loans').s;
  const loansRepaid = db.get('SELECT coalesce(sum(total_principal_repaid), 0) as s FROM loans').s;
  const totalOpening = db.get('SELECT coalesce(sum(opening_balance), 0) as s FROM financial_accounts').s;

  console.log('--- VERIFICATION ---');
  console.log('Donors count:', donorsCount);
  console.log('Donations total:', donTotal);
  console.log('Loans disbursed:', loansDisbursed);
  console.log('Loans repaid:', loansRepaid);
  console.log('Account balances (Opening):', totalOpening);
}

resetToZero().catch(console.error);
