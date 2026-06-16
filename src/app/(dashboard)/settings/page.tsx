"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import ModalPortal from "@/components/Modal";

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

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [editSecurityOpen, setEditSecurityOpen] = useState(false);

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

  async function handleSaveProfile(e: React.FormEvent) {
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
      setEditProfileOpen(false);
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

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error("Gagal mendapatkan URL foto.");

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", profile.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + "?t=" + Date.now()); 
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

  // Mock save handlers for static sections
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setEditAddressOpen(false);
      showToast("success", "Alamat Diperbarui", "Data alamat berhasil disimpan.");
    }, 600);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setEditSecurityOpen(false);
      showToast("success", "Keamanan Diperbarui", "Data keamanan berhasil disimpan.");
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="material-symbols-outlined animate-spin text-brand-500 text-[40px]">progress_activity</span>
        <p className="text-sm text-gray-500">Memuat profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <span className="material-symbols-outlined text-error-500 text-[60px]">error</span>
        <p className="text-gray-500">Profil tidak ditemukan.</p>
      </div>
    );
  }

  const cleanName = (profile.full_name || "User").replace(/\s*\(.*?\)\s*/g, '');

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] pb-10">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Profil</h2>
      </div>

      {/* 1. Profile Meta Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div
              className="relative group cursor-pointer shrink-0 w-[84px] h-[84px] rounded-full overflow-hidden bg-brand-50 text-brand-500 flex items-center justify-center border border-gray-100 dark:border-gray-800"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold uppercase">
                  {cleanName.charAt(0)}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                {uploadingAvatar ? (
                  <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                    <span className="text-[10px] font-medium mt-0.5">Ubah</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                {cleanName}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5">
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {profile.role}
                </p>
                <div className="hidden sm:block w-px h-3.5 bg-gray-300 dark:bg-gray-700"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Indonesia
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setEditProfileOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 w-full sm:w-auto"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
          <div className="col-span-1 sm:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Nama Lengkap</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.full_name}</p>
          </div>
          <div className="col-span-1 sm:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Username</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.username}</p>
          </div>
          <div className="col-span-1 sm:col-span-2 md:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Email address</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.email}</p>
          </div>
          <div className="col-span-1 sm:col-span-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Role</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">{profile.role}</p>
          </div>
          <div className="col-span-1 sm:col-span-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bergabung</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Address Card (Mock) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Alamat</h3>
          <button 
            onClick={() => setEditAddressOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 w-full sm:w-auto"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Negara</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">Indonesia</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kota/Provinsi</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">Jakarta, ID.</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kode Pos</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">10110</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">NPWP</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">AS4568384</p>
          </div>
        </div>
      </div>

      {/* 3. Security Card (Mock) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Keamanan</h3>
          <button 
            onClick={() => setEditSecurityOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 w-full sm:w-auto"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">Kata Sandi</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Terakhir diubah 3 bulan yang lalu</p>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90 tracking-[0.25em]">••••••••••</p>
          </div>
          <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">Autentikasi Dua Langkah</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tambahkan lapis keamanan ekstra</p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded-md">Nonaktif</span>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Edit Profile Modal */}
      <ModalPortal open={editProfileOpen} onClose={() => setEditProfileOpen(false)}>
        <div className="w-full overflow-y-auto max-h-[90dvh]">
          <div className="p-8 pr-14">
            {/* Header */}
            <div className="mb-7">
              <h4 className="text-[22px] font-bold text-gray-900 dark:text-white mb-1.5">Edit Informasi Pribadi</h4>
              <p className="text-sm text-gray-400 dark:text-gray-500">Perbarui detail Anda agar profil tetap terkini.</p>
            </div>

            {/* Change Profile Picture */}
            <div className="mb-8">
              <h5 className="text-[15px] font-bold text-gray-900 dark:text-white mb-5">Ganti Foto Profil</h5>
              <div className="flex items-center gap-6">
                <div
                  className="relative cursor-pointer shrink-0"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="w-[90px] h-[90px] rounded-full overflow-hidden bg-[#EEF0FF] text-brand-500 flex items-center justify-center border border-gray-100 dark:border-gray-800">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold uppercase text-brand-400">{cleanName.charAt(0)}</span>
                    )}
                  </div>
                  {/* Camera badge */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md">
                    {uploadingAvatar ? (
                      <span className="material-symbols-outlined animate-spin text-[14px] text-gray-500">progress_activity</span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    )}
                  </div>
                  <input
                    ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                  Upload gambar persegi (200×200 px)<br />dalam format JPEG atau PNG.
                </p>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h5 className="text-[15px] font-bold text-gray-900 dark:text-white mb-5">Informasi Pribadi</h5>
              <form onSubmit={handleSaveProfile}>
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 mb-5">
                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all"
                    />
                  </div>
                  {/* Username */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all"
                    />
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Alamat Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  {/* Role */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                    <input
                      type="text"
                      value={profile.role?.toUpperCase()}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Edit Address Modal */}
      <ModalPortal open={editAddressOpen} onClose={() => setEditAddressOpen(false)}>
        <div className="p-6 sm:p-10 w-full max-w-[700px] overflow-y-auto max-h-[90dvh] no-scrollbar">
          <div className="mb-6 lg:mb-8">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">Ubah Alamat</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Perbarui detail Anda agar profil tetap terkini.</p>
          </div>
          
          <form onSubmit={handleSaveAddress} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">Negara</label>
                <input type="text" defaultValue="Indonesia" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">Kota/Provinsi</label>
                <input type="text" defaultValue="Jakarta, ID." className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">Kode Pos</label>
                <input type="text" defaultValue="10110" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">NPWP</label>
                <input type="text" defaultValue="AS4568384" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setEditAddressOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 rounded-full transition-colors shadow-theme-xs">Tutup</button>
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-theme-xs">{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Edit Security Modal */}
      <ModalPortal open={editSecurityOpen} onClose={() => setEditSecurityOpen(false)}>
        <div className="p-6 sm:p-10 w-full max-w-[700px] overflow-y-auto max-h-[90dvh] no-scrollbar">
          <div className="mb-6 lg:mb-8">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">Ubah Keamanan</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Perbarui detail Anda agar profil tetap terkini.</p>
          </div>
          
          <form onSubmit={handleSaveSecurity} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">Kata Sandi Saat Ini</label>
                <input type="password" placeholder="••••••••••" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2.5">Kata Sandi Baru</label>
                <input type="password" placeholder="Masukkan kata sandi baru" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-theme-xs" />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setEditSecurityOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 rounded-full transition-colors shadow-theme-xs">Tutup</button>
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-theme-xs">{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
            </div>
          </form>
        </div>
      </ModalPortal>

    </div>
  );
}
