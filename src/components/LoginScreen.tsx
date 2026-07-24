import React, { useState, useEffect } from "react";
import { User, FileText, ArrowRight, Shield } from "lucide-react";
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
    const t = setTimeout(() => setMounted(true), 80);
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

    try {
      await ensureAuthSession(cleanCpf);
    } catch {
      // Proceed even if auth fails (localStorage fallback)
    }

    setTimeout(() => onLogin(cleanName, cpfInput), 400);
  };

  const isFormFilled = nameInput.trim().length >= 3 && cpfInput.replace(/\D/g, "").length === 11;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 select-none"
      style={{
        backgroundColor: "#f8fafc",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              FACILITIES
            </span>
            <span className="text-2xl font-bold tracking-tight text-blue-600">
              BP
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-2 tracking-wide uppercase">
            Sistema de Cotações Corporativas
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                Acesso ao Sistema
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-[38px]">
              Registre sua identificação para registrar cotações com carimbo de auditoria.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NAME FIELD */}
            <div>
              <label htmlFor="full-name" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome
              </label>
              <div className="relative">
                <input
                  id="full-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Seu nome completo"
                  className="w-full text-[13px] font-medium text-slate-900 placeholder-slate-300 py-2.5 px-3 pr-9 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  autoFocus
                />
                <div className="absolute right-3 top-2.5 text-slate-300">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* CPF FIELD */}
            <div>
              <label htmlFor="user-cpf" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                CPF
              </label>
              <div className="relative">
                <input
                  id="user-cpf"
                  type="text"
                  value={cpfInput}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full text-[13px] font-medium text-slate-900 placeholder-slate-300 py-2.5 px-3 pr-9 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
                <div className="absolute right-3 top-2.5 text-slate-300">
                  <FileText className="h-3.5 w-3.5" />
                </div>
              </div>
              {error && (
                <p className="text-[11px] text-red-500 font-medium mt-1.5 leading-snug">
                  {error}
                </p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormFilled || isSubmitting}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold uppercase tracking-wide text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
            Licenciado para BP S.A. • v2.8.0
          </span>
        </div>
      </div>
    </div>
  );
}
