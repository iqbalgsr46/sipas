# Setup Telegram Bot SIPAS

Bot Telegram yang terintegrasi dengan sistem SIPAS untuk memberikan akses AI assistant melalui chat Telegram.

## 🚀 Cara Setup

### 1. Database Migration

Jalankan SQL berikut di **Supabase SQL Editor**:

```sql
-- Tambah kolom telegram_id
ALTER TABLE users ADD COLUMN telegram_id TEXT;
ALTER TABLE users ADD CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id) WHERE telegram_id IS NOT NULL;
```

### 2. Environment Variables

Tambahkan di **Vercel Environment Variables**:

```
TELEGRAM_BOT_TOKEN=8889698173:AAE8D-rTxRSWe73nJc844qCIELOBLYIwmLg
```

### 3. Set Webhook

Setelah deploy, buka URL berikut **sekali saja**:

```
https://sipas.vercel.app/api/telegram/set-webhook
```

Jika berhasil, response akan seperti:

```json
{
  "webhook_url": "https://sipas.vercel.app/api/telegram",
  "telegram_response": { "ok": true, "result": true }
}
```

---

## 📱 Cara Penggunaan

### Untuk User Baru

1. **User chat bot** → cari `@sipas_karawang_bot` di Telegram
2. **Ketik `/start`** → bot balas dengan Telegram ID user
3. **User kirim screenshot/copy ID** ke admin
4. **Admin buka halaman Users di SIPAS** → Edit user → isi Telegram ID
5. **User sudah bisa chat** dengan bot

### Commands yang Tersedia

- `/start` - Registrasi dan dapatkan Telegram ID
- Tanya apapun tentang surat, contoh:
  - "Berapa surat masuk hari ini?"
  - "Tampilkan surat pending approval"
  - "Buat surat keluar ke Dinas Pendidikan"
  - "Cari surat tentang anggaran"

---

## 🔐 Keamanan

- **Whitelist**: Hanya Telegram ID yang terdaftar di database SIPAS yang bisa akses
- **Role-based**: Akses disesuaikan dengan role user (admin/staf/pimpinan)
- **No credentials**: Bot tidak menyimpan password atau token user

---

## 🛠 Troubleshooting

### Bot tidak merespons
1. Cek webhook: `https://sipas.vercel.app/api/telegram/set-webhook`
2. Pastikan `TELEGRAM_BOT_TOKEN` sudah di-set di Vercel
3. Cek logs di Vercel Functions

### User dapat "Akses ditolak"
- Pastikan Telegram ID user sudah diinput di halaman Users SIPAS
- ID harus persis sama (copy-paste, jangan ketik manual)

### Webhook gagal di-set
- Pastikan `NEXT_PUBLIC_SITE_URL` di-set ke URL production (bukan localhost)
- URL harus HTTPS

---

## 📊 Info Bot

- **Username**: @sipas_karawang_bot
- **Webhook**: https://sipas.vercel.app/api/telegram
- **AI Models**: Gemini → DeepSeek → OpenRouter (fallback otomatis)
- **Tools**: Semua SIPAS AI tools tersedia (baca surat, buat surat, approval, statistik)