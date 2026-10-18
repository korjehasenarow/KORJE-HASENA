const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TUNNEL_FILE = path.join(__dirname, 'data', 'tunnel_url.txt');

async function start() {
  try {
    const sub = 'korjehasena-' + Math.floor(1000 + Math.random() * 9000);
    const tunnel = await localtunnel({ port: PORT, subdomain: sub });
    
    // Save to file for server.js to know
    try {
      fs.writeFileSync(TUNNEL_FILE, tunnel.url, 'utf8');
    } catch (e) {}

    console.log('\n=============================================================');
    console.log('  📱 কর্জে হাসানা ফাউন্ডেশন - অনলাইন মোবাইল সংযোগ সক্রিয়');
    console.log('=============================================================');
    console.log('  🌐 লাইভ মোবাইল ও ল্যাপটপ লিংক:');
    console.log('     ' + tunnel.url);
    console.log('  📸 মোবাইল ক্যামেরা দিয়ে কিউআর কোড লিংক:');
    console.log(`     https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tunnel.url)}`);
    console.log('=============================================================');
    console.log('  ✓ যেকোনো মোবাইল বা ল্যাপটপ থেকে এই লিংকটি ওপেন করুন।');
    console.log('  ✓ এন্ট্রি দিলে সবগুলো ডিভাইসে এক সাথেই রিয়েল-টাইমে আপডেট হবে।');
    console.log('=============================================================\n');

    tunnel.on('close', () => {
      console.log('টানেল সাময়িক বন্ধ হয়েছে। ৩ সেকেন্ডে পুনরায় চালু হচ্ছে...');
      try { fs.unlinkSync(TUNNEL_FILE); } catch (e) {}
      setTimeout(start, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('টানেল সতর্কতা:', err.message);
      setTimeout(start, 3000);
    });
  } catch (err) {
    console.error('টানেল শুরু করতে সমস্যা:', err.message);
    setTimeout(start, 5000);
  }
}

start();
