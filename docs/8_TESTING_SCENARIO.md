# Testing Scenario

| ID | Modul | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Status |
|---|---|---|---|---|---|
| TS-01 | Auth | Login dengan kredensial benar | Masukkan email staf, pass benar, klik Masuk | Berhasil masuk ke Dasbor dan melihat sapaan | ✅ Pass |
| TS-02 | Auth | Login dengan kredensial salah | Masukkan email asal, pass asal | Muncul alert merah "Invalid login credentials" | ✅ Pass |
| TS-03 | Sidebar | UI Responsif (Collapse) | Di Desktop, klik tombol hamburger menu | Sidebar menyusut, teks hilang, ikon ke tengah | ✅ Pass |
| TS-04 | Surat Masuk | Input Surat Baru | Isi form surat masuk, klik Simpan | Data masuk ke tabel, notifikasi Toast sukses | ⏳ Pending |
| TS-05 | Surat Masuk | Validasi Form | Kosongkan kolom wajib (Perihal), klik Simpan | Muncul peringatan "Perihal wajib diisi" | ⏳ Pending |
| TS-06 | Surat Keluar| Approval Pimpinan | Login sebagai Pimpinan, klik Setuju di surat | Status surat berubah jadi "Disetujui" | ⏳ Pending |
| TS-07 | Theme | Dark Mode Toggle | Klik ikon bulan/matahari di topbar | Seluruh UI berubah warna dengan transisi halus | ✅ Pass |
