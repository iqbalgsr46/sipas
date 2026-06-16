# Testing Scenario - SIPAS v2.2.0

## Web Application Testing

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :---: |
| 1. Login | Memasukkan email dan password yang benar | Sistem mengarahkan ke dashboard | ✅ Pass |
| 2. Dark Mode | Klik toggle dark mode di header | Tampilan berubah ke tema gelap (gray-900 background) | ✅ Pass |
| 3. Input Surat Masuk | Login sebagai Staf, mengisi form surat masuk, klik Simpan | Surat masuk tersimpan ke database dan muncul di tabel | ✅ Pass |
| 4. Buat Surat Keluar | Login sebagai Staf, mengisi form surat keluar, klik Ajukan | Status surat menjadi "menunggu_approval" | ✅ Pass |
| 5. Cek Realtime Notif | Buka dua tab (Staf & Pimpinan). Staf ajukan surat | Pimpinan menerima notifikasi realtime pop-up otomatis | ✅ Pass |
| 6. Approval Surat | Pimpinan membuka detail surat dan klik "Setujui" | Status surat di database dan UI berubah menjadi "disetujui" | ✅ Pass |
| 7. Akses Ilegal | Staf mencoba mengakses menu "Kelola User" via URL | Sistem me-redirect staf kembali ke dashboard | ✅ Pass |
| 8. AI Chat - Basic | Buka AI Assistant, ketik "Halo" | AI merespons dengan sapaan | ✅ Pass |
| 9. AI Chat - Tools | Ketik "Berapa surat masuk hari ini?" | AI menjalankan tool `statistik_surat` dan memberi jawaban | ✅ Pass |
| 10. AI Upload Doc | Upload file PDF/image di AI Assistant | AI mengekstrak teks dan memberikan analisis | ✅ Pass |
| 11. AI Fallback | Matikan NVIDIA (simulasi), tanya AI | AI otomatis fallback ke Gemini → DeepSeek → OpenRouter | ✅ Pass |
| 12. User Management | Admin menambah user baru dan set Telegram ID | User baru muncul di tabel dengan Telegram ID terisi | ✅ Pass |
| 13. Model Selection | Klik model selector, pilih NVIDIA/Gemini/DeepSeek | Model berubah, chat menggunakan model yang dipilih | ✅ Pass |
| 14. AI Intent Recognition | Ketik "cari surat dari Dinas Pendidikan" | AI otomatis pilih tool `cari_surat_masuk` | ✅ Pass |
| 15. AI Smart Recovery | AI dapat error pada tool pertama | AI troubleshoot, coba tool alternatif atau berikan solusi | ✅ Pass |

---

## Telegram Bot Testing

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :---: |
| **A. Registrasi & Authentication** |
| 1. Start Bot | User baru chat bot, ketik `/start` | Bot balas dengan Telegram ID user | ✅ Pass |
| 2. Unregistered Access | User belum registered tanya "Halo" | Bot balas "Akses ditolak, hubungi admin untuk registrasi" | ✅ Pass |
| 3. Admin Set ID | Admin input Telegram ID di halaman Users | User berhasil di-update dengan telegram_id | ✅ Pass |
| 4. Registered Access | User registered tanya "Halo" | Bot merespons dengan AI assistant | ✅ Pass |
| **B. AI Query & Tools** |
| 5. Statistik Query | User tanya "Berapa surat masuk hari ini?" | Bot menjalankan tool dan memberi angka statistik | ⚠️ Tool returns undefined (known issue) |
| 6. Cari Surat | User tanya "Cari surat tentang anggaran" | Bot memanggil tool `cari_surat` dan list hasil | ⚠️ Tool returns undefined (known issue) |
| 7. Detail Surat | User tanya "Detail surat nomor 001/2024" | Bot menampilkan detail lengkap surat | ⚠️ Tool returns undefined (known issue) |
| 8. AI Fallback | Gemini error, bot retry DeepSeek | Bot tetap merespons menggunakan model fallback | ✅ Pass |
| **C. Role-Based Actions** |
| 9. Staf Buat Surat | Staf tanya "Buatkan surat ke Dinas Pendidikan" | AI tool `buat_surat_keluar` creates draft | ⚠️ Tool returns undefined (known issue) |
| 10. Pimpinan Approval | Pimpinan: "Setujui surat 001/2024" | Tool `approval_surat` updates status ke disetujui | ⚠️ Tool returns undefined (known issue) |
| 11. Staf Approval (Ilegal) | Staf coba "Setujui surat 001/2024" | Bot/RLS menolak aksi, error permission | ✅ Pass |
| **D. Edge Cases** |
| 12. Invalid Telegram ID | Admin set ID yang salah untuk user | User tidak bisa akses bot (ID tidak match) | ✅ Pass |
| 13. Multiple Sessions | User chat bot dari 2 device bersamaan | Kedua session berfungsi normal (stateless) | ✅ Pass |
| 14. Webhook Down | Webhook error 500 | Telegram retry otomatis, user dapat response | ✅ Pass |
| 15. Long Message | User kirim pesan >4096 karakter | Bot split response atau truncate dengan warning | ✅ Pass |

---

## AI Models Testing

| Model | Endpoint | Status | Notes |
| :--- | :--- | :---: | :--- |
| NVIDIA NIM (Llama 3.1 70B) | `integrate.api.nvidia.com/v1` | ⭐ Primary | FREE & Unlimited, recommended |
| Gemini 2.0 Flash | `gemini-2.0-flash-exp` | ✅ Fallback #1 | Free tier, rate limit: 15 req/min |
| DeepSeek Chat | `deepseek-chat` | ✅ Fallback #2 | Auto switch saat Gemini limit |
| OpenRouter Free | `openrouter/free` | ✅ Fallback #3 | Auto-select available free models |

---

## Known Issues & Workarounds

### 🔴 Critical Issues
1. **Telegram Bot Tool Results Undefined** (Open)
   - **Problem**: Tool executes successfully (logs show data returned), but AI SDK returns `result = undefined`
   - **Impact**: Bot dapat error atau response tidak informatif
   - **Status**: Under investigation, may be AI SDK integration issue
   - **Workaround**: Tool logs show data is retrieved, issue is in SDK result handling

### 🟡 Medium Issues
_(None currently)_

### 🟢 Minor Issues
_(None currently)_

---

## Test Data Setup

Untuk testing lengkap, gunakan data berikut:

### Users
- **Admin**: admin@sipas.com / password: admin123
- **Pimpinan**: pimpinan@sipas.com / password: pimpinan123 / telegram_id: 123456789
- **Staf**: staf@sipas.com / password: staf123 / telegram_id: 987654321

### Sample Surat
```sql
-- Insert sample surat masuk
INSERT INTO surat_masuk (nomor_surat, tanggal_surat, pengirim, perihal, created_by)
VALUES ('001/SM/2024', '2024-06-01', 'Dinas Pendidikan', 'Permohonan Anggaran', [staf_user_id]);

-- Insert sample surat keluar (pending approval)
INSERT INTO surat_keluar (nomor_surat, tanggal_surat, tujuan, perihal, status, created_by)
VALUES ('001/SK/2024', '2024-06-15', 'Gubernur Jabar', 'Laporan Kinerja', 'menunggu_approval', [staf_user_id]);
```

---

## Testing Checklist

- [ ] Semua role (admin/pimpinan/staf) dapat login
- [ ] Dark mode berfungsi di semua halaman
- [ ] Real-time notifications muncul tanpa refresh
- [ ] AI Assistant merespons dengan benar (web)
- [ ] AI tools (statistik, cari, detail, buat, approval) berfungsi (web)
- [ ] Document upload & OCR berfungsi
- [ ] Telegram bot menerima webhook
- [ ] Bot `/start` memberikan Telegram ID
- [ ] Bot menolak akses user unregistered
- [ ] Bot merespons query AI (meski tool results undefined)
- [ ] AI fallback Gemini → DeepSeek → OpenRouter berfungsi
- [ ] RLS mencegah akses ilegal (staf tidak bisa approval)
- [ ] Webhook set-up via `/api/telegram/set-webhook` berhasil

---

## Performance Testing

| Metric | Target | Actual | Status |
| :--- | :--- | :--- | :---: |
| Page Load Time | < 2s | ~1.5s | ✅ |
| AI Response Time | < 5s | ~3-4s | ✅ |
| Telegram Bot Response | < 5s | ~3-8s | ⚠️ (depends on tool) |
| Database Query | < 500ms | ~200-300ms | ✅ |
| Real-time Notification | < 1s | ~500ms | ✅ |

---

## Security Testing

| Test | Description | Status |
| :--- | :--- | :---: |
| SQL Injection | Coba input `' OR 1=1--` di form | ✅ Protected (parameterized queries) |
| XSS Attack | Input `<script>alert('XSS')</script>` | ✅ Sanitized |
| CSRF | Request without auth header | ✅ Blocked by Supabase |
| RLS Bypass | Staf akses data pimpinan via API | ✅ Blocked by RLS |
| Telegram Bot Spoofing | Fake webhook request | ✅ Bot token validation |
| API Rate Limiting | Spam requests | ✅ Vercel rate limit active |
