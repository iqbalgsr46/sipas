/**
 * Database Types for Supabase
 * ============================
 * TypeScript interface yang merepresentasikan
 * struktur database Supabase SIPAS.
 *
 * Setiap tabel memiliki 3 bagian:
 * - Row    → Tipe data saat SELECT (baca)
 * - Insert → Tipe data saat INSERT (tambah)
 * - Update → Tipe data saat UPDATE (edit)
 */

// =============================================
// Tipe untuk masing-masing tabel
// =============================================

/** Profil pengguna sistem */
export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "admin" | "user" | "pimpinan";
  status: "aktif" | "nonaktif";
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_name: string;
  resource: string;
  action: string;
  created_at: string;
}

/** Surat yang diterima instansi */
export interface SuratMasuk {
  id: string;
  nomor_surat: string;
  pengirim: string;
  perihal: string;
  tanggal_surat: string;
  tanggal_diterima: string;
  status: "belum_dibaca" | "diproses" | "selesai";
  keterangan: string | null;
  file_url: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Surat yang dikirim keluar instansi */
export interface SuratKeluar {
  id: string;
  nomor_surat: string;
  tujuan: string;
  perihal: string;
  tanggal_surat: string;
  status: "draft" | "menunggu_approval" | "disetujui" | "ditolak";
  konten: string | null;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Disposisi surat masuk ke pegawai */
export interface Disposisi {
  id: string;
  surat_masuk_id: string;
  assigned_to: string;
  catatan: string | null;
  status: "pending" | "selesai";
  created_at: string;
}

/** Catatan persetujuan surat keluar */
export interface Approval {
  id: string;
  surat_keluar_id: string;
  approved_by: string;
  action: "approved" | "rejected";
  catatan: string | null;
  created_at: string;
}

// =============================================
// Insert types (tanpa id dan timestamps)
// =============================================

export type UserInsert = {
  full_name: string;
  username: string;
  email: string;
  role?: "admin" | "user" | "pimpinan";
  status?: "aktif" | "nonaktif";
};

export type SuratMasukInsert = {
  nomor_surat: string;
  pengirim: string;
  perihal: string;
  tanggal_surat: string;
  tanggal_diterima?: string;
  status?: "belum_dibaca" | "diproses" | "selesai";
  keterangan?: string | null;
  file_url?: string | null;
  registered_by?: string | null;
};

export type SuratKeluarInsert = {
  nomor_surat: string;
  tujuan: string;
  perihal: string;
  tanggal_surat?: string;
  status?: "draft" | "menunggu_approval" | "disetujui" | "ditolak";
  konten?: string | null;
  file_url?: string | null;
  created_by?: string | null;
};

export type ApprovalInsert = {
  surat_keluar_id: string;
  approved_by: string;
  action: "approved" | "rejected";
  catatan?: string | null;
};

// =============================================
// Update types (semua opsional)
// =============================================

export type UserUpdate = Partial<UserInsert>;
export type SuratMasukUpdate = Partial<SuratMasukInsert>;
export type SuratKeluarUpdate = Partial<SuratKeluarInsert>;

// =============================================
// Database Schema (untuk generic Supabase client)
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      surat_masuk: {
        Row: SuratMasuk;
        Insert: SuratMasukInsert;
        Update: SuratMasukUpdate;
      };
      surat_keluar: {
        Row: SuratKeluar;
        Insert: SuratKeluarInsert;
        Update: SuratKeluarUpdate;
      };
      disposisi: {
        Row: Disposisi;
        Insert: {
          surat_masuk_id: string;
          assigned_to: string;
          catatan?: string | null;
          status?: "pending" | "selesai";
        };
        Update: {
          catatan?: string | null;
          status?: "pending" | "selesai";
        };
      };
      approvals: {
        Row: Approval;
        Insert: ApprovalInsert;
        Update: Partial<ApprovalInsert>;
      };
      roles: {
        Row: Role;
        Insert: {
          name: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      role_permissions: {
        Row: RolePermission;
        Insert: {
          role_name: string;
          resource: string;
          action: string;
        };
        Update: {
          role_name?: string;
          resource?: string;
          action?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
