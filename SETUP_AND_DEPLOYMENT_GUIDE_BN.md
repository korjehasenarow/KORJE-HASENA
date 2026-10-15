# কর্জে হাসানা ফাউন্ডেশন, রৌমারী, কুড়িগ্রাম
## সম্পূর্ণ সিস্টেম সেটআপ ও প্রোডাকশন ডিপ্লয়মেন্ট নির্দেশিকা (Setup & Deployment Guide)

এই নির্দেশিকাটি কর্জে হাসানা ফাউন্ডেশনের সফটওয়্যার সিস্টেমটি লোকাল কম্পিউটার অথবা ক্লাউড/ভিপিএস (VPS) সার্ভারে সফলভাবে ইনস্টল, পরিচালনা ও ডিপ্লয় করার জন্য প্রস্তুত করা হয়েছে।

---

## ১. সার্ভারের পরিবেশ ও প্রয়োজনীয়তা (System Requirements)
* **অপারেটিং সিস্টেম:** উইন্ডোজ ১০/১১ অথবা উবুন্টু/লিনাক্স (Ubuntu 20.04/22.04 LTS).
* **রানটাইম:** Node.js v18 বা তার পরবর্তী সংস্করণ (আমরা Node.js v20 LTS ব্যবহার করেছি)।
* **র‌্যাম (RAM):** সর্বনিম্ন 1 GB (2 GB বা তদূর্ধ্ব প্রস্তাবিত)।
* **স্টোরেজ:** সর্বনিম্ন 1 GB খালি জায়গা (আবেদনকারীর ছবি ও রসিদ সংরক্ষণের জন্য)।

---

## ২. লোকাল উইন্ডোজ মেশিনে ইনস্টলেশন (Windows Local Setup)

১. টার্মিনাল বা PowerShell ওপেন করুন এবং প্রজেক্ট ফোল্ডারে প্রবেশ করুন:
```powershell
cd "c:\Users\TIaan Tech\Desktop\KORJE HASENA"
```

২. যদি প্যাকেজ ইনস্টল করা না থাকে:
```powershell
npm install
```

৩. সার্ভার চালু করুন:
```powershell
node server.js
```

৪. যেকোনো ব্রাউজারে প্রবেশ করুন:
```
http://localhost:3000
```

---

## ৩. লিনাক্স ক্লাউড সার্ভারে ডিপ্লয়মেন্ট (Ubuntu VPS Deployment)

### ধাপ ১: সার্ভার আপডেট ও Node.js ইনস্টলেশন
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx ufw
```

### ধাপ ২: প্রজেক্ট কোড স্থানান্তর ও প্যাকেজ ইনস্টলেশন
```bash
sudo mkdir -p /var/www/korje-hasena
sudo chown -R $USER:$USER /var/www/korje-hasena
cd /var/www/korje-hasena

# কোড আপলোড করার পর:
npm install --production
```

### ধাপ ৩: PM2 প্রসেস ম্যানেজার সেটআপ (২৪/৭ নিরবচ্ছিন্ন চালানোর জন্য)
```bash
sudo npm install -g pm2
pm2 start server.js --name "korje-hasena"
pm2 save
pm2 startup
```

### ধাপ ৪: Nginx রিভার্স প্রক্সি ও ডোমেইন কনফিগারেশন
`/etc/nginx/sites-available/korjehasana.org` ফাইলে লিখুন:
```nginx
server {
    listen 80;
    server_name korjehasana.org www.korjehasana.org;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

কনফিগারেশন সক্রিয় করুন:
```bash
sudo ln -s /etc/nginx/sites-available/korjehasana.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### ধাপ ৫: ফ্রি SSL সার্টিফিকেট (Let's Encrypt HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d korjehasana.org -d www.korjehasana.org
```

---

## ৪. ব্যাকআপ ও ডাটাবেজ পুনরুদ্ধার (Backup & Disaster Recovery)
* **ডাটাবেজ ফাইল:** `data/korje_hasena.sqlite`
* **আপলোডকৃত ফাইল:** `public/uploads/`
* **১-ক্লিক ব্যাকআপ:** এডমিন প্যানেলের **"সংস্থা সেটিংস ও ব্যাকআপ"** মেনু থেকে সরাসরি `.sqlite` ফাইল ডাউনলোড করা যায়।
* **রিস্টোর প্রক্রিয়া:** এডমিন প্যানেল থেকে ডাউনলোডকৃত ব্যাকআপ ফাইলটি আপলোড করলেই ডাটাবেজ তাৎক্ষণিকভাবে পুনরুদ্ধার হয়।

---

## ৫. নিরাপত্তা সতর্কতা (Security Recommendations)
১. প্রথমবার ইনস্টল করার পর অবিলম্বে ডিফল্ট `admin123` পাসওয়ার্ড পরিবর্তন করে শক্তিশালী পাসওয়ার্ড নির্ধারণ করুন।
২. সরবরাহকৃত টেলিফোন নম্বরটিতে (0196644279) ১০টি ডিজিট রয়েছে; রৌমারীর অফিশিয়াল সিম কার্ডের সঠিক ১১ সংখ্যার নম্বরটি এডমিন সেটিংস থেকে হালনাগাদ করুন।
