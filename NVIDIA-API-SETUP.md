# 🚀 NVIDIA API Setup Guide - 100% GRATIS & TANPA LIMIT!

## Kenapa NVIDIA API?

- ✅ **100% GRATIS** - Tidak ada biaya sama sekali
- ✅ **TANPA LIMIT** - Tidak ada quota atau rate limit
- ✅ **POWERFUL** - Menggunakan Meta Llama 3.1 70B (model besar dan pintar)
- ✅ **CEPAT** - Response time yang sangat baik
- ✅ **RELIABLE** - Infrastructure dari NVIDIA yang stabil

## 📋 Langkah-langkah Setup

### 1. Buat Akun NVIDIA

1. Buka [https://build.nvidia.com/](https://build.nvidia.com/)
2. Klik tombol **"Sign In"** di pojok kanan atas
3. Pilih salah satu opsi login:
   - **Google Account** (paling mudah)
   - **GitHub Account**
   - Atau buat akun baru NVIDIA

### 2. Dapatkan API Key

1. Setelah login, Anda akan masuk ke halaman **NVIDIA API Catalog**
2. Cari atau scroll ke model **"meta/llama-3.1-70b-instruct"**
   - Atau langsung buka: [https://build.nvidia.com/meta/llama-3_1-70b-instruct](https://build.nvidia.com/meta/llama-3_1-70b-instruct)
3. Klik tombol **"Get API Key"** atau **"Generate Key"**
4. Copy API Key yang muncul (format: `nvapi-xxxxx...`)

### 3. Pasang di SIPAS

1. Buka file `.env.local` di root project SIPAS
2. Cari baris:
   ```env
   NVIDIA_API_KEY=
   ```
3. Paste API Key Anda:
   ```env
   NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. **Save** file `.env.local`

### 4. Restart Development Server

```bash
# Stop server yang sedang berjalan (Ctrl+C)
# Lalu jalankan ulang:
npm run dev
```

### 5. Test AI Chat

1. Buka aplikasi SIPAS di browser
2. Login dengan akun Anda
3. Klik tombol **AI Chat** di pojok kanan bawah
4. Pilih model **"🚀 NVIDIA"** di header chat
5. Coba kirim pesan: "Halo, perkenalkan dirimu"

## ✨ Fitur Tambahan

### Model Selector

SIPAS sekarang memiliki 3 pilihan model AI:

1. **🚀 NVIDIA** (Default) - FREE & No Limit
   - Model: Meta Llama 3.1 70B Instruct
   - Gratis tanpa batas
   
2. **Gemini** - Google AI
   - Model: Gemini 2.5 Flash
   - Ada quota limit (free tier)
   
3. **DeepSeek** - DeepSeek AI
   - Model: DeepSeek Chat
   - Ada rate limit

### Auto Fallback Chain

Jika satu model gagal, sistem akan otomatis mencoba model lain:

```
Primary Model Failed
    ↓
Gemini → DeepSeek → NVIDIA → OpenRouter
```

Sistem akan otomatis switch dan memberitahu Anda dengan notifikasi:
- *"⚡ Dialihkan ke DeepSeek (Gemini sedang kena limit)"*
- *"⚡ Dialihkan ke NVIDIA Llama (provider utama tidak tersedia)"*

## 🔧 Troubleshooting

### API Key Invalid

**Error:** `API Key tidak valid atau tidak memiliki akses`

**Solusi:**
1. Pastikan Anda copy API Key dengan benar (tidak ada spasi di awal/akhir)
2. Cek apakah API Key dimulai dengan `nvapi-`
3. Generate ulang API Key di [build.nvidia.com](https://build.nvidia.com/)
4. Restart development server setelah update `.env.local`

### Model Tidak Tersedia

**Error:** `Model tidak tersedia` atau `404 Not Found`

**Solusi:**
1. Pastikan menggunakan model yang benar: `meta/llama-3.1-70b-instruct`
2. Cek status NVIDIA API di [status page](https://www.nvidia.com/status/)
3. Sistem akan auto fallback ke model lain jika NVIDIA down

### Connection Timeout

**Error:** `Request timeout` atau koneksi lambat

**Solusi:**
1. Cek koneksi internet Anda
2. NVIDIA API memerlukan koneksi internet yang stabil
3. Coba refresh halaman dan kirim ulang pesan
4. Sistem akan auto fallback jika timeout berkali-kali

## 📊 Perbandingan Model

| Feature | NVIDIA | Gemini | DeepSeek |
|---------|--------|--------|----------|
| **Harga** | GRATIS | GRATIS (limited) | GRATIS (limited) |
| **Quota** | Unlimited | ~15 req/min | ~60 req/min |
| **Model Size** | 70B params | Flash (small) | Medium |
| **Response Quality** | Excellent | Very Good | Good |
| **Response Speed** | Fast | Very Fast | Fast |
| **Bahasa Indonesia** | ✅ Bagus | ✅ Sangat Bagus | ✅ Bagus |

## 🎯 Rekomendasi Penggunaan

### NVIDIA (Default)
- ✅ Untuk penggunaan intensif
- ✅ Untuk query yang kompleks
- ✅ Untuk produksi (production)
- ✅ Tidak perlu khawatir limit

### Gemini
- ✅ Untuk testing/development
- ✅ Response sangat cepat
- ⚠️ Ada quota limit

### DeepSeek
- ✅ Backup option
- ✅ Response quality bagus
- ⚠️ Ada rate limit

## 🔗 Link Berguna

- NVIDIA API Catalog: https://build.nvidia.com/
- Llama 3.1 Documentation: https://build.nvidia.com/meta/llama-3_1-70b-instruct
- NVIDIA Developer Portal: https://developer.nvidia.com/
- SIPAS Documentation: [README.md](./README.md)

## 💡 Tips

1. **Gunakan NVIDIA sebagai default** - Karena gratis dan tanpa limit
2. **Simpan API Key dengan aman** - Jangan commit file `.env.local` ke Git
3. **Monitor response** - Cek header `X-AI-Model` untuk tahu model mana yang dipakai
4. **Fallback otomatis** - Sistem akan handle error secara otomatis

## ❓ FAQ

**Q: Apakah benar-benar gratis?**
A: Ya, 100% gratis untuk penggunaan personal dan development.

**Q: Apakah ada batasan penggunaan?**
A: Saat ini NVIDIA tidak menerapkan hard limit untuk free tier.

**Q: Bagaimana cara tahu model mana yang sedang aktif?**
A: Cek response header `X-AI-Model` atau lihat notifikasi fallback di chat.

**Q: Apakah bisa pakai semua model sekaligus?**
A: Ya, Anda bisa switch model dengan model selector di header AI Chat.

**Q: Apakah data saya aman?**
A: Ya, komunikasi menggunakan HTTPS dan API Key tidak pernah di-expose ke frontend.

---

**Happy Coding! 🚀**

Jika ada pertanyaan, silakan hubungi tim developer atau buat issue di repository.
