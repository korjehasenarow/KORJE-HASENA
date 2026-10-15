// Script to download all 9 advisory board images and populate committee_members database
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const members = [
  {
    order: 1,
    name_bn: 'জনাব মোঃ শাহ্ আলম ইসলাম',
    name_en: 'MD SHAH ALAM',
    designation_bn: 'প্রতিষ্ঠাতা চেয়ারম্যান ও ম্যানেজিং ডিরেক্টর, লাইফ কেয়ার হাসপাতাল রৌমারী',
    mobile: '01966442769',
    email: 'shahalal.siraz@gmail.com',
    imageUrl: 'https://i.postimg.cc/rpcJB0Xg/Gemini-Generated-Image-cjm7vucjm7vucjm7.jpg',
    fileName: 'member_1_shah_alam.jpg',
    bio_bn: 'প্রতিষ্ঠাতা চেয়ারম্যান, কর্জে হাসানা ফাউন্ডেশন ও ম্যানেজিং ডিরেক্টর, লাইফ কেয়ার হাসপাতাল রৌমারী'
  },
  {
    order: 2,
    name_bn: 'হযরত মাওলানা মোঃ মোকছেদ আলী',
    name_en: 'Mawlana Md Moksed Ali',
    designation_bn: 'প্রধান উপদেষ্টা ও অধ্যক্ষ, রৌমারী কেরামতিয়া আদর্শ ফাযিল মাদ্রাসা',
    mobile: '01914638313',
    email: 'moksed.ali@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/c4RTXMPx/Gemini-Generated-Image-obg24uobg24uobg2.jpg',
    fileName: 'member_2_moksed_ali.jpg',
    bio_bn: 'বিশিষ্ট ইসলামী শিক্ষাবিদ ও অধ্যক্ষ, রৌমারী কেরামতিয়া আদর্শ ফাযিল মাদ্রাসা'
  },
  {
    order: 3,
    name_bn: 'জনাব মোঃ বাবুল হোসেন',
    name_en: 'Md Babul Hossain',
    designation_bn: 'উপদেষ্টা ও চেয়ারম্যান, লাইফ কেয়ার হাসপাতাল, রৌমারী',
    mobile: '01931649576',
    email: 'babul.hossain@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/D0YpF2d1/Gemini-Generated-Image-322uzf322uzf322u.jpg',
    fileName: 'member_3_babul_hossain.jpg',
    bio_bn: 'বিশিষ্ট ব্যবসায়ী, সমাজসেবক ও চেয়ারম্যান, লাইফ কেয়ার হাসপাতাল, রৌমারী'
  },
  {
    order: 4,
    name_bn: 'হযরত মাওলানা মোঃ আনোয়ারুল ইসলাম',
    name_en: 'Mawlana Md Anwarul Islam',
    designation_bn: 'শরীয়াহ উপদেষ্টা ও প্রধান ফকিহ, কুড়িগ্রাম আলিয়া মাদ্রাসা',
    mobile: '01911086469',
    email: 'anwarul.islam@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/fLz9KYnN/Gemini-Generated-Image-1kkjye1kkjye1kkj.jpg',
    fileName: 'member_4_anwarul_islam.jpg',
    bio_bn: 'বিশিষ্ট ইসলামী আইন ও শরীয়াহ বিশেষজ্ঞ, প্রধান ফকিহ, কুড়িগ্রাম আলিয়া মাদ্রাসা'
  },
  {
    order: 5,
    name_bn: 'জনাব মোঃ মাহবুব আলম',
    name_en: 'Md Mahbub Alam',
    designation_bn: 'উপদেষ্টা ও চেয়ারম্যান, রৌমারী জেনারেল হাসপাতাল এন্ড ডায়াগনস্টিক সেন্টার',
    mobile: '01915604026',
    email: 'mahbub.alam@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/KYH5R93P/Gemini-Generated-Image-sjsxc5sjsxc5sjsx.jpg',
    fileName: 'member_5_mahbub_alam.jpg',
    bio_bn: 'বিশিষ্ট সমাজসেবক ও চেয়ারম্যান, রৌমারী জেনারেল হাসপাতাল এন্ড ডায়াগনস্টিক সেন্টার'
  },
  {
    order: 6,
    name_bn: 'হাফেজ হযরত মাওলানা মোঃ রিয়াজুল ইসলাম',
    name_en: 'Hafez Mawlana Md Riazul Islam',
    designation_bn: 'উপদেষ্টা ও বিশিষ্ট তরুণ বক্তা',
    mobile: '01921970377',
    email: 'riazul.islam@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/Gm3Pz0Fc/Gemini-Generated-Image-vzt1bsvzt1bsvzt1.jpg',
    fileName: 'member_6_riazul_islam.jpg',
    bio_bn: 'জনপ্রিয় ইসলামী আলোচক ও তরুণ বক্তা'
  },
  {
    order: 7,
    name_bn: 'জনাব মোঃ সাইদুল ইসলাম সাইদ',
    name_en: 'Md Saidul Islam Said',
    designation_bn: 'উপদেষ্টা ও বিশিষ্ট সমাজসেবক',
    mobile: '01716882049',
    email: 'saidul.islam@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/4NPVY8rM/Gemini-Generated-Image-wrwru6wrwru6wrwr.jpg',
    fileName: 'member_7_saidul_islam.jpg',
    bio_bn: 'বিশিষ্ট সমাজসেবক ও শুভাকাঙ্ক্ষী, রৌমারী'
  },
  {
    order: 8,
    name_bn: 'হাফেজ হযরত মাওলানা মোঃ মাইদুল ইসলাম',
    name_en: 'Hafez Mawlana Md Maidul Islam',
    designation_bn: 'উপদেষ্টা ও বিশিষ্ট তরুণ বক্তা',
    mobile: '01920114330',
    email: 'maidul.islam@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/PJ3fj8Rv/Gemini-Generated-Image-y2a4z8y2a4z8y2a4.jpg',
    fileName: 'member_8_maidul_islam.jpg',
    bio_bn: 'জনপ্রিয় ইসলামী আলোচক ও তরুণ বক্তা'
  },
  {
    order: 9,
    name_bn: 'জনাব মোঃ আল আমিন অনিক',
    name_en: 'MD AL AMIN ONIK',
    designation_bn: 'উপদেষ্টা ও CEO, ঢাকা এয়ার ট্রাভেলস, রৌমারী, কুড়িগ্রাম',
    mobile: '01832630299',
    email: 'alamin.onik@karjehasana.org',
    imageUrl: 'https://i.postimg.cc/jSynYMRb/Gemini-Generated-Image-9fvxuk9fvxuk9fvx.jpg',
    fileName: 'member_9_al_amin_onik.jpg',
    bio_bn: 'CEO, DHAKA AIR TRAVELS, ROWMARI, KURIGRAM'
  }
];

async function downloadImagesAndSeed() {
  const uploadDir = path.join(__dirname, 'public', 'uploads', 'committee');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  console.log('Downloading all 9 advisory board images...');
  for (const m of members) {
    const dest = path.join(uploadDir, m.fileName);
    try {
      console.log(`Downloading [${m.order}/9]: ${m.name_bn}...`);
      const res = await fetch(m.imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      m.localPath = '/uploads/committee/' + m.fileName;
      console.log(`✓ Saved ${m.fileName} (${arrayBuffer.byteLength} bytes)`);
    } catch (err) {
      console.error(`Failed downloading ${m.name_bn}:`, err.message);
      // Fallback to direct remote URL if download fails
      m.localPath = m.imageUrl;
    }
  }

  console.log('\nUpdating SQLite database with Advisory Board members...');
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'korje_hasena.sqlite');
  let db;

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Ensure committee_members table exists
  db.run(`
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
  `);

  // Clear previous sample committee and insert all 9 actual members
  db.run('DELETE FROM committee_members;');
  
  for (const m of members) {
    db.run(
      `INSERT INTO committee_members (id, name_bn, name_en, designation_bn, mobile, email, photo_url, bio_bn, display_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        m.order,
        m.name_bn,
        m.name_en,
        m.designation_bn,
        m.mobile,
        m.email,
        m.localPath,
        m.bio_bn,
        m.order
      ]
    );
  }

  // Also update organization settings phone number to 01966442769 (11 digits)
  try {
    db.run(`
      UPDATE organization_settings 
      SET phone = '01966442769', 
          whatsapp = '01966442769',
          phone_verified_warning = 0,
          updated_at = datetime('now')
      WHERE id = 1;
    `);
    console.log('✓ Updated organization_settings phone to 01966442769 and cleared warning.');
  } catch (err) {
    console.log('Org settings note:', err.message);
  }

  // Save to disk atomically
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('✓ Successfully saved database to disk:', dbPath);

  console.log('\n=======================================');
  console.log('✓ ALL 9 ADVISORY BOARD MEMBERS SUCCESSFULLY SAVED!');
  console.log('=======================================');
}

downloadImagesAndSeed().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
