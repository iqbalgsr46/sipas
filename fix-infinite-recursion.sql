-- =============================================
-- HOTFIX: FIX INFINITE RECURSION PADA TABEL USERS
-- =============================================
-- Masalah "Gagal Memuat Data" disebabkan oleh "Infinite Recursion"
-- pada aturan RLS (Row Level Security) tabel users.
-- =============================================

-- 1. Hapus policy yang menyebabkan infinite recursion (loop tanpa henti)
DROP POLICY IF EXISTS "Admin bisa manage users" ON public.users;

-- 2. Pastikan policy SELECT tetap sederhana (tidak memanggil tabel users lagi)
DROP POLICY IF EXISTS "Semua user bisa baca users" ON public.users;
CREATE POLICY "Semua user bisa baca users" ON public.users 
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Pecah hak Admin (Manage Users) menjadi spesifik untuk Insert, Update, Delete
-- Karena tidak menggunakan "FOR ALL", ini TIDAK AKAN memicu infinite recursion pada saat Select.

DROP POLICY IF EXISTS "Admin bisa insert users" ON public.users;
CREATE POLICY "Admin bisa insert users" ON public.users 
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin bisa update users" ON public.users;
CREATE POLICY "Admin bisa update users" ON public.users 
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin bisa delete users" ON public.users;
CREATE POLICY "Admin bisa delete users" ON public.users 
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
