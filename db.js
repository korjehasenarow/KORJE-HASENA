const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'korje_hasena.sqlite');

let dbInstance = null;
let SQL = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  // Auto-create data directory if missing (e.g. on Render or fresh clone)
  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });
    } catch (e) {
      console.error('[DB] Error creating data directory:', e);
    }
  }

  // If database was committed to root repository, copy to data directory
  const rootDbPath = path.join(__dirname, 'korje_hasena.sqlite');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(rootDbPath)) {
    try {
      fs.copyFileSync(rootDbPath, DB_PATH);
      console.log('[DB] Found korje_hasena.sqlite in root; copied to data/korje_hasena.sqlite');
    } catch (e) {
      console.error('[DB] Error copying root db to data directory:', e);
    }
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing SQLite database from disk.');
  } else {
    dbInstance = new SQL.Database();
    console.log('[DB] Initialized new in-memory SQLite database.');
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run migrations/tables init
  initSchema(dbInstance);

  // Save to disk
  saveDbToDisk();

  return dbInstance;
}

function saveDbToDisk() {
  if (!dbInstance) return;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[DB] Error saving database to disk:', err);
  }
}

function initSchema(db) {
  db.run(`
    -- Organization Settings
    CREATE TABLE IF NOT EXISTS organization_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      slogan_bn TEXT,
      location TEXT NOT NULL,
      address TEXT NOT NULL,
      chairman_name TEXT NOT NULL,
      chairman_title TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone_verified_warning INTEGER DEFAULT 1,
      whatsapp TEXT NOT NULL,
      bkash_number TEXT NOT NULL,
      email TEXT NOT NULL,
      currency TEXT DEFAULT 'BDT',
      currency_symbol TEXT DEFAULT '৳',
      timezone TEXT DEFAULT 'Asia/Dhaka',
      bkash_instructions TEXT NOT NULL,
      allow_public_registration INTEGER DEFAULT 1,
      updated_at TEXT
    );

    -- Users & Roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name_bn TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL, -- 'superadmin', 'accountant', 'verification_officer', 'committee_member', 'staff'
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Financial Accounts
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_bn TEXT NOT NULL,
      account_type TEXT NOT NULL, -- 'cash', 'bank', 'mfs', 'other'
      account_number TEXT,
      bank_name TEXT,
      opening_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Funds (Separated Restricted vs Unrestricted)
    CREATE TABLE IF NOT EXISTS funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_bn TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      is_restricted INTEGER DEFAULT 0,
      description TEXT,
      opening_balance REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Donors
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY, -- e.g. DON-2026-0001
      name_bn TEXT NOT NULL,
      name_en TEXT,
      mobile TEXT NOT NULL,
      whatsapp TEXT,
      email TEXT,
      address TEXT,
      category TEXT NOT NULL, -- 'মাসিক দাতা', 'এককালীন দাতা', 'নিয়মিত দাতা', 'বিশেষ দাতা', 'অন্যান্য দাতা'
      frequency TEXT DEFAULT 'এককালীন',
      commitment_amount REAL DEFAULT 0,
      preferred_payment_method TEXT,
      notes TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    -- Donations (Never treated as loans!)
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY, -- DONATION-2026-0001
      receipt_number TEXT UNIQUE NOT NULL,
      donor_id TEXT,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT NOT NULL,
      amount REAL NOT NULL,
      fund_id INTEGER NOT NULL,
      financial_account_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT,
      status TEXT NOT NULL, -- 'অপেক্ষমাণ', 'যাচাইাধীন', 'নিশ্চিত', 'প্রত্যাখ্যাত', 'বাতিল'
      date TEXT NOT NULL,
      recorded_by TEXT,
      verified_by TEXT,
      verified_at TEXT,
      rejection_reason TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (fund_id) REFERENCES funds(id),
      FOREIGN KEY (financial_account_id) REFERENCES financial_accounts(id)
    );

    -- Public bKash Payment Submissions
    CREATE TABLE IF NOT EXISTS payment_submissions (
      id TEXT PRIMARY KEY,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT NOT NULL,
      bkash_number_used TEXT NOT NULL,
      sender_bkash_mobile TEXT,
      transaction_id TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      fund_category TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      screenshot_path TEXT,
      notes TEXT,
      verification_status TEXT DEFAULT 'অপেক্ষমাণ', -- 'অপেক্ষমাণ', 'যাচাইাধীন', 'নিশ্চিত', 'প্রত্যাখ্যাত'
      verified_by TEXT,
      verified_at TEXT,
      associated_donation_id TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL
    );

    -- Applicants
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY, -- APP-MEM-2026-0001
      name_bn TEXT NOT NULL,
      name_en TEXT,
      father_husband_name TEXT NOT NULL,
      mother_name TEXT NOT NULL,
      dob TEXT,
      age INTEGER,
      gender TEXT,
      nid_number TEXT,
      mobile TEXT NOT NULL,
      alt_mobile TEXT,
      present_address TEXT NOT NULL,
      permanent_address TEXT NOT NULL,
      occupation TEXT NOT NULL,
      monthly_income REAL DEFAULT 0,
      family_members INTEGER DEFAULT 1,
      dependents INTEGER DEFAULT 0,
      emergency_contact_name TEXT,
      emergency_contact_mobile TEXT,
      photo_url TEXT,
      nid_file_url TEXT,
      created_at TEXT NOT NULL
    );

    -- Loan/Assistance Applications
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY, -- APP-2026-0001
      applicant_id TEXT NOT NULL,
      assistance_type TEXT NOT NULL, -- 'সুদমুক্ত ধার', 'চিকিৎসা সহায়তা', 'শিক্ষা সহায়তা', 'জরুরি অনুদান', 'অন্যান্য'
      requested_amount REAL NOT NULL,
      purpose TEXT NOT NULL,
      detailed_explanation TEXT,
      requested_duration_days INTEGER DEFAULT 30, -- 10, 15, 20, 30, or custom
      proposed_repayment_date TEXT,
      proposed_repayment_method TEXT,
      guarantor_name TEXT,
      guarantor_mobile TEXT,
      guarantor_relation TEXT,
      guarantor_address TEXT,
      guarantor_nid TEXT,
      status TEXT NOT NULL, -- 'খসড়া', 'জমা হয়েছে', 'যাচাইাধীন', 'অতিরিক্ত তথ্য প্রয়োজন', 'অনুমোদনের অপেক্ষায়', 'অনুমোদিত', 'প্রত্যাখ্যাত', 'অর্থ বিতরণ হয়েছে', 'সম্পূর্ণ পরিশোধিত', 'বন্ধ'
      verification_notes TEXT,
      verification_officer_id TEXT,
      verified_at TEXT,
      committee_recommendation TEXT,
      approved_amount REAL,
      approved_duration_days INTEGER,
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    );

    -- Approved and Disbursed Loans
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY, -- LOAN-2026-0001
      application_id TEXT UNIQUE NOT NULL,
      applicant_id TEXT NOT NULL,
      fund_id INTEGER NOT NULL,
      disbursed_from_account_id INTEGER NOT NULL,
      original_principal REAL NOT NULL,
      approved_duration_days INTEGER NOT NULL,
      actual_disbursement_date TEXT NOT NULL,
      due_date TEXT NOT NULL, -- Repayment Due Date = Actual Disbursement Date + Approved Duration
      repayment_method TEXT,
      total_principal_repaid REAL DEFAULT 0,
      outstanding_principal REAL NOT NULL,
      loan_status TEXT NOT NULL, -- 'সক্রিয়', 'সম্পূর্ণ পরিশোধিত', 'মেয়াদোত্তীর্ণ', 'স্থগিত'
      disbursement_receipt_number TEXT UNIQUE NOT NULL,
      disbursed_by TEXT NOT NULL,
      agreement_number TEXT UNIQUE NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (applicant_id) REFERENCES applicants(id),
      FOREIGN KEY (fund_id) REFERENCES funds(id),
      FOREIGN KEY (disbursed_from_account_id) REFERENCES financial_accounts(id)
    );

    -- Loan Extensions (Audit history)
    CREATE TABLE IF NOT EXISTS loan_extensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id TEXT NOT NULL,
      previous_due_date TEXT NOT NULL,
      new_due_date TEXT NOT NULL,
      extension_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      approved_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    -- Repayments (Full / Partial) - Never treated as donations!
    CREATE TABLE IF NOT EXISTS repayments (
      id TEXT PRIMARY KEY, -- REP-2026-0001
      receipt_number TEXT UNIQUE NOT NULL,
      loan_id TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      amount REAL NOT NULL,
      repayment_date TEXT NOT NULL,
      received_in_account_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT,
      status TEXT DEFAULT 'নিশ্চিত', -- 'যাচাইাধীন', 'নিশ্চিত', 'বাতিল'
      recorded_by TEXT NOT NULL,
      verified_by TEXT,
      verified_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (applicant_id) REFERENCES applicants(id),
      FOREIGN KEY (received_in_account_id) REFERENCES financial_accounts(id)
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, -- EXP-2026-0001
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_account_id INTEGER NOT NULL,
      recipient_vendor TEXT NOT NULL,
      description TEXT NOT NULL,
      voucher_receipt_number TEXT,
      entered_by TEXT NOT NULL,
      approved_by TEXT,
      status TEXT DEFAULT 'অনুমোদিত', -- 'অনুমোদিত', 'অপেক্ষমাণ', 'বাতিল'
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_account_id) REFERENCES financial_accounts(id)
    );

    -- Account Transfers
    CREATE TABLE IF NOT EXISTS account_transfers (
      id TEXT PRIMARY KEY, -- TRF-2026-0001
      from_account_id INTEGER NOT NULL,
      to_account_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_account_id) REFERENCES financial_accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES financial_accounts(id)
    );

    -- Unified Transaction Ledger
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, -- TRX-2026-0001
      date TEXT NOT NULL,
      type TEXT NOT NULL, -- 'DONATION', 'DISBURSEMENT', 'REPAYMENT', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING_BALANCE'
      account_id INTEGER NOT NULL,
      fund_id INTEGER,
      amount REAL NOT NULL,
      direction TEXT NOT NULL, -- 'IN', 'OUT'
      related_entity_type TEXT,
      related_entity_id TEXT,
      reference_no TEXT,
      description_bn TEXT NOT NULL,
      recorded_by TEXT,
      status TEXT DEFAULT 'verified',
      created_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES financial_accounts(id)
    );

    -- Scheduled Notifications (Prevents duplicate 3-day and overdue alerts)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'repayment_reminder_3days', 'repayment_due_today', 'loan_overdue', 'new_donation', 'new_bkash_payment', 'new_application'
      loan_id TEXT,
      applicant_name TEXT,
      title_bn TEXT NOT NULL,
      message_bn TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      channel TEXT DEFAULT 'dashboard',
      delivery_status TEXT DEFAULT 'delivered',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- Committee Members (Managing Committee with photos & Super Admin control)
    CREATE TABLE IF NOT EXISTS committee_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_bn TEXT NOT NULL,
      name_en TEXT,
      designation_bn TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      photo_url TEXT,
      bio_bn TEXT,
      display_order INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Welfare Grants & Humanitarian Relief (One-time, non-repayable aid: housing, food rations, medical, blankets, disaster relief)
    CREATE TABLE IF NOT EXISTS welfare_grants (
      id TEXT PRIMARY KEY,
      voucher_no TEXT UNIQUE NOT NULL,
      title_bn TEXT NOT NULL,
      category TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      beneficiary_mobile TEXT,
      beneficiary_nid TEXT,
      beneficiary_address TEXT NOT NULL,
      beneficiary_count INTEGER DEFAULT 1,
      amount REAL NOT NULL,
      fund_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      impact_notes TEXT,
      photo_url TEXT,
      approved_by TEXT NOT NULL,
      entered_by TEXT NOT NULL,
      status TEXT DEFAULT 'সম্পন্ন',
      created_at TEXT NOT NULL,
      FOREIGN KEY (fund_id) REFERENCES funds(id),
      FOREIGN KEY (account_id) REFERENCES financial_accounts(id)
    );
  `);

  // Column migration for donors photo_url and show_on_website
  try { db.run("ALTER TABLE donors ADD COLUMN photo_url TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE donors ADD COLUMN show_on_website INTEGER DEFAULT 1;"); } catch (e) {}

  // Column migrations for committee_members: whatsapp, address, profession, committee_type
  try { db.run("ALTER TABLE committee_members ADD COLUMN whatsapp TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE committee_members ADD COLUMN address TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE committee_members ADD COLUMN profession TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE committee_members ADD COLUMN committee_type TEXT DEFAULT 'পরিচালনা পরিষদ';"); } catch (e) {}

  // Seed Default Advisory Board / Committee Members if empty
  try {
    const comCheck = db.exec('SELECT COUNT(*) as count FROM committee_members;');
    const comCount = comCheck[0]?.values[0][0] || 0;
    if (comCount === 0) {
      db.run(`
        INSERT INTO committee_members (id, name_bn, name_en, designation_bn, committee_type, mobile, email, photo_url, bio_bn, display_order, is_active, created_at) VALUES
        (1, 'জনাব মোঃ শাহ্ আলম ইসলাম', 'MD SHAH ALAM', 'প্রতিষ্ঠাতা চেয়ারম্যান ও ম্যানেজিং ডিরেক্টর, লাইফ কেয়ার হাসপাতাল রৌমারী', 'উপদেষ্টা পরিষদ', '01966442769', 'shahalal.siraz@gmail.com', '/uploads/committee/member_1_shah_alam.jpg', 'প্রতিষ্ঠাতা চেয়ারম্যান, কর্জে হাসানা ফাউন্ডেশন ও ম্যানেজিং ডিরেক্টর, লাইফ কেয়ার হাসপাতাল রৌমারী', 1, 1, datetime('now')),
        (2, 'হযরত মাওলানা মোঃ মোকছেদ আলী', 'Mawlana Md Moksed Ali', 'প্রধান উপদেষ্টা ও অধ্যক্ষ, রৌমারী কেরামতিয়া আদর্শ ফাযিল মাদ্রাসা', 'উপদেষ্টা পরিষদ', '01914638313', 'moksed.ali@karjehasana.org', '/uploads/committee/member_2_moksed_ali.jpg', 'বিশিষ্ট ইসলামী শিক্ষাবিদ ও অধ্যক্ষ, রৌমারী কেরামতিয়া আদর্শ ফাযিল মাদ্রাসা', 2, 1, datetime('now')),
        (3, 'জনাব মোঃ বাবুল হোসেন', 'Md Babul Hossain', 'উপদেষ্টা ও চেয়ারম্যান, লাইফ কেয়ার হাসপাতাল, রৌমারী', 'উপদেষ্টা পরিষদ', '01931649576', 'babul.hossain@karjehasana.org', '/uploads/committee/member_3_babul_hossain.jpg', 'বিশিষ্ট ব্যবসায়ী, সমাজসেবক ও চেয়ারম্যান, লাইফ কেয়ার হাসপাতাল, রৌমারী', 3, 1, datetime('now')),
        (4, 'হযরত মাওলানা মোঃ আনোয়ারুল ইসলাম', 'Mawlana Md Anwarul Islam', 'শরীয়াহ উপদেষ্টা ও প্রধান ফকিহ, কুড়িগ্রাম আলিয়া মাদ্রাসা', 'উপদেষ্টা পরিষদ', '01911086469', 'anwarul.islam@karjehasana.org', '/uploads/committee/member_4_anwarul_islam.jpg', 'বিশিষ্ট ইসলামী আইন ও শরীয়াহ বিশেষজ্ঞ, প্রধান ফকিহ, কুড়িগ্রাম আলিয়া মাদ্রাসা', 4, 1, datetime('now')),
        (5, 'জনাব মোঃ মাহবুব আলম', 'Md Mahbub Alam', 'উপদেষ্টা ও চেয়ারম্যান, রৌমারী জেনারেল হাসপাতাল এন্ড ডায়াগনস্টিক সেন্টার', 'উপদেষ্টা পরিষদ', '01915604026', 'mahbub.alam@karjehasana.org', '/uploads/committee/member_5_mahbub_alam.jpg', 'বিশিষ্ট সমাজসেবক ও চেয়ারম্যান, রৌমারী জেনারেল হাসপাতাল এন্ড ডায়াগনস্টিক সেন্টার', 5, 1, datetime('now')),
        (6, 'হাফেজ হযরত মাওলানা মোঃ রিয়াজুল ইসলাম', 'Hafez Mawlana Md Riazul Islam', 'উপদেষ্টা ও বিশিষ্ট তরুণ বক্তা', 'উপদেষ্টা পরিষদ', '01921970377', 'riazul.islam@karjehasana.org', '/uploads/committee/member_6_riazul_islam.jpg', 'জনপ্রিয় ইসলামী আলোচক ও তরুণ বক্তা', 6, 1, datetime('now')),
        (7, 'জনাব মোঃ সাইদুল ইসলাম সাইদ', 'Md Saidul Islam Said', 'উপদেষ্টা ও বিশিষ্ট সমাজসেবক', 'উপদেষ্টা পরিষদ', '01716882049', 'saidul.islam@karjehasana.org', '/uploads/committee/member_7_saidul_islam.jpg', 'বিশিষ্ট সমাজসেবক ও শুভাকাঙ্ক্ষী, রৌমারী', 7, 1, datetime('now')),
        (8, 'হাফেজ হযরত মাওলানা মোঃ মাইদুল ইসলাম', 'Hafez Mawlana Md Maidul Islam', 'উপদেষ্টা ও বিশিষ্ট তরুণ বক্তা', 'উপদেষ্টা পরিষদ', '01920114330', 'maidul.islam@karjehasana.org', '/uploads/committee/member_8_maidul_islam.jpg', 'জনপ্রিয় ইসলামী আলোচক ও তরুণ বক্তা', 8, 1, datetime('now')),
        (9, 'জনাব মোঃ আল আমিন অনিক', 'MD AL AMIN ONIK', 'উপদেষ্টা ও CEO, ঢাকা এয়ার ট্রাভেলস, রৌমারী, কুড়িগ্রাম', 'উপদেষ্টা পরিষদ', '01832630299', 'alamin.onik@karjehasana.org', '/uploads/committee/member_9_al_amin_onik.jpg', 'CEO, DHAKA AIR TRAVELS, ROWMARI, KURIGRAM', 9, 1, datetime('now'));
      `);
    }
  } catch (err) {
    console.error('Error seeding committee members:', err);
  }

  // Seed Initial Organization Settings if not present
  const orgCheck = db.exec('SELECT COUNT(*) as count FROM organization_settings;');
  const orgCount = orgCheck[0]?.values[0][0] || 0;
  if (orgCount === 0) {
    db.run(`
      INSERT INTO organization_settings (
        id, name_bn, name_en, slogan_bn, location, address, chairman_name, chairman_title,
        phone, phone_verified_warning, whatsapp, bkash_number, email, currency, currency_symbol,
        timezone, bkash_instructions, allow_public_registration, updated_at
      ) VALUES (
        1,
        'কর্জে হাসানা ফাউন্ডেশন',
        'Karje Hasana Foundation',
        'স্বচ্ছতা ও মানবতার কল্যাণে সুদমুক্ত সহযোগিতা',
        'রৌমারী, কুড়িগ্রাম, বাংলাদেশ',
        'Life Care Hospital, Rowmari, Kurigram, Bangladesh',
        'MD SHAH ALAM',
        'প্রতিষ্ঠাতা চেয়ারম্যান',
        '01966442769',
        0,
        '01966442769',
        '01966442769',
        'shahalal.siraz@gmail.com',
        'BDT',
        '৳',
        'Asia/Dhaka',
        'অনুদান পাঠানোর জন্য প্রদত্ত বিকাশ নম্বরে Send Money করুন। টাকা পাঠানোর পর আপনার বিকাশ ট্রানজ্যাকশন আইডি, পাঠানো টাকার পরিমাণ এবং প্রয়োজনীয় তথ্য দিয়ে পেমেন্ট নিশ্চিতকরণ ফরম পূরণ করুন। ফাউন্ডেশন যাচাই করার পর অনুদানের রসিদ প্রদান করা হবে।',
        1,
        datetime('now')
      );
    `);
  }

  // Seed Default Users
  const userCheck = db.exec('SELECT COUNT(*) as count FROM users;');
  const userCount = userCheck[0]?.values[0][0] || 0;
  if (userCount === 0) {
    // Note: Simple secure salt hash for demo/production setup
    const defaultUsers = [
      { u: 'Shahalam69', n: 'MD SHAH ALAM (প্রতিষ্ঠাতা চেয়ারম্যান)', e: 'shahalal.siraz@gmail.com', r: 'superadmin', p: '01081996' },
      { u: 'accountant', n: 'মোহাম্মদ রফিকুল ইসলাম (হিসাবরক্ষক)', e: 'accountant@karjehasana.org', r: 'accountant', p: 'acc123' },
      { u: 'verifier', n: 'মোস্তাফিজুর রহমান (যাচাই কর্মকর্তা)', e: 'verify@karjehasana.org', r: 'verification_officer', p: 'ver123' },
      { u: 'committee', n: 'ডাঃ আশরাফুল হক (কমিটি সদস্য)', e: 'committee@karjehasana.org', r: 'committee_member', p: 'com123' },
      { u: 'staff', n: 'মাহবুব আলম (সাধারণ কর্মী)', e: 'staff@karjehasana.org', r: 'staff', p: 'staff123' }
    ];

    for (const usr of defaultUsers) {
      db.run(
        `INSERT INTO users (username, full_name_bn, email, role, password_hash, is_active, created_at)
         VALUES ('${usr.u}', '${usr.n}', '${usr.e}', '${usr.r}', '${usr.p}', 1, datetime('now'));`
      );
    }
  }

  // Seed Financial Accounts
  const accCheck = db.exec('SELECT COUNT(*) as count FROM financial_accounts;');
  const accCount = accCheck[0]?.values[0][0] || 0;
  if (accCount === 0) {
    db.run(`
      INSERT INTO financial_accounts (name_bn, account_type, account_number, bank_name, opening_balance, is_active, created_at) VALUES
      ('হাতে নগদ (Cash in Hand)', 'cash', 'CASH-MAIN', 'ফাউন্ডেশন ভল্ট', 0.00, 1, datetime('now')),
      ('সোনালী ব্যাংক পিএলসি', 'bank', '1203456789012', 'সোনালী ব্যাংক পিএলসি, রৌমারী শাখা', 0.00, 1, datetime('now')),
      ('বিকাশ / নগদ / রকেট (MFS) হিসাব', 'mfs', '01966442769', 'bKash / Nagad / Rocket MFS', 0.00, 1, datetime('now'));
    `);
  }

  // Seed Funds
  const fundCheck = db.exec('SELECT COUNT(*) as count FROM funds;');
  const fundCount = fundCheck[0]?.values[0][0] || 0;
  if (fundCount === 0) {
    db.run(`
      INSERT INTO funds (name_bn, code, is_restricted, description, opening_balance, created_at) VALUES
      ('সাধারণ অনুদান তহবিল', 'GENERAL', 0, 'ফাউন্ডেশনের সাধারণ ও পরিচালন অনুদান', 0.00, datetime('now')),
      ('সুদমুক্ত ধার ঘূর্ণায়মান তহবিল', 'REVOLVING_LOAN', 1, 'কর্জে হাসানা হিসেবে বিতরণের জন্য সংরক্ষিত ঘূর্ণায়মান মূলধন', 0.00, datetime('now')),
      ('চিকিৎসা সহায়তা তহবিল', 'MEDICAL', 1, 'অসহায় রোগীদের জরুরি চিকিৎসা অনুদান', 0.00, datetime('now')),
      ('শিক্ষা সহায়তা তহবিল', 'EDUCATION', 1, 'দরিদ্র শিক্ষার্থীদের শিক্ষা উপকরণ ও ফি সহায়তা', 0.00, datetime('now')),
      ('জরুরি দুর্যোগ সহায়তা তহবিল', 'EMERGENCY', 1, 'বন্যা ও প্রাকৃতিক দুর্যোগে জরুরি ত্রাণ সহায়তা', 0.00, datetime('now'));
    `);
  }
}

// Helper query function that maps result rows to JavaScript objects
function query(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  if (params && params.length > 0) {
    const stmt = dbInstance.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } else {
    dbInstance.run(sql);
  }
  saveDbToDisk();
  return { success: true };
}

function transaction(fn) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run('BEGIN TRANSACTION;');
  try {
    const result = fn({ query, get, run: (sql, params) => {
      if (params && params.length > 0) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
      } else {
        dbInstance.run(sql);
      }
    }});
    dbInstance.run('COMMIT;');
    saveDbToDisk();
    return result;
  } catch (err) {
    dbInstance.run('ROLLBACK;');
    throw err;
  }
}

function exportDbBuffer() {
  if (!dbInstance) throw new Error('Database not initialized');
  const data = dbInstance.export();
  return Buffer.from(data);
}

function restoreDbFromBuffer(buffer) {
  if (!SQL) throw new Error('SQL engine not loaded');
  dbInstance = new SQL.Database(buffer);
  saveDbToDisk();
  return true;
}

module.exports = {
  getDb,
  query,
  get,
  run,
  transaction,
  exportDbBuffer,
  restoreDbFromBuffer,
  saveDbToDisk
};
