"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Beams from "@/components/Beams";

/**
 * Halaman Login SIPAS
 * -------------------
 * Menggunakan Supabase Auth untuk autentikasi email + password.
 *
 * Untuk demo/development tanpa Supabase Auth,
 * bisa gunakan login sederhana dengan query ke tabel users.
 */
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
      // ======================================
      // OPSI 1: Login dengan Supabase Auth (REAL IMPLEMENTATION)
      // ======================================
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Email atau password salah.");
      }

      // Ambil data profil dari tabel users untuk disimpan di localStorage (opsional untuk cache UI cepat)
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (!profileError && profile) {
        localStorage.setItem("sipas_user", JSON.stringify(profile));
      } else {
        // Jika gagal ambil profil, tetap simpan data auth basic
        localStorage.setItem("sipas_user", JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          role: "user"
        }));
      }

      // Redirect ke dashboard (Gunakan window.location untuk force middleware membaca cookie baru)
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
    <main className="dark relative w-full h-screen overflow-hidden flex items-center justify-center p-6 bg-surface-container">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      <div className="relative z-10 w-full max-w-[420px] bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 border border-white/10 flex flex-col items-center">
        {/* Brand / Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-4 text-on-primary-container">
            <span className="material-symbols-outlined text-[32px]">mail</span>
          </div>
          <h1 className="font-public-sans text-4xl font-bold text-primary mb-1 tracking-tight">
            SIPAS
          </h1>
          <p className="font-inter text-base text-on-surface-variant">
            Sistem Informasi Persuratan
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          {/* Email Input */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-widest"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">
                  person
                </span>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface font-inter text-base focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 outline-none placeholder:text-outline/70"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label
                htmlFor="password"
                className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-widest"
              >
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
                className="font-inter text-xs text-primary hover:underline transition-colors duration-150"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">lock</span>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full pl-12 pr-12 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface font-inter text-base focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 outline-none placeholder:text-outline/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Forgot password message */}
          {forgotMsg && (
            <div className={`p-3 rounded-lg text-sm font-inter flex items-start gap-2 ${
              forgotMsg.startsWith("Gagal") || forgotMsg.startsWith("Masukkan")
                ? "bg-error-container text-on-error-container"
                : "bg-[#e8f5e9] text-[#1b5e20]"
            }`}>
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                {forgotMsg.startsWith("Gagal") || forgotMsg.startsWith("Masukkan") ? "error" : "check_circle"}
              </span>
              {forgotMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-primary text-on-primary font-inter text-sm font-semibold rounded-lg hover:opacity-90 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <><span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>Memverifikasi…</>
            ) : (
              <><span>Masuk</span><span className="material-symbols-outlined text-[20px]">login</span></>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-center text-on-surface-variant font-inter text-sm">
        © 2024 SIPAS Digital. All rights reserved.
      </p>
    </main>
  );
}
