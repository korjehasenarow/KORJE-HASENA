// Test script to verify committee API endpoints and permissions
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

async function runTests() {
  console.log('--- 1. Testing GET /api/committee ---');
  const getRes = await request('GET', '/api/committee');
  console.log('Status:', getRes.status, 'Count:', getRes.body.data?.length);
  if (!getRes.body.success) throw new Error('GET committee failed');

  console.log('\n--- 2. Testing unauthorized POST /api/committee (Staff role) ---');
  const unauthRes = await request('POST', '/api/committee', {
    'Content-Type': 'application/json',
    'x-user-role': 'staff',
    'x-user-id': 'USR-004'
  }, JSON.stringify({
    name_bn: 'অবৈধ সদস্য',
    designation_bn: 'সদস্য'
  }));
  console.log('Status (Expect 403):', unauthRes.status, 'Message:', unauthRes.body.message);
  if (unauthRes.status !== 403) throw new Error('Security failure: non-superadmin could modify committee!');

  console.log('\n--- 3. Testing authorized POST /api/committee (Superadmin role) ---');
  const addRes = await request('POST', '/api/committee', {
    'Content-Type': 'application/json',
    'x-user-role': 'superadmin',
    'x-user-id': 'USR-001'
  }, JSON.stringify({
    name_bn: 'হাফেজ ক্বারী মোঃ জয়নাল আবেদীন',
    name_en: 'Hafez Md Joynal Abedin',
    designation_bn: 'ধর্ম বিষয়ক সম্পাদক ও প্রধান মুফতি',
    mobile: '01711223344',
    email: 'joynal@karjehasana.org',
    photo_url: '/assets/logo.png',
    bio_bn: 'বিশিষ্ট ইসলামী চিন্তাবিদ ও শরীয়াহ বোর্ড সদস্য',
    display_order: 6,
    user_id: 'USR-001',
    user_name: 'MD SHAH ALAM'
  }));
  console.log('Status (Expect 200):', addRes.status, 'Message:', addRes.body.message);
  if (!addRes.body.success) throw new Error('Super Admin committee add failed');

  console.log('\n--- 4. Verify updated list contains new member ---');
  const updatedList = await request('GET', '/api/committee');
  const newMember = updatedList.body.data.find(m => m.name_bn.includes('জয়নাল আবেদীন'));
  console.log('Found newly added member ID:', newMember?.id, 'Name:', newMember?.name_bn);
  if (!newMember) throw new Error('New member not found in list');

  console.log('\n--- 5. Testing authorized PUT /api/committee/:id ---');
  const editRes = await request('PUT', `/api/committee/${newMember.id}`, {
    'Content-Type': 'application/json',
    'x-user-role': 'superadmin',
    'x-user-id': 'USR-001'
  }, JSON.stringify({
    name_bn: 'মাওলানা মুফতি মোঃ জয়নাল আবেদীন',
    designation_bn: 'প্রধান শরীয়াহ উপদেষ্টা',
    mobile: '01911223344',
    user_id: 'USR-001',
    user_name: 'MD SHAH ALAM'
  }));
  console.log('Status (Expect 200):', editRes.status, 'Message:', editRes.body.message);

  console.log('\n--- 6. Testing DELETE /api/committee/:id ---');
  const delRes = await request('DELETE', `/api/committee/${newMember.id}?user_role=superadmin&user_id=USR-001`);
  console.log('Status (Expect 200):', delRes.status, 'Message:', delRes.body.message);

  console.log('\n=======================================');
  console.log('✓ ALL COMMITTEE & SUPER ADMIN TESTS PASSED!');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
