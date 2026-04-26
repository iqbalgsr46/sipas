-- ============================================
-- SIPAS DATABASE SCHEMA
-- Sistem Informasi Persuratan
-- ============================================
-- 
-- Cara menggunakan:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste seluruh isi file ini
-- 3. Klik "Run" untuk membuat semua tabel
--
-- ============================================

-- Aktifkan UUID extension (untuk generate ID otomatis)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================
-- TABEL 1: users (Pengguna Sistem)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name   TEXT NOT NULL,
    username    TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL DEFAULT 'user' 
                CHECK (role IN ('admin', 'user', 'pimpinan')),
    status      TEXT NOT NULL DEFAULT 'aktif' 
                CHECK (status IN ('aktif', 'nonaktif')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Komentar tabel
COMMENT ON TABLE users IS 'Data pengguna sistem SIPAS';
COMMENT ON COLUMN users.role IS 'Role: admin (full akses), user (staf), pimpinan (approval)';
COMMENT ON COLUMN users.status IS 'Status akun: aktif atau nonaktif';


-- ============================================
-- TABEL 2: surat_masuk (Surat yang Diterima)
-- ============================================
CREATE TABLE IF NOT EXISTS surat_masuk (
    id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nomor_surat       TEXT NOT NULL,
    pengirim          TEXT NOT NULL,
    perihal           TEXT NOT NULL,
    tanggal_surat     DATE NOT NULL,
    tanggal_diterima  DATE NOT NULL DEFAULT CURRENT_DATE,
    status            TEXT NOT NULL DEFAULT 'belum_dibaca' 
                      CHECK (status IN ('belum_dibaca', 'diproses', 'selesai')),
    keterangan        TEXT,
    file_url          TEXT,
    registered_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE surat_masuk IS 'Data surat masuk yang diterima instansi';
COMMENT ON COLUMN surat_masuk.nomor_surat IS 'Nomor surat, contoh: SM-2023/10/001';
COMMENT ON COLUMN surat_masuk.registered_by IS 'ID user yang menginput surat';


-- ============================================
-- TABEL 3: surat_keluar (Surat yang Dikirim)
-- ============================================
CREATE TABLE IF NOT EXISTS surat_keluar (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nomor_surat     TEXT NOT NULL,
    tujuan          TEXT NOT NULL,
    perihal         TEXT NOT NULL,
    tanggal_surat   DATE NOT NULL DEFAULT CURRENT_DATE,
    status          TEXT NOT NULL DEFAULT 'draft' 
                    CHECK (status IN ('draft', 'menunggu_approval', 'disetujui', 'ditolak')),
    konten          TEXT,
    file_url        TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE surat_keluar IS 'Data surat keluar yang dikirim instansi';
COMMENT ON COLUMN surat_keluar.status IS 'Alur: draft → menunggu_approval → disetujui/ditolak';


-- ============================================
-- TABEL 4: disposisi (Penugasan Surat Masuk)
-- ============================================
CREATE TABLE IF NOT EXISTS disposisi (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surat_masuk_id  UUID NOT NULL REFERENCES surat_masuk(id) ON DELETE CASCADE,
    assigned_to     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catatan         TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'selesai')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE disposisi IS 'Disposisi/penugasan surat masuk ke pegawai';


-- ============================================
-- TABEL 5: approvals (Persetujuan Surat Keluar)
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
    id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surat_keluar_id  UUID NOT NULL REFERENCES surat_keluar(id) ON DELETE CASCADE,
    approved_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action           TEXT NOT NULL 
                     CHECK (action IN ('approved', 'rejected')),
    catatan          TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approvals IS 'Log approval/penolakan surat keluar oleh pimpinan';


-- ============================================
-- FUNCTION: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update updated_at pada setiap UPDATE
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_surat_masuk_updated_at ON surat_masuk;
CREATE TRIGGER trigger_surat_masuk_updated_at
    BEFORE UPDATE ON surat_masuk
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_surat_keluar_updated_at ON surat_keluar;
CREATE TRIGGER trigger_surat_keluar_updated_at
    BEFORE UPDATE ON surat_keluar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEX untuk performa query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_surat_masuk_status ON surat_masuk(status);
CREATE INDEX IF NOT EXISTS idx_surat_masuk_tanggal ON surat_masuk(tanggal_diterima);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_status ON surat_keluar(status);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_tanggal ON surat_keluar(tanggal_surat);
CREATE INDEX IF NOT EXISTS idx_approvals_surat ON approvals(surat_keluar_id);
CREATE INDEX IF NOT EXISTS idx_disposisi_surat ON disposisi(surat_masuk_id);


-- ============================================
-- DATA SAMPLE (Opsional - untuk testing)
-- ============================================

-- Insert sample users
INSERT INTO users (full_name, username, email, role, status) VALUES
    ('Wulan (Admin)', 'wulan', 'wulan@sipas.go.id', 'admin', 'aktif'),
    ('Zidan (Staf)', 'zidan', 'zidan@sipas.go.id', 'user', 'aktif'),
    ('Iqbal (Pimpinan)', 'iqbal', 'iqbal@sipas.go.id', 'pimpinan', 'aktif')
ON CONFLICT (username) DO NOTHING;

-- Insert sample surat masuk
INSERT INTO surat_masuk (nomor_surat, pengirim, perihal, tanggal_surat, tanggal_diterima, status) VALUES
    ('SM-2023/10/001', 'Kementerian Dalam Negeri', 'Undangan Rapat Koordinasi Nasional', '2023-10-10', '2023-10-12', 'belum_dibaca'),
    ('SM-2023/10/002', 'Dinas Pendidikan Provinsi', 'Laporan Kinerja Triwulan III', '2023-10-09', '2023-10-11', 'diproses'),
    ('SM-2023/10/003', 'PT. Teknologi Nusantara', 'Penawaran Pengadaan Perangkat Keras', '2023-10-07', '2023-10-09', 'selesai'),
    ('SM-2023/10/004', 'Sekretariat Daerah', 'Edaran Hari Libur Nasional 2024', '2023-10-06', '2023-10-08', 'selesai');

-- Insert sample surat keluar
INSERT INTO surat_keluar (nomor_surat, tujuan, perihal, tanggal_surat, status, konten) VALUES
    ('B-102/SET/2023', 'Kementerian Dalam Negeri', 'Laporan Evaluasi Kinerja Triwulan III', '2023-10-12', 'draft', 'Isi surat draft...'),
    ('B-101/SET/2023', 'Dinas Pendidikan Provinsi', 'Undangan Rapat Koordinasi Anggaran 2024', '2023-10-10', 'disetujui', 'Isi surat yang sudah disetujui...'),
    ('B-100/SET/2023', 'Bappeda Kota', 'Permohonan Data Demografi Terkini', '2023-10-08', 'menunggu_approval', 'Isi surat menunggu approval...'),
    ('B-099/SET/2023', 'Inspektorat Daerah', 'Tanggapan atas Temuan Audit Internal', '2023-10-05', 'ditolak', 'Isi surat yang ditolak...');


-- ============================================
-- TABEL 6: notifications (Notifikasi User)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - REAL IMPLEMENTATION
-- ============================================
-- Mengaktifkan RLS untuk semua tabel
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposisi ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. Helper function untuk cek role tanpa infinite recursion (RLS bypass)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Policies untuk tabel 'users' (Profiles)
-- Admin bisa lihat semua, User/Pimpinan bisa lihat semua profil (untuk referensi)
DROP POLICY IF EXISTS "Semua orang bisa melihat profil" ON users;
CREATE POLICY "Semua orang bisa melihat profil" ON users FOR SELECT USING (true);

-- Hanya Admin yang bisa insert/update/delete semua profil
DROP POLICY IF EXISTS "Admin bisa kelola profil" ON users;
CREATE POLICY "Admin bisa kelola profil" ON users FOR ALL USING (
    public.is_admin()
);

-- User bisa update profil mereka sendiri (untuk halaman Pengaturan)
DROP POLICY IF EXISTS "User bisa update profil sendiri" ON users;
CREATE POLICY "User bisa update profil sendiri" ON users FOR UPDATE USING (
    id = auth.uid()
);

-- 2. Policies untuk 'surat_masuk'
-- Admin bisa lihat semua, User hanya yang ditugaskan, Pimpinan bisa lihat semua
DROP POLICY IF EXISTS "Akses Surat Masuk (Baca)" ON surat_masuk;
CREATE POLICY "Akses Surat Masuk (Baca)" ON surat_masuk FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'pimpinan') OR
    registered_by = auth.uid() OR
    id IN (SELECT surat_masuk_id FROM disposisi WHERE assigned_to = auth.uid())
);
-- Admin dan User bisa insert
DROP POLICY IF EXISTS "Akses Surat Masuk (Tulis)" ON surat_masuk;
CREATE POLICY "Akses Surat Masuk (Tulis)" ON surat_masuk FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'user')
);
-- Update: Hanya admin atau pembuat surat
DROP POLICY IF EXISTS "Akses Surat Masuk (Update)" ON surat_masuk;
CREATE POLICY "Akses Surat Masuk (Update)" ON surat_masuk FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' OR
    registered_by = auth.uid()
);
-- Delete: Hanya admin
DROP POLICY IF EXISTS "Akses Surat Masuk (Hapus)" ON surat_masuk;
CREATE POLICY "Akses Surat Masuk (Hapus)" ON surat_masuk FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 3. Policies untuk 'surat_keluar'
DROP POLICY IF EXISTS "Akses Surat Keluar (Baca)" ON surat_keluar;
CREATE POLICY "Akses Surat Keluar (Baca)" ON surat_keluar FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'pimpinan') OR
    created_by = auth.uid()
);
DROP POLICY IF EXISTS "Akses Surat Keluar (Tulis)" ON surat_keluar;
CREATE POLICY "Akses Surat Keluar (Tulis)" ON surat_keluar FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'user')
);
DROP POLICY IF EXISTS "Akses Surat Keluar (Update)" ON surat_keluar;
CREATE POLICY "Akses Surat Keluar (Update)" ON surat_keluar FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' OR
    created_by = auth.uid()
);
DROP POLICY IF EXISTS "Akses Surat Keluar (Hapus)" ON surat_keluar;
CREATE POLICY "Akses Surat Keluar (Hapus)" ON surat_keluar FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 4. Policies untuk 'notifications'
-- User hanya bisa melihat, update, dan hapus notifikasinya sendiri
DROP POLICY IF EXISTS "User akses notifikasi sendiri" ON notifications;
CREATE POLICY "User akses notifikasi sendiri" ON notifications FOR ALL USING (
    user_id = auth.uid()
);

-- Note: RLS di atas sangat ketat dan bergantung pada integrasi Supabase Auth (auth.uid()).

-- ============================================
-- TRIGGER: Sinkronisasi auth.users ke public.users
-- ============================================
-- Fungsi untuk menyalin data dari auth.users ke public.users saat register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Generate unique username fallback
  base_username := split_part(new.email, '@', 1);
  final_username := COALESCE(new.raw_user_meta_data->>'username', base_username || '_' || substr(md5(random()::text), 1, 4));

  INSERT INTO public.users (id, email, username, full_name, role, status)
  VALUES (
    new.id, 
    new.email, 
    final_username,
    COALESCE(new.raw_user_meta_data->>'full_name', base_username),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    'aktif'
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Mencegah error database menghentikan proses registrasi auth
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pada auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Auto-Notifikasi Approval
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_approval_notif()
RETURNS trigger AS $$
BEGIN
  -- Jika status berubah menjadi 'menunggu_approval'
  IF NEW.status = 'menunggu_approval' AND OLD.status != 'menunggu_approval' THEN
    -- Kirim notifikasi ke semua user dengan role 'pimpinan'
    INSERT INTO public.notifications (user_id, title, message)
    SELECT id, 'Menunggu Approval', 'Surat keluar ' || NEW.nomor_surat || ' menunggu persetujuan Anda.'
    FROM public.users WHERE role = 'pimpinan';
  END IF;

  -- Jika status berubah menjadi 'disetujui' atau 'ditolak'
  IF (NEW.status = 'disetujui' OR NEW.status = 'ditolak') AND OLD.status != NEW.status THEN
    -- Kirim notifikasi kembali ke pembuat surat
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.created_by, 
      'Status Surat: ' || upper(NEW.status), 
      'Surat keluar ' || NEW.nomor_surat || ' telah ' || NEW.status || '.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_surat_keluar_status_change ON surat_keluar;
CREATE TRIGGER on_surat_keluar_status_change
  AFTER UPDATE ON surat_keluar
  FOR EACH ROW EXECUTE FUNCTION public.handle_surat_keluar_approval_notif();
