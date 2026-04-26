-- ============================================
-- SQL FIXES: RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Fix RLS Permissions: Create is_admin() function
-- This allows the RLS policies to correctly identify admin users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Profile Settings: Add avatar_url column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Fix Approval: Add RLS policies for approvals table so insert doesn't fail
DROP POLICY IF EXISTS "Pimpinan and Admin can insert approvals" ON public.approvals;
CREATE POLICY "Pimpinan and Admin can insert approvals" ON public.approvals FOR INSERT WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'pimpinan')
);

DROP POLICY IF EXISTS "Everyone can read approvals" ON public.approvals;
CREATE POLICY "Everyone can read approvals" ON public.approvals FOR SELECT USING (true);

-- 4. Fix Surat Keluar: Allow Pimpinan to update status (approve/reject)
-- Previously only admin and the creator could update surat_keluar
DROP POLICY IF EXISTS "Akses Surat Keluar (Update)" ON public.surat_keluar;
CREATE POLICY "Akses Surat Keluar (Update)" ON public.surat_keluar FOR UPDATE USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'pimpinan') OR
  created_by = auth.uid()
);

-- 5. Fix Notification Trigger: Prevent null user_id error & handle menunggu_approval only
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_approval_notif()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'menunggu_approval' AND OLD.status != 'menunggu_approval' THEN
    INSERT INTO public.notifications (user_id, title, message)
    SELECT id, 'Menunggu Approval', 'Surat keluar ' || NEW.nomor_surat || ' menunggu persetujuan Anda.'
    FROM public.users WHERE role = 'pimpinan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Approvals to include the reason (catatan) in the notification
CREATE OR REPLACE FUNCTION public.handle_approvals_notif()
RETURNS trigger AS $$
DECLARE
  v_surat_nomor TEXT;
  v_created_by UUID;
  v_status TEXT;
BEGIN
  SELECT nomor_surat, created_by INTO v_surat_nomor, v_created_by
  FROM public.surat_keluar WHERE id = NEW.surat_keluar_id;

  v_status := CASE WHEN NEW.action = 'approved' THEN 'disetujui' ELSE 'ditolak' END;

  IF COALESCE(v_created_by, auth.uid()) IS NOT NULL THEN
    -- Simpan catatan di dalam pesan notifikasi. Dipisah dengan delimiter khusus "|||"
    -- agar front-end bisa memisahkannya nanti jika ingin membuat modal klik.
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      COALESCE(v_created_by, auth.uid()), 
      'Status Surat: ' || upper(v_status), 
      'Surat keluar ' || v_surat_nomor || ' telah ' || v_status || '.|||' || COALESCE(NEW.catatan, '-')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_approvals_insert ON public.approvals;
CREATE TRIGGER on_approvals_insert
  AFTER INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.handle_approvals_notif();

-- 7. ENABLE REAL-TIME FOR NOTIFICATIONS
-- Ini sangat penting! Supabase secara default tidak memancarkan event realtime
-- untuk tabel baru sampai kita memasukkannya ke publication 'supabase_realtime'.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
