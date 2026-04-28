# Product Requirements Document (PRD)
**Sistem Informasi Persuratan (SIPAS)**

### 🎯 Tujuan Sistem
- Digitalisasi pencatatan surat masuk dan surat keluar.
- Sentralisasi data persuratan dalam satu sistem berbasis web.
- Mempercepat proses persetujuan (approval) secara elektronik.

### 👥 Pengguna & Hak Akses
- **Admin**: Konfigurasi sistem dan manajemen pengguna.
- **Pimpinan**: Meninjau dan menyetujui surat keluar.
- **Staf**: Mencatat surat masuk dan membuat draf surat keluar.

### ⚙️ Fitur Utama
- **Autentikasi**: Login aman menggunakan peran pengguna.
- **Manajemen Surat Masuk**: Pencatatan data surat yang diterima instansi.
- **Manajemen Surat Keluar**: Pembuatan draf surat.
- **Approval Sederhana**: Pimpinan dapat memberikan persetujuan (Approve/Reject) terhadap draf surat keluar.
- **Notifikasi Realtime**: Pemberitahuan instan untuk setiap pengajuan surat baru atau status approval.

### 🚀 Teknologi
- **Frontend**: Next.js 14, Tailwind CSS, Shadcn UI.
- **Backend & Database**: Supabase (PostgreSQL, GoTrue Auth, Realtime).
