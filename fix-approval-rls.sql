-- =============================================
-- HOTFIX: FIX PIMPINAN GAGAL APPROVE (RLS GOTCHA)
-- =============================================
-- Masalah: Pimpinan gagal melakukan approve/reject karena aturan RLS UPDATE 
-- secara implisit mewajibkan "status baru" juga bernilai 'diajukan'.
-- Solusi: Sederhanakan RLS UPDATE, biarkan Trigger yang menangani 
-- validasi logika status (karena Trigger sudah kita buat sangat ketat).
-- =============================================

DROP POLICY IF EXISTS "Update surat_keluar" ON public.surat_keluar;

CREATE POLICY "Update surat_keluar" ON public.surat_keluar 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND (
        LOWER(role) = 'admin'
        OR LOWER(role) = 'pimpinan'
        OR (LOWER(role) = 'staf' AND created_by = auth.uid())
      )
    )
  );
