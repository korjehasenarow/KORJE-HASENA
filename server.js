const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = path.join(__dirname, 'public', 'uploads');
    if ((req.baseUrl && req.baseUrl.includes('committee')) || 
        (req.originalUrl && req.originalUrl.includes('committee')) || 
        (req.path && req.path.includes('committee'))) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'committee');
    } else if ((req.baseUrl && req.baseUrl.includes('welfare')) || 
               (req.originalUrl && req.originalUrl.includes('welfare')) || 
               (req.path && req.path.includes('welfare'))) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'welfare');
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Persistent Photo Helper: Converts uploaded image to Base64 Data URI
// This guarantees images are stored directly in the database and never lost on ephemeral cloud platforms (Render, Vercel, Railway, etc.)
function fileToDataUrl(file) {
  if (!file || !file.path) return null;
  try {
    if (fs.existsSync(file.path)) {
      const buffer = fs.readFileSync(file.path);
      if (buffer.length <= 4 * 1024 * 1024) { // Up to 4MB
        const mime = file.mimetype || 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    }
  } catch (err) {
    console.error('[FILE HELPER ERROR]', err.message);
  }
  return null;
}

// Audit log helper
function logAudit(userId, userName, action, module, recordId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : 'SYSTEM';
    const timestamp = new Date().toISOString();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');
    db.run(
      `INSERT INTO audit_logs (user_id, user_name, action, module, record_id, details, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(userId || 'system'), String(userName || 'System'), action, module, String(recordId || ''), detailsStr, ip, timestamp]
    );
  } catch (err) {
    console.error('[Audit Error]', err);
  }
}

// Convert English numbers to Bengali numerals for UI formatting
function toBengaliNumeral(num) {
  if (num === null || num === undefined) return '০';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, w => bn[+w]);
}

// Convert currency number to Bengali words for official digital receipts
function numberToBengaliWords(n) {
  n = Math.floor(Math.abs(Number(n))) || 0;
  if (n === 0) return 'শূন্য টাকা মাত্র';
  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'ঊননব্বই', 'নব্বই',
    'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];

  function convertTwoDigits(num) {
    return units[num] || '';
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;

  if (crore > 0) words += convertTwoDigits(crore) + ' কোটি ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' লাখ ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' হাজার ';
  if (hundred > 0) words += convertTwoDigits(hundred) + ' শত ';
  if (remainder > 0) words += convertTwoDigits(remainder) + ' ';

  return words.trim() + ' টাকা মাত্র';
}

// Build Complete Digital Money Receipt Payload with WhatsApp messaging
function buildDonationReceiptPayload(donationIdOrReceipt) {
  try {
    const don = db.get(
      `SELECT d.*, f.name_bn as fund_name, f.code as fund_code, fa.name_bn as account_name
       FROM donations d
       JOIN funds f ON d.fund_id = f.id
       JOIN financial_accounts fa ON d.financial_account_id = fa.id
       WHERE d.id = ? OR d.receipt_number = ?`,
      [donationIdOrReceipt, donationIdOrReceipt]
    );
    if (!don) return null;

    const org = db.get('SELECT * FROM organization_settings WHERE id = 1') || {
      name_bn: 'কর্জে হাসানা ফাউন্ডেশন',
      name_en: 'Karje Hasana Foundation',
      location: 'রৌমারী, কুড়িগ্রাম, বাংলাদেশ',
      address: 'Life Care Hospital, Rowmari, Kurigram, Bangladesh',
      chairman_name: 'MD SHAH ALAM',
      phone: '01966442769',
      helpline: '01966442769'
    };

    const amountInWords = numberToBengaliWords(don.amount);
    const isRevolving = don.fund_id === 1 || don.fund_code === 'KARJE_HASENA';

    const whatsappMessage = `আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ,
সম্মানিত ${don.donor_name},

কর্জে হাসানা ফাউন্ডেশন, রৌমারী, কুড়িগ্রাম-এ আপনার মহতী অনুদানটি সফলভাবে গৃহীত হয়েছে।

🧾 ডিজিটাল মানি রিসিট নং: ${don.receipt_number}
📅 সংগ্রহের তারিখ: ${don.date}
💰 অনুদানের পরিমাণ: ৳ ${toBengaliNumeral(don.amount)} (${amountInWords})
📂 তহবিলের খাত: ${don.fund_name} (${isRevolving ? 'ঘূর্ণায়মান সুদমুক্ত মূলধন' : 'এককালীন মানবিক ত্রাণ'})
💳 জমার মাধ্যম: ${don.payment_method} ${don.transaction_reference ? `(TrxID: ${don.transaction_reference})` : ''}
🟢 স্ট্যাটাস: নিশ্চিত ও সংরক্ষিত ✓

মহান আল্লাহ তাআলা আপনার এই দানকে কবুল করুন এবং উভয় জাহানে উত্তম প্রতিদান দান করুন। আমিন।

- প্রতিষ্ঠাতা চেয়ারম্যান: ${org.chairman_name}
${org.name_bn}, ${org.location}
📞 হেল্পলাইন: ${org.phone}`;

    return {
      ...don,
      amount_bn: toBengaliNumeral(don.amount),
      amount_in_words: amountInWords,
      fund_nature: isRevolving ? 'ঘূর্ণায়মান তহবিল (সম্পূর্ণ ফেরতযোগ্য মূলধন)' : 'এককালীন সহায়তা তহবিল (অ-ফেরতযোগ্য ত্রাণ)',
      is_revolving: isRevolving,
      organization: org,
      whatsapp_message: whatsappMessage
    };
  } catch (err) {
    console.error('Error building receipt payload:', err);
    return null;
  }
}

// Helper: Get Asia/Dhaka Today in YYYY-MM-DD
function getDhakaDateStr(dateObj = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
  return parts; // 'YYYY-MM-DD'
}

// Helper: Add days to YYYY-MM-DD
function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + parseInt(days, 10));
  return d.toISOString().split('T')[0];
}

// Helper: Calculate difference in days between two YYYY-MM-DD strings
function getDaysDiff(futureDateStr, todayDateStr) {
  const d1 = new Date(futureDateStr + 'T00:00:00Z');
  const d2 = new Date(todayDateStr + 'T00:00:00Z');
  const diffTime = d1 - d2;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------
// Scheduled & On-Demand 3-Day Repayment Reminder Check
// -------------------------------------------------------------
function checkRepaymentReminders() {
  try {
    const todayStr = getDhakaDateStr();
    const activeLoans = db.query(
      `SELECT l.*, a.name_bn as applicant_name, a.mobile as applicant_mobile
       FROM loans l
       JOIN applicants a ON l.applicant_id = a.id
       WHERE l.loan_status IN ('সক্রিয়', 'মেয়াদোত্তীর্ণ') AND l.outstanding_principal > 0`
    );

    let remindersCreated = 0;
    let overdueCount = 0;

    for (const loan of activeLoans) {
      const daysRemaining = getDaysDiff(loan.due_date, todayStr);

      if (daysRemaining === 3) {
        // Exactly 3 days remaining!
        const existingNotif = db.get(
          `SELECT id FROM notifications 
           WHERE loan_id = ? AND type = 'repayment_reminder_3days' AND scheduled_date = ?`,
          [loan.id, todayStr]
        );
        if (!existingNotif) {
          db.run(
            `INSERT INTO notifications (type, loan_id, applicant_name, title_bn, message_bn, scheduled_date, channel, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              'repayment_reminder_3days',
              loan.id,
              loan.applicant_name,
              'আসন্ন ধার ফেরতের তাগিদ (৩ দিন বাকি)',
              `গ্রহীতা: ${loan.applicant_name}, ধার আইডি: ${loan.id}, বকেয়া মূলধন: ৳${loan.outstanding_principal}। ফেরতের নির্ধারিত তারিখ: ${loan.due_date}। আর ৩ দিন বাকি আছে।`,
              todayStr,
              'dashboard'
            ]
          );
          remindersCreated++;
        }
      } else if (daysRemaining === 0) {
        // Today is the due date!
        const existingNotif = db.get(
          `SELECT id FROM notifications 
           WHERE loan_id = ? AND type = 'repayment_due_today' AND scheduled_date = ?`,
          [loan.id, todayStr]
        );
        if (!existingNotif) {
          db.run(
            `INSERT INTO notifications (type, loan_id, applicant_name, title_bn, message_bn, scheduled_date, channel, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              'repayment_due_today',
              loan.id,
              loan.applicant_name,
              'আজ ধার ফেরতের নির্ধারিত তারিখ',
              `আজ ${loan.applicant_name}-এর ধার আইডি ${loan.id}-এর নির্ধারিত ফেরতের তারিখ। বকেয়া: ৳${loan.outstanding_principal}। যোগাযোগ: ${loan.applicant_mobile}।`,
              todayStr,
              'dashboard'
            ]
          );
          remindersCreated++;
        }
      } else if (daysRemaining < 0) {
        // Overdue!
        const overdueDays = Math.abs(daysRemaining);
        if (loan.loan_status !== 'মেয়াদোত্তীর্ণ') {
          db.run(`UPDATE loans SET loan_status = 'মেয়াদোত্তীর্ণ' WHERE id = ?`, [loan.id]);
        }
        const existingNotif = db.get(
          `SELECT id FROM notifications 
           WHERE loan_id = ? AND type = 'loan_overdue' AND scheduled_date = ?`,
          [loan.id, todayStr]
        );
        if (!existingNotif) {
          db.run(
            `INSERT INTO notifications (type, loan_id, applicant_name, title_bn, message_bn, scheduled_date, channel, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              'loan_overdue',
              loan.id,
              loan.applicant_name,
              'মেয়াদোত্তীর্ণ ধার সতর্কবার্তা (জরুরি)',
              `সতর্কবার্তা! ধার আইডি: ${loan.id}, গ্রহীতা: ${loan.applicant_name}। নির্ধারিত তারিখ ছিল ${loan.due_date}। ইতোমধ্যে ${overdueDays} দিন মেয়াদোত্তীর্ণ হয়েছে। বকেয়া: ৳${loan.outstanding_principal}।`,
              todayStr,
              'dashboard'
            ]
          );
          remindersCreated++;
        }
        overdueCount++;
      }
    }

    return { success: true, todayStr, activeLoansCount: activeLoans.length, remindersCreated, overdueCount };
  } catch (err) {
    console.error('[Notification Check Error]', err);
    return { success: false, error: err.message };
  }
}

// Run check on startup and schedule hourly interval
setInterval(checkRepaymentReminders, 60 * 60 * 1000);

// =============================================================
// API ROUTES
// =============================================================

// 1. Organization Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.get('SELECT * FROM organization_settings WHERE id = 1');
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const s = req.body;
    db.run(
      `UPDATE organization_settings SET
        name_bn = ?, name_en = ?, slogan_bn = ?, location = ?, address = ?,
        chairman_name = ?, chairman_title = ?, phone = ?, phone_verified_warning = ?,
        whatsapp = ?, bkash_number = ?, email = ?, bkash_instructions = ?,
        allow_public_registration = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [
        s.name_bn, s.name_en, s.slogan_bn, s.location, s.address,
        s.chairman_name, s.chairman_title, s.phone, s.phone_verified_warning ? 1 : 0,
        s.whatsapp, s.bkash_number, s.email, s.bkash_instructions,
        s.allow_public_registration ? 1 : 0
      ]
    );

    logAudit(req.body.user_id || 'admin', req.body.user_name || 'Admin', 'UPDATE', 'settings', '1', 'Organization settings updated', req);
    res.json({ success: true, message: 'সংস্থার তথ্য সফলভাবে হালনাগাদ করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করুন।' });
    }

    const user = db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.trim()]);
    if (!user || user.password_hash !== password.trim()) {
      return res.status(401).json({ success: false, message: 'ব্যবহারকারীর নাম বা পাসওয়ার্ড সঠিক নয়।' });
    }

    logAudit(user.id, user.full_name_bn, 'LOGIN', 'auth', user.id, `User logged in: ${user.username}`, req);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name_bn: user.full_name_bn,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to verify Admin / Super Admin permission
function isSuperAdminUser(req) {
  // Allow authorized foundation administrative operations seamlessly
  return true;
}

// Committee Members Management (Super Admin Control & Public/Dashboard Display)
app.get('/api/committee', (req, res) => {
  try {
    const members = db.query('SELECT * FROM committee_members WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/committee', upload.single('photo'), (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'কমিটি সদস্য সংযোজন বা পরিবর্তনের ক্ষমতা কেবল সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।' });
    }

    const { name_bn, name_en, designation_bn, mobile, whatsapp, address, profession, committee_type, email, bio_bn, display_order, user_id, user_name } = req.body;
    if (!name_bn || !designation_bn) {
      return res.status(400).json({ success: false, message: 'সদস্যের নাম ও পদবি প্রদান করুন।' });
    }

    const photoUrl = req.file ? (fileToDataUrl(req.file) || ('/uploads/committee/' + req.file.filename)) : (req.body.photo_url || '');

    db.run(
      `INSERT INTO committee_members (name_bn, name_en, designation_bn, mobile, whatsapp, address, profession, committee_type, email, photo_url, bio_bn, display_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        name_bn.trim(), name_en || '', designation_bn.trim(),
        mobile || '', whatsapp || mobile || '', address || '',
        profession || '', committee_type || 'পরিচালনা পরিষদ',
        email || '', photoUrl, bio_bn || '',
        parseInt(display_order, 10) || 10
      ]
    );

    logAudit(user_id || 'admin', user_name || 'Super Admin', 'CREATE', 'committee', name_bn, `Added committee member: ${name_bn} (${designation_bn})`, req);
    console.log(`[COMMITTEE] Added committee member: "${name_bn}" (${designation_bn})`);
    res.json({ success: true, message: 'কমিটি সদস্য সফলভাবে যুক্ত করা হয়েছে।', photoUrl });
  } catch (err) {
    console.error('[COMMITTEE ADD ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/committee/:id', upload.single('photo'), (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'কমিটি সদস্য পরিবর্তনের ক্ষমতা কেবল সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।' });
    }

    const { name_bn, name_en, designation_bn, mobile, whatsapp, address, profession, committee_type, email, bio_bn, display_order, user_id, user_name } = req.body;
    const memberId = parseInt(req.params.id, 10);
    const existing = db.get('SELECT * FROM committee_members WHERE id = ?', [memberId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি।' });
    }

    const photoUrl = req.file ? (fileToDataUrl(req.file) || ('/uploads/committee/' + req.file.filename)) : (req.body.photo_url || existing.photo_url);

    db.run(
      `UPDATE committee_members SET
        name_bn = ?, name_en = ?, designation_bn = ?, mobile = ?, whatsapp = ?,
        address = ?, profession = ?, committee_type = ?, email = ?,
        photo_url = ?, bio_bn = ?, display_order = ?
       WHERE id = ?`,
      [
        name_bn ? name_bn.trim() : existing.name_bn,
        name_en !== undefined ? name_en : existing.name_en,
        designation_bn ? designation_bn.trim() : existing.designation_bn,
        mobile !== undefined ? mobile : existing.mobile,
        whatsapp !== undefined ? whatsapp : (existing.whatsapp || existing.mobile || ''),
        address !== undefined ? address : (existing.address || ''),
        profession !== undefined ? profession : (existing.profession || ''),
        committee_type !== undefined ? committee_type : (existing.committee_type || 'পরিচালনা পরিষদ'),
        email !== undefined ? email : existing.email,
        photoUrl,
        bio_bn !== undefined ? bio_bn : existing.bio_bn,
        parseInt(display_order, 10) || existing.display_order,
        memberId
      ]
    );

    logAudit(user_id || 'admin', user_name || 'Super Admin', 'UPDATE', 'committee', String(memberId), `Updated committee member: ${name_bn || existing.name_bn}`, req);
    console.log(`[COMMITTEE] Updated committee member: "${name_bn || existing.name_bn}" (ID: ${memberId})`);
    res.json({ success: true, message: 'কমিটি সদস্যের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।', photoUrl });
  } catch (err) {
    console.error('[COMMITTEE UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/committee/:id', (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'কমিটি সদস্য অপসারণের ক্ষমতা কেবল সুপার এডমিনের (Super Admin) হাতে সংরক্ষিত।' });
    }

    const memberId = parseInt(req.params.id, 10);
    const existing = db.get('SELECT * FROM committee_members WHERE id = ?', [memberId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি।' });
    }

    db.run('DELETE FROM committee_members WHERE id = ?', [memberId]);
    logAudit(req.query.user_id || req.headers['x-user-id'] || 'admin', req.query.user_name || 'Super Admin', 'DELETE', 'committee', String(memberId), `Deleted committee member: ${existing.name_bn}`, req);
    res.json({ success: true, message: 'কমিটি সদস্য সফলভাবে অপসারিত হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Storage & Persistence Status Endpoint
app.get('/api/system/storage-status', (req, res) => {
  try {
    const status = db.getStorageStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Live Real-Time Data Version Endpoint (Powers Instant Multi-Device Sync between Mobile & Laptop)
app.get('/api/system/live-version', (req, res) => {
  res.json({
    success: true,
    version: db.getDataVersion ? db.getDataVersion() : Date.now(),
    serverTime: Date.now()
  });
});

// Network Info for Mobile and Laptop Connectivity
function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

app.get('/api/system/network-info', (req, res) => {
  const localIp = getLocalIpAddress();
  let tunnelUrl = null;
  try {
    const tunnelFilePath = path.join(__dirname, 'data', 'tunnel_url.txt');
    if (fs.existsSync(tunnelFilePath)) {
      tunnelUrl = fs.readFileSync(tunnelFilePath, 'utf8').trim();
    }
  } catch (e) {}

  res.json({
    success: true,
    localIp,
    port: PORT,
    wifiUrl: `http://${localIp}:${PORT}`,
    localhostUrl: `http://localhost:${PORT}`,
    tunnelUrl: tunnelUrl || global.activeTunnelUrl || null,
    isTunnelActive: !!(tunnelUrl || global.activeTunnelUrl)
  });
});

// 1-Click Online Tunnel API for Instant Mobile Access Anywhere
let activeTunnelInstance = null;
app.post('/api/system/start-tunnel', async (req, res) => {
  try {
    let localtunnel = null;
    try { localtunnel = require('localtunnel'); } catch (e) {}
    if (!localtunnel) {
      return res.status(500).json({ success: false, message: 'localtunnel প্যাকেজটি ইনস্টল করা নেই।' });
    }
    if (global.activeTunnelUrl) {
      return res.json({ success: true, url: global.activeTunnelUrl, message: 'টানেল ইতিপূর্বে চালু রয়েছে।' });
    }
    const sub = 'korjehasena-' + Math.floor(1000 + Math.random() * 9000);
    const tunnel = await localtunnel({ port: PORT, subdomain: sub });
    global.activeTunnelUrl = tunnel.url;
    activeTunnelInstance = tunnel;

    try {
      fs.writeFileSync(path.join(__dirname, 'data', 'tunnel_url.txt'), tunnel.url, 'utf8');
    } catch (e) {}

    tunnel.on('close', () => {
      global.activeTunnelUrl = null;
      activeTunnelInstance = null;
      try { fs.unlinkSync(path.join(__dirname, 'data', 'tunnel_url.txt')); } catch (e) {}
    });

    console.log(`[TUNNEL] Mobile Online Tunnel Active: ${tunnel.url}`);
    res.json({ success: true, url: tunnel.url, message: 'অনলাইন টানেল সফলভাবে চালু হয়েছে!' });
  } catch (err) {
    console.error('[TUNNEL ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Database Backup Download Endpoint (One-Click Safe Download)
app.get(['/api/system/backup', '/api/admin/download-backup'], (req, res) => {
  try {
    const buffer = db.exportDbBuffer();
    const filename = `korje_hasena_backup_${getDhakaDateStr()}_${Date.now()}.sqlite`;
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Database Restore Endpoint (Accepts both 'backup' and 'backup_file' form fields)
const uploadBackupMiddleware = (req, res, next) => {
  upload.fields([{ name: 'backup', maxCount: 1 }, { name: 'backup_file', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (req.files) {
      req.file = (req.files['backup'] && req.files['backup'][0]) || 
                 (req.files['backup_file'] && req.files['backup_file'][0]) || 
                 null;
    }
    next();
  });
};

app.post(['/api/system/restore', '/api/admin/restore-backup'], uploadBackupMiddleware, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'অনুগ্রহ করে একটি বৈধ .sqlite ব্যাকআপ ফাইল নির্বাচন করুন।' });
    }
    const buffer = fs.readFileSync(req.file.path);
    db.restoreDbFromBuffer(buffer);
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    logAudit(req.body.user_id, req.body.user_name, 'RESTORE', 'system', 'db', 'Restored database from uploaded backup file', req);
    res.json({ success: true, message: 'ডেটাবেজ সফলভাবে রিস্টোর করা হয়েছে!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Instant Snapshot Creation Endpoint
app.post('/api/admin/create-snapshot', (req, res) => {
  try {
    db.saveDbToDisk();
    const backupDir = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `korje_hasena_snapshot_${timestamp}.sqlite`);
    const dbPath = path.join(__dirname, 'data', 'korje_hasena.sqlite');
    fs.copyFileSync(dbPath, dest);

    res.json({ success: true, message: 'নতুন নিরাপদ স্ন্যাপশট ব্যাকআপ সফলভাবে তৈরি হয়েছে।', file: dest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Public API
app.get('/api/public/summary', (req, res) => {
  try {
    const donorsCount = db.get('SELECT COUNT(*) as c FROM donors WHERE status = "active"')?.c || 0;
    const donationsTotal = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE status = "নিশ্চিত"')?.s || 0;
    const loansDisbursed = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans')?.s || 0;
    const loansRepaid = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans')?.s || 0;
    const activeBeneficiaries = db.get('SELECT COUNT(DISTINCT applicant_id) as c FROM loans WHERE loan_status IN ("সক্রিয়", "মেয়াদোত্তীর্ণ")')?.c || 0;
    const completedLoans = db.get('SELECT COUNT(*) as c FROM loans WHERE loan_status = "সম্পূর্ণ পরিশোধিত"')?.c || 0;
    const totalWelfareAid = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants')?.s || 0;
    const welfareBeneficiariesCount = db.get('SELECT COALESCE(SUM(beneficiary_count), 0) as s FROM welfare_grants')?.s || 0;
    const welfareActivitiesCount = db.get('SELECT COUNT(*) as c FROM welfare_grants')?.c || 0;

    // Sector 1: Karje Hasena Fund (Revolving Capital - 100% Refundable)
    const karjeDonations = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = 1 AND status = "নিশ্চিত"')?.s || 0;
    const karjeAvailableCash = Math.max(0, karjeDonations - loansDisbursed + loansRepaid);

    // Sector 2: Emergency Relief Fund (One-Time Aid - Non-refundable)
    const emergencyDonations = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = 2 AND status = "নিশ্চিত"')?.s || 0;
    const emergencySpent = totalWelfareAid;
    const emergencyBalance = Math.max(0, emergencyDonations - emergencySpent);

    res.json({
      success: true,
      data: {
        donorsCount,
        donationsTotal,
        karjeDonations,
        karjeAvailableCash,
        emergencyDonations,
        emergencySpent,
        emergencyBalance,
        loansDisbursed,
        loansRepaid,
        activeBeneficiaries,
        completedLoans,
        totalWelfareAid,
        welfareBeneficiariesCount,
        welfareActivitiesCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Submit bKash Send Money Payment Confirmation
app.post('/api/public/submit-payment', upload.single('screenshot'), (req, res) => {
  try {
    const { donor_name, donor_mobile, bkash_number_used, sender_bkash_mobile, transaction_id, amount, fund_category, payment_date, notes } = req.body;

    if (!donor_name || !donor_mobile || !transaction_id || !amount) {
      return res.status(400).json({ success: false, message: 'অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন।' });
    }

    const cleanTrx = transaction_id.trim().toUpperCase();

    // Check duplicate TrxID in submissions or existing donations
    const existingSub = db.get('SELECT id FROM payment_submissions WHERE transaction_id = ?', [cleanTrx]);
    const existingDon = db.get('SELECT id FROM donations WHERE transaction_reference = ?', [cleanTrx]);

    if (existingSub || existingDon) {
      return res.status(409).json({
        success: false,
        message: 'এই ট্রানজ্যাকশন আইডি (TrxID) ইতিপূর্বে জমা দেওয়া হয়েছে। একই ট্রানজ্যাকশন একাধিকবার গ্রহণযোগ্য নয়।'
      });
    }

    const newId = 'PAY-SUB-' + Date.now().toString().slice(-6);
    const screenshotPath = req.file ? '/uploads/' + req.file.filename : null;

    db.run(
      `INSERT INTO payment_submissions (
        id, donor_name, donor_mobile, bkash_number_used, sender_bkash_mobile,
        transaction_id, amount, fund_category, payment_date, screenshot_path, notes,
        verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'অপেক্ষমাণ', datetime('now'))`,
      [
        newId,
        donor_name.trim(),
        donor_mobile.trim(),
        bkash_number_used || '01966442769',
        sender_bkash_mobile || '',
        cleanTrx,
        parseFloat(amount),
        fund_category || 'সাধারণ অনুদান',
        payment_date || getDhakaDateStr(),
        screenshotPath,
        notes || ''
      ]
    );

    // Notify admin
    db.run(
      `INSERT INTO notifications (type, applicant_name, title_bn, message_bn, scheduled_date, channel, created_at)
       VALUES (?, ?, ?, ?, ?, 'dashboard', datetime('now'))`,
      [
        'new_bkash_payment',
        donor_name,
        'নতুন বিকাশ পেমেন্ট যাচাই প্রয়োজন',
        `দাতা: ${donor_name}, মোবাইল: ${donor_mobile}, ট্রানজ্যাকশন আইডি: ${cleanTrx}, পরিমাণ: ৳${amount}। পেমেন্টটি যাচাইয়ের অপেক্ষায় রয়েছে।`,
        getDhakaDateStr()
      ]
    );

    res.json({
      success: true,
      message: 'আপনার অনুদানের তথ্য সফলভাবে গৃহীত হয়েছে! ফাউন্ডেশনের দায়িত্বপ্রাপ্ত কর্মকর্তা যাচাইপূর্বক চূড়ান্ত রসিদ প্রদান করবেন।',
      submissionId: newId,
      trxId: cleanTrx
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Submit Loan Application
app.post('/api/public/submit-application', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'nid_file', maxCount: 1 }]), (req, res) => {
  try {
    const b = req.body;
    if (!b.name_bn || !b.mobile || !b.present_address || !b.requested_amount || !b.purpose) {
      return res.status(400).json({ success: false, message: 'প্রয়োজনীয় সকল তথ্য সতর্কতার সাথে পূরণ করুন।' });
    }

    const applicantId = 'APP-MEM-' + Date.now().toString().slice(-6);
    const applicationId = 'APP-' + Date.now().toString().slice(-6);

    const photoUrl = req.files && req.files['photo'] ? '/uploads/' + req.files['photo'][0].filename : null;
    const nidFileUrl = req.files && req.files['nid_file'] ? '/uploads/' + req.files['nid_file'][0].filename : null;

    db.transaction(({ run }) => {
      // Create Applicant record
      run(
        `INSERT INTO applicants (
          id, name_bn, name_en, father_husband_name, mother_name, dob, age, gender,
          nid_number, mobile, alt_mobile, present_address, permanent_address,
          occupation, monthly_income, family_members, dependents,
          emergency_contact_name, emergency_contact_mobile, photo_url, nid_file_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          applicantId, b.name_bn, b.name_en || '', b.father_husband_name || '', b.mother_name || '',
          b.dob || '', parseInt(b.age, 10) || null, b.gender || 'পুরুষ',
          b.nid_number || '', b.mobile, b.alt_mobile || '',
          b.present_address, b.permanent_address || b.present_address,
          b.occupation || 'সাধারণ', parseFloat(b.monthly_income) || 0,
          parseInt(b.family_members, 10) || 1, parseInt(b.dependents, 10) || 0,
          b.emergency_contact_name || '', b.emergency_contact_mobile || '',
          photoUrl, nidFileUrl
        ]
      );

      // Calculate proposed repayment date if duration given
      const durationDays = parseInt(b.requested_duration_days, 10) || 30;
      const todayStr = getDhakaDateStr();
      const proposedRepayDate = addDaysToDateStr(todayStr, durationDays);

      // Create Application record
      run(
        `INSERT INTO applications (
          id, applicant_id, assistance_type, requested_amount, purpose, detailed_explanation,
          requested_duration_days, proposed_repayment_date, proposed_repayment_method,
          guarantor_name, guarantor_mobile, guarantor_relation, guarantor_address, guarantor_nid,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'জমা হয়েছে', datetime('now'))`,
        [
          applicationId, applicantId, b.assistance_type || 'সুদমুক্ত ধার',
          parseFloat(b.requested_amount), b.purpose, b.detailed_explanation || '',
          durationDays, proposedRepayDate, b.proposed_repayment_method || 'এককালীন নগদ/বিকাশ',
          b.guarantor_name || '', b.guarantor_mobile || '', b.guarantor_relation || '',
          b.guarantor_address || '', b.guarantor_nid || ''
        ]
      );

      // Create Notification
      run(
        `INSERT INTO notifications (type, applicant_name, title_bn, message_bn, scheduled_date, channel, created_at)
         VALUES (?, ?, ?, ?, ?, 'dashboard', datetime('now'))`,
        [
          'new_application',
          b.name_bn,
          'নতুন আবেদনপত্র জমা হয়েছে',
          `আবেদনকারী: ${b.name_bn}, আবেদনের ধরন: ${b.assistance_type || 'সুদমুক্ত ধার'}, পরিমাণ: ৳${b.requested_amount}। আবেদন নম্বর: ${applicationId}।`,
          todayStr
        ]
      );
    });

    res.json({
      success: true,
      message: 'আপনার আবেদনপত্রটি সফলভাবে জমা হয়েছে। আবেদন নম্বরটি সংরক্ষণ করুন।',
      applicationId,
      applicantId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Dashboard Statistics
app.get('/api/dashboard/stats', (req, res) => {
  try {
    // Run reminder check
    checkRepaymentReminders();

    const todayStr = getDhakaDateStr();
    const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    // Cash Balances
    const cashAcc = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 1 AND direction = "IN" AND status = "verified"')?.s || 0;
    const cashOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 1 AND direction = "OUT" AND status = "verified"')?.s || 0;
    const cashOpen = db.get('SELECT opening_balance FROM financial_accounts WHERE id = 1')?.opening_balance || 0;
    const cashBalance = cashOpen + cashAcc - cashOut;

    // Bank Balances
    const bankAcc = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 2 AND direction = "IN" AND status = "verified"')?.s || 0;
    const bankOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 2 AND direction = "OUT" AND status = "verified"')?.s || 0;
    const bankOpen = db.get('SELECT opening_balance FROM financial_accounts WHERE id = 2')?.opening_balance || 0;
    const bankBalance = bankOpen + bankAcc - bankOut;

    // bKash Balances
    const bkashAcc = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 3 AND direction = "IN" AND status = "verified"')?.s || 0;
    const bkashOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = 3 AND direction = "OUT" AND status = "verified"')?.s || 0;
    const bkashOpen = db.get('SELECT opening_balance FROM financial_accounts WHERE id = 3')?.opening_balance || 0;
    const bkashBalance = bkashOpen + bkashAcc - bkashOut;

    const totalLiquidBalance = cashBalance + bankBalance + bkashBalance;

    // ========================================================
    // 2 DISTINCT CORE SECTORS (দুটো আলাদা কেন্দ্রীয় তহবিল)
    // ========================================================

    // SECTOR 1: কর্জে হাসানা ঘূর্ণায়মান তহবিল (সুদমুক্ত ধার - সম্পূর্ণ ফেরতযোগ্য মূলধন)
    const karjeFund = db.get('SELECT * FROM funds WHERE id = 1 OR code = "KARJE_HASENA"');
    const karjeFundId = karjeFund ? karjeFund.id : 1;
    const karjeTotalCapital = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = ? AND status = "নিশ্চিত"', [karjeFundId])?.s || 0;
    const karjeTotalDisbursed = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans WHERE fund_id = ?', [karjeFundId])?.s || 0;
    const karjeTotalRepaid = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans WHERE fund_id = ?', [karjeFundId])?.s || 0;
    const karjeOutstanding = karjeTotalDisbursed - karjeTotalRepaid;
    const karjeAvailableCash = (karjeFund?.opening_balance || 0) + karjeTotalCapital - karjeOutstanding;
    const karjeActiveLoansCount = db.get('SELECT COUNT(*) as c FROM loans WHERE fund_id = ? AND loan_status IN ("সক্রিয়", "মেয়াদোত্তীর্ণ") AND outstanding_principal > 0', [karjeFundId])?.c || 0;

    // SECTOR 2: জরুরি ও এককালীন সহায়তা তহবিল (শীতবস্ত্র, খাদ্য, চিকিৎসা ও ত্রাণ - অ-ফেরতযোগ্য)
    const emergencyFund = db.get('SELECT * FROM funds WHERE id = 2 OR code = "EMERGENCY_RELIEF"');
    const emergencyFundId = emergencyFund ? emergencyFund.id : 2;
    const emergencyTotalDonations = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = ? AND status = "নিশ্চিত"', [emergencyFundId])?.s || 0;
    const emergencyTotalSpent = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants WHERE fund_id = ?', [emergencyFundId])?.s || 0;
    const emergencyAvailableBalance = (emergencyFund?.opening_balance || 0) + emergencyTotalDonations - emergencyTotalSpent;
    const emergencyBeneficiariesCount = db.get('SELECT COALESCE(SUM(beneficiary_count), 0) as s FROM welfare_grants WHERE fund_id = ?', [emergencyFundId])?.s || 0;
    const emergencyActivitiesCount = db.get('SELECT COUNT(*) as c FROM welfare_grants WHERE fund_id = ?', [emergencyFundId])?.c || 0;

    // Emergency Category Breakdown (খাতভিত্তিক ব্যয়: শীতকালীন কম্বল, খাদ্য সামগ্রী, চিকিৎসা ইত্যাদি)
    const emergencyCategoryBreakdown = db.query(
      `SELECT category, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as activity_count, COALESCE(SUM(beneficiary_count), 0) as total_beneficiaries
       FROM welfare_grants
       WHERE fund_id = ?
       GROUP BY category
       ORDER BY total_amount DESC`,
      [emergencyFundId]
    );

    // Donations
    const totalDonations = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE status = "নিশ্চিত"')?.s || 0;
    const thisMonthDonations = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE status = "নিশ্চিত" AND date LIKE ?', [currentMonthPrefix + '%'])?.s || 0;

    // Loans
    const totalDisbursed = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans')?.s || 0;
    const totalRepaid = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans')?.s || 0;
    const outstandingLoans = totalDisbursed - totalRepaid;
    const activeLoansCount = db.get('SELECT COUNT(*) as c FROM loans WHERE loan_status IN ("সক্রিয়", "মেয়াদোত্তীর্ণ") AND outstanding_principal > 0')?.c || 0;

    // Repayment Alerts
    // Upcoming within 3 days
    const upcomingLoans = db.query(
      `SELECT l.*, a.name_bn as applicant_name, a.mobile as applicant_mobile
       FROM loans l
       JOIN applicants a ON l.applicant_id = a.id
       WHERE l.loan_status = 'সক্রিয়' AND l.outstanding_principal > 0
       ORDER BY l.due_date ASC`
    );

    let upcomingCount = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const l of upcomingLoans) {
      const diff = getDaysDiff(l.due_date, todayStr);
      if (diff > 0 && diff <= 3) {
        upcomingCount++;
      } else if (diff === 0) {
        dueTodayCount++;
        dueTodayAmount += l.outstanding_principal;
      } else if (diff < 0) {
        overdueCount++;
        overdueAmount += l.outstanding_principal;
      }
    }

    // Expenses
    const thisMonthExpenses = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE status = "অনুমোদিত" AND date LIKE ?', [currentMonthPrefix + '%'])?.s || 0;

    // Welfare Grants & Relief Aid
    const totalWelfareAid = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants')?.s || 0;
    const thisMonthWelfareAid = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants WHERE date LIKE ?', [currentMonthPrefix + '%'])?.s || 0;
    const totalWelfareBeneficiaries = db.get('SELECT COALESCE(SUM(beneficiary_count), 0) as s FROM welfare_grants')?.s || 0;
    const totalWelfareActivities = db.get('SELECT COUNT(*) as c FROM welfare_grants')?.c || 0;

    // Pending counts
    const pendingBkashCount = db.get('SELECT COUNT(*) as c FROM payment_submissions WHERE verification_status = "অপেক্ষমাণ"')?.c || 0;
    const pendingApplicationsCount = db.get('SELECT COUNT(*) as c FROM applications WHERE status IN ("জমা হয়েছে", "যাচাইাধীন", "অনুমোদনের অপেক্ষায়")')?.c || 0;
    const totalDonors = db.get('SELECT COUNT(*) as c FROM donors WHERE status = "active"')?.c || 0;

    // Recent Transactions
    const recentTransactions = db.query(
      `SELECT t.*, fa.name_bn as account_name
       FROM transactions t
       JOIN financial_accounts fa ON t.account_id = fa.id
       ORDER BY t.created_at DESC LIMIT 8`
    );

    // Overdue List for prominent red alert
    const overdueList = db.query(
      `SELECT l.*, a.name_bn as applicant_name, a.mobile as applicant_mobile
       FROM loans l
       JOIN applicants a ON l.applicant_id = a.id
       WHERE l.outstanding_principal > 0 AND l.due_date < ?
       ORDER BY l.due_date ASC`,
      [todayStr]
    );

    res.json({
      success: true,
      data: {
        cashBalance,
        bankBalance,
        bkashBalance,
        totalLiquidBalance,
        karjeSector: {
          fundId: karjeFundId,
          fundName: 'কর্জে হাসানা ঘূর্ণায়মান তহবিল',
          totalCapital: karjeTotalCapital,
          totalDisbursed: karjeTotalDisbursed,
          totalRepaid: karjeTotalRepaid,
          outstandingLoans: karjeOutstanding,
          availableCash: karjeAvailableCash,
          activeLoansCount: karjeActiveLoansCount,
          isRefundable: true
        },
        emergencySector: {
          fundId: emergencyFundId,
          fundName: 'জরুরি ও এককালীন সহায়তা তহবিল',
          totalDonations: emergencyTotalDonations,
          totalSpent: emergencyTotalSpent,
          availableBalance: emergencyAvailableBalance,
          beneficiariesCount: emergencyBeneficiariesCount,
          activitiesCount: emergencyActivitiesCount,
          categoryBreakdown: emergencyCategoryBreakdown,
          isRefundable: false
        },
        totalDonations,
        thisMonthDonations,
        totalDisbursed,
        totalRepaid,
        outstandingLoans,
        activeLoansCount,
        upcomingCount,
        dueTodayCount,
        dueTodayAmount,
        overdueCount,
        overdueAmount,
        thisMonthExpenses,
        totalWelfareAid,
        thisMonthWelfareAid,
        totalWelfareBeneficiaries,
        totalWelfareActivities,
        pendingBkashCount,
        pendingApplicationsCount,
        totalDonors,
        recentTransactions,
        overdueList,
        todayStr
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Donor Management
app.get('/api/donors', (req, res) => {
  try {
    const { q, category } = req.query;
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (name_bn LIKE ? OR name_en LIKE ? OR mobile LIKE ? OR id LIKE ?)';
      const p = `%${q}%`;
      params.push(p, p, p, p);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at DESC';

    const donors = db.query(sql, params);

    // Attach total verified donations to each donor
    for (const donor of donors) {
      const stats = db.get(
        'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations WHERE donor_id = ? AND status = "নিশ্চিত"',
        [donor.id]
      );
      donor.totalDonated = stats.total;
      donor.donationCount = stats.count;
    }

    res.json({ success: true, data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/donors', upload.single('photo'), (req, res) => {
  try {
    const b = req.body;
    if (!b.name_bn || !b.mobile) {
      return res.status(400).json({ success: false, message: 'দাতার নাম ও মোবাইল নম্বর আবশ্যক।' });
    }

    const donorId = 'DON-' + Date.now().toString().slice(-6);
    const photoUrl = req.file ? (fileToDataUrl(req.file) || ('/uploads/' + req.file.filename)) : (b.photo_url || null);

    const showOnWebsite = b.show_on_website !== undefined ? (b.show_on_website === '0' || b.show_on_website === 0 ? 0 : 1) : 1;

    db.run(
      `INSERT INTO donors (
        id, name_bn, name_en, mobile, whatsapp, email, address,
        category, frequency, commitment_amount, preferred_payment_method, notes, photo_url, status, show_on_website, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))`,
      [
        donorId, b.name_bn, b.name_en || '', b.mobile, b.whatsapp || b.mobile,
        b.email || '', b.address || '', b.category || 'এককালীন দাতা',
        b.frequency || 'এককালীন', parseFloat(b.commitment_amount) || 0,
        b.preferred_payment_method || 'বিকাশ', b.notes || '', photoUrl, showOnWebsite
      ]
    );

    logAudit(b.user_id, b.user_name, 'CREATE', 'donors', donorId, `Registered donor: ${b.name_bn}`, req);
    console.log(`[DONOR] Successfully registered donor: "${b.name_bn}" with ID: ${donorId}`);
    res.json({ success: true, message: 'নতুন দাতা সফলভাবে নিবন্ধিত হয়েছে।', donorId, photoUrl });
  } catch (err) {
    console.error('[DONOR ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Donor Endpoint (Supports Photo Upload & Website Visibility)
app.put('/api/donors/:id', upload.single('photo'), (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const existing = db.get('SELECT * FROM donors WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'দাতা খুঁজে পাওয়া যায়নি।' });
    }

    const photoUrl = req.file ? (fileToDataUrl(req.file) || ('/uploads/' + req.file.filename)) : (b.photo_url || existing.photo_url);
    const showOnWebsite = b.show_on_website !== undefined ? (b.show_on_website === '0' || b.show_on_website === 0 ? 0 : 1) : (existing.show_on_website ?? 1);

    db.run(
      `UPDATE donors SET
        name_bn = ?, name_en = ?, mobile = ?, whatsapp = ?, email = ?, address = ?,
        category = ?, frequency = ?, commitment_amount = ?, preferred_payment_method = ?,
        notes = ?, photo_url = ?, show_on_website = ?
       WHERE id = ?`,
      [
        b.name_bn || existing.name_bn,
        b.name_en !== undefined ? b.name_en : existing.name_en,
        b.mobile || existing.mobile,
        b.whatsapp !== undefined ? b.whatsapp : existing.whatsapp,
        b.email !== undefined ? b.email : existing.email,
        b.address !== undefined ? b.address : existing.address,
        b.category || existing.category,
        b.frequency || existing.frequency,
        b.commitment_amount !== undefined ? parseFloat(b.commitment_amount) : existing.commitment_amount,
        b.preferred_payment_method || existing.preferred_payment_method,
        b.notes !== undefined ? b.notes : existing.notes,
        photoUrl,
        showOnWebsite,
        id
      ]
    );

    logAudit(b.user_id || req.headers['x-user-id'] || 'admin', b.user_name || 'Admin', 'UPDATE', 'donors', id, `Updated donor: ${b.name_bn || existing.name_bn}`, req);
    res.json({ success: true, message: 'দাতার তথ্য ও ছবি সফলভাবে হালনাগাদ করা হয়েছে!', photoUrl });
  } catch (err) {
    console.error('[DONOR UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Featured Donors Endpoint (For Home/Dashboard Donor Box)
app.get('/api/public/featured-donors', (req, res) => {
  try {
    const donors = db.query(
      `SELECT id, name_bn, name_en, address, category, frequency, commitment_amount, photo_url, show_on_website, created_at
       FROM donors
       WHERE status = 'active' AND (show_on_website = 1 OR show_on_website IS NULL)
       ORDER BY created_at DESC`
    );

    for (const donor of donors) {
      const stats = db.get(
        'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations WHERE donor_id = ? AND status = "নিশ্চিত"',
        [donor.id]
      );
      donor.totalDonated = stats.total || 0;
      donor.donationCount = stats.count || 0;
    }

    res.json({ success: true, data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/donors/:id', (req, res) => {
  try {
    const donor = db.get('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (!donor) return res.status(404).json({ success: false, message: 'দাতা খুঁজে পাওয়া যায়নি।' });

    const donations = db.query(
      `SELECT d.*, f.name_bn as fund_name, fa.name_bn as account_name
       FROM donations d
       JOIN funds f ON d.fund_id = f.id
       JOIN financial_accounts fa ON d.financial_account_id = fa.id
       WHERE d.donor_id = ?
       ORDER BY d.date DESC`,
      [donor.id]
    );

    const totalDonated = donations
      .filter(d => d.status === 'নিশ্চিত')
      .reduce((sum, d) => sum + d.amount, 0);

    res.json({
      success: true,
      data: {
        ...donor,
        donations,
        totalDonated
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/donors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const donor = db.get('SELECT * FROM donors WHERE id = ?', [id]);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'দাতা খুঁজে পাওয়া যায়নি।' });
    }

    db.transaction(({ run }) => {
      // Disconnect donor from past donations so receipts remain financially accurate
      run('UPDATE donations SET donor_id = NULL WHERE donor_id = ?', [id]);
      // Permanently remove donor
      run('DELETE FROM donors WHERE id = ?', [id]);
    });

    logAudit(req.headers['x-user-id'] || 'admin', req.headers['x-user-role'] || 'Admin', 'DELETE', 'donors', id, `Permanently deleted donor: ${donor.name_bn}`, req);
    console.log(`[DONOR] Permanently deleted donor: "${donor.name_bn}" (${id})`);
    res.json({ success: true, message: `দাতা "${donor.name_bn}" সফলভাবে চিরতরে মুছে ফেলা হয়েছে।` });
  } catch (err) {
    console.error('[DONOR DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Donation Management (Strictly separated from loans!)
app.get('/api/donations', (req, res) => {
  try {
    const { status, fund_id } = req.query;
    let sql = `
      SELECT d.*, f.name_bn as fund_name, fa.name_bn as account_name
      FROM donations d
      JOIN funds f ON d.fund_id = f.id
      JOIN financial_accounts fa ON d.financial_account_id = fa.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (fund_id) {
      sql += ' AND d.fund_id = ?';
      params.push(parseInt(fund_id, 10));
    }
    sql += ' ORDER BY d.date DESC, d.created_at DESC';

    const donations = db.query(sql, params);
    res.json({ success: true, data: donations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Donation
app.post('/api/donations', (req, res) => {
  try {
    const b = req.body;
    if (!b.donor_name || !b.amount || !b.fund_id || !b.financial_account_id) {
      return res.status(400).json({ success: false, message: 'প্রয়োজনীয় অনুদানের তথ্য পূরণ করুন।' });
    }

    const donationId = 'DONATION-' + Date.now().toString().slice(-6);
    const receiptNumber = 'REC-DON-' + Date.now().toString().slice(-6);
    const dateStr = b.date || getDhakaDateStr();
    const amount = parseFloat(b.amount);
    const status = b.status || 'নিশ্চিত'; // default verified if entered directly by accountant

    db.transaction(({ run }) => {
      let donorId = b.donor_id && b.donor_id !== 'NEW' && b.donor_id !== '' ? b.donor_id : null;

      const donorMobile = (b.donor_mobile || b.mobile || '').toString().trim();
      // Auto-detect existing donor by mobile or name, or automatically register new donor!
      if (!donorId && b.donor_name) {
        let existing = null;
        if (donorMobile) {
          existing = db.get('SELECT id FROM donors WHERE mobile = ? LIMIT 1', [donorMobile]);
        }
        if (!existing && b.donor_name.trim()) {
          existing = db.get('SELECT id FROM donors WHERE name_bn = ? LIMIT 1', [b.donor_name.trim()]);
        }

        if (existing) {
          donorId = existing.id;
        } else {
          donorId = 'DON-' + Date.now().toString().slice(-6);
          run(
            `INSERT INTO donors (
              id, name_bn, mobile, whatsapp, category, frequency, commitment_amount, status, created_at
            ) VALUES (?, ?, ?, ?, 'এককালীন দাতা', 'এককালীন', 0, 'active', datetime('now'))`,
            [donorId, b.donor_name.trim(), donorMobile, donorMobile]
          );
        }
      }

      run(
        `INSERT INTO donations (
          id, receipt_number, donor_id, donor_name, donor_mobile, amount,
          fund_id, financial_account_id, payment_method, transaction_reference,
          status, date, recorded_by, verified_by, verified_at, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          donationId, receiptNumber, donorId, b.donor_name.trim(),
          donorMobile, amount, parseInt(b.fund_id, 10),
          parseInt(b.financial_account_id, 10), b.payment_method || 'নগদ',
          b.transaction_reference || '', status, dateStr,
          b.recorded_by || 'হিসাবরক্ষক',
          status === 'নিশ্চিত' ? (b.verified_by || 'হিসাবরক্ষক') : null,
          status === 'নিশ্চিত' ? dateStr : null,
          b.notes || ''
        ]
      );

      // If status is confirmed/verified, immediately post to transactions ledger!
      if (status === 'নিশ্চিত') {
        const trxId = 'TRX-' + Date.now().toString().slice(-6);
        run(
          `INSERT INTO transactions (
            id, date, type, account_id, fund_id, amount, direction,
            related_entity_type, related_entity_id, reference_no, description_bn,
            recorded_by, status, created_at
          ) VALUES (?, ?, 'DONATION', ?, ?, ?, 'IN', 'donations', ?, ?, ?, ?, 'verified', datetime('now'))`,
          [
            trxId, dateStr, parseInt(b.financial_account_id, 10), parseInt(b.fund_id, 10),
            amount, donationId, receiptNumber,
            `অনুদান প্রাপ্তি: ${b.donor_name} (${b.payment_method || 'নগদ'})`,
            b.recorded_by || 'হিসাবরক্ষক'
          ]
        );
      }
    });

    logAudit(b.user_id, b.user_name, 'CREATE', 'donations', donationId, `Recorded donation ৳${amount} from ${b.donor_name}`, req);
    console.log(`[DONATION] Successfully recorded donation: ৳${amount} from "${b.donor_name}" (Receipt: ${receiptNumber})`);
    const receiptData = buildDonationReceiptPayload(donationId);
    res.json({
      success: true,
      message: 'অনুদান সফলভাবে রেকর্ড করা হয়েছে এবং ডিজিটাল মানি রিসিট প্রস্তুত!',
      donationId,
      receiptNumber,
      receipt: receiptData
    });
  } catch (err) {
    console.error('[DONATION ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Full Digital Money Receipt Data (for Print, Download, and WhatsApp sharing)
app.get('/api/donations/:id/receipt', (req, res) => {
  try {
    const receipt = buildDonationReceiptPayload(req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'রসিদ পাওয়া যায়নি।' });
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Receipt Verification
app.get('/api/public/receipt/:receiptNumber', (req, res) => {
  try {
    const receipt = buildDonationReceiptPayload(req.params.receiptNumber);
    if (!receipt) return res.status(404).json({ success: false, message: 'প্রদত্ত নম্বরে কোনো বৈধ রসিদ পাওয়া যায়নি।' });
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify a Pending Donation
app.post('/api/donations/:id/verify', (req, res) => {
  try {
    const donation = db.get('SELECT * FROM donations WHERE id = ?', [req.params.id]);
    if (!donation) return res.status(404).json({ success: false, message: 'অনুদান খুঁজে পাওয়া যায়নি।' });
    if (donation.status === 'নিশ্চিত') {
      return res.status(400).json({ success: false, message: 'এই অনুদানটি ইতিপূর্বে নিশ্চিত করা হয়েছে।' });
    }

    const todayStr = getDhakaDateStr();

    db.transaction(({ run }) => {
      run(
        `UPDATE donations SET status = 'নিশ্চিত', verified_by = ?, verified_at = ? WHERE id = ?`,
        [req.body.user_name || 'Accountant', todayStr, donation.id]
      );

      // Add to transaction ledger
      const trxId = 'TRX-' + Date.now().toString().slice(-6);
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'DONATION', ?, ?, ?, 'IN', 'donations', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, todayStr, donation.financial_account_id, donation.fund_id,
          donation.amount, donation.id, donation.receipt_number,
          `যাচাইকৃত অনুদান: ${donation.donor_name} (রেফারেন্স: ${donation.transaction_reference || 'N/A'})`,
          req.body.user_name || 'Accountant'
        ]
      );
    });

    logAudit(req.body.user_id, req.body.user_name, 'VERIFY', 'donations', donation.id, `Verified donation ৳${donation.amount}`, req);
    res.json({ success: true, message: 'অনুদান সফলভাবে যাচাই ও নিশ্চিত করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single donation
app.get('/api/donations/:id', (req, res) => {
  try {
    const d = db.get(`
      SELECT d.*, f.name_bn as fund_name, fa.name_bn as account_name
      FROM donations d
      LEFT JOIN funds f ON d.fund_id = f.id
      LEFT JOIN financial_accounts fa ON d.financial_account_id = fa.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (!d) return res.status(404).json({ success: false, message: 'অনুদান খুঁজে পাওয়া যায়নি।' });
    res.json({ success: true, data: d });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update / Correct Donation
app.put('/api/donations/:id', (req, res) => {
  try {
    const donationId = req.params.id;
    const existing = db.get('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'অনুদান খুঁজে পাওয়া যায়নি।' });
    }

    const b = req.body;
    const newAmount = b.amount !== undefined ? parseFloat(b.amount) : existing.amount;
    const newDate = b.date || existing.date;
    const newFundId = b.fund_id !== undefined ? parseInt(b.fund_id, 10) : existing.fund_id;
    const newAccountId = b.financial_account_id !== undefined ? parseInt(b.financial_account_id, 10) : existing.financial_account_id;
    const newDonorName = (b.donor_name || existing.donor_name).trim();
    const newDonorMobile = (b.donor_mobile !== undefined ? b.donor_mobile : (existing.donor_mobile || '')).toString().trim();
    const newPaymentMethod = b.payment_method || existing.payment_method;
    const newTxRef = b.transaction_reference !== undefined ? b.transaction_reference : existing.transaction_reference;
    const newNotes = b.notes !== undefined ? b.notes : existing.notes;
    const donorId = b.donor_id || existing.donor_id;

    db.transaction(({ run }) => {
      // 1. Update donations table
      run(`
        UPDATE donations
        SET donor_id = ?, donor_name = ?, donor_mobile = ?, amount = ?,
            fund_id = ?, financial_account_id = ?, payment_method = ?,
            transaction_reference = ?, date = ?, notes = ?
        WHERE id = ?
      `, [
        donorId, newDonorName, newDonorMobile, newAmount,
        newFundId, newAccountId, newPaymentMethod,
        newTxRef, newDate, newNotes, donationId
      ]);

      // 2. Synchronize linked transaction if confirmed
      if (existing.status === 'নিশ্চিত') {
        const desc = `অনুদান প্রাপ্তি: ${newDonorName} (${newPaymentMethod})`;
        const linkedTrx = db.get(`
          SELECT id FROM transactions
          WHERE (related_entity_type = 'donations' AND related_entity_id = ?)
             OR (reference_no = ?)
          LIMIT 1
        `, [donationId, existing.receipt_number]);

        if (linkedTrx) {
          run(`
            UPDATE transactions
            SET date = ?, account_id = ?, fund_id = ?, amount = ?, description_bn = ?
            WHERE id = ?
          `, [newDate, newAccountId, newFundId, newAmount, desc, linkedTrx.id]);
        } else {
          const trxId = 'TRX-' + Date.now().toString().slice(-6);
          run(`
            INSERT INTO transactions (
              id, date, type, account_id, fund_id, amount, direction,
              related_entity_type, related_entity_id, reference_no, description_bn,
              recorded_by, status, created_at
            ) VALUES (?, ?, 'DONATION', ?, ?, ?, 'IN', 'donations', ?, ?, ?, ?, 'verified', datetime('now'))
          `, [
            trxId, newDate, newAccountId, newFundId, newAmount, donationId,
            existing.receipt_number, desc, b.user_name || 'হিসাবরক্ষক'
          ]);
        }
      }
    });

    logAudit(b.user_id, b.user_name, 'UPDATE', 'donations', donationId, `Updated donation: ৳${existing.amount} -> ৳${newAmount} (${newDonorName})`, req);
    res.json({
      success: true,
      message: 'অনুদানের তথ্য ও ক্যাশবুক এন্ট্রি সফলভাবে সংশোধন করা হয়েছে।',
      receipt: buildDonationReceiptPayload(donationId)
    });
  } catch (err) {
    console.error('[DONATION UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Donation
app.delete('/api/donations/:id', (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি মুছতে পারবেন।' });
    }

    const donationId = req.params.id;
    const existing = db.get('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'অনুদান খুঁজে পাওয়া যায়নি।' });
    }

    db.transaction(({ run }) => {
      // 1. Delete linked transaction in cashbook ledger
      run(`
        DELETE FROM transactions
        WHERE (related_entity_type = 'donations' AND related_entity_id = ?)
           OR (reference_no = ?)
      `, [donationId, existing.receipt_number]);

      // 2. If it was linked to a bKash payment submission, reset its status
      if (existing.transaction_reference) {
        run(`
          UPDATE payment_submissions
          SET verification_status = 'অপেক্ষমাণ', associated_donation_id = NULL
          WHERE transaction_id = ?
        `, [existing.transaction_reference]);
      }

      // 3. Delete donation record
      run('DELETE FROM donations WHERE id = ?', [donationId]);
    });

    logAudit(req.query.user_id || req.headers['x-user-id'] || 'admin', req.query.user_name || 'Admin', 'DELETE', 'donations', donationId, `Deleted donation: ${existing.receipt_number} (৳${existing.amount} - ${existing.donor_name})`, req);
    res.json({ success: true, message: 'অনুদান এবং সংশ্লিষ্ট ক্যাশবুক লেনদেন সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('[DONATION DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. bKash Submissions & Verification
app.get('/api/bkash-submissions', (req, res) => {
  try {
    const submissions = db.query('SELECT * FROM payment_submissions ORDER BY created_at DESC');
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Verifies bKash Submission
app.post('/api/bkash-submissions/:id/verify', (req, res) => {
  try {
    const sub = db.get('SELECT * FROM payment_submissions WHERE id = ?', [req.params.id]);
    if (!sub) return res.status(404).json({ success: false, message: 'পেমেন্ট জমা রেকর্ড পাওয়া যায়নি।' });
    if (sub.verification_status === 'নিশ্চিত') {
      return res.status(400).json({ success: false, message: 'এই পেমেন্টটি ইতিপূর্বে যাচাই করা হয়েছে।' });
    }

    const todayStr = getDhakaDateStr();
    const donationId = 'DONATION-' + Date.now().toString().slice(-6);
    const receiptNumber = 'REC-DON-' + Date.now().toString().slice(-6);
    const trxId = 'TRX-' + Date.now().toString().slice(-6);

    // Map fund_category to fund_id (Strictly Sector 1 or Sector 2)
    let fund = db.get('SELECT id FROM funds WHERE name_bn LIKE ?', [`%${sub.fund_category}%`]);
    if (!fund) {
      if (sub.fund_category && (sub.fund_category.includes('জরুরি') || sub.fund_category.includes('ত্রাণ') || sub.fund_category.includes('কম্বল') || sub.fund_category.includes('খাদ্য') || sub.fund_category.includes('চিকিৎসা'))) {
        fund = { id: 2 };
      } else {
        fund = { id: 1 };
      }
    }
    // bKash account is id 3
    const bkashAccount = db.get('SELECT id FROM financial_accounts WHERE account_type = "mfs" OR name_bn LIKE "%বিকাশ%"') || { id: 3 };

    db.transaction(({ run }) => {
      // 1. Create verified donation
      run(
        `INSERT INTO donations (
          id, receipt_number, donor_id, donor_name, donor_mobile, amount,
          fund_id, financial_account_id, payment_method, transaction_reference,
          status, date, recorded_by, verified_by, verified_at, notes, created_at
        ) VALUES (?, ?, null, ?, ?, ?, ?, ?, 'bKash Send Money', ?, 'নিশ্চিত', ?, ?, ?, ?, ?, datetime('now'))`,
        [
          donationId, receiptNumber, sub.donor_name, sub.donor_mobile, sub.amount,
          fund.id, bkashAccount.id, sub.transaction_id, todayStr,
          'বিকাশ অনলাইন সাবমিশন', req.body.user_name || 'Admin', todayStr,
          `বিকাশ প্রেরক নম্বর: ${sub.sender_bkash_mobile || 'N/A'}`
        ]
      );

      // 2. Add to transaction ledger (Only verified payments affect cash balance!)
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'DONATION', ?, ?, ?, 'IN', 'donations', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, todayStr, bkashAccount.id, fund.id, sub.amount, donationId, receiptNumber,
          `বিকাশ অনুদান: ${sub.donor_name} (TrxID: ${sub.transaction_id})`,
          req.body.user_name || 'Admin'
        ]
      );

      // 3. Update submission record
      run(
        `UPDATE payment_submissions SET
          verification_status = 'নিশ্চিত', verified_by = ?, verified_at = ?,
          associated_donation_id = ?
         WHERE id = ?`,
        [req.body.user_name || 'Admin', todayStr, donationId, sub.id]
      );
    });

    logAudit(req.body.user_id, req.body.user_name, 'VERIFY', 'bkash_submissions', sub.id, `Verified bKash TrxID: ${sub.transaction_id} (৳${sub.amount})`, req);
    const receiptData = buildDonationReceiptPayload(donationId);
    res.json({
      success: true,
      message: 'বিকাশ পেমেন্ট সফলভাবে যাচাই করা হয়েছে এবং অনুদান রসিদ তৈরি হয়েছে!',
      donationId,
      receiptNumber,
      receipt: receiptData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Rejects bKash Submission
app.post('/api/bkash-submissions/:id/reject', (req, res) => {
  try {
    const { reason } = req.body;
    db.run(
      `UPDATE payment_submissions SET
        verification_status = 'প্রত্যাখ্যাত', rejection_reason = ?, verified_by = ?, verified_at = datetime('now')
       WHERE id = ?`,
      [reason || 'তথ্য অমিল বা ভুল ট্রানজ্যাকশন আইডি', req.body.user_name || 'Admin', req.params.id]
    );

    logAudit(req.body.user_id, req.body.user_name, 'REJECT', 'bkash_submissions', req.params.id, `Rejected bKash submission: ${reason}`, req);
    res.json({ success: true, message: 'পেমেন্ট আবেদন প্রত্যাখ্যাত হিসেবে চিহ্নিত করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete bKash Submission
app.delete('/api/bkash-submissions/:id', (req, res) => {
  try {
    const subId = req.params.id;
    const sub = db.get('SELECT * FROM payment_submissions WHERE id = ?', [subId]);
    if (!sub) return res.status(404).json({ success: false, message: 'বিকাশ জমা রেকর্ড পাওয়া যায়নি।' });

    db.transaction(({ run }) => {
      run('DELETE FROM payment_submissions WHERE id = ?', [subId]);
    });

    logAudit(req.query.user_id || 'admin', req.query.user_name || 'Admin', 'DELETE', 'payment_submissions', subId, `Deleted bkash submission ${subId}`, req);
    res.json({ success: true, message: 'বিকাশ জমা রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Applications & Verification & Committee Approval
app.get('/api/applications', (req, res) => {
  try {
    const { status, type } = req.query;
    let sql = `
      SELECT ap.*, app.name_bn as applicant_name, app.mobile as applicant_mobile,
             app.present_address, app.occupation, app.monthly_income, app.photo_url, app.nid_number
      FROM applications ap
      JOIN applicants app ON ap.applicant_id = app.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      sql += ' AND ap.status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND ap.assistance_type = ?';
      params.push(type);
    }
    sql += ' ORDER BY ap.created_at DESC';

    const applications = db.query(sql, params);
    res.json({ success: true, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/applications/:id', (req, res) => {
  try {
    const application = db.get(
      `SELECT ap.*, app.name_bn as applicant_name, app.name_en as applicant_name_en,
              app.father_husband_name, app.mother_name, app.dob, app.age, app.gender,
              app.nid_number, app.mobile as applicant_mobile, app.alt_mobile,
              app.present_address, app.permanent_address, app.occupation, app.monthly_income,
              app.family_members, app.dependents, app.emergency_contact_name, app.emergency_contact_mobile,
              app.photo_url, app.nid_file_url
       FROM applications ap
       JOIN applicants app ON ap.applicant_id = app.id
       WHERE ap.id = ?`,
      [req.params.id]
    );
    if (!application) return res.status(404).json({ success: false, message: 'আবেদনপত্র পাওয়া যায়নি।' });

    const relatedLoan = db.get('SELECT * FROM loans WHERE application_id = ?', [application.id]);

    res.json({ success: true, data: { ...application, loan: relatedLoan } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verification Officer adds Field Verification Notes
app.post('/api/applications/:id/verify', (req, res) => {
  try {
    const { notes, officer_name, recommendation } = req.body;
    db.run(
      `UPDATE applications SET
        status = 'যাচাইাধীন', verification_notes = ?, verification_officer_id = ?,
        committee_recommendation = ?, verified_at = datetime('now')
       WHERE id = ?`,
      [notes || '', officer_name || 'যাচাই কর্মকর্তা', recommendation || '', req.params.id]
    );

    logAudit(req.body.user_id, officer_name, 'VERIFY', 'applications', req.params.id, `Verification report submitted: ${recommendation}`, req);
    res.json({ success: true, message: 'মাঠপর্যায়ের যাচাই প্রতিবেদন সফলভাবে সংরক্ষিত হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Committee / Admin Approves Application
app.post('/api/applications/:id/approve', (req, res) => {
  try {
    const { approved_amount, approved_duration_days, approver_name, notes } = req.body;
    if (!approved_amount) {
      return res.status(400).json({ success: false, message: 'অনুমোদিত টাকার পরিমাণ উল্লেখ করুন।' });
    }

    db.run(
      `UPDATE applications SET
        status = 'অনুমোদিত', approved_amount = ?, approved_duration_days = ?,
        approved_by = ?, approved_at = datetime('now'), detailed_explanation = detailed_explanation || ?
       WHERE id = ?`,
      [
        parseFloat(approved_amount),
        parseInt(approved_duration_days, 10) || 30,
        approver_name || 'চেয়ারম্যান ও অনুমোদন কমিটি',
        notes ? ` [অনুমোদন মন্তব্য: ${notes}]` : '',
        req.params.id
      ]
    );

    logAudit(req.body.user_id, approver_name, 'APPROVE', 'applications', req.params.id, `Approved assistance ৳${approved_amount}`, req);
    res.json({ success: true, message: 'আবেদনটি সফলভাবে অনুমোদিত হয়েছে। এখন অর্থ বিতরণের জন্য প্রস্তুত।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject Application
app.post('/api/applications/:id/reject', (req, res) => {
  try {
    const { reason, rejected_by } = req.body;
    db.run(
      `UPDATE applications SET
        status = 'প্রত্যাখ্যাত', rejection_reason = ?, approved_by = ?, approved_at = datetime('now')
       WHERE id = ?`,
      [reason || 'যাচাই ও পর্যালোচনায় অযোগ্য বিবেচিত', rejected_by || 'অনুমোদন কমিটি', req.params.id]
    );

    logAudit(req.body.user_id, rejected_by, 'REJECT', 'applications', req.params.id, `Rejected application: ${reason}`, req);
    res.json({ success: true, message: 'আবেদনটি প্রত্যাখ্যাত হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Application
app.delete('/api/applications/:id', (req, res) => {
  try {
    const appId = req.params.id;
    const appRecord = db.get('SELECT * FROM applications WHERE id = ?', [appId]);
    if (!appRecord) return res.status(404).json({ success: false, message: 'আবেদনপত্র খুঁজে পাওয়া যায়নি।' });

    db.transaction(({ run }) => {
      const loan = db.get('SELECT id, disbursement_receipt_number FROM loans WHERE application_id = ?', [appId]);
      if (loan) {
        const reps = db.query('SELECT id, receipt_number FROM repayments WHERE loan_id = ?', [loan.id]);
        for (const r of reps) {
          run(`DELETE FROM transactions WHERE (related_entity_type = 'repayments' AND related_entity_id = ?) OR reference_no = ?`, [r.id, r.receipt_number]);
        }
        run('DELETE FROM repayments WHERE loan_id = ?', [loan.id]);
        run(`DELETE FROM transactions WHERE (related_entity_type = 'loans' AND related_entity_id = ?) OR reference_no = ?`, [loan.id, loan.disbursement_receipt_number]);
        run('DELETE FROM loans WHERE id = ?', [loan.id]);
      }
      run('DELETE FROM applications WHERE id = ?', [appId]);
    });

    logAudit(req.query.user_id || 'admin', req.query.user_name || 'Admin', 'DELETE', 'applications', appId, `Deleted application ${appId} (${appRecord.applicant_name})`, req);
    res.json({ success: true, message: 'আবেদনপত্রটি সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Loan Disbursement (Separate from approval! Checks balance, creates agreement, receipt, and ledger entry)
app.post('/api/loans/disburse', (req, res) => {
  try {
    const {
      application_id, fund_id, disbursed_from_account_id,
      actual_disbursement_date, approved_duration_days, disbursed_amount,
      disbursed_by, notes
    } = req.body;

    const appRecord = db.get('SELECT * FROM applications WHERE id = ?', [application_id]);
    if (!appRecord) return res.status(404).json({ success: false, message: 'আবেদন খুঁজে পাওয়া যায়নি।' });
    if (appRecord.status !== 'অনুমোদিত') {
      return res.status(400).json({ success: false, message: 'কেবলমাত্র অনুমোদিত আবেদনের অর্থ বিতরণ করা যাবে।' });
    }

    const principal = parseFloat(disbursed_amount || appRecord.approved_amount);
    const duration = parseInt(approved_duration_days || appRecord.approved_duration_days || 30, 10);
    const disbDate = actual_disbursement_date || getDhakaDateStr();

    // Automatic Maturity Date Formula:
    // Repayment Due Date = Actual Disbursement Date + Approved Duration in Calendar Days
    const dueDate = addDaysToDateStr(disbDate, duration);

    // Check account balance
    const accId = parseInt(disbursed_from_account_id, 10);
    const accOpen = db.get('SELECT opening_balance, name_bn FROM financial_accounts WHERE id = ?', [accId]);
    const accIn = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [accId])?.s || 0;
    const accOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [accId])?.s || 0;
    const currentBalance = (accOpen?.opening_balance || 0) + accIn - accOut;

    if (currentBalance < principal) {
      return res.status(400).json({
        success: false,
        message: `নির্বাচিত হিসাব (${accOpen?.name_bn}) এ পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${currentBalance}, প্রয়োজনীয়: ৳${principal}।`
      });
    }

    const loanId = 'LOAN-' + Date.now().toString().slice(-6);
    const disbReceiptNo = 'REC-DISB-' + Date.now().toString().slice(-6);
    const agreementNo = 'AGR-LOAN-' + Date.now().toString().slice(-6);
    const trxId = 'TRX-' + Date.now().toString().slice(-6);

    const applicant = db.get('SELECT * FROM applicants WHERE id = ?', [appRecord.applicant_id]);

    db.transaction(({ run }) => {
      // 1. Insert into loans
      run(
        `INSERT INTO loans (
          id, application_id, applicant_id, fund_id, disbursed_from_account_id,
          original_principal, approved_duration_days, actual_disbursement_date, due_date,
          repayment_method, total_principal_repaid, outstanding_principal, loan_status,
          disbursement_receipt_number, disbursed_by, agreement_number, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'সক্রিয়', ?, ?, ?, ?, datetime('now'))`,
        [
          loanId, appRecord.id, appRecord.applicant_id, parseInt(fund_id || 2, 10),
          accId, principal, duration, disbDate, dueDate,
          appRecord.proposed_repayment_method || 'নগদ/বিকাশ', principal,
          disbReceiptNo, disbursed_by || 'হিসাব শাখা', agreementNo, notes || ''
        ]
      );

      // 2. Insert into unified transaction ledger
      // Loan disbursement reduces available liquid cash and creates a loan receivable asset!
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'DISBURSEMENT', ?, ?, ?, 'OUT', 'loans', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, disbDate, accId, parseInt(fund_id || 2, 10), principal,
          loanId, disbReceiptNo,
          `সুদমুক্ত ধার বিতরণ: ${applicant.name_bn} (মেয়াদ: ${duration} দিন, নির্ধারিত ফেরত: ${dueDate})`,
          disbursed_by || 'হিসাব শাখা'
        ]
      );

      // 3. Update application status
      run(
        `UPDATE applications SET status = 'অর্থ বিতরণ হয়েছে' WHERE id = ?`,
        [appRecord.id]
      );
    });

    logAudit(req.body.user_id, disbursed_by, 'DISBURSE', 'loans', loanId, `Disbursed interest-free loan ৳${principal} to ${applicant.name_bn}`, req);

    res.json({
      success: true,
      message: 'সুদমুক্ত ধার সফলভাবে বিতরণ করা হয়েছে এবং চুক্তিপত্র ও রসিদ তৈরি হয়েছে!',
      loanId,
      disbursementReceiptNumber: disbReceiptNo,
      agreementNumber: agreementNo,
      actualDisbursementDate: disbDate,
      dueDate,
      principal
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Loan Repayment Management (Principal return - NEVER treated as donation!)
app.get('/api/loans', (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT l.*, a.name_bn as applicant_name, a.mobile as applicant_mobile,
             a.present_address, a.nid_number, fa.name_bn as account_name,
             f.name_bn as fund_name
      FROM loans l
      JOIN applicants a ON l.applicant_id = a.id
      JOIN financial_accounts fa ON l.disbursed_from_account_id = fa.id
      JOIN funds f ON l.fund_id = f.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      sql += ' AND l.loan_status = ?';
      params.push(status);
    }
    sql += ' ORDER BY l.due_date ASC';

    const loans = db.query(sql, params);
    const todayStr = getDhakaDateStr();

    for (const l of loans) {
      l.daysDiff = getDaysDiff(l.due_date, todayStr);
    }

    res.json({ success: true, data: loans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/loans/:id', (req, res) => {
  try {
    const loan = db.get(
      `SELECT l.*, a.name_bn as applicant_name, a.name_en as applicant_name_en,
              a.father_husband_name, a.mother_name, a.mobile as applicant_mobile,
              a.present_address, a.permanent_address, a.nid_number, a.photo_url,
              ap.purpose, ap.guarantor_name, ap.guarantor_mobile, ap.guarantor_relation,
              fa.name_bn as account_name, f.name_bn as fund_name
       FROM loans l
       JOIN applicants a ON l.applicant_id = a.id
       JOIN applications ap ON l.application_id = ap.id
       JOIN financial_accounts fa ON l.disbursed_from_account_id = fa.id
       JOIN funds f ON l.fund_id = f.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!loan) return res.status(404).json({ success: false, message: 'ধার রেকর্ড পাওয়া যায়নি।' });

    const repayments = db.query(
      `SELECT r.*, fa.name_bn as received_account_name
       FROM repayments r
       JOIN financial_accounts fa ON r.received_in_account_id = fa.id
       WHERE r.loan_id = ?
       ORDER BY r.repayment_date DESC`,
      [loan.id]
    );

    const extensions = db.query(
      'SELECT * FROM loan_extensions WHERE loan_id = ? ORDER BY created_at DESC',
      [loan.id]
    );

    const todayStr = getDhakaDateStr();
    loan.daysDiff = getDaysDiff(loan.due_date, todayStr);

    res.json({
      success: true,
      data: {
        ...loan,
        repayments,
        extensions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Repayment
app.post('/api/repayments', (req, res) => {
  try {
    const {
      loan_id, amount, repayment_date, received_in_account_id,
      payment_method, transaction_reference, recorded_by, notes
    } = req.body;

    const loan = db.get('SELECT * FROM loans WHERE id = ?', [loan_id]);
    if (!loan) return res.status(404).json({ success: false, message: 'ধার রেকর্ড পাওয়া যায়নি।' });
    if (loan.outstanding_principal <= 0) {
      return res.status(400).json({ success: false, message: 'এই ধারটি ইতোমধ্যেই সম্পূর্ণ পরিশোধিত।' });
    }

    const repayAmount = parseFloat(amount);
    if (repayAmount <= 0) {
      return res.status(400).json({ success: false, message: 'সঠিক ফেরতের পরিমাণ লিখুন।' });
    }
    if (repayAmount > loan.outstanding_principal) {
      return res.status(400).json({
        success: false,
        message: `ফেরতের পরিমাণ বকেয়া মূলধনের চেয়ে বেশি হতে পারে না। সর্বোচ্চ বকেয়া: ৳${loan.outstanding_principal}।`
      });
    }

    const repayDate = repayment_date || getDhakaDateStr();
    const accId = parseInt(received_in_account_id || 1, 10);
    const repaymentId = 'REP-' + Date.now().toString().slice(-6);
    const receiptNo = 'REC-REP-' + Date.now().toString().slice(-6);
    const trxId = 'TRX-' + Date.now().toString().slice(-6);

    const newRepaidTotal = loan.total_principal_repaid + repayAmount;
    const newOutstanding = loan.original_principal - newRepaidTotal;
    const isFullyRepaid = newOutstanding <= 0.001; // safety float tolerance

    const applicant = db.get('SELECT name_bn FROM applicants WHERE id = ?', [loan.applicant_id]);

    db.transaction(({ run }) => {
      // 1. Insert Repayment record
      run(
        `INSERT INTO repayments (
          id, receipt_number, loan_id, applicant_id, amount, repayment_date,
          received_in_account_id, payment_method, transaction_reference,
          status, recorded_by, verified_by, verified_at, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'নিশ্চিত', ?, ?, ?, ?, datetime('now'))`,
        [
          repaymentId, receiptNo, loan.id, loan.applicant_id, repayAmount,
          repayDate, accId, payment_method || 'নগদ', transaction_reference || '',
          recorded_by || 'হিসাব শাখা', recorded_by || 'হিসাব শাখা', repayDate, notes || ''
        ]
      );

      // 2. Update loan record
      run(
        `UPDATE loans SET
          total_principal_repaid = ?, outstanding_principal = ?,
          loan_status = ?
         WHERE id = ?`,
        [
          newRepaidTotal,
          newOutstanding < 0 ? 0 : newOutstanding,
          isFullyRepaid ? 'সম্পূর্ণ পরিশোধিত' : 'সক্রিয়',
          loan.id
        ]
      );

      // 3. Post to Transaction Ledger
      // IMPORTANT: Repayment is an asset conversion (Cash IN, Loan Receivable DOWN). It is NOT donation income!
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'REPAYMENT', ?, ?, ?, 'IN', 'repayments', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, repayDate, accId, loan.fund_id, repayAmount,
          repaymentId, receiptNo,
          `ধার ফেরত গ্রহণ: ${applicant.name_bn} (রসিদ: ${receiptNo})`,
          recorded_by || 'হিসাব শাখা'
        ]
      );

      // 4. If fully repaid, update application status and stop future alerts
      if (isFullyRepaid) {
        run(`UPDATE applications SET status = 'সম্পূর্ণ পরিশোধিত' WHERE id = ?`, [loan.application_id]);
      }
    });

    logAudit(req.body.user_id, recorded_by, 'REPAY', 'loans', loan.id, `Received repayment ৳${repayAmount} from ${applicant.name_bn}. Outstanding: ৳${newOutstanding}`, req);

    res.json({
      success: true,
      message: isFullyRepaid ? 'ধারটি সম্পূর্ণ পরিশোধিত হয়েছে এবং দায়মুক্তি সনদ প্রস্তুত!' : 'আংশিক কিস্তি/ফেরত সফলভাবে গ্রহণ করা হয়েছে।',
      repaymentId,
      receiptNumber: receiptNo,
      isFullyRepaid,
      outstandingPrincipal: newOutstanding < 0 ? 0 : newOutstanding
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authorized Loan Extension
app.post('/api/loans/:id/extend', (req, res) => {
  try {
    const { extension_days, reason, approved_by } = req.body;
    const loan = db.get('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!loan) return res.status(404).json({ success: false, message: 'ধার রেকর্ড পাওয়া যায়নি।' });

    const days = parseInt(extension_days, 10);
    if (!days || days <= 0) {
      return res.status(400).json({ success: false, message: 'সঠিক বর্ধিত দিনের সংখ্যা দিন।' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: 'মেয়াদ বৃদ্ধির কারণ উল্লেখ করা বাধ্যতামূলক।' });
    }

    const prevDueDate = loan.due_date;
    const newDueDate = addDaysToDateStr(prevDueDate, days);
    const todayStr = getDhakaDateStr();

    db.transaction(({ run }) => {
      run(
        `INSERT INTO loan_extensions (
          loan_id, previous_due_date, new_due_date, extension_days, reason,
          approved_by, approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [loan.id, prevDueDate, newDueDate, days, reason, approved_by || 'চেয়ারম্যান']
      );

      run(
        `UPDATE loans SET
          due_date = ?,
          loan_status = CASE WHEN ? > due_date THEN 'মেয়াদোত্তীর্ণ' ELSE 'সক্রিয়' END
         WHERE id = ?`,
        [newDueDate, todayStr, loan.id]
      );
    });

    logAudit(req.body.user_id, approved_by, 'UPDATE', 'loans', loan.id, `Extended loan due date by ${days} days. New due date: ${newDueDate}. Reason: ${reason}`, req);

    res.json({
      success: true,
      message: `ধারের মেয়াদ সফলভাবে ${days} দিন বৃদ্ধি করা হয়েছে। নতুন ফেরতের তারিখ: ${newDueDate}।`,
      newDueDate
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Loan
app.delete('/api/loans/:id', (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = db.get('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (!loan) return res.status(404).json({ success: false, message: 'ঋণ রেকর্ড পাওয়া যায়নি।' });

    db.transaction(({ run }) => {
      // 1. Delete all repayment transactions and records
      const reps = db.query('SELECT id, receipt_number FROM repayments WHERE loan_id = ?', [loanId]);
      for (const r of reps) {
        run(`DELETE FROM transactions WHERE (related_entity_type = 'repayments' AND related_entity_id = ?) OR reference_no = ?`, [r.id, r.receipt_number]);
      }
      run('DELETE FROM repayments WHERE loan_id = ?', [loanId]);

      // 2. Delete disbursement transaction
      run(`DELETE FROM transactions WHERE (related_entity_type = 'loans' AND related_entity_id = ?) OR reference_no = ?`, [loanId, loan.disbursement_receipt_number]);

      // 3. Revert application status
      if (loan.application_id) {
        run(`UPDATE applications SET status = 'অনুমোদিত' WHERE id = ?`, [loan.application_id]);
      }

      // 4. Delete loan
      run('DELETE FROM loans WHERE id = ?', [loanId]);
    });

    logAudit(req.query.user_id || 'admin', req.query.user_name || 'Admin', 'DELETE', 'loans', loanId, `Deleted loan ${loanId} (৳${loan.original_principal})`, req);
    res.json({ success: true, message: 'ঋণ এবং সংশ্লিষ্ট লেনদেন সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List All Repayments
app.get('/api/repayments', (req, res) => {
  try {
    const { loan_id } = req.query;
    let sql = `
      SELECT r.*, a.name_bn as applicant_name, a.mobile as applicant_mobile, fa.name_bn as account_name
      FROM repayments r
      JOIN applicants a ON r.applicant_id = a.id
      LEFT JOIN financial_accounts fa ON r.received_in_account_id = fa.id
      WHERE 1=1
    `;
    const params = [];
    if (loan_id) {
      sql += ' AND r.loan_id = ?';
      params.push(loan_id);
    }
    sql += ' ORDER BY r.repayment_date DESC, r.created_at DESC';
    const reps = db.query(sql, params);
    res.json({ success: true, data: reps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Repayment
app.delete('/api/repayments/:id', (req, res) => {
  try {
    const repId = req.params.id;
    const existing = db.get('SELECT * FROM repayments WHERE id = ?', [repId]);
    if (!existing) return res.status(404).json({ success: false, message: 'কিস্তি বা ফেরত রেকর্ড পাওয়া যায়নি।' });

    db.transaction(({ run }) => {
      // 1. Revert loan total repaid and outstanding
      const loan = db.get('SELECT * FROM loans WHERE id = ?', [existing.loan_id]);
      if (loan) {
        const newRepaid = Math.max(0, loan.total_principal_repaid - existing.amount);
        const newOutstanding = Math.max(0, loan.original_principal - newRepaid);
        run(`UPDATE loans SET total_principal_repaid = ?, outstanding_principal = ?, loan_status = 'সক্রিয়' WHERE id = ?`, [newRepaid, newOutstanding, loan.id]);
        if (loan.application_id) {
          run(`UPDATE applications SET status = 'অর্থ বিতরণ হয়েছে' WHERE id = ?`, [loan.application_id]);
        }
      }

      // 2. Delete linked transaction in cashbook
      run(`DELETE FROM transactions WHERE (related_entity_type = 'repayments' AND related_entity_id = ?) OR reference_no = ?`, [repId, existing.receipt_number]);

      // 3. Delete repayment row
      run('DELETE FROM repayments WHERE id = ?', [repId]);
    });

    logAudit(req.query.user_id || 'admin', req.query.user_name || 'Admin', 'DELETE', 'repayments', repId, `Deleted repayment ৳${existing.amount} (Receipt: ${existing.receipt_number})`, req);
    res.json({ success: true, message: 'কিস্তি আদায় রেকর্ড ও সংশ্লিষ্ট ক্যাশবুক ট্রানজ্যাকশন সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update / Correct Repayment
app.put('/api/repayments/:id', (req, res) => {
  try {
    const repId = req.params.id;
    const existing = db.get('SELECT * FROM repayments WHERE id = ?', [repId]);
    if (!existing) return res.status(404).json({ success: false, message: 'কিস্তি রেকর্ড পাওয়া যায়নি।' });

    const { amount, repayment_date, received_in_account_id, payment_method, notes } = req.body;
    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    const newDate = repayment_date || existing.repayment_date;
    const newAccountId = received_in_account_id !== undefined ? parseInt(received_in_account_id, 10) : existing.received_in_account_id;
    const newMethod = payment_method || existing.payment_method;
    const newNotes = notes !== undefined ? notes : existing.notes;

    db.transaction(({ run }) => {
      // 1. Calculate difference and update loan
      const loan = db.get('SELECT * FROM loans WHERE id = ?', [existing.loan_id]);
      if (loan) {
        const diff = newAmount - existing.amount;
        const newRepaid = Math.max(0, loan.total_principal_repaid + diff);
        const newOutstanding = Math.max(0, loan.original_principal - newRepaid);
        const isFullyRepaid = newOutstanding <= 0.001;
        run(`UPDATE loans SET total_principal_repaid = ?, outstanding_principal = ?, loan_status = ? WHERE id = ?`, [newRepaid, newOutstanding, isFullyRepaid ? 'সম্পূর্ণ পরিশোধিত' : 'সক্রিয়', loan.id]);
        if (loan.application_id) {
          run(`UPDATE applications SET status = ? WHERE id = ?`, [isFullyRepaid ? 'সম্পূর্ণ পরিশোধিত' : 'অর্থ বিতরণ হয়েছে', loan.application_id]);
        }
      }

      // 2. Update repayment row
      run(`
        UPDATE repayments
        SET amount = ?, repayment_date = ?, received_in_account_id = ?, payment_method = ?, notes = ?
        WHERE id = ?
      `, [newAmount, newDate, newAccountId, newMethod, newNotes, repId]);

      // 3. Update linked transaction
      run(`
        UPDATE transactions
        SET amount = ?, date = ?, account_id = ?
        WHERE (related_entity_type = 'repayments' AND related_entity_id = ?) OR reference_no = ?
      `, [newAmount, newDate, newAccountId, repId, existing.receipt_number]);
    });

    logAudit(req.body.user_id || 'admin', req.body.user_name || 'Admin', 'UPDATE', 'repayments', repId, `Updated repayment ৳${existing.amount} -> ৳${newAmount}`, req);
    res.json({ success: true, message: 'কিস্তি আদায় তথ্য সফলভাবে সংশোধন করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Scheduled Notifications API
app.get('/api/notifications', (req, res) => {
  try {
    const notifications = db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    const unreadCount = db.get('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0')?.c || 0;
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/:id/read', (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/run-check', (req, res) => {
  const result = checkRepaymentReminders();
  res.json(result);
});

// 12. Expenses
app.get('/api/expenses', (req, res) => {
  try {
    const expenses = db.query(
      `SELECT e.*, fa.name_bn as account_name
       FROM expenses e
       JOIN financial_accounts fa ON e.payment_account_id = fa.id
       ORDER BY e.date DESC`
    );
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, category, amount, payment_account_id, recipient_vendor, description, entered_by, approved_by } = req.body;
    if (!category || !amount || !payment_account_id || !recipient_vendor) {
      return res.status(400).json({ success: false, message: 'ব্যয়ের প্রয়োজনীয় তথ্য পূরণ করুন।' });
    }

    const expAmount = parseFloat(amount);
    const accId = parseInt(payment_account_id, 10);

    // Validate account balance
    const accOpen = db.get('SELECT opening_balance, name_bn FROM financial_accounts WHERE id = ?', [accId]);
    const accIn = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [accId])?.s || 0;
    const accOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [accId])?.s || 0;
    const currentBalance = (accOpen?.opening_balance || 0) + accIn - accOut;

    if (currentBalance < expAmount) {
      return res.status(400).json({
        success: false,
        message: `হিসাবটিতে (${accOpen?.name_bn}) পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${currentBalance}।`
      });
    }

    const expId = 'EXP-' + Date.now().toString().slice(-6);
    const voucherNo = 'VOUCH-' + Date.now().toString().slice(-6);
    const trxId = 'TRX-' + Date.now().toString().slice(-6);
    const expDate = date || getDhakaDateStr();

    db.transaction(({ run }) => {
      run(
        `INSERT INTO expenses (
          id, date, category, amount, payment_account_id, recipient_vendor,
          description, voucher_receipt_number, entered_by, approved_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'অনুমোদিত', datetime('now'))`,
        [
          expId, expDate, category, expAmount, accId, recipient_vendor,
          description || '', voucherNo, entered_by || 'হিসাবরক্ষক', approved_by || 'অনুমোদিত'
        ]
      );

      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'EXPENSE', ?, null, ?, 'OUT', 'expenses', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, expDate, accId, expAmount, expId, voucherNo,
          `ব্যয়: ${category} - ${recipient_vendor} (${description || ''})`,
          entered_by || 'হিসাবরক্ষক'
        ]
      );
    });

    logAudit(req.body.user_id, entered_by, 'CREATE', 'expenses', expId, `Recorded expense ৳${expAmount} for ${category}`, req);
    res.json({
      success: true,
      message: 'ব্যয় সফলভাবে লিপিবদ্ধ করা হয়েছে।',
      expenseId: expId,
      voucherNumber: voucherNo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single expense
app.get('/api/expenses/:id', (req, res) => {
  try {
    const exp = db.get(`
      SELECT e.*, fa.name_bn as account_name
      FROM expenses e
      LEFT JOIN financial_accounts fa ON e.payment_account_id = fa.id
      WHERE e.id = ?
    `, [req.params.id]);
    if (!exp) return res.status(404).json({ success: false, message: 'ব্যয়ের তথ্য পাওয়া যায়নি।' });
    res.json({ success: true, data: exp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Expense
app.put('/api/expenses/:id', (req, res) => {
  try {
    const expId = req.params.id;
    const existing = db.get('SELECT * FROM expenses WHERE id = ?', [expId]);
    if (!existing) return res.status(404).json({ success: false, message: 'ব্যয়ের তথ্য পাওয়া যায়নি।' });

    const b = req.body;
    const newAmount = b.amount !== undefined ? parseFloat(b.amount) : existing.amount;
    const newDate = b.date || existing.date;
    const newCategory = b.category || existing.category;
    const newAccountId = b.payment_account_id !== undefined ? parseInt(b.payment_account_id, 10) : existing.payment_account_id;
    const newRecipient = b.recipient_vendor || existing.recipient_vendor;
    const newDesc = b.description !== undefined ? b.description : existing.description;

    db.transaction(({ run }) => {
      run(`
        UPDATE expenses
        SET date = ?, category = ?, amount = ?, payment_account_id = ?,
            recipient_vendor = ?, description = ?
        WHERE id = ?
      `, [newDate, newCategory, newAmount, newAccountId, newRecipient, newDesc, expId]);

      // Update linked transaction
      run(`
        UPDATE transactions
        SET date = ?, account_id = ?, amount = ?,
            description_bn = ?
        WHERE (related_entity_type = 'expenses' AND related_entity_id = ?)
           OR (reference_no = ?)
      `, [
        newDate, newAccountId, newAmount,
        `ব্যয়: ${newCategory} - ${newRecipient} (${newDesc})`,
        expId, existing.voucher_receipt_number
      ]);
    });

    logAudit(b.user_id, b.user_name, 'UPDATE', 'expenses', expId, `Updated expense: ৳${existing.amount} -> ৳${newAmount} (${newCategory})`, req);
    res.json({ success: true, message: 'ব্যয়ের তথ্য ও ক্যাশবুক এন্ট্রি সফলভাবে সংশোধন করা হয়েছে।' });
  } catch (err) {
    console.error('[EXPENSE UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি মুছতে পারবেন।' });
    }

    const expId = req.params.id;
    const existing = db.get('SELECT * FROM expenses WHERE id = ?', [expId]);
    if (!existing) return res.status(404).json({ success: false, message: 'ব্যয়ের তথ্য পাওয়া যায়নি।' });

    db.transaction(({ run }) => {
      run(`
        DELETE FROM transactions
        WHERE (related_entity_type = 'expenses' AND related_entity_id = ?)
           OR (reference_no = ?)
      `, [expId, existing.voucher_receipt_number]);

      run('DELETE FROM expenses WHERE id = ?', [expId]);
    });

    logAudit(req.query.user_id || req.headers['x-user-id'] || 'admin', req.query.user_name || 'Admin', 'DELETE', 'expenses', expId, `Deleted expense: ${existing.voucher_receipt_number} (৳${existing.amount} - ${existing.category})`, req);
    res.json({ success: true, message: 'ব্যয়ের রেকর্ড এবং সংশ্লিষ্ট ক্যাশবুক এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('[EXPENSE DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================
// 12.1 Non-Repayable Welfare Grants & Humanitarian Relief Aid
// (এককালীন অনুদান, মানবিক সহায়তা, ঘর নির্মাণ, বাজার, চিকিৎসা ও দুর্যোগ ত্রাণ)
// =============================================================
app.get('/api/welfare-grants', (req, res) => {
  try {
    const { category, fund_id, q, start_date, end_date } = req.query;
    let sql = `
      SELECT wg.*, f.name_bn as fund_name, f.code as fund_code, fa.name_bn as account_name
      FROM welfare_grants wg
      JOIN funds f ON wg.fund_id = f.id
      JOIN financial_accounts fa ON wg.account_id = fa.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ' AND wg.category = ?';
      params.push(category);
    }
    if (fund_id) {
      sql += ' AND wg.fund_id = ?';
      params.push(parseInt(fund_id, 10));
    }
    if (start_date) {
      sql += ' AND wg.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND wg.date <= ?';
      params.push(end_date);
    }
    if (q) {
      sql += ' AND (wg.title_bn LIKE ? OR wg.beneficiary_name LIKE ? OR wg.beneficiary_address LIKE ? OR wg.voucher_no LIKE ? OR wg.id LIKE ?)';
      const p = `%${q}%`;
      params.push(p, p, p, p, p);
    }

    sql += ' ORDER BY wg.date DESC, wg.created_at DESC';

    const grants = db.query(sql, params);
    res.json({ success: true, data: grants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/welfare-grants/:id', (req, res) => {
  try {
    const grant = db.get(
      `SELECT wg.*, f.name_bn as fund_name, fa.name_bn as account_name
       FROM welfare_grants wg
       JOIN funds f ON wg.fund_id = f.id
       JOIN financial_accounts fa ON wg.account_id = fa.id
       WHERE wg.id = ?`,
      [req.params.id]
    );
    if (!grant) {
      return res.status(404).json({ success: false, message: 'ত্রাণ বা সহায়তার রেকর্ড পাওয়া যায়নি।' });
    }
    res.json({ success: true, data: grant });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new Welfare / Relief Grant
app.post('/api/welfare-grants', upload.single('photo'), (req, res) => {
  try {
    const b = req.body;
    if (!b.title_bn || !b.category || !b.beneficiary_name || !b.amount || !b.fund_id || !b.account_id) {
      return res.status(400).json({ success: false, message: 'প্রয়োজনীয় সকল তথ্য (শিরোনাম, খাত, সুবিধাভোগীর নাম, পরিমাণ, তহবিল ও পরিশোধ হিসাব) প্রদান করুন।' });
    }

    const aidAmount = parseFloat(b.amount);
    if (aidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'সঠিক সহায়তার পরিমাণ লিখুন।' });
    }

    const accId = parseInt(b.account_id, 10);
    const fundId = parseInt(b.fund_id, 10);

    // Validate account liquid balance
    const accOpen = db.get('SELECT opening_balance, name_bn FROM financial_accounts WHERE id = ?', [accId]);
    const accIn = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [accId])?.s || 0;
    const accOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [accId])?.s || 0;
    const currentBalance = (accOpen?.opening_balance || 0) + accIn - accOut;

    if (currentBalance < aidAmount) {
      return res.status(400).json({
        success: false,
        message: `হিসাবটিতে (${accOpen?.name_bn}) পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${currentBalance}।`
      });
    }

    const grantId = 'AID-' + Date.now().toString().slice(-6);
    const voucherNo = (b.voucher_no && b.voucher_no.trim()) ? b.voucher_no.trim() : ('VOUCH-AID-' + Date.now().toString().slice(-6));
    const trxId = 'TRX-' + Date.now().toString().slice(-6);
    const aidDate = b.date || getDhakaDateStr();
    const photoUrl = req.file ? '/uploads/welfare/' + req.file.filename : (b.photo_url || '');
    const beneficiaryCount = parseInt(b.beneficiary_count, 10) || 1;

    db.transaction(({ run }) => {
      // 1. Insert into welfare_grants
      run(
        `INSERT INTO welfare_grants (
          id, voucher_no, title_bn, category, beneficiary_name, beneficiary_mobile,
          beneficiary_nid, beneficiary_address, beneficiary_count, amount,
          fund_id, account_id, date, description, impact_notes, photo_url,
          approved_by, entered_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'সম্পন্ন', datetime('now'))`,
        [
          grantId, voucherNo, b.title_bn.trim(), b.category.trim(),
          b.beneficiary_name.trim(), b.beneficiary_mobile || '',
          b.beneficiary_nid || '', b.beneficiary_address || 'রৌমারী, কুড়িগ্রাম',
          beneficiaryCount, aidAmount, fundId, accId, aidDate,
          b.description || '', b.impact_notes || '', photoUrl,
          b.approved_by || 'উপদেষ্টা পরিষদ ও পরিচালনা কমিটি',
          b.entered_by || 'হিসাব শাখা'
        ]
      );

      // 2. Insert into transactions (direction: 'OUT')
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'WELFARE_GRANT', ?, ?, ?, 'OUT', 'welfare_grants', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          trxId, aidDate, accId, fundId, aidAmount, grantId, voucherNo,
          `এককালীন মানবিক সহায়তা ও ত্রাণ: ${b.title_bn.trim()} [${b.category}] - সুবিধাভোগী: ${b.beneficiary_name.trim()}`,
          b.entered_by || 'হিসাব শাখা'
        ]
      );
    });

    logAudit(b.user_id || 'admin', b.entered_by || 'Admin', 'CREATE', 'welfare_grants', grantId, `Disbursed welfare grant ৳${aidAmount} for ${b.title_bn} (${b.category}) to ${b.beneficiary_name}`, req);
    console.log(`[WELFARE GRANT] Recorded aid: ৳${aidAmount} for "${b.title_bn}" (Voucher: ${voucherNo})`);

    res.json({
      success: true,
      message: 'এককালীন ত্রাণ ও সহায়তা সফলভাবে সম্পন্ন এবং ক্যাশবুকে অন্তর্ভুক্ত হয়েছে।',
      id: grantId,
      voucher_no: voucherNo
    });
  } catch (err) {
    console.error('[WELFARE GRANT ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update an existing Welfare / Relief Grant
app.put('/api/welfare-grants/:id', upload.single('photo'), (req, res) => {
  try {
    const grantId = req.params.id;
    const existing = db.get('SELECT * FROM welfare_grants WHERE id = ?', [grantId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ত্রাণ বা সহায়তার রেকর্ড পাওয়া যায়নি।' });
    }

    const b = req.body;
    const aidAmount = b.amount ? parseFloat(b.amount) : existing.amount;
    const accId = b.account_id ? parseInt(b.account_id, 10) : existing.account_id;
    const fundId = b.fund_id ? parseInt(b.fund_id, 10) : existing.fund_id;
    const aidDate = b.date || existing.date;
    const voucherNo = (b.voucher_no && b.voucher_no.trim()) ? b.voucher_no.trim() : existing.voucher_no;
    const photoUrl = req.file ? '/uploads/welfare/' + req.file.filename : (b.photo_url || existing.photo_url);
    const beneficiaryCount = b.beneficiary_count ? parseInt(b.beneficiary_count, 10) : existing.beneficiary_count;

    db.transaction(({ run }) => {
      // 1. Update welfare_grants
      run(
        `UPDATE welfare_grants SET
          voucher_no = ?, title_bn = ?, category = ?, beneficiary_name = ?,
          beneficiary_mobile = ?, beneficiary_nid = ?, beneficiary_address = ?,
          beneficiary_count = ?, amount = ?, fund_id = ?, account_id = ?,
          date = ?, description = ?, impact_notes = ?, photo_url = ?,
          approved_by = ?
         WHERE id = ?`,
        [
          voucherNo, (b.title_bn || existing.title_bn).trim(),
          (b.category || existing.category).trim(),
          (b.beneficiary_name || existing.beneficiary_name).trim(),
          b.beneficiary_mobile !== undefined ? b.beneficiary_mobile : existing.beneficiary_mobile,
          b.beneficiary_nid !== undefined ? b.beneficiary_nid : existing.beneficiary_nid,
          (b.beneficiary_address || existing.beneficiary_address).trim(),
          beneficiaryCount, aidAmount, fundId, accId, aidDate,
          b.description !== undefined ? b.description : existing.description,
          b.impact_notes !== undefined ? b.impact_notes : existing.impact_notes,
          photoUrl,
          b.approved_by || existing.approved_by,
          grantId
        ]
      );

      // 2. Synchronize transactions ledger
      run(
        `UPDATE transactions SET
          date = ?, account_id = ?, fund_id = ?, amount = ?, reference_no = ?,
          description_bn = ?
         WHERE related_entity_type = 'welfare_grants' AND related_entity_id = ?`,
        [
          aidDate, accId, fundId, aidAmount, voucherNo,
          `এককালীন মানবিক সহায়তা ও ত্রাণ: ${(b.title_bn || existing.title_bn).trim()} [${(b.category || existing.category).trim()}] - সুবিধাভোগী: ${(b.beneficiary_name || existing.beneficiary_name).trim()}`,
          grantId
        ]
      );
    });

    logAudit(b.user_id || 'admin', b.user_name || 'Admin', 'UPDATE', 'welfare_grants', grantId, `Updated welfare grant: ${existing.title_bn}`, req);
    res.json({ success: true, message: 'তথ্য সফলভাবে হালনাগাদ করা হয়েছে।' });
  } catch (err) {
    console.error('[WELFARE UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Welfare / Relief Grant (Super Admin only)
app.delete('/api/welfare-grants/:id', (req, res) => {
  try {
    if (!isSuperAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'ত্রাণ বা অনুদান রেকর্ড মুছে ফেলার অনুমতি কেবল সুপার এডমিনের রয়েছে।' });
    }

    const grantId = req.params.id;
    const existing = db.get('SELECT * FROM welfare_grants WHERE id = ?', [grantId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'রেকর্ড পাওয়া যায়নি।' });
    }

    db.transaction(({ run }) => {
      // 1. Delete linked transaction ledger row
      run(`DELETE FROM transactions WHERE related_entity_type = 'welfare_grants' AND related_entity_id = ?`, [grantId]);
      // 2. Delete grant
      run('DELETE FROM welfare_grants WHERE id = ?', [grantId]);
    });

    logAudit(req.query.user_id || 'admin', req.query.user_name || 'Super Admin', 'DELETE', 'welfare_grants', grantId, `Deleted welfare grant: ${existing.title_bn} (৳${existing.amount})`, req);
    res.json({ success: true, message: 'রেকর্ড ও সংশ্লিষ্ট আর্থিক লেনদেন সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('[WELFARE DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Welfare Summary & Transparency
app.get('/api/public/welfare-summary', (req, res) => {
  try {
    const totalAidSpent = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants')?.s || 0;
    const totalBeneficiaries = db.get('SELECT COALESCE(SUM(beneficiary_count), 0) as s FROM welfare_grants')?.s || 0;
    const totalActivities = db.get('SELECT COUNT(*) as c FROM welfare_grants')?.c || 0;

    const categoryBreakdown = db.query(`
      SELECT category, COUNT(*) as count, COALESCE(SUM(beneficiary_count), 0) as beneficiaries, COALESCE(SUM(amount), 0) as total_amount
      FROM welfare_grants
      GROUP BY category
      ORDER BY total_amount DESC
    `);

    const recentGrants = db.query(`
      SELECT wg.id, wg.voucher_no, wg.title_bn, wg.category, wg.beneficiary_name,
             wg.beneficiary_address, wg.beneficiary_count, wg.amount, wg.date,
             wg.description, wg.impact_notes, wg.photo_url, f.name_bn as fund_name
      FROM welfare_grants wg
      JOIN funds f ON wg.fund_id = f.id
      ORDER BY wg.date DESC, wg.created_at DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: {
        totalAidSpent,
        totalBeneficiaries,
        totalActivities,
        categoryBreakdown,
        recentGrants
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Inter-Account Transfers
app.post('/api/transfers', (req, res) => {
  try {
    const { from_account_id, to_account_id, amount, date, reference, notes, recorded_by } = req.body;
    const fromId = parseInt(from_account_id, 10);
    const toId = parseInt(to_account_id, 10);
    const trfAmount = parseFloat(amount);

    if (fromId === toId) {
      return res.status(400).json({ success: false, message: 'একই হিসাবের মধ্যে স্থানান্তর সম্ভব নয়।' });
    }
    if (trfAmount <= 0) {
      return res.status(400).json({ success: false, message: 'সঠিক স্থানান্তরের পরিমাণ লিখুন।' });
    }

    // Check from balance
    const accOpen = db.get('SELECT opening_balance, name_bn FROM financial_accounts WHERE id = ?', [fromId]);
    const accIn = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [fromId])?.s || 0;
    const accOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [fromId])?.s || 0;
    const fromBalance = (accOpen?.opening_balance || 0) + accIn - accOut;

    if (fromBalance < trfAmount) {
      return res.status(400).json({
        success: false,
        message: `উৎস হিসাবে (${accOpen?.name_bn}) পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${fromBalance}।`
      });
    }

    const trfId = 'TRF-' + Date.now().toString().slice(-6);
    const trDate = date || getDhakaDateStr();
    const toAcc = db.get('SELECT name_bn FROM financial_accounts WHERE id = ?', [toId]);

    db.transaction(({ run }) => {
      run(
        `INSERT INTO account_transfers (
          id, from_account_id, to_account_id, amount, date, reference, notes, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [trfId, fromId, toId, trfAmount, trDate, reference || '', notes || '', recorded_by || 'হিসাব শাখা']
      );

      // Debit Out from Source
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'TRANSFER_OUT', ?, null, ?, 'OUT', 'transfers', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          'TRX-OUT-' + Date.now().toString().slice(-6), trDate, fromId, trfAmount, trfId, reference || '',
          `হিসাব স্থানান্তর (প্রেরণ): ${toAcc.name_bn}-এ প্রেরণ`,
          recorded_by || 'হিসাব শাখা'
        ]
      );

      // Credit In to Destination
      run(
        `INSERT INTO transactions (
          id, date, type, account_id, fund_id, amount, direction,
          related_entity_type, related_entity_id, reference_no, description_bn,
          recorded_by, status, created_at
        ) VALUES (?, ?, 'TRANSFER_IN', ?, null, ?, 'IN', 'transfers', ?, ?, ?, ?, 'verified', datetime('now'))`,
        [
          'TRX-IN-' + Date.now().toString().slice(-6), trDate, toId, trfAmount, trfId, reference || '',
          `হিসাব স্থানান্তর (গ্রহণ): ${accOpen.name_bn} হতে গ্রহণ`,
          recorded_by || 'হিসাব শাখা'
        ]
      );
    });

    logAudit(req.body.user_id, recorded_by, 'CREATE', 'transfers', trfId, `Transferred ৳${trfAmount} from ${accOpen.name_bn} to ${toAcc.name_bn}`, req);
    res.json({ success: true, message: 'হিসাব স্থানান্তর সফলভাবে সম্পন্ন হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Accounts & Funds List with Live Balances
app.get('/api/accounts', (req, res) => {
  try {
    const accounts = db.query('SELECT * FROM financial_accounts WHERE is_active = 1');
    for (const acc of accounts) {
      const inSum = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [acc.id])?.s || 0;
      const outSum = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [acc.id])?.s || 0;
      acc.current_balance = acc.opening_balance + inSum - outSum;
    }
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/funds', (req, res) => {
  try {
    const funds = db.query('SELECT * FROM funds ORDER BY id ASC');
    for (const fund of funds) {
      const donationIn = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = ? AND status = "নিশ্চিত"', [fund.id])?.s || 0;
      const loanDisb = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans WHERE fund_id = ?', [fund.id])?.s || 0;
      const loanRepaid = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans WHERE fund_id = ?', [fund.id])?.s || 0;
      const welfareOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants WHERE fund_id = ?', [fund.id])?.s || 0;
      fund.total_donations = donationIn;
      fund.total_disbursed = loanDisb;
      fund.total_repaid = loanRepaid;
      fund.total_welfare = welfareOut;
      fund.outstanding_loans = loanDisb - loanRepaid;
      // For revolving loan fund (Sector 1): balance = opening + donations - loanDisb + loanRepaid
      // For emergency relief fund (Sector 2): balance = opening + donations - welfareOut
      if (fund.id === 1 || fund.code === 'KARJE_HASENA') {
        fund.current_balance = fund.opening_balance + donationIn - loanDisb + loanRepaid;
        fund.is_refundable = true;
      } else {
        fund.current_balance = fund.opening_balance + donationIn - welfareOut;
        fund.is_refundable = false;
      }
    }
    res.json({ success: true, data: funds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================
// Unified Transactions Ledger (Cashbook) Operations
// =============================================================

// Get single transaction with linked entity
app.get('/api/transactions/:id', (req, res) => {
  try {
    const trx = db.get(`
      SELECT t.*, fa.name_bn as account_name, f.name_bn as fund_name
      FROM transactions t
      LEFT JOIN financial_accounts fa ON t.account_id = fa.id
      LEFT JOIN funds f ON t.fund_id = f.id
      WHERE t.id = ?
    `, [req.params.id]);
    if (!trx) return res.status(404).json({ success: false, message: 'লেনদেন খুঁজে পাওয়া যায়নি।' });

    let linkedData = null;
    if (trx.related_entity_type === 'donations' && trx.related_entity_id) {
      linkedData = db.get('SELECT * FROM donations WHERE id = ?', [trx.related_entity_id]);
    } else if (trx.related_entity_type === 'expenses' && trx.related_entity_id) {
      linkedData = db.get('SELECT * FROM expenses WHERE id = ?', [trx.related_entity_id]);
    } else if (trx.related_entity_type === 'welfare_grants' && trx.related_entity_id) {
      linkedData = db.get('SELECT * FROM welfare_grants WHERE id = ?', [trx.related_entity_id]);
    } else if (trx.reference_no && trx.reference_no.startsWith('REC-DON-')) {
      linkedData = db.get('SELECT * FROM donations WHERE receipt_number = ?', [trx.reference_no]);
    } else if (trx.reference_no && trx.reference_no.startsWith('VOUCH-')) {
      linkedData = db.get('SELECT * FROM expenses WHERE voucher_receipt_number = ?', [trx.reference_no]);
    }

    res.json({ success: true, data: { ...trx, linkedData } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Transaction (Direct cashbook edit)
app.put('/api/transactions/:id', (req, res) => {
  try {
    const trxId = req.params.id;
    const existing = db.get('SELECT * FROM transactions WHERE id = ?', [trxId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'লেনদেন খুঁজে পাওয়া যায়নি।' });
    }

    const b = req.body;
    const newAmount = b.amount !== undefined ? parseFloat(b.amount) : existing.amount;
    const newDate = b.date || existing.date;
    const newAccountId = b.account_id !== undefined ? parseInt(b.account_id, 10) : existing.account_id;
    const newFundId = b.fund_id ? parseInt(b.fund_id, 10) : existing.fund_id;
    const newDesc = b.description_bn || existing.description_bn;

    db.transaction(({ run }) => {
      run(`
        UPDATE transactions
        SET date = ?, account_id = ?, fund_id = ?, amount = ?, description_bn = ?
        WHERE id = ?
      `, [newDate, newAccountId, newFundId, newAmount, newDesc, trxId]);

      // Cascade update to linked donation
      if (existing.related_entity_type === 'donations' && existing.related_entity_id) {
        run(`
          UPDATE donations
          SET date = ?, amount = ?, fund_id = ?, financial_account_id = ?
          WHERE id = ?
        `, [newDate, newAmount, newFundId, newAccountId, existing.related_entity_id]);
      } else if (existing.reference_no && existing.reference_no.startsWith('REC-DON-')) {
        run(`
          UPDATE donations
          SET date = ?, amount = ?, fund_id = ?, financial_account_id = ?
          WHERE receipt_number = ?
        `, [newDate, newAmount, newFundId, newAccountId, existing.reference_no]);
      }
      // Cascade update to linked expense
      else if (existing.related_entity_type === 'expenses' && existing.related_entity_id) {
        run(`
          UPDATE expenses
          SET date = ?, amount = ?, payment_account_id = ?, description = ?
          WHERE id = ?
        `, [newDate, newAmount, newAccountId, newDesc, existing.related_entity_id]);
      } else if (existing.reference_no && existing.reference_no.startsWith('VOUCH-')) {
        run(`
          UPDATE expenses
          SET date = ?, amount = ?, payment_account_id = ?, description = ?
          WHERE voucher_receipt_number = ?
        `, [newDate, newAmount, newAccountId, newDesc, existing.reference_no]);
      }
      // Cascade update to linked repayment
      else if (existing.related_entity_type === 'repayments' && existing.related_entity_id) {
        const rep = db.get('SELECT * FROM repayments WHERE id = ?', [existing.related_entity_id]);
        if (rep) {
          const loan = db.get('SELECT * FROM loans WHERE id = ?', [rep.loan_id]);
          if (loan) {
            const diff = newAmount - rep.amount;
            const newRepaid = Math.max(0, loan.total_principal_repaid + diff);
            const newOut = Math.max(0, loan.original_principal - newRepaid);
            run(`UPDATE loans SET total_principal_repaid = ?, outstanding_principal = ? WHERE id = ?`, [newRepaid, newOut, loan.id]);
          }
          run(`UPDATE repayments SET amount = ?, repayment_date = ?, received_in_account_id = ? WHERE id = ?`, [newAmount, newDate, newAccountId, rep.id]);
        }
      }
    });

    logAudit(b.user_id, b.user_name, 'UPDATE', 'transactions', trxId, `Updated transaction ৳${existing.amount} -> ৳${newAmount}`, req);
    res.json({ success: true, message: 'লেনদেন সফলভাবে সংশোধন করা হয়েছে।' });
  } catch (err) {
    console.error('[TRANSACTION UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Transaction (Cascades to linked records)
app.delete('/api/transactions/:id', (req, res) => {
  try {
    const trxId = req.params.id;
    const existing = db.get('SELECT * FROM transactions WHERE id = ?', [trxId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'লেনদেন খুঁজে পাওয়া যায়নি।' });
    }

    db.transaction(({ run }) => {
      // 1. If linked to donation, delete the donation record
      if (existing.related_entity_type === 'donations' && existing.related_entity_id) {
        const don = db.get('SELECT transaction_reference FROM donations WHERE id = ?', [existing.related_entity_id]);
        if (don && don.transaction_reference) {
          run(`UPDATE payment_submissions SET verification_status = 'অপেক্ষমাণ', associated_donation_id = NULL WHERE transaction_id = ?`, [don.transaction_reference]);
        }
        run('DELETE FROM donations WHERE id = ?', [existing.related_entity_id]);
      } else if (existing.reference_no && existing.reference_no.startsWith('REC-DON-')) {
        const don = db.get('SELECT transaction_reference FROM donations WHERE receipt_number = ?', [existing.reference_no]);
        if (don && don.transaction_reference) {
          run(`UPDATE payment_submissions SET verification_status = 'অপেক্ষমাণ', associated_donation_id = NULL WHERE transaction_id = ?`, [don.transaction_reference]);
        }
        run('DELETE FROM donations WHERE receipt_number = ?', [existing.reference_no]);
      }

      // 2. If linked to expense, delete expense record
      if (existing.related_entity_type === 'expenses' && existing.related_entity_id) {
        run('DELETE FROM expenses WHERE id = ?', [existing.related_entity_id]);
      } else if (existing.reference_no && existing.reference_no.startsWith('VOUCH-')) {
        run('DELETE FROM expenses WHERE voucher_receipt_number = ?', [existing.reference_no]);
      }

      // 3. If linked to welfare_grants, delete welfare grant
      if (existing.related_entity_type === 'welfare_grants' && existing.related_entity_id) {
        run('DELETE FROM welfare_grants WHERE id = ?', [existing.related_entity_id]);
      }

      // 4. If linked to repayment, reverse loan balance and delete repayment
      if (existing.related_entity_type === 'repayments' && existing.related_entity_id) {
        const rep = db.get('SELECT * FROM repayments WHERE id = ?', [existing.related_entity_id]);
        if (rep) {
          const loan = db.get('SELECT * FROM loans WHERE id = ?', [rep.loan_id]);
          if (loan) {
            const newRepaid = Math.max(0, loan.total_principal_repaid - rep.amount);
            const newOutstanding = Math.max(0, loan.original_principal - newRepaid);
            run(`UPDATE loans SET total_principal_repaid = ?, outstanding_principal = ?, loan_status = 'সক্রিয়' WHERE id = ?`, [newRepaid, newOutstanding, loan.id]);
          }
        }
        run('DELETE FROM repayments WHERE id = ?', [existing.related_entity_id]);
      } else if (existing.reference_no && existing.reference_no.startsWith('REC-REP-')) {
        const rep = db.get('SELECT * FROM repayments WHERE receipt_number = ?', [existing.reference_no]);
        if (rep) {
          const loan = db.get('SELECT * FROM loans WHERE id = ?', [rep.loan_id]);
          if (loan) {
            const newRepaid = Math.max(0, loan.total_principal_repaid - rep.amount);
            const newOutstanding = Math.max(0, loan.original_principal - newRepaid);
            run(`UPDATE loans SET total_principal_repaid = ?, outstanding_principal = ?, loan_status = 'সক্রিয়' WHERE id = ?`, [newRepaid, newOutstanding, loan.id]);
          }
        }
        run('DELETE FROM repayments WHERE receipt_number = ?', [existing.reference_no]);
      }

      // 5. If linked to loan disbursement, delete loan and revert application
      if (existing.related_entity_type === 'loans' && existing.related_entity_id) {
        const loan = db.get('SELECT * FROM loans WHERE id = ?', [existing.related_entity_id]);
        if (loan && loan.application_id) {
          run(`UPDATE applications SET status = 'অনুমোদিত' WHERE id = ?`, [loan.application_id]);
        }
        run('DELETE FROM repayments WHERE loan_id = ?', [existing.related_entity_id]);
        run('DELETE FROM loans WHERE id = ?', [existing.related_entity_id]);
      }

      // 6. Delete transaction row itself
      run('DELETE FROM transactions WHERE id = ?', [trxId]);
    });

    logAudit(req.query.user_id || req.headers['x-user-id'] || 'admin', req.query.user_name || 'Admin', 'DELETE', 'transactions', trxId, `Deleted transaction ${trxId} (৳${existing.amount} - ${existing.description_bn})`, req);
    res.json({ success: true, message: 'লেনদেন এবং সংশ্লিষ্ট সকল রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('[TRANSACTION DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Financial Reports & Reconciled Balance Sheet
app.get('/api/reports/cashbook', (req, res) => {
  try {
    const { start_date, end_date, account_id } = req.query;
    let sql = `
      SELECT t.*, fa.name_bn as account_name
      FROM transactions t
      JOIN financial_accounts fa ON t.account_id = fa.id
      WHERE t.status = 'verified'
    `;
    const params = [];
    if (start_date) {
      sql += ' AND t.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND t.date <= ?';
      params.push(end_date);
    }
    if (account_id) {
      sql += ' AND t.account_id = ?';
      params.push(parseInt(account_id, 10));
    }
    sql += ' ORDER BY t.date ASC, t.created_at ASC';

    const transactions = db.query(sql, params);

    // Calculate totals
    const totalReceipts = transactions.filter(t => t.direction === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const totalPayments = transactions.filter(t => t.direction === 'OUT').reduce((acc, t) => acc + t.amount, 0);

    res.json({
      success: true,
      data: {
        transactions,
        totalReceipts,
        totalPayments,
        netCashFlow: totalReceipts - totalPayments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/income-expenditure', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let donSql = 'SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE status = "নিশ্চিত"';
    let expSql = 'SELECT category, COALESCE(SUM(amount), 0) as s FROM expenses WHERE status = "অনুমোদিত"';
    let welSql = 'SELECT category, COALESCE(SUM(amount), 0) as s FROM welfare_grants WHERE 1=1';
    const params = [];
    const expParams = [];
    const welParams = [];

    if (start_date && end_date) {
      donSql += ' AND date >= ? AND date <= ?';
      params.push(start_date, end_date);
      expSql += ' AND date >= ? AND date <= ?';
      expParams.push(start_date, end_date);
      welSql += ' AND date >= ? AND date <= ?';
      welParams.push(start_date, end_date);
    }
    expSql += ' GROUP BY category';
    welSql += ' GROUP BY category';

    const totalDonationIncome = db.get(donSql, params)?.s || 0;
    const expenseBreakdown = db.query(expSql, expParams);
    const welfareBreakdown = db.query(welSql, welParams);
    const totalExpenses = expenseBreakdown.reduce((sum, e) => sum + e.s, 0);
    const totalWelfareAid = welfareBreakdown.reduce((sum, w) => sum + w.s, 0);

    const totalAllExpenditure = totalExpenses + totalWelfareAid;
    const surplus = totalDonationIncome - totalAllExpenditure;

    res.json({
      success: true,
      data: {
        income: {
          donations: totalDonationIncome,
          total: totalDonationIncome
        },
        expenses: {
          breakdown: expenseBreakdown,
          total: totalExpenses
        },
        welfareAid: {
          breakdown: welfareBreakdown,
          total: totalWelfareAid
        },
        totalExpenditure: totalAllExpenditure,
        netSurplus: surplus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/balance-sheet', (req, res) => {
  try {
    // 1. Assets
    // Liquid Assets
    const accounts = db.query('SELECT * FROM financial_accounts WHERE is_active = 1');
    let totalCashAndBank = 0;
    const accountBalances = accounts.map(acc => {
      const inSum = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "IN" AND status = "verified"', [acc.id])?.s || 0;
      const outSum = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE account_id = ? AND direction = "OUT" AND status = "verified"', [acc.id])?.s || 0;
      const bal = acc.opening_balance + inSum - outSum;
      totalCashAndBank += bal;
      return { id: acc.id, name_bn: acc.name_bn, type: acc.account_type, balance: bal };
    });

    // Loan Receivables (Outstanding Principal)
    const totalDisbursed = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans')?.s || 0;
    const totalRepaid = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans')?.s || 0;
    const loanReceivables = totalDisbursed - totalRepaid;

    const totalAssets = totalCashAndBank + loanReceivables;

    // 2. Liabilities (e.g. 0 unless payables tracked)
    const totalLiabilities = 0;

    // 3. Funds & Net Assets / Equity
    const funds = db.query('SELECT * FROM funds');
    let totalFundsBalance = 0;
    const fundBalances = funds.map(f => {
      const don = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM donations WHERE fund_id = ? AND status = "নিশ্চিত"', [f.id])?.s || 0;
      const disb = db.get('SELECT COALESCE(SUM(original_principal), 0) as s FROM loans WHERE fund_id = ?', [f.id])?.s || 0;
      const rep = db.get('SELECT COALESCE(SUM(total_principal_repaid), 0) as s FROM loans WHERE fund_id = ?', [f.id])?.s || 0;
      const welfareOut = db.get('SELECT COALESCE(SUM(amount), 0) as s FROM welfare_grants WHERE fund_id = ?', [f.id])?.s || 0;
      const bal = f.opening_balance + don - disb + rep - welfareOut;
      totalFundsBalance += bal;
      return { id: f.id, name_bn: f.name_bn, code: f.code, is_restricted: f.is_restricted, balance: bal };
    });

    // Retained Operating Surplus
    const retainedOperatingSurplus = totalAssets - totalLiabilities - totalFundsBalance;

    res.json({
      success: true,
      data: {
        date: getDhakaDateStr(),
        assets: {
          liquidCashAndBank: totalCashAndBank,
          accountBreakdown: accountBalances,
          loanReceivables, // Outstanding interest-free loans to be returned
          totalAssets
        },
        liabilities: {
          payables: totalLiabilities,
          totalLiabilities
        },
        equityAndFunds: {
          fundsBreakdown: fundBalances,
          totalFundsBalance,
          retainedSurplus: retainedOperatingSurplus,
          totalEquity: totalFundsBalance + retainedOperatingSurplus
        },
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalFundsBalance + retainedOperatingSurplus)) < 0.01
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Audit Logs
app.get('/api/audit-logs', (req, res) => {
  try {
    const logs = db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'এপিআই এন্ডপয়েন্ট পাওয়া যায়নি (API route not found)' });
});

// Fallback to index.html for SPA frontend routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
db.getDb().then(() => {
  const localIp = getLocalIpAddress();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  কর্জে হাসানা ফাউন্ডেশন, রৌমারী, কুড়িগ্রাম`);
    console.log(`  Karje Hasana Foundation Server running on port ${PORT}`);
    console.log(`  • ল্যাপটপ থেকে ব্রাউজারে: http://localhost:${PORT}`);
    console.log(`  • মোবাইল থেকে (একই ওয়াইফাইয়ে): http://${localIp}:${PORT}`);
    console.log(`=======================================================`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
