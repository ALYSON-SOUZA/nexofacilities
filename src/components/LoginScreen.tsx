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

    try {
      await ensureAuthSession(cleanCpf);
    } catch {
      // Proceed even if auth fails (localStorage fallback)
    }

    setTimeout(() => onLogin(cleanName, cpfInput), 400);
  };

  const isFormFilled = nameInput.trim().length >= 3 && cpfInput.replace(/\D/g, "").length === 11;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden" style={{ backgroundColor: "#EAEAEA", backgroundImage: "radial-gradient(#d1d5db 0.5px, transparent 0.5px)", backgroundSize: "24px 24px" }}>
      
      {/* Content */}
      <div
        className="w-full max-w-md relative z-10 transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
        }}
      >
        {/* Logo - Showcase editorial */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1">
            <span className="showcase-title-xl">
              FACILITIES
            </span>
            <span className="showcase-title-xl text-[#FF2E63]">
              BP
            </span>
          </div>
          <div className="w-16 h-[2px] bg-[#FF2E63] mx-auto rounded-full mt-4" />
          <p className="showcase-label mt-4">
            Sistema de Cotações Corporativas
          </p>
        </div>

        {/* Login Card - Showcase editorial */}
        <div className="showcase-card-elevated relative overflow-hidden">
          {/* Left accent bar */}
          <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-[#FF2E63] to-[#A82047]" />

          <div className="showcase-padding pl-8 sm:pl-10">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="showcase-icon showcase-icon-pink">
                  <Shield className="h-4 w-4" />
                </div>
                <h2 className="showcase-title-md">
                  Acesso ao Sistema
                </h2>
              </div>
              <p className="showcase-subtitle pl-11">
                Registre a sua identificação de Operador para registrar cotações com carimbo de auditoria de compras.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NAME FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="full-name" className="showcase-label block">
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
                    className="w-full showcase-input text-[13px] font-medium text-[#252A34] placeholder-slate-400 py-3 pl-4 pr-11"
                    autoFocus
                  />
                  <div className="absolute right-3 top-3 text-slate-400 group-focus-within:text-[#FF2E63] transition-colors duration-200">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* CPF FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="user-cpf" className="showcase-label block">
                  CPF
                </label>
                <div className="relative group">
                  <input
                    id="user-cpf"
                    type="text"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full showcase-input text-[13px] font-medium text-[#252A34] placeholder-slate-400 py-3 pl-4 pr-11"
                  />
                  <div className="absolute right-3 top-3 text-slate-400 group-focus-within:text-[#FF2E63] transition-colors duration-200">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1.5 leading-snug flex items-center gap-1.5">
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
                  className="showcase-btn-primary w-full justify-center text-sm py-3 rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: isFormFilled
                      ? "0 4px 16px rgba(255, 46, 99, 0.35)"
                      : "none",
                  }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 showcase-label">
          <span>Licenciado para BP S.A. • v2.8.0</span>
        </div>
      </div>
    </div>
  );
}
