import React, { useState, useEffect } from "react";
import { User, FileText, ArrowRight } from "lucide-react";
import { ensureAuthSession } from "../supabaseClient";

interface LoginScreenProps {
  onLogin: (fullName: string, cpf: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [nameInput, setNameInput] = useState("");
  const [cpfInput, setCpfInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCPF(rawValue);
    if (formatted.replace(/\D/g, "").length <= 11) {
      setCpfInput(formatted);
      if (error) setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    const cleanCpf = cpfInput.replace(/\D/g, "");

    if (cleanName.length < 3) {
      setError("Por favor, digite seu nome de forma correta (mínimo de 3 caracteres).");
      return;
    }
    if (cleanCpf.length !== 11) {
      setError("Por favor, informe um CPF válido com 11 dígitos.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Establish Supabase Auth session for RLS policies
    try {
      await ensureAuthSession(cleanCpf);
    } catch {
      // Proceed even if auth fails (localStorage fallback)
    }

    setTimeout(() => onLogin(cleanName, cpfInput), 400);
  };

  const isFormFilled = nameInput.trim().length >= 3 && cpfInput.replace(/\D/g, "").length === 11;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-white to-pink-50/40 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff2a6d] via-pink-400 to-[#ff2a6d]" />
      <div
        className="absolute top-[8%] left-[-12%] w-[55%] h-[55%] rounded-full blur-3xl transition-all duration-[3000ms] ease-out"
        style={{
          background: "radial-gradient(circle, rgba(255,46,99,0.06) 0%, rgba(255,46,99,0.02) 50%, transparent 70%)",
          transform: mounted ? "translate(0, 0) scale(1)" : "translate(-20px, -20px) scale(0.95)",
        }}
      />
      <div
        className="absolute bottom-[-8%] right-[-8%] w-[45%] h-[45%] rounded-full blur-3xl transition-all duration-[3000ms] ease-out delay-300"
        style={{
          background: "radial-gradient(circle, rgba(8,255,42,109,0.06) 0%, transparent 60%)",
          transform: mounted ? "translate(0, 0) scale(1)" : "translate(20px, 20px) scale(0.95)",
        }}
      />

      <div
        className="w-full max-w-md relative z-10 transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#111c2e]">
              FACILITIES <span className="text-[#ff2a6d]">BP</span>
            </span>
          </div>
          <div className="w-16 h-1 bg-gradient-to-r from-[#ff2a6d] to-pink-400 mx-auto rounded-full mt-3" />
        </div>

        {/* Login Card */}
        <div
          className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/60 p-8 relative overflow-hidden transition-shadow duration-500 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          style={{
            boxShadow: "0 15px 45px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          {/* Accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#ff2a6d] via-[#ff2a6d] to-pink-300 rounded-l-xl" />

          <div className="pl-3">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-[#111c2e] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#ff2a6d] shrink-0 animate-pulse-slow" />
                Acesso ao Sistema
              </h2>
              <p className="text-[11px] text-slate-450 mt-2.5 leading-relaxed font-medium">
                Registre a sua identificação de Operador para registrar cotações com carimbo de auditoria de compras.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NAME FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="full-name" className="text-[11px] font-extrabold uppercase tracking-widest text-slate-800 block">
                  NOME
                </label>
                <div className="relative group">
                  <input
                    id="full-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Ex: SEU NOME"
                    className="w-full bg-[#F4F6F9]/70 text-[13px] font-bold text-[#111c2e] placeholder-slate-400 border border-slate-150 rounded-lg py-3 pl-4 pr-11 focus:outline-hidden focus:ring-2 focus:ring-[#ff2a6d]/12 focus:border-[#ff2a6d]/60 focus:bg-white transition-all duration-300"
                    autoFocus
                  />
                  <div className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#ff2a6d] transition-colors duration-300">
                    <User className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>

              {/* CPF FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="user-cpf" className="text-[11px] font-extrabold uppercase tracking-widest text-slate-800 block">
                  CPF
                </label>
                <div className="relative group">
                  <input
                    id="user-cpf"
                    type="text"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#F4F6F9]/70 text-[13px] font-bold text-[#111c2e] placeholder-slate-400 border border-slate-150 rounded-lg py-3 pl-4 pr-11 focus:outline-hidden focus:ring-2 focus:ring-[#ff2a6d]/12 focus:border-[#ff2a6d]/60 focus:bg-white transition-all duration-300"
                  />
                  <div className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#ff2a6d] transition-colors duration-300">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1.5 leading-snug flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex justify-center pt-3">
                <button
                  type="submit"
                  disabled={!isFormFilled || isSubmitting}
                  className="group relative w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: isFormFilled
                      ? "linear-gradient(135deg, #ff2a6d 0%, #c21e54 50%, #ff2a6d 100%)"
                      : "#cbd5e1",
                    boxShadow: isFormFilled
                      ? "0 8px 25px -5px rgba(255,42,109,0.35), 0 4px 10px -3px rgba(255,42,109,0.2)"
                      : "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight
                      className="h-6 w-6 text-white transition-transform duration-200 group-hover:translate-x-0.5 group-active:scale-90"
                      strokeWidth={2.5}
                    />
                  )}
                  {/* Hover ring */}
                  {isFormFilled && !isSubmitting && (
                    <div className="absolute inset-0 rounded-lg ring-2 ring-[#ff2a6d]/0 group-hover:ring-[#ff2a6d]/20 transition-all duration-300" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
          <span>Licenciado para BP S.A. • v2.8.0</span>
        </div>
      </div>
    </div>
  );
}
