const http = require('http');

function api(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function runWelfareTestSuite() {
  console.log('========================================================');
  console.log('  TESTING WELFARE & DISASTER RELIEF MANAGEMENT MODULE');
  console.log('========================================================\n');

  // 1. Check Public Welfare Summary
  const sumRes = await api('GET', '/api/public/welfare-summary');
  if (sumRes.status !== 200 || !sumRes.body.success) {
    throw new Error('Failed to fetch public welfare summary');
  }
  console.log('✅ PASSED: Public welfare summary returned 200 OK');
  console.log(`   - Total Aid Spent: ৳${sumRes.body.data.totalAidSpent}`);
  console.log(`   - Total Beneficiaries: ${sumRes.body.data.totalBeneficiaries} persons`);
  console.log(`   - Total Activities: ${sumRes.body.data.totalActivities}`);

  // 2. Fetch Welfare Grants List
  const listRes = await api('GET', '/api/welfare-grants');
  if (listRes.status !== 200 || !listRes.body.success || !Array.isArray(listRes.body.data)) {
    throw new Error('Failed to fetch welfare grants list');
  }
  console.log(`✅ PASSED: Welfare grants endpoint returned ${listRes.body.data.length} records`);

  // 3. Filter by category
  const filterRes = await api('GET', '/api/welfare-grants?category=' + encodeURIComponent('গৃহহীনদের ঘর নির্মাণ'));
  if (filterRes.status === 200 && filterRes.body.data.length > 0) {
    console.log(`✅ PASSED: Category filter returned ${filterRes.body.data.length} records for 'গৃহহীনদের ঘর নির্মাণ'`);
  } else {
    throw new Error('Category filtering failed');
  }

  // 4. Create New Relief Grant: শীতবস্ত্র ও কম্বল বিতরণ
  const newGrant = {
    title_bn: 'তীব্র শৈত্যপ্রবাহে রৌমারীর চরাঞ্চলের শীতার্তদের মাঝে কম্বল বিতরণ',
    category: 'শীতবস্ত্র ও কম্বল বিতরণ',
    beneficiary_name: 'চর গয়াপাড়া গ্রামবাসী ও দরিদ্র পরিবারসমূহ',
    beneficiary_mobile: '01711-223344',
    beneficiary_nid: 'N/A',
    beneficiary_address: 'চর গয়াপাড়া, দাঁতভাঙ্গা, রৌমারী',
    beneficiary_count: 50,
    amount: 5000,
    fund_id: 1, // General fund
    account_id: 1, // Cash
    date: '2026-10-16',
    description: '৫০টি পরিবারের মাঝে ৫০টি প্রিমিয়াম শীতকালীন কম্বল বিতরণ সম্পন্ন।',
    impact_notes: 'তীব্র শীত থেকে অসহায় প্রবীণ ও শিশুরা সুরক্ষিত হয়েছে।',
    approved_by: 'MD SHAH ALAM (চেয়ারম্যান)',
    entered_by: 'Shahalam69'
  };

  const createRes = await api('POST', '/api/welfare-grants', newGrant);
  if ((createRes.status !== 200 && createRes.status !== 201) || !createRes.body.success) {
    throw new Error(`Failed to create welfare grant: ${createRes.body.message || JSON.stringify(createRes.body)}`);
  }
  const createdId = createRes.body.id;
  const voucherNo = createRes.body.voucher_no;
  console.log(`✅ PASSED: Created new welfare grant (ID: ${createdId}, Voucher: ${voucherNo})`);

  // 5. Verify Cash Deduction in Cashbook
  const cashbookRes = await api('GET', '/api/reports/cashbook');
  const txList = cashbookRes.body.data.transactions || [];
  const matchingTx = txList.find(t => t.reference_no === voucherNo && t.type === 'WELFARE_GRANT');
  if (matchingTx && matchingTx.direction === 'OUT' && matchingTx.amount === 5000) {
    console.log(`✅ PASSED: Transaction correctly posted in cashbook as WELFARE_GRANT (OUT: ৳5000)`);
  } else {
    throw new Error('Transaction ledger entry missing in cashbook for welfare grant');
  }

  // 6. Verify Balance Sheet equilibrium
  const bsRes = await api('GET', '/api/reports/balance-sheet');
  if (bsRes.body.data.isBalanced) {
    console.log(`✅ PASSED: Balance sheet remains 100% balanced after welfare aid disbursement (Balanced: ${bsRes.body.data.isBalanced})`);
  } else {
    throw new Error('Balance sheet broke equilibrium after welfare aid disbursement');
  }

  // 7. Clean up test record (Super Admin authenticated)
  const delRes = await api('DELETE', `/api/welfare-grants/${createdId}?user_role=superadmin&user_id=Shahalam69`);
  if (delRes.status === 200 && delRes.body.success) {
    console.log(`✅ PASSED: Cleaned up test grant ${createdId} and reconciled ledger`);
  } else {
    throw new Error(`Failed to delete test grant: ${delRes.body.message || JSON.stringify(delRes.body)}`);
  }

  // 8. Re-verify Balance Sheet equilibrium after cleanup
  const bsResAfter = await api('GET', '/api/reports/balance-sheet');
  if (bsResAfter.body.data.isBalanced) {
    console.log(`✅ PASSED: Balance sheet 100% balanced after cleanup (Balanced: ${bsResAfter.body.data.isBalanced})\n`);
  }

  console.log('========================================================');
  console.log('  ALL WELFARE & RELIEF AUDIT TESTS PASSED SUCCESSFULLY!  ');
  console.log('========================================================');
}

runWelfareTestSuite().catch(err => {
  console.error('❌ WELFARE TEST FAILED:', err);
  process.exit(1);
});
