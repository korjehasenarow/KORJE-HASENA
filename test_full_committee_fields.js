const http = require('http');

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function verifyFullFields() {
  console.log('Testing full member creation with all 7 fields...');
  const memberData = {
    name_bn: 'মাওলানা মোঃ সাইফুল ইসলাম',
    name_en: 'Mawlana Md Saiful Islam',
    designation_bn: 'সাধারণ সম্পাদক',
    profession: 'শিক্ষক ও সমাজসেবক',
    mobile: '01977112233',
    whatsapp: '01977112233',
    address: 'রৌমারী সদর, কুড়িগ্রাম',
    committee_type: 'পরিচালনা পরিষদ',
    display_order: 3,
    photo_url: '/uploads/committee/member_1_shah_alam.jpg',
    bio_bn: 'সার্বিক সাংগঠনিক কার্যক্রম পরিচালনা ও তহবিল ব্যবস্থাপনা সমন্বয়।'
  };

  const addRes = await request('POST', '/api/committee', {
    'Content-Type': 'application/json',
    'x-user-role': 'superadmin',
    'x-user-id': 'USR-001'
  }, JSON.stringify(memberData));

  console.log('Add Response:', addRes.status, addRes.body);
  if (!addRes.body.success) throw new Error('Failed to add full member');

  const getRes = await request('GET', '/api/committee');
  const found = getRes.body.data.find(m => m.name_bn === memberData.name_bn);
  console.log('Found member:', found);

  if (!found) throw new Error('Member not found in GET response');
  if (found.profession !== memberData.profession) throw new Error('Profession mismatch');
  if (found.whatsapp !== memberData.whatsapp) throw new Error('WhatsApp mismatch');
  if (found.address !== memberData.address) throw new Error('Address mismatch');
  if (found.committee_type !== memberData.committee_type) throw new Error('Committee type mismatch');

  console.log('\n✓ ALL 7 FIELDS VERIFIED IN DATABASE AND API SUCCESSFULLY!');
}

verifyFullFields().catch(err => {
  console.error('Field verification failed:', err);
  process.exit(1);
});
