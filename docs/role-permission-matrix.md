# Role & Permission Matrix - SIPAS v2.2.0

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
| | Pilih AI Model (NVIDIA/Gemini/DeepSeek) | ✅ | ✅ | ✅ |
| | Gunakan AI Tools | ✅ | ✅ | ✅ |
| **Settings** | Ubah Profil Sendiri | ✅ | ✅ | ✅ |
| | Ubah Password | ✅ | ✅ | ✅ |

---

## Telegram Bot Access

| Fitur | Hak Akses | Admin | Pimpinan | Staf |
| :--- | :--- | :---: | :---: | :---: |
| **Registrasi** | Dapatkan Telegram ID via `/start` | ✅ | ✅ | ✅ |
| **AI Chat** | Tanya jawab dengan SIPAS AI (NVIDIA primary) | ✅ | ✅ | ✅ |
| **Model Selection** | Pilih AI model di chat | ✅ | ✅ | ✅ |
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
| `intent_recognition` (v2.2.0) | AI memahami intent user & pilih tool | ✅ | ✅ | ✅ |

---

## Legend

✅ = Akses Diberikan
❌ = Akses Ditolak

---

## Notes

1. **Telegram Bot Whitelist**: Hanya user yang `telegram_id`-nya sudah diinput di sistem yang bisa menggunakan bot
2. **Role Enforcement**: Semua akses dikontrol oleh Row Level Security (RLS) Supabase
3. **AI Model Fallback (v2.2.0)**: Primary NVIDIA NIM → Gemini → DeepSeek → OpenRouter (99.9% reliability)
4. **Model Selection (v2.2.0)**: User dapat pilih model AI di chat (NVIDIA, Gemini, atau DeepSeek)
5. **Intent Recognition (v2.2.0)**: AI otomatis mengenali intent user dan memilih tool yang sesuai
6. **Real-time Notifications**: Notifikasi approval otomatis dikirim ke user terkait (via web & Telegram)

