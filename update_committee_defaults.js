const db = require('./db');

async function main() {
  await db.getDb();
  db.run("UPDATE committee_members SET profession = 'ব্যবসায়ী ও ব্যবস্থাপনা পরিচালক', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01966442769', committee_type = 'পরিচালনা পরিষদ' WHERE id = 1");
  db.run("UPDATE committee_members SET profession = 'অধ্যক্ষ (ইসলামী শিক্ষাবিদ)', address = 'রৌমারী কেরামতিয়া, কুড়িগ্রাম', whatsapp = '01914638313', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 2");
  db.run("UPDATE committee_members SET profession = 'ব্যবসায়ী ও সমাজসেবক', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01931649576', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 3");
  db.run("UPDATE committee_members SET profession = 'প্রধান ফকিহ ও ইসলামী চিন্তাবিদ', address = 'কুড়িগ্রাম সদর', whatsapp = '01911086469', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 4");
  db.run("UPDATE committee_members SET profession = 'ব্যবসায়ী ও সমাজসেবক', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01915604026', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 5");
  db.run("UPDATE committee_members SET profession = 'ইসলামী আলোচক ও শিক্ষক', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01921970377', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 6");
  db.run("UPDATE committee_members SET profession = 'বিশিষ্ট সমাজসেবক ও ব্যবসায়ী', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01716882049', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 7");
  db.run("UPDATE committee_members SET profession = 'ইসলামী আলোচক ও শিক্ষক', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01920114330', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 8");
  db.run("UPDATE committee_members SET profession = 'প্রধান নির্বাহী কর্মকর্তা (CEO)', address = 'রৌমারী, কুড়িগ্রাম', whatsapp = '01832630299', committee_type = 'উপদেষ্টা পরিষদ' WHERE id = 9");
  console.log('✓ Successfully updated existing committee members with profession, address, and whatsapp!');
}

main().catch(console.error);
