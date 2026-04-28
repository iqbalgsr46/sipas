"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setForm({ 
          full_name: data.full_name?.replace(/\s*\(.*?\)\s*/g, '') || "", 
          username: data.username || "" 
        });
        setAvatarUrl(data.avatar_url || null);
      }
    } catch {
      // profile load failed — will show empty state
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!form.full_name.trim() || !form.username.trim()) {
      showToast("warning", "Validasi Gagal", "Nama dan username tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: form.full_name.trim(),
          username: form.username.trim(),
        } as any)
        .eq("id", profile.id);

      if (error) throw error;

      const updatedProfile = { ...profile, ...form };
      setProfile(updatedProfile);
      localStorage.setItem("sipas_user", JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event("profileUpdate"));
      showToast("success", "Profil Diperbarui", "Data Anda berhasil disimpan.");
    } catch (err: any) {
      showToast("error", "Gagal Menyimpan", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      showToast("warning", "Format Salah", "Pilih file gambar (JPG, PNG, dll).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("warning", "Terlalu Besar", "Ukuran maksimal 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `avatars/${profile.id}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error("Gagal mendapatkan URL foto.");

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", profile.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + "?t=" + Date.now()); // cache bust
      const updatedProfile = { ...profile, avatar_url: publicUrl };
      setProfile(updatedProfile);
      localStorage.setItem("sipas_user", JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event("profileUpdate"));
      showToast("success", "Foto Diperbarui", "Foto profil berhasil diupload.");
    } catch (err: any) {
      showToast("error", "Gagal Upload", err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarUpload(file);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">progress_activity</span>
        <p className="font-inter text-sm text-on-surface-variant">Memuat profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <span className="material-symbols-outlined text-error text-[60px]">error</span>
        <p className="text-on-surface-variant font-inter">Profil tidak ditemukan.</p>
      </div>
    );
  }

  const getRoleBadgeStyle = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-error-container text-on-error-container",
      staf: "bg-secondary-container text-on-secondary-container",
      pimpinan: "bg-primary-container text-on-primary-container",
    };
    return map[role] || "bg-surface-variant text-on-surface-variant";
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Page Header */}
      <div>
        <h2 className="font-public-sans text-2xl font-bold text-on-background tracking-tight">Pengaturan Profil</h2>
        <p className="font-inter text-sm text-on-surface-variant mt-1">Kelola informasi akun dan preferensi Anda.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="p-6 sm:p-8 border-b border-outline-variant flex flex-col sm:flex-row items-center gap-6 relative">
          {/* Subtle background decoration */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full">
            {/* Circular Avatar */}
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-surface overflow-hidden bg-primary text-on-primary flex items-center justify-center shadow-md ring-1 ring-outline-variant/50">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl sm:text-5xl font-bold uppercase font-public-sans">
                    {(profile.full_name || "User").replace(/\s*\(.*?\)\s*/g, '').charAt(0)}
                  </span>
                )}
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                {uploadingAvatar ? (
                  <span className="material-symbols-outlined animate-spin text-white text-[28px]">progress_activity</span>
                ) : (
                  <div className="flex flex-col items-center text-white">
                    <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                    <span className="font-inter text-[10px] font-bold mt-1">UBAH</span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface font-public-sans tracking-tight">
                {(profile.full_name || "User").replace(/\s*\(.*?\)\s*/g, '')}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1.5">
                <span className={`inline-flex w-fit mx-auto sm:mx-0 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${getRoleBadgeStyle(profile.role)}`}>
                  {profile.role}
                </span>
                <span className="text-on-surface-variant text-sm font-inter flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  {profile.email}
                </span>
              </div>
              <p className="font-inter text-[11px] text-outline mt-3">
                Format yang didukung: JPG, PNG, GIF • Maks. 2 MB
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSave} className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Email (Read-only) */}
            <div>
              <label className="flex items-center gap-1.5 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-transparent rounded-xl font-inter text-sm text-on-surface-variant cursor-not-allowed"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">
                  lock
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 flex items-center gap-1 font-inter">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                Tidak dapat diubah
              </p>
            </div>

            {/* Role (Read-only) */}
            <div>
              <label className="flex items-center gap-1.5 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[14px]">shield_person</span>
                Role
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-transparent rounded-xl font-inter text-sm text-on-surface-variant cursor-not-allowed uppercase"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">
                  lock
                </span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="flex items-center gap-1.5 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[14px]">person</span>
                Nama Lengkap <span className="text-error normal-case tracking-normal">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nama lengkap Anda"
                required
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-inter text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>

            {/* Username */}
            <div>
              <label className="flex items-center gap-1.5 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                Username <span className="text-error normal-case tracking-normal">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username unik Anda"
                required
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-inter text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-5 border-t border-outline-variant flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-outline font-inter">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                Bergabung: {new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Diperbarui: {new Date(profile.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setForm({ 
                full_name: profile.full_name?.replace(/\s*\(.*?\)\s*/g, '') || "", 
                username: profile.username || "" 
              })}
              className="px-5 py-2.5 border border-outline-variant rounded-xl font-inter text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-inter text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {saving ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span>Simpan Perubahan</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
