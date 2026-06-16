"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Email atau password salah.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (!profileError && profile) {
        localStorage.setItem("sipas_user", JSON.stringify(profile));
      } else {
        localStorage.setItem("sipas_user", JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          role: "staf"
        }));
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 font-outfit relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-gray-900 rounded-2xl shadow-theme-xl p-8 sm:p-10 border border-gray-100 dark:border-gray-800">
        {/* Brand / Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 mb-5 relative drop-shadow-sm">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/9d/LAMBANG_KABUPATEN_KARAWANG.svg"
              alt="Lambang Kabupaten Karawang"
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            SIPAS Karawang
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Sistem Informasi Persuratan Digital
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mb-6 p-4 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 border border-error-100 dark:border-error-500/20 rounded-xl text-sm font-medium flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        {/* Forgot password message */}
        {forgotMsg && (
          <div className={`w-full mb-6 p-4 border rounded-xl text-sm font-medium flex items-start gap-2.5 ${
            forgotMsg.startsWith("Gagal") || forgotMsg.startsWith("Masukkan")
              ? "bg-error-50 border-error-100 text-error-600 dark:bg-error-500/10 dark:border-error-500/20 dark:text-error-400"
              : "bg-success-50 border-success-100 text-success-600 dark:bg-success-500/10 dark:border-success-500/20 dark:text-success-500"
          }`}>
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
              {forgotMsg.startsWith("Gagal") || forgotMsg.startsWith("Masukkan") ? "error" : "check_circle"}
            </span>
            <p className="leading-relaxed">{forgotMsg}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@karawangkab.go.id"
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!email.trim()) {
                    setForgotMsg("Masukkan email Anda terlebih dahulu di kolom email.");
                    return;
                  }
                  supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/login`,
                  }).then(({ error }) => {
                    if (error) setForgotMsg("Gagal mengirim email reset: " + error.message);
                    else setForgotMsg("Link reset password telah dikirim ke " + email + ". Periksa inbox Anda.");
                  });
                }}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-brand-500 text-white font-bold text-sm rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] shadow-theme-md shadow-brand-500/25"
          >
            {loading ? (
              <><span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>Memverifikasi…</>
            ) : (
              <><span>Masuk ke Dashboard</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-center text-gray-500 dark:text-gray-500 text-sm font-medium">
        © {new Date().getFullYear()} SIPAS Digital. All rights reserved.
      </p>
    </main>
  );
}
