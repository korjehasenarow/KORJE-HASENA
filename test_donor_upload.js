// Test donor registration with photo upload
const fs = require('fs');
const path = require('path');

async function testDonorUpload() {
  const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
  const fileBuffer = fs.readFileSync(logoPath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('name_bn', 'হাজী মোঃ নুরুল ইসলাম');
  formData.append('mobile', '01811223344');
  formData.append('category', 'মাসিক দাতা');
  formData.append('commitment_amount', '5000');
  formData.append('address', 'রৌমারী বাজার');
  formData.append('photo', blob, 'donor_nurul.png');

  console.log('Sending multipart POST /api/donors with photo...');
  const res = await fetch('http://localhost:3000/api/donors', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log('Response:', json);

  if (!json.success) throw new Error('Donor upload failed: ' + json.message);
  console.log('Donor ID:', json.donorId, 'Photo URL:', json.photoUrl);

  const checkRes = await fetch(`http://localhost:3000/api/donors/${json.donorId}`);
  const checkJson = await checkRes.json();
  console.log('Retrieved donor photoUrl:', checkJson.data?.photo_url);

  if (checkJson.data?.photo_url !== json.photoUrl) {
    throw new Error('Photo URL mismatch!');
  }

  console.log('\n=======================================');
  console.log('✓ DONOR PHOTO UPLOAD VERIFIED!');
  console.log('=======================================');
}

testDonorUpload().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
