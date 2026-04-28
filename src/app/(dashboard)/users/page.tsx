"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import type { User } from "@/types/database";

export default function UsersPage() {
  // ── ALL HOOKS FIRST ───────────────────────────────────────────
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "staf" as User["role"],
    status: "aktif" as User["status"],
  });

  // ── Fetch (memoized so it can be called from multiple effects) ─
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterRole) query = query.eq("role", filterRole);
    if (filterStatus) query = query.eq("status", filterStatus);
    if (searchQuery) query = query.ilike("full_name", `%${searchQuery}%`);

    const { data, error } = (await query) as { data: User[] | null; error: any };
    if (error) showToast("error", "Gagal Memuat Data", error.message);
    else setUsers(data ?? []);
    setLoading(false);
  }, [filterRole, filterStatus, searchQuery]); // eslint-disable-line

  // ── Role check on mount ───────────────────────────────────────
  useEffect(() => {
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.role === "admin") {
        setIsAdmin(true);
      }
    }
    setRoleChecked(true);
  }, []);

  // ── Fetch when admin confirmed or filters change ──────────────
  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // ── Access Guard (after all hooks) ───────────────────────────
  if (roleChecked && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <span className="material-symbols-outlined text-error text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold font-public-sans text-on-surface">Akses Ditolak</h2>
        <p className="text-on-surface-variant text-center max-w-md">
          Halaman ini hanya dapat diakses oleh Administrator sistem.
        </p>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────
  const EMPTY_FORM = {
    full_name: "", username: "", email: "", password: "",
    role: "staf" as User["role"], status: "aktif" as User["status"],
  };

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModal("create");
  }

  function openEdit(user: User) {
    setForm({ full_name: user.full_name, username: user.username, email: user.email, password: "", role: user.role, status: user.status });
    setEditingId(user.id);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
  }

  // ── Validate ──────────────────────────────────────────────────
  function validate() {
    if (!form.full_name.trim()) { showToast("warning", "Validasi", "Nama lengkap wajib diisi."); return false; }
    if (!form.username.trim()) { showToast("warning", "Validasi", "Username wajib diisi."); return false; }
    if (!form.email.trim()) { showToast("warning", "Validasi", "Email wajib diisi."); return false; }
    if (modal === "create" && (!form.password || form.password.length < 6)) {
      showToast("warning", "Validasi", "Password minimal 6 karakter."); return false;
    }
    return true;
  }

  // ── Create ────────────────────────────────────────────────────
  async function handleCreate() {
    if (!validate()) return;
    setSubmitting(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast("error", "Gagal Membuat User", data.error ?? "Unknown error");
    } else {
      showToast("success", "User Berhasil Dibuat", `Email: ${form.email}`);
      closeModal();
      fetchUsers();
    }
    setSubmitting(false);
  }

  // ── Update ────────────────────────────────────────────────────
  async function handleUpdate() {
    if (!editingId || !validate()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
        status: form.status,
      } as any)
      .eq("id", editingId);

    if (error) {
      showToast("error", "Gagal Update User", error.message);
    } else {
      showToast("success", "User Berhasil Diperbarui");
      closeModal();
      fetchUsers();
    }
    setSubmitting(false);
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("users").delete().eq("id", confirmDeleteId);
    if (error) showToast("error", "Gagal Menghapus", error.message);
    else { showToast("info", "User Dihapus"); fetchUsers(); }
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "edit") handleUpdate();
    else handleCreate();
  }

  const roleBadgeCls = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-error-container text-on-error-container",
      staf: "bg-secondary-container text-on-secondary-container",
      pimpinan: "bg-primary-container text-on-primary-container",
    };
    return map[role] ?? "bg-surface-variant text-on-surface-variant";
  };

  const inputCls = "w-full px-3.5 py-2.5 border border-outline-variant rounded-lg text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline/60";

  // ── Form Modal Content ────────────────────────────────────────
  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
      <div>
        <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          Nama Lengkap <span className="text-error normal-case tracking-normal">*</span>
        </label>
        <input className={inputCls} type="text" placeholder="Nama lengkap beserta gelar" required
          value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>

      <div>
        <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          Username <span className="text-error normal-case tracking-normal">*</span>
        </label>
        <input className={inputCls} type="text" placeholder="nama.pengguna" required
          value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </div>

      <div>
        <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          Email <span className="text-error normal-case tracking-normal">*</span>
        </label>
        <input
          className={`${inputCls} ${modal === "edit" ? "opacity-60 cursor-not-allowed" : ""}`}
          type="email" placeholder="email@instansi.go.id" required
          disabled={modal === "edit"}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {modal === "edit" && (
          <p className="font-inter text-xs text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">lock</span>Email tidak dapat diubah
          </p>
        )}
      </div>

      {modal === "create" && (
        <div>
          <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Password <span className="text-error normal-case tracking-normal">*</span>
          </label>
          <input className={inputCls} type="password" placeholder="Minimal 6 karakter" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Role</label>
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}>
            <option value="admin">Admin</option>
            <option value="staf">Staf</option>
            <option value="pimpinan">Pimpinan</option>
          </select>
        </div>
        <div>
          <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Status</label>
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as User["status"] })}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "person_add"}</span>{modal === "edit" ? "Simpan" : "Tambah User"}</>}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Manajemen Pengguna</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">Kelola akses, role, dan status pengguna sistem.</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Tambah User
        </button>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[17px]">search</span>
          <input
            type="text" placeholder="Cari nama pengguna..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg bg-surface font-inter text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="px-3.5 py-2 border border-outline-variant rounded-lg font-inter text-sm bg-surface text-on-surface focus:border-primary outline-none">
          <option value="">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="staf">Staf</option>
          <option value="pimpinan">Pimpinan</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 border border-outline-variant rounded-lg font-inter text-sm bg-surface text-on-surface focus:border-primary outline-none">
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Non-aktif</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant">
                  {["Nama", "Username", "Role", "Status", "Bergabung", "Aksi"].map((h) => (
                    <th key={h} className={`py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider ${h === "Aksi" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-inter text-sm divide-y divide-outline-variant">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 ring-1 ring-inset ring-emerald-500/10 shadow-sm">
                          <span className="material-symbols-outlined icon-fill text-[32px] text-emerald-500">group</span>
                        </div>
                        <p className="font-inter text-sm font-medium text-slate-500">Tidak ada pengguna ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-container-low transition-colors group ${user.status === "nonaktif" ? "opacity-55" : ""}`}>
                    <td className="py-3.5 px-4 font-semibold text-on-surface">{user.full_name}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{user.username}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-inter text-[11px] font-bold tracking-wider ${roleBadgeCls(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={user.status} /></td>
                    <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(user)} title="Edit"
                          className="group p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-500/10 transition-all">
                          <span className="material-symbols-outlined text-[19px] group-hover:icon-fill">edit</span>
                        </button>
                        <button onClick={() => setConfirmDeleteId(user.id)} title="Hapus"
                          className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors">
                          <span className="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3.5 border-t border-outline-variant bg-surface-container-lowest">
          <span className="font-inter text-xs text-on-surface-variant">Total: {users.length} pengguna</span>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-[520px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">
                  {modal === "edit" ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                  {modal === "edit" ? `Mengubah akun: ${form.email}` : "Buat akun pengguna baru"}
                </p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {FormContent}
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-[90vw] max-w-[400px] p-6 flex flex-col gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">person_remove</span>
              </div>
              <div>
                <h4 className="font-public-sans text-lg font-bold text-on-surface">Hapus Pengguna?</h4>
                <p className="font-inter text-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  User akan dihapus permanen dari sistem.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                className="w-full py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="w-full py-2.5 bg-error text-on-error rounded-xl font-inter text-sm font-semibold hover:bg-error/90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                {deleting
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>...</>
                  : <><span className="material-symbols-outlined text-[18px]">delete</span>Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
