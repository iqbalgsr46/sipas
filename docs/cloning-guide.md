# Panduan Cloning Aplikasi SIPAS v2.2.0 & Basis Data (Supabase)

Panduan ini menjelaskan langkah demi langkah cara melakukan *cloning* (menggandakan) repositori proyek SIPAS v2.2.0 ke komputer lokal dan mengonfigurasi ulang *database* Supabase + AI Providers + Telegram Bot agar aplikasi dapat langsung berjalan secara fungsional.

> **⚡ Quick Start?** Jika hanya ingin setup AI dalam 5 menit, baca [QUICK-START-AI.md](../QUICK-START-AI.md) terlebih dahulu!

---

## TAHAP 1: Clone Repositori (Frontend)

1. **Buka Terminal/Command Prompt** di komputer lokal Anda.
2. **Clone repositori** menggunakan perintah Git:
   ```bash
   git clone https://github.com/iqbalgsr46/sipas.git
   ```
3. **Masuk ke direktori proyek**:
   ```bash
   cd sipas
   ```
4. **Instal seluruh dependensi (Library)**:
   ```bash
   npm install
   # atau menggunakan pnpm/yarn
   pnpm install
   ```

---

## TAHAP 2: Replikasi Basis Data (Supabase)

Karena aplikasi ini menggunakan arsitektur BaaS (Supabase), Anda harus membuat proyek Supabase baru sebagai *database* Anda sendiri.

1. **Buat Proyek Supabase Baru**:
   - Kunjungi [supabase.com](https://supabase.com) dan *Login/Sign Up*.
   - Klik **"New Project"**, beri nama proyek (misal: `sipas-v2`), masukkan *database password*, dan klik **Create New Project**.

2. **Eksekusi Struktur Database (Schema & RLS)**:
   - Setelah proyek Supabase selesai dibuat, masuk ke menu **SQL Editor** di *sidebar* kiri.
   - Klik **"New Query"**.
   - Buka file `migration.sql` yang ada di direktori *root* repositori Anda.
   - *Copy* seluruh isi teks dari `migration.sql` dan *Paste* ke dalam kolom SQL Editor di Supabase.
   - Klik tombol **"Run"** (atau tekan `Ctrl+Enter`).
   - *Pastikan output memunculkan pesan "Success" yang berarti tabel berhasil terbuat.*

3. **Jalankan Migration Telegram Bot**:
   - Buat *query* baru di SQL Editor.
   - *Copy* isi file `add-telegram-column.sql` dan **Run**:
     ```sql
     ALTER TABLE users ADD COLUMN telegram_id TEXT;
     ALTER TABLE users ADD CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id);
     CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id) WHERE telegram_id IS NOT NULL;
     ```

4. **Jalankan Perbaikan Database (Fix SQL)** *(Jika Diperlukan)*:
   - Untuk memastikan database Anda memiliki versi logika (RLS & Triggers) yang paling baru, buat *query* baru di SQL Editor.
   - *Copy* isi file `db-integrity-v2.sql` atau `refactor-schema.sql` (sesuai *patch* perbaikan terakhir) dan **Run** kembali.

---

## TAHAP 3: Konfigurasi Environment Variables

Aplikasi ini butuh "kunci" untuk terhubung ke Supabase, AI providers, dan Telegram Bot.

1. Buat sebuah *file* baru di *root* direktori proyek dengan nama **`.env.local`** (Jangan lupa titik di depannya).
2. Isi file `.env.local` Anda dengan konfigurasi berikut:

### A. Supabase Configuration
Kembali ke halaman Dashboard Supabase Anda, masuk ke menu **Settings** (ikon gir) > **API**.
Temukan bagian `Project URL` dan `Project API Keys (anon public)`.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...[kode_panjang]...
```

### B. AI Providers Configuration

#### **🆓 NVIDIA NIM (Primary - FREE & UNLIMITED)** ⭐ RECOMMENDED

1. **Dapatkan API Key** (Gratis):
   - Kunjungi: [build.nvidia.com](https://build.nvidia.com/)
   - Sign up / Login
   - Buat API key baru
   - Copy API key (format: `nvapi-xxxxx...`)

2. **Tambahkan ke `.env.local`**:
```env
# Primary AI Provider (FREE & UNLIMITED)
NVIDIA_API_KEY=nvapi-...[your-nvidia-key]
```

#### **Fallback Providers** (Optional but Recommended)

```env
# Fallback #1: Google Gemini (Free tier: 15 req/min)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...[your-gemini-key]

# Fallback #2: DeepSeek Chat (Pay-per-use)
DEEPSEEK_API_KEY=sk-...[your-deepseek-key]

# Fallback #3: OpenRouter (Various free & paid models)
OPENROUTER_API_KEY=sk-or-v1-...[your-openrouter-key]
```

**Cara Dapatkan API Keys:**
- **NVIDIA NIM** (GRATIS): [build.nvidia.com](https://build.nvidia.com/) ⭐
- **Gemini**: [aistudio.google.com](https://aistudio.google.com/apikey)
- **DeepSeek**: [platform.deepseek.com](https://platform.deepseek.com/api_keys)
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys)

> **Pro Tip**: Setup hanya NVIDIA_API_KEY saja sudah cukup! Sistem akan fallback ke Gemini jika NVIDIA tidak tersedia.

### C. Telegram Bot Configuration

1. **Buat Bot di Telegram**:
   - Buka Telegram, cari `@BotFather`
   - Kirim command `/newbot`
   - Ikuti instruksi: beri nama bot (misal: "SIPAS Assistant")
   - Beri username bot (misal: "sipas_your_org_bot")
   - BotFather akan memberikan **Bot Token**

2. **Tambahkan ke `.env.local`**:
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Site URL (untuk webhook, gunakan domain production)
NEXT_PUBLIC_SITE_URL=https://your-sipas-domain.vercel.app
```

**Contoh `.env.local` Lengkap (Minimal Setup):**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Providers - Primary (NVIDIA)
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Providers - Fallback (Optional)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXxXxXxXxXxXxXxXxXxXxXxXxXxXxX

# Telegram Bot
TELEGRAM_BOT_TOKEN=8889698173:AAE8D-rTxRSWe73nJc844qCIELOBLYIwmLg
NEXT_PUBLIC_SITE_URL=https://sipas-your-org.vercel.app
```

**Contoh `.env.local` Lengkap (Dengan Semua Providers):**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Providers - Primary
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Providers - Fallback
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXxXxXxXxXxXxXxXxXxXxXxXxXxXxX
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=8889698173:AAE8D-rTxRSWe73nJc844qCIELOBLYIwmLg
NEXT_PUBLIC_SITE_URL=https://sipas-your-org.vercel.app
```

*(Catatan: Jangan bagikan file ini ke publik/GitHub, sudah masuk `.gitignore`)*

---

## TAHAP 4: Jalankan Aplikasi Lokal

Setelah Frontend terunduh dan Database terhubung, jalankan aplikasi di komputer Anda:

```bash
npm run dev
```

1. Buka browser dan kunjungi: **`http://localhost:3000`**
2. **Setup Akun Pertama (Admin)**:
   - Masuk ke menu **Authentication** > **Users** di dashboard Supabase.
   - Klik **Add User** > **Create New User**, masukkan Email dan Password awal.
   - Di tabel `users` Supabase, set kolom `role` user pertama menjadi `'admin'`.
   - Lakukan login di aplikasi `http://localhost:3000` menggunakan email dan password tersebut.

---

## TAHAP 5: Deploy ke Production (Vercel)

### A. Push ke GitHub
```bash
git add .
git commit -m "Initial SIPAS v2.0 setup"
git push origin main
```

### B. Deploy ke Vercel
1. Kunjungi [vercel.com](https://vercel.com) dan login
2. Klik **Add New** > **Project**
3. Import repository GitHub Anda
4. **Environment Variables**: Copy semua dari `.env.local` ke Vercel
5. Klik **Deploy**

### C. Set Telegram Webhook
Setelah deployment selesai, buka URL ini **sekali saja**:

```
https://your-sipas-domain.vercel.app/api/telegram/set-webhook
```

**Response yang diharapkan:**
```json
{
  "webhook_url": "https://your-sipas-domain.vercel.app/api/telegram",
  "telegram_response": {
    "ok": true,
    "result": true,
    "description": "Webhook was set"
  }
}
```

---

## TAHAP 6: Telegram Bot - User Registration Flow

### Untuk Admin (Pertama Kali)
1. Buka aplikasi SIPAS web
2. Masuk ke halaman **Users** (hanya admin yang bisa akses)
3. Lihat ada kolom **Telegram ID** di tabel

### Untuk User yang Ingin Menggunakan Bot
1. **User chat bot** → cari `@your_bot_username` di Telegram
2. **Ketik `/start`** → bot balas dengan Telegram ID user (contoh: `8406125410`)
3. **User kirim screenshot/copy ID** ke admin
4. **Admin input Telegram ID** di halaman Users SIPAS (edit user, isi field Telegram ID)
5. **User sudah bisa chat** dengan bot tanpa batasan

### Testing Bot
User coba kirim pesan:
- "Berapa surat masuk hari ini?"
- "Tampilkan surat pending approval"
- "Cari surat tentang anggaran"

Bot akan merespons menggunakan AI assistant yang sama dengan web app.

---

## TAHAP 7: Seed Data (Optional)

Untuk testing, Anda bisa insert data sample:

```sql
-- Sample Surat Masuk
INSERT INTO surat_masuk (nomor_surat, tanggal_surat, pengirim, perihal, created_by)
VALUES 
  ('001/SM/VI/2024', '2024-06-01', 'Dinas Pendidikan', 'Permohonan Anggaran', [user_id]),
  ('002/SM/VI/2024', '2024-06-10', 'Bappeda', 'Koordinasi Program', [user_id]);

-- Sample Surat Keluar
INSERT INTO surat_keluar (nomor_surat, tanggal_surat, tujuan, perihal, status, created_by)
VALUES 
  ('001/SK/VI/2024', '2024-06-15', 'Gubernur Jabar', 'Laporan Kinerja', 'menunggu_approval', [user_id]),
  ('002/SK/VI/2024', '2024-06-16', 'DPRD', 'Undangan Rapat', 'draf', [user_id]);
```

---

## Troubleshooting

### 1. Bot Tidak Merespons
- **Cek webhook**: Buka `https://your-domain.vercel.app/api/telegram/set-webhook`
- **Cek environment variable**: Pastikan `TELEGRAM_BOT_TOKEN` sudah di-set di Vercel
- **Cek logs**: Masuk ke Vercel dashboard > Functions > Logs

### 2. AI Error / Limit Exceeded
- Sistem akan otomatis fallback: NVIDIA → Gemini → DeepSeek → OpenRouter
- Jika hanya setup NVIDIA, tidak ada masalah (unlimited requests)
- Jika NVIDIA kedaluwarsa, fallback ke Gemini (15 req/min)
- Pastikan minimal 1 API key valid

### 3. Database Connection Error
- Periksa `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Pastikan RLS policies sudah di-run via `migration.sql`

### 4. User Tidak Bisa Login
- Cek di Supabase Authentication > Users
- Pastikan email confirmation tidak required (Settings > Auth > Email confirmation)

### 5. Dark Mode Tidak Berfungsi
- Clear browser cache
- Periksa `localStorage` key `theme`

---

## File Structure Reference

```
sipas/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Protected dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── surat-masuk/
│   │   │   ├── surat-keluar/
│   │   │   ├── approval/
│   │   │   ├── users/
│   │   │   ├── ai-assistant/     # ✨ AI Chat interface
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── ai/               # ✨ AI endpoints (chat, upload)
│   │   │   ├── telegram/         # ✨ Telegram bot webhook
│   │   │   └── users/
│   │   └── login/
│   ├── components/
│   │   ├── ai/                   # ✨ AI chat components
│   │   └── ...
│   ├── lib/
│   │   ├── ai/                   # ✨ AI tools & models
│   │   ├── supabase/
│   │   └── utils/
│   └── types/
├── docs/                         # 📚 Documentation
├── public/
├── migration.sql                 # Database schema
├── add-telegram-column.sql       # ✨ Telegram integration
├── .env.local                    # Environment variables (create this)
├── package.json
└── README.md
```

---

## Checklist Setup

- [ ] Repository di-clone
- [ ] Dependencies di-install (`npm install`)
- [ ] Proyek Supabase dibuat
- [ ] `migration.sql` di-run di Supabase SQL Editor
- [ ] `add-telegram-column.sql` di-run di Supabase SQL Editor
- [ ] `.env.local` dibuat dengan semua keys (Supabase, AI, Telegram)
- [ ] Aplikasi berjalan di `http://localhost:3000`
- [ ] User admin pertama dibuat di Supabase Auth
- [ ] Role admin di-set di tabel `users`
- [ ] Login berhasil
- [ ] AI Assistant merespons dengan benar (web)
- [ ] Repository di-push ke GitHub
- [ ] Deploy ke Vercel berhasil
- [ ] Environment variables di-set di Vercel
- [ ] Telegram webhook di-set via `/api/telegram/set-webhook`
- [ ] Bot merespons `/start` dengan Telegram ID
- [ ] Admin set Telegram ID user di halaman Users
- [ ] User chat bot dan mendapat respons AI

---

**🎉 Selesai!** Anda kini memiliki kloning aplikasi SIPAS v2.0 yang berjalan penuh dengan AI Assistant dan Telegram Bot di *environment* Anda sendiri.

---

## Additional Resources

### 📖 SIPAS Documentation
- **[QUICK-START-AI.md](../QUICK-START-AI.md)** - Setup AI dalam 5 menit (⚡ Start here!)
- **[NVIDIA-API-SETUP.md](../NVIDIA-API-SETUP.md)** - Panduan lengkap NVIDIA NIM API
- **[AI-MODELS-COMPARISON.md](../AI-MODELS-COMPARISON.md)** - Perbandingan semua AI models

### 🔗 External Resources
- **NVIDIA NIM**: https://build.nvidia.com/
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Deployment**: https://vercel.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Gemini API**: https://ai.google.dev/docs
- **DeepSeek API**: https://platform.deepseek.com/docs
- **OpenRouter**: https://openrouter.ai/docs
