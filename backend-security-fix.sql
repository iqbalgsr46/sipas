-- =============================================
-- SIPAS BACKEND SECURITY & REALTIME FIX
-- =============================================
-- Skrip ini mengimplementasikan aturan backend ketat
-- (Trigger & RLS) sesuai dengan PRD Final.
-- =============================================

-- =============================================
-- 1. TABEL NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Notifikasi (Hanya pemilik yang bisa melihat dan update)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select notif" ON public.notifications;
CREATE POLICY "Select notif" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update notif" ON public.notifications;
CREATE POLICY "Update notif" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert notif (system)" ON public.notifications;
CREATE POLICY "Insert notif (system)" ON public.notifications 
  FOR INSERT WITH CHECK (true); -- Diizinkan karena akan diinsert melalui trigger SECURITY DEFINER

-- =============================================
-- 2. TRIGGER: NOTIFIKASI REALTIME (AFTER UPDATE)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_notif()
RETURNS trigger AS $$
DECLARE
  v_pimpinan_id UUID;
BEGIN
  -- Skenario 1: Staf mengajukan surat (draft/ditolak -> diajukan)
  IF OLD.status IN ('draft', 'ditolak') AND NEW.status = 'diajukan' THEN
    -- Kirim notif ke semua user dengan role pimpinan
    FOR v_pimpinan_id IN SELECT id FROM public.users WHERE role = 'pimpinan' LOOP
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        v_pimpinan_id, 
        'Approval Dibutuhkan', 
        'Surat No: ' || NEW.nomor_surat || ' (' || NEW.perihal || ') menunggu persetujuan Anda.'
      );
    END LOOP;
  END IF;

  -- Skenario 2: Pimpinan menyetujui (diajukan -> disetujui)
  IF OLD.status = 'diajukan' AND NEW.status = 'disetujui' THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.created_by, 
      'Surat Disetujui', 
      'Surat No: ' || NEW.nomor_surat || ' telah DISETUJUI oleh Pimpinan.'
    );
  END IF;

  -- Skenario 3: Pimpinan menolak (diajukan -> ditolak)
  IF OLD.status = 'diajukan' AND NEW.status = 'ditolak' THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.created_by, 
      'Surat Ditolak', 
      'Surat No: ' || NEW.nomor_surat || ' DITOLAK oleh Pimpinan. Silakan periksa.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Trigger Notifikasi
DROP TRIGGER IF EXISTS tr_surat_keluar_notif ON public.surat_keluar;
CREATE TRIGGER tr_surat_keluar_notif
  AFTER UPDATE ON public.surat_keluar
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_surat_keluar_notif();

-- =============================================
-- 3. TRIGGER: VALIDASI LOGIC (BEFORE UPDATE)
-- =============================================
-- Memastikan aturan tidak bisa dibypass langsung ke API.
CREATE OR REPLACE FUNCTION public.validate_surat_keluar_update()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Dapatkan role user saat ini
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  
  -- Admin bebas melakukan segalanya
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Aturan untuk STAF
  IF v_role = 'staf' THEN
    -- Blokir edit jika surat sedang diajukan atau disetujui
    IF OLD.status IN ('diajukan', 'disetujui') THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Surat dengan status "%" tidak dapat diedit.', OLD.status;
    END IF;

    -- Blokir staf mengubah status ke 'disetujui' (bypass approval)
    IF NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Staf tidak memiliki hak untuk menyetujui surat.';
    END IF;
  END IF;

  -- Aturan untuk PIMPINAN
  IF v_role = 'pimpinan' THEN
    -- Pimpinan hanya memproses surat berstatus diajukan
    IF OLD.status != 'diajukan' THEN
      RAISE EXCEPTION 'Akses Ditolak (Backend): Pimpinan hanya dapat memproses surat yang diajukan.';
    END IF;

    -- Pimpinan dilarang mengedit isi konten/nomor/tujuan surat (Hanya Approve/Reject)
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

-- Pasang Trigger Validasi
DROP TRIGGER IF EXISTS tr_validate_surat_keluar ON public.surat_keluar;
CREATE TRIGGER tr_validate_surat_keluar
  BEFORE UPDATE ON public.surat_keluar
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_surat_keluar_update();

-- =============================================
-- 4. PERKETAT RLS POLICIES SURAT KELUAR
-- =============================================

-- SELECT: 
-- Staf: milik sendiri + yang sudah disetujui (arsip)
-- Pimpinan: yang diajukan + disetujui + ditolak
-- Admin: semua
DROP POLICY IF EXISTS "Semua user bisa baca surat_keluar" ON public.surat_keluar;
DROP POLICY IF EXISTS "Select surat_keluar by role" ON public.surat_keluar;
CREATE POLICY "Select surat_keluar by role" ON public.surat_keluar 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role = 'pimpinan' AND status IN ('diajukan', 'disetujui', 'ditolak'))
        OR (role = 'staf' AND (created_by = auth.uid() OR status = 'disetujui'))
      )
    )
  );

-- UPDATE:
-- Staf: hanya milik sendiri DAN jika status masih draft/ditolak
-- Pimpinan: hanya bisa akses jika statusnya diajukan
DROP POLICY IF EXISTS "Update surat_keluar" ON public.surat_keluar;
CREATE POLICY "Update surat_keluar" ON public.surat_keluar 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role = 'pimpinan' AND status = 'diajukan')
        OR (role = 'staf' AND created_by = auth.uid() AND status IN ('draft', 'ditolak'))
      )
    )
  );

-- Hapus hak DELETE untuk staf/pimpinan (Hanya Admin)
DROP POLICY IF EXISTS "Admin bisa hapus surat_keluar" ON public.surat_keluar;
CREATE POLICY "Admin bisa hapus surat_keluar" ON public.surat_keluar 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- ENABLE RLS UNTUK MEMASTIKAN BERJALAN
-- =============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;

-- SELESAI. Semua aturan PRD sekarang ditegakkan murni di level Database.
