-- =============================================
-- SIPAS: FIX DUPLICATE nomor_surat
-- =============================================
-- Hasil cek duplikat menunjukkan 4 nomor surat bermasalah:
--   B-100/SET/2023 (7 baris)
--   B-102/SET/2023 (6 baris)
--   B-099/SET/2023 (7 baris)
--   B-101/SET/2023 (7 baris)
--
-- Strategi: Pertahankan 1 baris terbaik per nomor surat
-- (prioritas: disetujui > diajukan > draft > ditolak, terbaru)
-- Baris duplikat lain akan dihapus.
-- =============================================

-- LANGKAH 1: Lihat detail semua duplikat untuk konfirmasi manual
-- (Jalankan ini sendiri dulu untuk melihat data yang akan terpengaruh)

SELECT 
  id, nomor_surat, perihal, tujuan, status, 
  created_at,
  ROW_NUMBER() OVER (
    PARTITION BY nomor_surat 
    ORDER BY 
      CASE status
        WHEN 'disetujui' THEN 1
        WHEN 'diajukan'  THEN 2
        WHEN 'draft'     THEN 3
        WHEN 'ditolak'   THEN 4
        ELSE 5
      END ASC,
      created_at DESC
  ) AS rn
FROM public.surat_keluar
WHERE nomor_surat IN ('B-100/SET/2023','B-102/SET/2023','B-099/SET/2023','B-101/SET/2023')
ORDER BY nomor_surat, rn;


-- =============================================
-- LANGKAH 2: HAPUS BARIS DUPLIKAT
-- Hanya menyimpan 1 baris terbaik per nomor_surat.
-- Prioritas: status terbaik → created_at terbaru.
-- =============================================

DELETE FROM public.surat_keluar
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY nomor_surat 
        ORDER BY 
          CASE status
            WHEN 'disetujui' THEN 1
            WHEN 'diajukan'  THEN 2
            WHEN 'draft'     THEN 3
            WHEN 'ditolak'   THEN 4
            ELSE 5
          END ASC,
          created_at DESC
      ) AS rn
    FROM public.surat_keluar
    WHERE nomor_surat IN (
      SELECT nomor_surat 
      FROM public.surat_keluar 
      GROUP BY nomor_surat 
      HAVING COUNT(*) > 1
    )
  ) ranked
  WHERE rn > 1 -- Hapus semua selain baris terbaik (rn = 1)
);

-- =============================================
-- LANGKAH 3: VERIFIKASI (Jalankan setelah delete)
-- Hasilnya harus kosong (0 rows) sebelum lanjut.
-- =============================================
SELECT nomor_surat, COUNT(*) 
FROM public.surat_keluar 
GROUP BY nomor_surat 
HAVING COUNT(*) > 1;

-- =============================================
-- LANGKAH 4: BARU tambahkan UNIQUE constraint
-- Jalankan ini HANYA jika Langkah 3 menghasilkan 0 rows
-- =============================================
-- ALTER TABLE public.surat_keluar 
--   ADD CONSTRAINT surat_keluar_nomor_surat_unique UNIQUE (nomor_surat);
