# Role & Permission Matrix - SIPAS v2.0

## Web Application Access

| Modul | Hak Akses (Aksi) | Admin | Pimpinan | Staf |
| :--- | :--- | :---: | :---: | :---: |
| **User Management** | Tambah / Edit / Hapus User | ✅ | ❌ | ❌ |
| | Set Telegram ID User | ✅ | ❌ | ❌ |
| **Surat Masuk** | Input Data Surat Masuk | ❌ | ❌ | ✅ |
| | Lihat Data Surat Masuk | ✅ | ✅ | ✅ |
| **Surat Keluar** | Buat / Ajukan Surat Keluar | ❌ | ❌ | ✅ |
| | Lihat Detail Surat Keluar | ✅ | ✅ | ✅ |
| **Approval** | Menyetujui / Menolak Surat | ❌ | ✅ | ❌ |
| **Dashboard** | Lihat Statistik Keseluruhan | ✅ | ✅ | ✅ |
| **AI Assistant** | Akses AI Chat | ✅ | ✅ | ✅ |
| | Upload Dokumen ke AI | ✅ | ✅ | ✅ |
| | Gunakan AI Tools | ✅ | ✅ | ✅ |
| **Settings** | Ubah Profil Sendiri | ✅ | ✅ | ✅ |
| | Ubah Password | ✅ | ✅ | ✅ |

---

## Telegram Bot Access

| Fitur | Hak Akses | Admin | Pimpinan | Staf |
| :--- | :--- | :---: | :---: | :---: |
| **Registrasi** | Dapatkan Telegram ID via `/start` | ✅ | ✅ | ✅ |
| **AI Chat** | Tanya jawab dengan SIPAS AI | ✅ | ✅ | ✅ |
| **Statistik** | Query data surat (jumlah, status) | ✅ | ✅ | ✅ |
| **Baca Surat** | Cari & lihat detail surat | ✅ | ✅ | ✅ |
| **Buat Surat** | Ajukan surat keluar baru | ❌ | ❌ | ✅ |
| **Approval** | Setujui/tolak surat via chat | ❌ | ✅ | ❌ |

---

## AI Tools Permission (Web & Telegram)

| Tool Name | Fungsi | Admin | Pimpinan | Staf |
| :--- | :--- | :---: | :---: | :---: |
| `statistik_surat` | Lihat jumlah surat masuk/keluar | ✅ | ✅ | ✅ |
| `cari_surat` | Cari surat berdasarkan kriteria | ✅ | ✅ | ✅ |
| `detail_surat` | Lihat detail lengkap surat | ✅ | ✅ | ✅ |
| `buat_surat_keluar` | Buat draft surat keluar baru | ❌ | ❌ | ✅ |
| `approval_surat` | Setujui/tolak surat pending | ❌ | ✅ | ❌ |

---

## Legend

✅ = Akses Diberikan
❌ = Akses Ditolak

---

## Notes

1. **Telegram Bot Whitelist**: Hanya user yang `telegram_id`-nya sudah diinput di sistem yang bisa menggunakan bot
2. **Role Enforcement**: Semua akses dikontrol oleh Row Level Security (RLS) Supabase
3. **AI Model Fallback**: Semua role menggunakan sistem yang sama: Gemini → DeepSeek → OpenRouter
4. **Real-time Notifications**: Notifikasi approval otomatis dikirim ke user terkait (via web & akan ke Telegram jika diaktifkan)
