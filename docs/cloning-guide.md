# Panduan Cloning Aplikasi SIPAS & Basis Data (Supabase)

Panduan ini menjelaskan langkah demi langkah cara melakukan *cloning* (menggandakan) repositori proyek SIPAS ke komputer lokal dan mengonfigurasi ulang *database* Supabase agar aplikasi dapat langsung berjalan secara fungsional.

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
   - Klik **"New Project"**, beri nama proyek (misal: `sipas-clone`), masukkan *database password*, dan klik **Create New Project**.

2. **Eksekusi Struktur Database (Schema & RLS)**:
   - Setelah proyek Supabase selesai dibuat, masuk ke menu **SQL Editor** di *sidebar* kiri.
   - Klik **"New Query"**.
   - Buka file `supabase-schema.sql` yang ada di direktori *root* repositori Anda.
   - *Copy* seluruh isi teks dari `supabase-schema.sql` dan *Paste* ke dalam kolom SQL Editor di Supabase.
   - Klik tombol **"Run"** (atau tekan `Ctrl+Enter`).
   - *Pastikan output memunculkan pesan "Success, no rows returned" yang berarti tabel berhasil terbuat.*

3. **Jalankan Perbaikan Database (Fix SQL)** *(Jika Diperlukan)*:
   - Untuk memastikan database Anda memiliki versi logika (RLS & Triggers) yang paling baru, buat *query* baru di SQL Editor.
   - *Copy* isi file `db-integrity-v2.sql` atau `refactor-schema.sql` (sesuai *patch* perbaikan terakhir) dan **Run** kembali.

---

## TAHAP 3: Konfigurasi Environment Variables

Aplikasi ini butuh "kunci" untuk terhubung ke Supabase baru Anda.

1. Buat sebuah *file* baru di *root* direktori proyek dengan nama **`.env.local`** (Jangan lupa titik di depannya).
2. Kembali ke halaman Dashboard Supabase Anda, masuk ke menu **Settings** (ikon gir) > **API**.
3. Temukan bagian `Project URL` dan `Project API Keys (anon public)`.
4. Isi file `.env.local` Anda seperti ini:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...[kode_panjang]...
   ```

*(Catatan: Jangan bagikan file ini ke publik/GitHub)*

---

## TAHAP 4: Jalankan Aplikasi

Setelah Frontend terunduh dan Database terhubung, jalankan aplikasi di komputer Anda:

```bash
npm run dev
```

1. Buka browser dan kunjungi: **`http://localhost:3000`**
2. **Setup Akun Pertama (Admin)**:
   - Jika Anda tidak mengaktifkan fitur *Sign Up* publik, Anda harus membuat akun pertama langsung dari Supabase.
   - Masuk ke menu **Authentication** > **Users** di dashboard Supabase.
   - Klik **Add User** > **Create New User**, masukkan Email dan Password awal.
   - Lakukan login di aplikasi `http://localhost:3000` menggunakan email dan password tersebut.

---
**🎉 Selesai!** Anda kini memiliki kloning aplikasi SIPAS yang berjalan penuh di *environment* Anda sendiri.
