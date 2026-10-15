// Bengali Official Document Generator for Karje Hasana Foundation

const DocumentGenerator = {
  renderHeader(org, title, docNo, dateStr) {
    return `
      <div class="document-header">
        <div style="font-size: 0.95rem; color: #075B3B; font-weight: 700; margin-bottom: 2px;">বিসমিল্লাহির রাহমানির রাহিম</div>
          <img src="/assets/logo.png" alt="লোগো" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #D9B84C; object-fit: cover; box-shadow: 0 2px 6px rgba(7, 91, 59, 0.2);">
          <div>
            <h1 style="font-size: 1.55rem; color: #075B3B; margin: 0; font-weight: 800;">${org.name_bn || 'কর্জে হাসানা ফাউন্ডেশন'}</h1>
            <div style="font-size: 0.85rem; color: #52665D; font-weight: 600;">${org.name_en || 'Karje Hasana Foundation'} | ${org.location || 'রৌমারী, কুড়িগ্রাম, বাংলাদেশ'}</div>
          </div>
        </div>
        <div style="font-size: 0.82rem; color: #444; border-top: 1px solid #D3E4DB; padding-top: 4px;">
          কার্যালয়: ${org.address || 'Life Care Hospital, Rowmari, Kurigram, Bangladesh'} | মোবাইল/বিকাশ: ${org.phone || '01966442769'} | ইমেইল: ${org.email || 'shahalal.siraz@gmail.com'}
        </div>
        <div style="margin-top: 10px;">
          <div class="document-title">${title}</div>
        </div>
      </div>
      <div class="document-meta-row">
        <div><strong>নথি/স্মারক নং:</strong> ${docNo || 'N/A'}</div>
        <div><strong>তারিখ:</strong> ${dateStr || new Date().toISOString().split('T')[0]}</div>
      </div>
    `;
  },

  renderSignatures(type) {
    if (type === 'loan_agreement') {
      return `
        <div class="document-signatures" style="margin-top: 60px;">
          <div class="sig-box">ঋণগ্রহীতার স্বাক্ষর ও টিপসহি</div>
          <div class="sig-box">জামিনদার/স্বাক্ষীর স্বাক্ষর</div>
          <div class="sig-box">অনুমোদনকারী/চেয়ারম্যান<br><span style="font-size:0.75rem;">(কর্জে হাসানা ফাউন্ডেশন)</span></div>
        </div>
      `;
    } else if (type === 'donation_receipt') {
      return `
        <div class="document-signatures" style="margin-top: 40px;">
          <div class="sig-box">আদায়কারীর স্বাক্ষর<br><span style="font-size:0.75rem;">(হিসাব শাখা)</span></div>
          <div class="sig-box">প্রতিষ্ঠাতা ও চেয়ারম্যান<br><span style="font-size:0.75rem;">MD SHAH ALAM</span></div>
        </div>
      `;
    } else {
      return `
        <div class="document-signatures" style="margin-top: 50px;">
          <div class="sig-box">প্রস্তুতকারী কর্মকর্তা</div>
          <div class="sig-box">যাচাইকারী / হিসাবরক্ষক</div>
          <div class="sig-box">অনুমোদনকারী কর্তৃপক্ষ</div>
        </div>
      `;
    }
  },

  // 1. ঋণ/সহায়তা আবেদন ফরম
  generateApplicationForm(org, appData) {
    return `
      <div class="document-container">
        ${this.renderHeader(org, 'সুদমুক্ত ঋণ ও সহায়তা আবেদন ফরম', appData.id, appData.created_at?.split('T')[0])}
        <table class="data-table" style="margin-bottom: 20px;">
          <tr>
            <th colspan="4" style="background:#E8F5EC; color:#075B3B;">১. আবেদনকারীর ব্যক্তিগত বিবরণ</th>
          </tr>
          <tr>
            <td style="width: 25%;"><strong>আবেদনকারীর নাম:</strong></td>
            <td style="width: 25%; font-weight: 600;">${appData.applicant_name || appData.name_bn}</td>
            <td style="width: 25%;"><strong>পিতা/স্বামীর নাম:</strong></td>
            <td style="width: 25%;">${appData.father_husband_name || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>মাতার নাম:</strong></td>
            <td>${appData.mother_name || 'N/A'}</td>
            <td><strong>জাতীয় পরিচয়পত্র (NID):</strong></td>
            <td>${appData.nid_number || 'যাচাইাধীন'}</td>
          </tr>
          <tr>
            <td><strong>মোবাইল নম্বর:</strong></td>
            <td>${appData.applicant_mobile || appData.mobile}</td>
            <td><strong>বিকল্প যোগাযোগ:</strong></td>
            <td>${appData.alt_mobile || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>বর্তমান ঠিকানা:</strong></td>
            <td>${appData.present_address}</td>
            <td><strong>স্থায়ী ঠিকানা:</strong></td>
            <td>${appData.permanent_address || appData.present_address}</td>
          </tr>
          <tr>
            <td><strong>পেশা:</strong></td>
            <td>${appData.occupation || 'N/A'}</td>
            <td><strong>মাসিক আয়:</strong></td>
            <td>৳ ${bnNum(appData.monthly_income || 0)}</td>
          </tr>
          <tr>
            <td><strong>পরিবারের সদস্য সংখ্যা:</strong></td>
            <td>${bnNum(appData.family_members || 1)} জন</td>
            <td><strong>নির্ভরশীল সদস্য:</strong></td>
            <td>${bnNum(appData.dependents || 0)} জন</td>
          </tr>
          <tr>
            <th colspan="4" style="background:#E8F5EC; color:#075B3B;">২. আবেদনের বিস্তারিত তথ্য</th>
          </tr>
          <tr>
            <td><strong>সহায়তার ধরন:</strong></td>
            <td style="font-weight: 600; color: #075B3B;">${appData.assistance_type || 'সুদমুক্ত ধার'}</td>
            <td><strong>আবেদিত পরিমাণ:</strong></td>
            <td style="font-weight: 700; color: #075B3B; font-size: 1.1rem;">৳ ${bnNum(appData.requested_amount)}</td>
          </tr>
          <tr>
            <td><strong>সহায়তার উদ্দেশ্য:</strong></td>
            <td colspan="3">${appData.purpose}</td>
          </tr>
          <tr>
            <td><strong>প্রস্তাবিত মেয়াদ:</strong></td>
            <td>${bnNum(appData.requested_duration_days || 30)} দিন</td>
            <td><strong>প্রস্তাবিত পরিশোধের তারিখ:</strong></td>
            <td>${appData.proposed_repayment_date || 'N/A'}</td>
          </tr>
          <tr>
            <th colspan="4" style="background:#E8F5EC; color:#075B3B;">৩. জামিনদার / পরিচিতির বিবরণ</th>
          </tr>
          <tr>
            <td><strong>জামিনদারের নাম:</strong></td>
            <td>${appData.guarantor_name || 'N/A'}</td>
            <td><strong>সম্পর্ক:</strong></td>
            <td>${appData.guarantor_relation || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>মোবাইল নম্বর:</strong></td>
            <td>${appData.guarantor_mobile || 'N/A'}</td>
            <td><strong>ঠিকানা ও এনআইডি:</strong></td>
            <td>${appData.guarantor_address || ''} ${appData.guarantor_nid ? `(NID: ${appData.guarantor_nid})` : ''}</td>
          </tr>
        </table>
        <div style="font-size: 0.82rem; color: #555; background: #FAF5E4; border: 1px solid #D9B84C; padding: 10px; border-radius: 6px;">
          <strong>অঙ্গীকারনামা:</strong> আমি এই মর্মে প্রত্যয়ন করছি যে, উপরে বর্ণিত সকল তথ্য সম্পূর্ণ সত্য ও সঠিক। ফাউন্ডেশন কর্তৃক প্রদত্ত সুদমুক্ত ধার আমি নির্ধারিত মেয়াদের মধ্যে কোনো প্রকার কালক্ষেপণ ব্যতিরেকে সম্পূর্ণ পরিশোধ করিতে বাধ্য থাকিব।
        </div>
        ${this.renderSignatures('application')}
      </div>
    `;
  },

  // 5. সুদমুক্ত ধার চুক্তিপত্র
  generateLoanAgreement(org, loanData) {
    return `
      <div class="document-container">
        ${this.renderHeader(org, 'সুদমুক্ত ধার (কর্জ হাসানা) চুক্তিপত্র', loanData.agreement_number || 'AGR-' + loanData.id, loanData.actual_disbursement_date)}
        <div style="font-size: 0.95rem; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
          এই চুক্তিপত্র অদ্য <strong>${loanData.actual_disbursement_date}</strong> খ্রিঃ তারিখে <strong>${org.name_bn}</strong> (প্রথম পক্ষ / ঋণদাতা) এবং জনাব/বেগম <strong>${loanData.applicant_name}</strong>, পিতা/স্বামী: ${loanData.father_husband_name || 'N/A'}, মোবাইল: ${loanData.applicant_mobile}, ঠিকানা: ${loanData.present_address} (দ্বিতীয় পক্ষ / ঋণগ্রহীতা)-এর মধ্যে সম্পাদিত হইল।
        </div>
        <table class="data-table" style="margin-bottom: 24px;">
          <tr>
            <th style="width: 35%;">শর্তাবলি</th>
            <th>বিবরণ</th>
          </tr>
          <tr>
            <td><strong>ধারের মূল পরিমাণ (Principal):</strong></td>
            <td style="font-size: 1.15rem; font-weight: 700; color: #075B3B;">৳ ${bnNum(loanData.original_principal)} (${loanData.original_principal_in_words || 'টাকা মাত্র'})</td>
          </tr>
          <tr>
            <td><strong>সুদের হার (Interest Rate):</strong></td>
            <td style="font-weight: 700; color: #075B3B;">০% (সম্পূর্ণ সুদমুক্ত / শরীয়াহসম্মত কর্জে হাসানা)</td>
          </tr>
          <tr>
            <td><strong>বিলম্ব মাশুল বা অতিরিক্ত ফি:</strong></td>
            <td style="color: #075B3B;">শূন্য (০%) - কোনো জরিমানা বা অতিরিক্ত মাশুল প্রযোজ্য নয়</td>
          </tr>
          <tr>
            <td><strong>বিতরণের প্রকৃত তারিখ:</strong></td>
            <td>${loanData.actual_disbursement_date}</td>
          </tr>
          <tr>
            <td><strong>অনুমোদিত সময়কাল:</strong></td>
            <td>${bnNum(loanData.approved_duration_days)} ক্যালেন্ডার দিন</td>
          </tr>
          <tr>
            <td><strong>চূড়ান্ত পরিশোধের শেষ তারিখ (Maturity Due Date):</strong></td>
            <td style="font-weight: 700; color: #C62828; font-size: 1.1rem;">${loanData.due_date}</td>
          </tr>
          <tr>
            <td><strong>পরিশোধের মাধ্যম:</strong></td>
            <td>${loanData.repayment_method || 'নগদ / বিকাশ Send Money'}</td>
          </tr>
          <tr>
            <td><strong>তহবিল উৎস:</strong></td>
            <td>${loanData.fund_name || 'সুদমুক্ত ধার ঘূর্ণায়মান তহবিল'}</td>
          </tr>
        </table>
        <div style="background: #F7FAF8; border-left: 4px solid #075B3B; padding: 12px; font-size: 0.85rem; line-height: 1.7; margin-bottom: 20px;">
          <strong>চুক্তির সাধারণ শর্তাবলি:</strong><br>
          ১. এটি একটি সম্পূর্ণ সুদমুক্ত ধার। গ্রহীতা কেবলমাত্র গৃহীত মূল টাকা পরিশোধ করিবেন।<br>
          ২. ধার পরিশোধের নির্ধারিত তারিখ অতিক্রম করার পূর্বেই মূল টাকা ফাউন্ডেশনের অনুমোদিত হিসাবে জমা দিতে হইবে।<br>
          ৩. গ্রহীতা চাহিবামাত্র কিস্তিতে কিংবা এককালীন যেকোনো সময় মেয়াদ শেষ হওয়ার পূর্বেই ঋণ পরিশোধ করিতে পারিবেন।<br>
          ৪. কোনো অপ্রত্যাশিত কারণে মেয়াদ বৃদ্ধির আবশ্যক হইলে মেয়াদ শেষ হইবার অন্তত ৩ দিন পূর্বে লিখিত আবেদন করিতে হইবে।
        </div>
        ${this.renderSignatures('loan_agreement')}
      </div>
    `;
  },

  // 6. অর্থ বিতরণ রসিদ
  generateDisbursementReceipt(org, loanData) {
    return `
      <div class="document-container">
        ${this.renderHeader(org, 'সুদমুক্ত ধার বিতরণ ভাউচার ও রসিদ', loanData.disbursement_receipt_number || 'REC-DISB-' + loanData.id, loanData.actual_disbursement_date)}
        <table class="data-table" style="margin-bottom: 20px;">
          <tr>
            <td style="width: 30%;"><strong>গ্রহীতার নাম:</strong></td>
            <td style="font-weight: 700;">${loanData.applicant_name}</td>
            <td style="width: 25%;"><strong>ধার আইডি:</strong></td>
            <td>${loanData.id}</td>
          </tr>
          <tr>
            <td><strong>মোবাইল নম্বর:</strong></td>
            <td>${loanData.applicant_mobile}</td>
            <td><strong>জাতীয় পরিচয়পত্র:</strong></td>
            <td>${loanData.nid_number || 'যাচাইকৃত'}</td>
          </tr>
          <tr>
            <td><strong>প্রদত্ত মূলধন:</strong></td>
            <td colspan="3" style="font-size: 1.25rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(loanData.original_principal)}</td>
          </tr>
          <tr>
            <td><strong>প্রদানের হিসাব/মাধ্যম:</strong></td>
            <td>${loanData.account_name || 'হাতে নগদ'}</td>
            <td><strong>ফেরতের শেষ তারিখ:</strong></td>
            <td style="color: #C62828; font-weight: 700;">${loanData.due_date}</td>
          </tr>
          <tr>
            <td><strong>বিতরণকারী কর্মকর্তা:</strong></td>
            <td>${loanData.disbursed_by || 'হিসাব শাখা'}</td>
            <td><strong>অনুমোদনপত্র নং:</strong></td>
            <td>${loanData.application_id}</td>
          </tr>
        </table>
        <div style="font-size: 0.85rem; color: #555; border: 1px dashed #ccc; padding: 10px; text-align: center;">
          আমি স্বীকার করিতেছি যে, কর্জে হাসানা ফাউন্ডেশন হইতে সুদমুক্ত ধার বাবদ নগদ/হিসাব মাধ্যমে উল্লেখিত টাকা সম্পূর্ণ বুঝিয়া পাইলাম।
        </div>
        <div class="document-signatures" style="margin-top: 50px;">
          <div class="sig-box">গ্রহীতার স্বাক্ষর</div>
          <div class="sig-box">বিতরণকারী হিসাবরক্ষক</div>
          <div class="sig-box">প্রতিষ্ঠাতা চেয়ারম্যান<br>MD SHAH ALAM</div>
        </div>
      </div>
    `;
  },

  // 7. অনুদান প্রাপ্তি রসিদ
  generateDonationReceipt(org, donationData) {
    return `
      <div class="document-container">
        ${this.renderHeader(org, 'অফিসিয়াল অনুদান প্রাপ্তি রসিদ', donationData.receipt_number, donationData.date)}
        <div style="background: #E8F5EC; border: 1px solid #075B3B; padding: 14px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 0.9rem; color: #075B3B;">অনুদান প্রাপ্তির পরিমাণ</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #075B3B; margin: 4px 0;">৳ ${bnNum(donationData.amount)}</div>
        </div>
        <table class="data-table" style="margin-bottom: 20px;">
          <tr>
            <td style="width: 30%;"><strong>দাতার নাম:</strong></td>
            <td style="font-weight: 700;">${donationData.donor_name}</td>
            <td style="width: 25%;"><strong>দাতা আইডি:</strong></td>
            <td>${donationData.donor_id || 'সাধারণ দাতা'}</td>
          </tr>
          <tr>
            <td><strong>মোবাইল নম্বর:</strong></td>
            <td>${donationData.donor_mobile || 'N/A'}</td>
            <td><strong>পেমেন্ট মাধ্যম:</strong></td>
            <td>${donationData.payment_method || 'bKash Send Money'}</td>
          </tr>
          <tr>
            <td><strong>অনুদানের খাত/তহবিল:</strong></td>
            <td style="font-weight: 600; color: #075B3B;">${donationData.fund_name || 'সাধারণ অনুদান তহবিল'}</td>
            <td><strong>ট্রানজ্যাকশন আইডি (TrxID):</strong></td>
            <td style="font-family: var(--font-en); font-weight: 600;">${donationData.transaction_reference || 'CASH'}</td>
          </tr>
          <tr>
            <td><strong>জমার হিসাব:</strong></td>
            <td>${donationData.account_name || 'বিকাশ হিসাব'}</td>
            <td><strong>যাচাইকারী:</strong></td>
            <td>${donationData.verified_by || 'হিসাব শাখা'}</td>
          </tr>
        </table>
        <div style="font-size: 0.88rem; text-align: center; color: #075B3B; font-weight: 600; margin-top: 10px;">
          “মহান আল্লাহ তায়ালা আপনার দানকে কবুল করুন এবং উত্তম প্রতিদান দান করুন। আমিন।”
        </div>
        ${this.renderSignatures('donation_receipt')}
      </div>
    `;
  },

  // 8. কিস্তি / ফেরত আদায় রসিদ
  generateRepaymentReceipt(org, repayData) {
    return `
      <div class="document-container">
        ${this.renderHeader(org, 'সুদমুক্ত ধার ফেরত / কিস্তি আদায় রসিদ', repayData.receipt_number, repayData.repayment_date)}
        <table class="data-table" style="margin-bottom: 20px;">
          <tr>
            <td style="width: 30%;"><strong>গ্রহীতার নাম:</strong></td>
            <td style="font-weight: 700;">${repayData.applicant_name}</td>
            <td style="width: 25%;"><strong>ধার আইডি:</strong></td>
            <td>${repayData.loan_id}</td>
          </tr>
          <tr>
            <td><strong>আদায়কৃত কিস্তি/পরিমাণ:</strong></td>
            <td colspan="3" style="font-size: 1.35rem; font-weight: 800; color: #075B3B;">৳ ${bnNum(repayData.amount)}</td>
          </tr>
          <tr>
            <td><strong>মূল ধারের পরিমাণ:</strong></td>
            <td>৳ ${bnNum(repayData.original_principal || 0)}</td>
            <td><strong>পূর্বে পরিশোধিত মোট:</strong></td>
            <td>৳ ${bnNum(repayData.total_principal_repaid || 0)}</td>
          </tr>
          <tr>
            <td><strong>বর্তমান অবশিষ্ট বকেয়া:</strong></td>
            <td colspan="3" style="font-weight: 700; color: ${repayData.outstanding_principal <= 0 ? '#075B3B' : '#C62828'};">
              ${repayData.outstanding_principal <= 0 ? '৳ ০ (সম্পূর্ণ ঋণ পরিশোধিত)' : `৳ ${bnNum(repayData.outstanding_principal)}`}
            </td>
          </tr>
          <tr>
            <td><strong>পেমেন্ট মাধ্যম:</strong></td>
            <td>${repayData.payment_method || 'নগদ'}</td>
            <td><strong>আদায়কারী:</strong></td>
            <td>${repayData.recorded_by || 'হিসাব শাখা'}</td>
          </tr>
        </table>
        ${this.renderSignatures('repayment')}
      </div>
    `;
  },

  // 9. সম্পূর্ণ পরিশোধের সনদ (Loan Clearance Certificate)
  generateLoanClearanceCertificate(org, loanData) {
    return `
      <div class="document-container" style="border: 4px double #075B3B;">
        ${this.renderHeader(org, 'সম্পূর্ণ ঋণ পরিশোধের প্রত্যয়ন ও দায়মুক্তি সনদ', 'CERT-CLEAR-' + loanData.id, new Date().toISOString().split('T')[0])}
        <div style="text-align: center; margin: 24px 0;">
          <div style="font-size: 1.25rem; font-weight: 700; color: #075B3B; margin-bottom: 8px;">দায়মুক্তি ও সফল সমাপ্তি প্রত্যয়নপত্র</div>
          <p style="font-size: 0.98rem; line-height: 1.8; text-align: justify;">
            এতদ্বারা প্রত্যয়ন করা যাইতেছে যে, জনাব/বেগম <strong>${loanData.applicant_name}</strong>, পিতা/স্বামী: ${loanData.father_husband_name || 'N/A'}, ঠিকানা: ${loanData.present_address}, <strong>${org.name_bn}</strong> হইতে গৃহিত <strong>${loanData.actual_disbursement_date}</strong> তারিখের চুক্তিপত্র মোতাবেক <strong>৳ ${bnNum(loanData.original_principal)}</strong> (ধার আইডি: ${loanData.id}) সুদমুক্ত ধার বাবদ সম্পূর্ণ টাকা যথাসময়ে যথাযথভাবে পরিশোধ করিয়াছেন।
          </p>
          <div style="background: #E8F5EC; border: 1px solid #075B3B; padding: 12px; border-radius: 8px; margin: 18px 0; font-weight: 700; color: #075B3B;">
            ফাউন্ডেশনের নথিপত্র অনুসারে তাহার নিকট উক্ত ধার বাবদ আর কোনো প্রকার পাওনা বকেয়া অবশিষ্ট নাই। তিনি সম্পূর্ণ দায়মুক্ত।
          </div>
          <p style="font-size: 0.92rem; color: #555;">আমরা তাহার সততা ও দায়িত্বশীলতার প্রশংসা করি এবং উজ্জ্বল ভবিষ্যৎ কামনা করি।</p>
        </div>
        <div class="document-signatures" style="margin-top: 60px;">
          <div class="sig-box">হিসাব কর্মকর্তা</div>
          <div class="sig-box">সাধারণ সম্পাদক</div>
          <div class="sig-box">প্রতিষ্ঠাতা ও চেয়ারম্যান<br>MD SHAH ALAM</div>
        </div>
      </div>
    `;
  },

  // 15. পূর্ণাঙ্গ ব্যালেন্স শিট
  generateBalanceSheetDocument(org, sheetData) {
    return `
      <div class="document-container" style="max-width: 900px;">
        ${this.renderHeader(org, 'পূর্ণাঙ্গ আর্থিক ব্যালেন্স শিট (উদ্বৃত্তপত্র)', 'BS-' + sheetData.date, sheetData.date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <!-- Assets Column -->
          <div style="border: 1px solid #D3E4DB; border-radius: 8px; overflow: hidden;">
            <div style="background: #075B3B; color: white; padding: 10px 14px; font-weight: 700;">পরম্পরা সম্পদ (Assets)</div>
            <table class="data-table">
              <tr>
                <td><strong>হাতে নগদ ও ব্যাংক হিসাব:</strong></td>
                <td style="text-align: right; font-weight: 600;">৳ ${bnNum(sheetData.assets?.liquidCashAndBank || 0)}</td>
              </tr>
              ${(sheetData.assets?.accountBreakdown || []).map(a => `
                <tr>
                  <td style="padding-left: 20px; font-size: 0.85rem; color: #555;">- ${a.name_bn}</td>
                  <td style="text-align: right; font-size: 0.85rem;">৳ ${bnNum(a.balance)}</td>
                </tr>
              `).join('')}
              <tr>
                <td><strong>সুদমুক্ত ধার পাওনা (Loan Receivables):</strong></td>
                <td style="text-align: right; font-weight: 600; color: #075B3B;">৳ ${bnNum(sheetData.assets?.loanReceivables || 0)}</td>
              </tr>
              <tr style="background: #E8F5EC; font-weight: 800;">
                <td>মোট সম্পদ (Total Assets):</td>
                <td style="text-align: right; font-size: 1.1rem; color: #075B3B;">৳ ${bnNum(sheetData.assets?.totalAssets || 0)}</td>
              </tr>
            </table>
          </div>

          <!-- Liabilities & Equity Column -->
          <div style="border: 1px solid #D3E4DB; border-radius: 8px; overflow: hidden;">
            <div style="background: #06452E; color: white; padding: 10px 14px; font-weight: 700;">দায় ও তহবিলসমূহ (Liabilities & Funds)</div>
            <table class="data-table">
              <tr>
                <td><strong>চলতি দায় (Liabilities):</strong></td>
                <td style="text-align: right; font-weight: 600;">৳ 0</td>
              </tr>
              <tr>
                <td colspan="2" style="background: #FAF5E4; font-weight: 700; color: #7A5200;">তহবিল ও নিট মূলধন (Funds & Equity):</td>
              </tr>
              ${(sheetData.equityAndFunds?.fundsBreakdown || []).map(f => `
                <tr>
                  <td style="padding-left: 20px; font-size: 0.85rem; color: #555;">- ${f.name_bn}</td>
                  <td style="text-align: right; font-size: 0.85rem;">৳ ${bnNum(f.balance)}</td>
                </tr>
              `).join('')}
              <tr>
                <td><strong>সংরক্ষিত পরিচালন উদ্বৃত্ত:</strong></td>
                <td style="text-align: right; font-weight: 600;">৳ ${bnNum(sheetData.equityAndFunds?.retainedSurplus || 0)}</td>
              </tr>
              <tr style="background: #E8F5EC; font-weight: 800;">
                <td>মোট দায় ও তহবিল (Total Liabilities & Funds):</td>
                <td style="text-align: right; font-size: 1.1rem; color: #075B3B;">৳ ${bnNum(sheetData.assets?.totalAssets || 0)}</td>
              </tr>
            </table>
          </div>
        </div>
        <div style="text-align: center; font-size: 0.85rem; color: #075B3B; font-weight: 600; padding: 8px; background: #E8F5EC; border-radius: 6px;">
          ✓ ব্যালেন্স শিট সম্পূর্ণ সামঞ্জস্যপূর্ণ ও হিসাববিজ্ঞানের নীতিমালার সাথে সংগতিপূর্ণ।
        </div>
        ${this.renderSignatures('balance_sheet')}
      </div>
    `;
  }
};
