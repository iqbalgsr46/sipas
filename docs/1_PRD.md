# Product Requirements Document (PRD)
## Sistem Informasi Persuratan (SIPAS) - Kabupaten Karawang

### 1. Tujuan Proyek
Mengembangkan sistem informasi persuratan (SIPAS) yang modern, efisien, dan tanpa kertas (paperless) untuk mengelola surat masuk, surat keluar, disposisi, dan persetujuan di lingkungan dinas/pemerintahan Kabupaten Karawang.

### 2. Lingkup Produk
SIPAS akan menangani:
- Pencatatan dan pengarsipan digital Surat Masuk.
- Pembuatan, penomoran otomatis, dan pengiriman Surat Keluar.
- Alur persetujuan (Approval workflow) oleh Pimpinan.
- Disposisi surat dari Pimpinan ke Staf.
- Dasbor analitik (statistik persuratan).

### 3. Pengguna Sistem (User Personas)
- **Admin**: Mengelola data pengguna, departemen, dan pengaturan sistem.
- **Pimpinan / Kepala Dinas**: Membaca surat masuk, memberikan disposisi, dan menyetujui surat keluar.
- **Staf / Operator**: Memasukkan data surat masuk, mendraf surat keluar, dan menerima disposisi.

### 4. Kebutuhan Fungsional Pokok
- **Auth**: Login aman menggunakan Supabase Auth.
- **Surat Masuk**: Tambah, Edit, Hapus, Detail, Cetak Resi.
- **Surat Keluar**: Draf, Ajukan Persetujuan, Setujui/Tolak (Pimpinan), Kirim.
- **Disposisi**: Tambah catatan disposisi dan teruskan ke departemen/staf lain.
- **Notifikasi**: Memberitahu staf saat ada disposisi baru atau surat disetujui.

### 5. Kebutuhan Non-Fungsional
- **Teknologi**: Next.js 14, Tailwind CSS, Supabase (PostgreSQL).
- **Desain**: UI/UX kelas SaaS, mode terang & gelap, mendukung mobile-responsive.
- **Keamanan**: Row Level Security (RLS) di database PostgreSQL.
