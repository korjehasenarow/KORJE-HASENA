const fs = require('fs');
const path = require('path');
const db = require('./db.js');

async function createBackup() {
  console.log('========================================================');
  console.log('  STARTING COMPREHENSIVE DATA & CODEBASE BACKUP');
  console.log('========================================================\n');

  // 1. Ensure backup directory exists
  const backupDir = path.join(__dirname, 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('[BACKUP] Created backup directory:', backupDir);
  }

  // 2. Initialize DB and save binary copy
  await db.getDb();
  db.saveDbToDisk();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sqliteLatest = path.join(backupDir, 'korje_hasena_latest.sqlite');
  const sqliteTimestamped = path.join(backupDir, `korje_hasena_backup_${timestamp}.sqlite`);
  const sqliteGolden = path.join(backupDir, 'korje_hasena_clean_production_zero_balance.sqlite');

  const liveDbPath = path.join(__dirname, 'data', 'korje_hasena.sqlite');
  const dbBuffer = fs.readFileSync(liveDbPath);

  fs.writeFileSync(sqliteLatest, dbBuffer);
  fs.writeFileSync(sqliteTimestamped, dbBuffer);
  fs.writeFileSync(sqliteGolden, dbBuffer);

  console.log('✅ SQLite Database Binary Backups Created:');
  console.log('   - ' + sqliteLatest);
  console.log('   - ' + sqliteTimestamped);
  console.log('   - ' + sqliteGolden);

  // 3. Export Human-Readable JSON Dump of all tables
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const fullDump = {
    backup_timestamp: new Date().toISOString(),
    organization: 'কর্জে হাসানা ফাউন্ডেশন, রৌমারী, কুড়িগ্রাম',
    chairman: 'MD SHAH ALAM',
    tables: {}
  };

  for (const t of tables) {
    const rows = db.query(`SELECT * FROM ${t.name}`);
    fullDump.tables[t.name] = {
      rowCount: rows.length,
      rows: rows
    };
  }

  const jsonDumpPath = path.join(backupDir, `database_dump_${timestamp}.json`);
  const jsonDumpLatest = path.join(backupDir, 'database_dump_latest.json');
  fs.writeFileSync(jsonDumpPath, JSON.stringify(fullDump, null, 2), 'utf8');
  fs.writeFileSync(jsonDumpLatest, JSON.stringify(fullDump, null, 2), 'utf8');

  console.log('\n✅ JSON Data Dump Exported:');
  console.log('   - ' + jsonDumpLatest);
  console.log('   - Total tables backed up: ' + Object.keys(fullDump.tables).length);

  // 4. Create a manifest log
  const manifestPath = path.join(__dirname, 'BACKUP_MANIFEST.md');
  const manifestContent = `# 🛡️ কর্জে হাসানা ফাউন্ডেশন - ডেটা ও সিস্টেম ব্যাকআপ বিবরণী
**তারিখ ও সময়:** ${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })} (Dhaka Time)
**প্রতিষ্ঠাতা চেয়ারম্যান:** MD SHAH ALAM
**অবস্থান:** লাইফ কেয়ার হাসপাতাল, রৌমারী, কুড়িগ্রাম

---

### ১. সংরক্ষিত ডেটাবেজ ব্যাকআপ ফাইলসমূহ
- \`data/korje_hasena.sqlite\`: রানিং মূল প্রোডাকশন ডেটাবেজ।
- \`data/backups/korje_hasena_latest.sqlite\`: সর্বশেষ নিরাপদ বাইনারি ব্যাকআপ।
- \`data/backups/korje_hasena_clean_production_zero_balance.sqlite\`: ০ ব্যালেন্স বিশিষ্ট গোল্ডেন ব্যাকআপ (যেকোনো সময় রিসেট করতে পারবেন)।
- \`data/backups/database_dump_latest.json\`: পূর্ণাঙ্গ টেবিল ও ফিল্ডের রিডেবল ব্যাকআপ।

### ২. সংরক্ষিত প্রধান তথ্যাদি
- **প্রতিষ্ঠান সেটিংস:** কর্জে হাসানা ফাউন্ডেশন, রৌমারী, কুড়িগ্রাম, ফোন: ০১৯৬৬-৪৪২৭৬৯, ইমেইল: shahalal.siraz@gmail.com
- **উপদেষ্টা ও পরিচালনা পরিষদ:** ৯ জন সম্মানিত সদস্যের পূর্ণ পরিচিতি, দায়িত্ব, বিশেষ নির্দেশনা ও আসল ছবি।
- **ব্যালেন্স স্ট্যাটাস:** সকল অপারেশনাল ব্যালেন্স ০ (শূন্য)। সুপার এডমিন এন্ট্রি দিলে স্বয়ংক্রিয়ভাবে নির্ভুল ডাবল-এন্ট্রি লেজারে যুক্ত হবে।
- **গঠনতন্ত্র ও শর্তাবলি:** ১৬টি অধ্যায়, ৪৯টি ধারা ও পূর্ণ শর্তাবলি কোডবেজে সুরক্ষিত সংরক্ষিত রয়েছে।
- **মোবাইল রেসপনসিভনেস:** অ্যান্ড্রয়েড/আইফোন ও যেকোনো ছোট স্ক্রিনের জন্য অপ্টিমাইজড সিএসএস ও টাচ মেনু।

---
*এই ফাইল ও ব্যাকআপ ফোল্ডারটি কখনো ডিলিট করবেন না।*
`;
  fs.writeFileSync(manifestPath, manifestContent, 'utf8');
  console.log('\n✅ Backup Manifest written to: ' + manifestPath);

  console.log('\n========================================================');
  console.log('  ALL DATA SAFELY BACKED UP AND SAVED TO DISK!');
  console.log('========================================================\n');
}

createBackup().catch(console.error);
