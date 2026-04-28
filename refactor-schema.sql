-- =============================================
-- SIPAS REFACTOR: SQL Migration Script
-- =============================================
-- Jalankan di Supabase SQL Editor.
-- Script ini menyederhanakan database sesuai kebutuhan baru.
-- =============================================

-- 1. UPDATE ROLE 'user' → 'staf' di tabel users
UPDATE public.users SET role = 'staf' WHERE role = 'user';

-- 2. UPDATE STATUS 'menunggu_approval' → 'diajukan' di surat_keluar
UPDATE public.surat_keluar SET status = 'diajukan' WHERE status = 'menunggu_approval';

-- 3. TAMBAH KOLOM approved_by & approved_at di surat_keluar (jika belum ada)
ALTER TABLE public.surat_keluar 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 4. MIGRASI data approvals lama ke kolom baru di surat_keluar (opsional)
UPDATE public.surat_keluar sk
SET 
  approved_by = a.approved_by,
  approved_at = a.created_at
FROM public.approvals a
WHERE a.surat_keluar_id = sk.id
  AND sk.approved_by IS NULL
  AND a.action IN ('approved', 'rejected');

-- 5. UPDATE trigger on_auth_user_created agar role default = 'staf'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, username, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'staf'),
    'aktif'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pastikan trigger terpasang
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS POLICIES untuk surat_keluar (simplified)
-- Semua user yang login bisa baca semua surat keluar
DROP POLICY IF EXISTS "Semua user bisa baca surat_keluar" ON public.surat_keluar;
CREATE POLICY "Semua user bisa baca surat_keluar" ON public.surat_keluar 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin & Staf bisa insert surat keluar
DROP POLICY IF EXISTS "Admin dan Staf bisa insert surat_keluar" ON public.surat_keluar;
CREATE POLICY "Admin dan Staf bisa insert surat_keluar" ON public.surat_keluar 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'staf'))
  );

-- Admin, Staf (pemilik), dan Pimpinan bisa update surat keluar
DROP POLICY IF EXISTS "Update surat_keluar" ON public.surat_keluar;
CREATE POLICY "Update surat_keluar" ON public.surat_keluar 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'pimpinan' OR (role = 'staf' AND auth.uid() = surat_keluar.created_by))
    )
  );

-- Admin bisa hapus surat keluar
DROP POLICY IF EXISTS "Admin bisa hapus surat_keluar" ON public.surat_keluar;
CREATE POLICY "Admin bisa hapus surat_keluar" ON public.surat_keluar 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. RLS POLICIES untuk surat_masuk (simplified)
DROP POLICY IF EXISTS "Semua user bisa baca surat_masuk" ON public.surat_masuk;
CREATE POLICY "Semua user bisa baca surat_masuk" ON public.surat_masuk 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin dan Staf bisa insert surat_masuk" ON public.surat_masuk;
CREATE POLICY "Admin dan Staf bisa insert surat_masuk" ON public.surat_masuk 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'staf'))
  );

DROP POLICY IF EXISTS "Admin dan Staf bisa update surat_masuk" ON public.surat_masuk;
CREATE POLICY "Admin dan Staf bisa update surat_masuk" ON public.surat_masuk 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'staf'))
  );

DROP POLICY IF EXISTS "Admin bisa hapus surat_masuk" ON public.surat_masuk;
CREATE POLICY "Admin bisa hapus surat_masuk" ON public.surat_masuk 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. Pastikan RLS aktif
ALTER TABLE public.surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 9. RLS untuk users table
DROP POLICY IF EXISTS "Semua user bisa baca users" ON public.users;
CREATE POLICY "Semua user bisa baca users" ON public.users 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin bisa manage users" ON public.users;
CREATE POLICY "Admin bisa manage users" ON public.users 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "User bisa update profil sendiri" ON public.users;
CREATE POLICY "User bisa update profil sendiri" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- 10. Storage bucket (pastikan ada)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "Allow authenticated uploads" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public select" ON storage.objects 
  FOR SELECT USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- DONE! Sistem sudah disederhanakan.
-- Role: admin | staf | pimpinan
-- Status Surat Keluar: draft | diajukan | disetujui | ditolak
-- =============================================
