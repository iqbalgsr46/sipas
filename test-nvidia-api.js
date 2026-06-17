#!/usr/bin/env node

/**
 * NVIDIA API Key Tester
 * 
 * Script untuk test apakah NVIDIA API key valid dan working.
 * 
 * Usage:
 *   node test-nvidia-api.js
 * 
 * atau dengan API key langsung:
 *   node test-nvidia-api.js nvapi-your-key-here
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Get API key from args or env
const API_KEY = process.argv[2] || process.env.NVIDIA_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: NVIDIA_API_KEY tidak ditemukan!');
  console.error('\nCara pakai:');
  console.error('  1. Set di .env.local:');
  console.error('     NVIDIA_API_KEY=nvapi-xxxxx');
  console.error('  2. Atau jalankan dengan argument:');
  console.error('     node test-nvidia-api.js nvapi-xxxxx');
  process.exit(1);
}

console.log('🔍 Testing NVIDIA API...');
console.log(`📝 API Key: ${API_KEY.substring(0, 15)}...`);
console.log('');

const data = JSON.stringify({
  model: 'meta/llama-3.1-70b-instruct',
  messages: [
    { role: 'user', content: 'Halo! Perkenalkan dirimu dalam 1 kalimat bahasa Indonesia.' }
  ],
  temperature: 0.7,
  max_tokens: 100
});

const options = {
  hostname: 'integrate.api.nvidia.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Length': data.length
  }
};

const startTime = Date.now();

const req = https.request(options, (res) => {
  let responseBody = '';

  console.log(`📡 Status Code: ${res.statusCode}`);
  console.log(`📊 Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('');

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    const duration = Date.now() - startTime;
    
    try {
      const response = JSON.parse(responseBody);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ API Key VALID!');
        console.log(`⏱️  Response time: ${duration}ms`);
        console.log('');
        console.log('🤖 AI Response:');
        console.log('─'.repeat(60));
        console.log(response.choices[0].message.content);
        console.log('─'.repeat(60));
        console.log('');
        console.log('✨ NVIDIA API working perfectly!');
        console.log('');
        console.log('📈 Usage:');
        console.log(`   Prompt tokens: ${response.usage?.prompt_tokens || 'N/A'}`);
        console.log(`   Completion tokens: ${response.usage?.completion_tokens || 'N/A'}`);
        console.log(`   Total tokens: ${response.usage?.total_tokens || 'N/A'}`);
        console.log('');
        console.log('🎯 Next steps:');
        console.log('   1. API key sudah working di .env.local');
        console.log('   2. Restart development server: npm run dev');
        console.log('   3. Test di browser: http://localhost:3000');
        console.log('   4. Open AI Chat → Select NVIDIA → Send message');
      } else {
        console.error('❌ API Error!');
        console.error(`   Status: ${res.statusCode}`);
        console.error(`   Message: ${response.error?.message || 'Unknown error'}`);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Cek API key valid: https://build.nvidia.com/');
        console.error('   2. Generate new key jika perlu');
        console.error('   3. Pastikan tidak ada spasi di API key');
        console.error('   4. Update .env.local dengan key baru');
      }
    } catch (error) {
      console.error('❌ Parse Error:', error.message);
      console.error('Raw Response:', responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
  console.error('');
  console.error('🔧 Possible Issues:');
  console.error('   1. No internet connection');
  console.error('   2. Firewall blocking request');
  console.error('   3. NVIDIA API down (check https://www.nvidia.com/status/)');
});

req.write(data);
req.end();

// Timeout after 30 seconds
setTimeout(() => {
  console.error('');
  console.error('⏱️  Timeout! Request took too long (>30s)');
  console.error('   Try again or check your internet connection');
  process.exit(1);
}, 30000);
