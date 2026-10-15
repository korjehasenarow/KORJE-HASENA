// Test committee photo upload directly into public/uploads/committee/
const fs = require('fs');
const path = require('path');

async function testFileUpload() {
  const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
  const fileBuffer = fs.readFileSync(logoPath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('name_bn', 'মোঃ শাহীনুর ইসলাম');
  formData.append('designation_bn', 'যুগ্ম সম্পাদক ও পরিচালনা পরিষদ সদস্য');
  formData.append('mobile', '01999887766');
  formData.append('email', 'shahinur@karjehasana.org');
  formData.append('display_order', '6');
  formData.append('user_id', 'USR-001');
  formData.append('user_name', 'MD SHAH ALAM');
  formData.append('user_role', 'superadmin');
  formData.append('photo', blob, 'shahinoor.png');

  console.log('Sending multipart POST /api/committee with photo...');
  const res = await fetch('http://localhost:3000/api/committee', {
    method: 'POST',
    headers: {
      'x-user-role': 'superadmin',
      'x-user-id': 'USR-001'
    },
    body: formData
  });

  const json = await res.json();
  console.log('Response:', json);

  if (!json.success) {
    throw new Error('Upload failed: ' + json.message);
  }

  console.log('Uploaded photoUrl:', json.photoUrl);
  if (!json.photoUrl.startsWith('/uploads/committee/')) {
    throw new Error('Photo was not uploaded to /uploads/committee/ folder! Got: ' + json.photoUrl);
  }

  // Check physical file existence on disk
  const relativePath = json.photoUrl.replace(/^\//, '').replace(/\//g, path.sep);
  const fullDiskPath = path.join(__dirname, 'public', relativePath.replace(/^public[\\\/]/, ''));
  console.log('Checking disk path:', fullDiskPath);

  if (fs.existsSync(fullDiskPath)) {
    console.log('✓ File exists on disk in public/uploads/committee/! Size:', fs.statSync(fullDiskPath).size, 'bytes');
  } else {
    throw new Error('File not found at expected disk location: ' + fullDiskPath);
  }

  console.log('\n=======================================');
  console.log('✓ COMMITTEE PHOTO UPLOAD TO FOLDER VERIFIED!');
  console.log('=======================================');
}

testFileUpload().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
