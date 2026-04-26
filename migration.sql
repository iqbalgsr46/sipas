-- ============================================
-- SIPAS DATABASE MIGRATION: Roles, Permissions, & Storage
-- ============================================

-- 1. Create Roles & Permissions Tables
CREATE TABLE IF NOT EXISTS roles (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name   TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE ON UPDATE CASCADE,
    resource    TEXT NOT NULL, -- e.g., 'surat_masuk', 'surat_keluar'
    action      TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_name, resource, action)
);

-- Trigger updated_at for roles
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles if empty
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator dengan akses penuh'),
    ('pimpinan', 'Pimpinan untuk memberikan persetujuan'),
    ('user', 'Staf / pengguna biasa')
ON CONFLICT (name) DO NOTHING;

-- Drop old check constraint (if exists from original schema)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- INSERT any roles from users table not yet in roles (safety net)
INSERT INTO roles (name)
SELECT DISTINCT role FROM users WHERE role NOT IN (SELECT name FROM roles);

-- Drop FK first so this script is safe to re-run, then re-add
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_fkey;
ALTER TABLE users ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE;

-- Default permissions for admin (example)
INSERT INTO role_permissions (role_name, resource, action) VALUES
    ('admin', 'surat_masuk', 'create'),
    ('admin', 'surat_masuk', 'read'),
    ('admin', 'surat_masuk', 'update'),
    ('admin', 'surat_masuk', 'delete'),
    ('admin', 'surat_keluar', 'create'),
    ('admin', 'surat_keluar', 'read'),
    ('admin', 'surat_keluar', 'update'),
    ('admin', 'surat_keluar', 'delete')
ON CONFLICT DO NOTHING;

-- RLS for roles & role_permissions
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua orang bisa melihat roles" ON roles;
CREATE POLICY "Semua orang bisa melihat roles" ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin bisa kelola roles" ON roles;
CREATE POLICY "Admin bisa kelola roles" ON roles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Semua orang bisa melihat permissions" ON role_permissions;
CREATE POLICY "Semua orang bisa melihat permissions" ON role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin bisa kelola permissions" ON role_permissions;
CREATE POLICY "Admin bisa kelola permissions" ON role_permissions FOR ALL USING (public.is_admin());

-- 2. Setup Storage for PDF files
-- This part creates the bucket 'documents' if using standard Supabase postgres.
-- (Note: Storage API is usually managed via Supabase Dashboard, but we can insert into storage.buckets)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public read access to documents
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'documents' );

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Auth Users Upload" ON storage.objects;
CREATE POLICY "Auth Users Upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Auth Users Update" ON storage.objects;
CREATE POLICY "Auth Users Update" ON storage.objects FOR UPDATE USING (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Auth Users Delete" ON storage.objects;
CREATE POLICY "Auth Users Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
);
