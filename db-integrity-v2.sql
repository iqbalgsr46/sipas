-- =============================================
-- SIPAS: SISA REVISI INTEGRITAS DATABASE
-- =============================================

-- 1. PATCH DATA LAMA (Agar tidak error saat diubah ke NOT NULL)
UPDATE public.surat_keluar SET tanggal_surat = CURRENT_DATE WHERE tanggal_surat IS NULL;

UPDATE public.surat_masuk SET registered_by = (
  SELECT id FROM public.users WHERE LOWER(role) = 'admin' LIMIT 1
) WHERE registered_by IS NULL;

-- 2. SET NOT NULL CONSTRAINTS
ALTER TABLE public.surat_keluar ALTER COLUMN tanggal_surat SET NOT NULL;
ALTER TABLE public.surat_masuk ALTER COLUMN registered_by SET NOT NULL;

-- 3. BUAT TABEL ACTIVITY LOG (Fitur Opsional)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  target_id  UUID        NULL,
  metadata   JSONB       NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS untuk activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User bisa lihat log sendiri" ON public.activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin bisa lihat semua log" ON public.activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(role) = 'admin')
);
CREATE POLICY "User bisa insert log sendiri" ON public.activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- 4. TAMBAH KOLOM TYPE DI NOTIFICATIONS
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'info';

-- Update fungsi notifikasi otomatis
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_notif()
RETURNS trigger AS $$
DECLARE
  v_pimpinan_id UUID;
BEGIN
  IF LOWER(OLD.status) IN ('draft', 'ditolak') AND LOWER(NEW.status) = 'diajukan' THEN
    FOR v_pimpinan_id IN SELECT id FROM public.users WHERE LOWER(role) = 'pimpinan' LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_pimpinan_id, 'Approval Dibutuhkan', 'Surat No: ' || NEW.nomor_surat || ' (' || NEW.perihal || ') menunggu persetujuan Anda.', 'submission');
    END LOOP;
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'disetujui' THEN
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.created_by, 'Surat Disetujui', 'Surat No: ' || NEW.nomor_surat || ' telah DISETUJUI oleh Pimpinan.', 'approval');
    END IF;
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'ditolak' THEN
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.created_by, 'Surat Ditolak', 'Surat No: ' || NEW.nomor_surat || ' DITOLAK oleh Pimpinan. Silakan periksa.', 'rejection');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
