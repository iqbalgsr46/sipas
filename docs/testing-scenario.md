# Testing Scenario

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :---: |
| 1. Login | Memasukkan email dan password yang benar | Sistem mengarahkan ke dashboard | ✅ Pass |
| 2. Input Surat Masuk | Login sebagai Staf, mengisi form surat masuk, klik Simpan | Surat masuk tersimpan ke database dan muncul di tabel | ✅ Pass |
| 3. Buat Surat Keluar | Login sebagai Staf, mengisi form surat keluar, klik Ajukan | Status surat menjadi "menunggu_approval" | ✅ Pass |
| 4. Cek Realtime | Buka dua tab (Staf & Pimpinan). Staf ajukan surat | Pimpinan menerima notifikasi realtime pop-up otomatis | ✅ Pass |
| 5. Approval Surat | Pimpinan membuka detail surat dan klik "Setujui" | Status surat di database dan UI berubah menjadi "disetujui" | ✅ Pass |
| 6. Akses Ilegal | Staf mencoba mengakses menu "Kelola User" via URL URL | Sistem me-redirect staf kembali ke dashboard | ✅ Pass |
