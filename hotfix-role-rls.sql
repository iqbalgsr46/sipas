-- =============================================
-- HOTFIX: SINKRONISASI ROLE & CASE-SENSITIVE RLS
-- =============================================

-- 1. SINKRONISASI ROLE BERDASARKAN EMAIL (Tabel users)
-- Memastikan admin, pimpinan, dan staf mendapatkan role yang tepat.
UPDATE public.users SET role = 'admin' WHERE LOWER(email) = 'wulan@sipas.go.id';
UPDATE public.users SET role = 'pimpinan' WHERE LOWER(email) = 'iqbal@sipas.go.id';
UPDATE public.users SET role = 'staf' WHERE LOWER(email) = 'zidan@sipas.go.id';

-- 2. PASTIKAN RLS TABEL USERS (PROFILES) TERBUKA UNTUK DIBACA
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Semua user bisa baca users" ON public.users;
CREATE POLICY "Semua user bisa baca users" ON public.users 
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. PERBAIKAN RLS SURAT KELUAR (CASE-INSENSITIVE)
-- Memastikan sistem tidak error hanya karena perbedaan 'Pimpinan' vs 'pimpinan'.
DROP POLICY IF EXISTS "Select surat_keluar by role" ON public.surat_keluar;
CREATE POLICY "Select surat_keluar by role" ON public.surat_keluar 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND (
        LOWER(role) = 'admin'
        OR (LOWER(role) = 'pimpinan' AND LOWER(status) IN ('diajukan', 'disetujui', 'ditolak'))
        OR (LOWER(role) = 'staf' AND (created_by = auth.uid() OR LOWER(status) = 'disetujui'))
      )
    )
  );

DROP POLICY IF EXISTS "Update surat_keluar" ON public.surat_keluar;
CREATE POLICY "Update surat_keluar" ON public.surat_keluar 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND (
        LOWER(role) = 'admin'
        OR (LOWER(role) = 'pimpinan' AND LOWER(status) = 'diajukan')
        OR (LOWER(role) = 'staf' AND created_by = auth.uid() AND LOWER(status) IN ('draft', 'ditolak'))
      )
    )
  );

-- 4. PERBAIKAN TRIGGER VALIDASI (CASE-INSENSITIVE)
CREATE OR REPLACE FUNCTION public.validate_surat_keluar_update()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Ambil role dengan format huruf kecil agar kebal case-sensitive
  SELECT LOWER(role) INTO v_role FROM public.users WHERE id = auth.uid();
  
  IF v_role = 'admin' THEN RETURN NEW; END IF;

  IF v_role = 'staf' THEN
    IF LOWER(OLD.status) IN ('diajukan', 'disetujui') THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Surat dengan status "%" tidak dapat diedit.', OLD.status;
    END IF;
    IF LOWER(NEW.status) = 'disetujui' AND LOWER(OLD.status) != 'disetujui' THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Staf tidak memiliki hak untuk menyetujui surat.';
    END IF;
  END IF;

  IF v_role = 'pimpinan' THEN
    IF LOWER(OLD.status) != 'diajukan' THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Pimpinan hanya dapat memproses surat yang diajukan.';
    END IF;
    IF NEW.nomor_surat != OLD.nomor_surat 
       OR NEW.perihal != OLD.perihal 
       OR NEW.tujuan != OLD.tujuan 
       OR NEW.konten IS DISTINCT FROM OLD.konten THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Pimpinan tidak dapat mengedit isi surat, hanya status approval.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERBAIKAN TRIGGER NOTIFIKASI (CASE-INSENSITIVE)
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_notif()
RETURNS trigger AS $$
DECLARE
  v_pimpinan_id UUID;
BEGIN
  IF LOWER(OLD.status) IN ('draft', 'ditolak') AND LOWER(NEW.status) = 'diajukan' THEN
    -- Cari semua pimpinan (case-insensitive)
    FOR v_pimpinan_id IN SELECT id FROM public.users WHERE LOWER(role) = 'pimpinan' LOOP
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (v_pimpinan_id, 'Approval Dibutuhkan', 'Surat No: ' || NEW.nomor_surat || ' (' || NEW.perihal || ') menunggu persetujuan Anda.');
    END LOOP;
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'disetujui' THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (NEW.created_by, 'Surat Disetujui', 'Surat No: ' || NEW.nomor_surat || ' telah DISETUJUI oleh Pimpinan.');
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'ditolak' THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (NEW.created_by, 'Surat Ditolak', 'Surat No: ' || NEW.nomor_surat || ' DITOLAK oleh Pimpinan. Silakan periksa.');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
