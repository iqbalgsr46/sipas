# API Documentation

Aplikasi SIPAS menggunakan **Supabase Client SDK** (PostgreSQL via PostgREST) sehingga API sebagian besar dikelola secara otomatis oleh Supabase. Berikut adalah abstraksi API/Service yang digunakan di dalam *frontend*.

## Autentikasi
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signOut()`
- `supabase.auth.getUser()`

## Modul Surat Masuk
### GET `/surat_masuk`
- **Method:** `supabase.from('surat_masuk').select('*')`
- **Tujuan:** Mendapatkan daftar surat masuk.
- **Filter:** `.order('created_at', { ascending: false })`

### POST `/surat_masuk`
- **Method:** `supabase.from('surat_masuk').insert([...])`
- **Payload:**
  ```json
  {
    "nomor_surat": "string",
    "pengirim": "string",
    "tanggal_surat": "date",
    "perihal": "string"
  }
  ```

## Modul Surat Keluar
### PATCH `/surat_keluar/:id/approve`
- **Method:** `supabase.from('surat_keluar').update({ status: 'disetujui' }).eq('id', id)`
- **Akses:** Hanya Pimpinan.

## Modul Statistik Dasbor
Mendapatkan agregasi jumlah menggunakan metode `.select('*', { count: 'exact' })` pada setiap tabel yang relevan untuk menampilkan metrik di dasbor.
