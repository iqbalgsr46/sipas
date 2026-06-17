# ⚡ Quick Start - NVIDIA AI (5 Menit)

Panduan super cepat untuk setup AI Assistant dengan NVIDIA (100% GRATIS & UNLIMITED).

---

## 🎯 TL;DR

```bash
# 1. Dapatkan API Key
https://build.nvidia.com/ → Login → Get API Key

# 2. Edit .env.local
NVIDIA_API_KEY=nvapi-your-key-here

# 3. Restart
npm run dev

# 4. Test di browser
localhost:3000 → AI Chat → Select NVIDIA → Send message

✅ Done!
```

---

## 📋 Detailed Steps

### Step 1: Get NVIDIA API Key (2 menit)

1. Buka **https://build.nvidia.com/**
2. Klik **"Sign In"** (pojok kanan atas)
3. Login dengan **Google** atau **GitHub**
4. Cari model **"meta/llama-3.1-70b-instruct"**
5. Klik **"Get API Key"**
6. **Copy** key yang muncul (format: `nvapi-xxxxx...`)

### Step 2: Configure Environment (1 menit)

Edit file `.env.local` di root project:

```env
# Add this line (atau update jika sudah ada)
NVIDIA_API_KEY=nvapi-paste-your-key-here
```

### Step 3: Restart Dev Server (1 menit)

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test AI Chat (1 menit)

1. Buka browser → **http://localhost:3000**
2. **Login** dengan akun Anda
3. Klik button **AI Chat** (pojok kanan bawah)
4. Pilih model **"🚀 NVIDIA"** di header
5. Kirim test message: **"Halo, perkenalkan dirimu"**

✅ **Success!** Jika AI merespons, setup berhasil!

---

## 🎨 UI Features

### Model Selector

Di header AI Chat, ada 3 tombol:

```
┌─────────────────────────────────────┐
│  🚀 NVIDIA [FREE]  │ Gemini │ DeepSeek │
└─────────────────────────────────────┘
```

- **🚀 NVIDIA** - Default, gratis tanpa limit
- **Gemini** - Fast response, ada quota
- **DeepSeek** - Backup option

Klik untuk switch model.

### Auto Fallback Notification

Jika model yang dipilih gagal, sistem auto switch dan show notif:

```
✅ Response dari AI...

⚡ Dialihkan ke NVIDIA Llama (provider utama tidak tersedia)
```

---

## 🐛 Troubleshooting

### "API Key tidak valid"

**Solusi:**
```bash
# Cek di .env.local:
# 1. Pastikan tidak ada spasi di awal/akhir
# 2. Pastikan dimulai dengan "nvapi-"
# 3. Restart server setelah edit

npm run dev
```

### "Model tidak tersedia"

**Solusi:**
- NVIDIA might be down
- System auto fallback ke Gemini/DeepSeek
- Check console logs

### AI tidak merespons

**Solusi:**
```bash
# 1. Check browser console (F12)
# 2. Check server logs di terminal
# 3. Verify API key valid
# 4. Test dengan curl:

curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta/llama-3.1-70b-instruct",
    "messages": [{"role":"user","content":"Hello"}]
  }'
```

---

## 🔥 Advanced: Add Other AI Models

### Gemini (Optional)

```env
# Get key from: https://makersuite.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=AIzaxxxxx
```

### DeepSeek (Optional)

```env
# Get key from: https://platform.deepseek.com
DEEPSEEK_API_KEY=sk-xxxxx
```

### OpenRouter (Optional - Emergency Fallback)

```env
# Get key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**Note:** NVIDIA sudah cukup untuk production! Model lain optional untuk backup.

---

## 📊 Test Commands

### Test via curl:

```bash
# Test NVIDIA directly
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Halo"}],
    "model": "nvidia"
  }'

# Test with Gemini fallback
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Halo"}],
    "model": "gemini"
  }'
```

### Check which model was used:

```bash
curl -i http://localhost:3000/api/ai/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"model":"nvidia"}'

# Look for header:
# X-AI-Model: nvidia
```

---

## 🎯 Next Steps

1. ✅ AI Chat working
2. 📖 Read full docs: [NVIDIA-API-SETUP.md](./NVIDIA-API-SETUP.md)
3. 📊 Compare models: [AI-MODELS-COMPARISON.md](./AI-MODELS-COMPARISON.md)
4. 🏗️ See architecture: [docs/system-architecture.md](./docs/system-architecture.md)
5. 🚀 Deploy to production

---

## 💡 Pro Tips

### 1. Monitor Usage

Check response headers untuk tahu model mana yang dipakai:

```javascript
// In browser DevTools (Network tab)
// Look for /api/ai/chat response headers:
X-AI-Model: nvidia         // Primary worked
X-AI-Model: nvidia-fallback // Failed over to NVIDIA
```

### 2. Debug Mode

Add console logs di `src/app/api/ai/chat/route.ts`:

```typescript
console.log(`[AI] Using model: ${requestedModel}`);
console.log(`[AI] Fallback activated: ${usedModel}`);
```

### 3. Performance Monitoring

Track average response time per model:

```typescript
const startTime = Date.now();
// ... AI call ...
const duration = Date.now() - startTime;
console.log(`[AI] Response time: ${duration}ms`);
```

---

## 🔗 Useful Links

- **NVIDIA Build:** https://build.nvidia.com/
- **NVIDIA Docs:** https://docs.nvidia.com/ai-inference/
- **Llama 3.1:** https://ai.meta.com/llama/
- **SIPAS Docs:** [README.md](./README.md)

---

## ❓ Common Questions

**Q: Apakah benar gratis?**  
A: Yes! NVIDIA NIM API gratis untuk development & personal use.

**Q: Ada limit?**  
A: Tidak ada hard limit saat ini.

**Q: Bisa pakai di production?**  
A: Yes, NVIDIA NIM dirancang untuk production use.

**Q: Bagaimana cara switch model?**  
A: Klik model selector di header AI Chat.

**Q: Data saya aman?**  
A: Yes, API key hanya di server, tidak di-expose ke frontend.

---

**Happy Coding! 🚀**

Setup selesai dalam **5 menit**, AI Assistant ready to use!

For more details: [NVIDIA-API-SETUP.md](./NVIDIA-API-SETUP.md)
