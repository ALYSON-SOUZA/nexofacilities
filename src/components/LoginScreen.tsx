import React, { useState } from "react";
import { User, ShieldCheck, FileText, ArrowRight, Sparkles } from "lucide-react";
import { EmojiButton } from "./EmojiButton";

interface LoginScreenProps {
  onLogin: (fullName: string, cpf: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [nameInput, setNameInput] = useState("");
  const [cpfInput, setCpfInput] = useState("");
  const [error, setError] = useState("");

  // CPF formatter: transforms raw digits to 000.000.000-00
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
    // limit to CPF pattern length
    if (formatted.replace(/\D/g, "").length <= 11) {
      setCpfInput(formatted);
      if (error) setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    onLogin(cleanName, cpfInput);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Subtle visual ambient background details */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FF2E63]" />
      <div className="absolute top-[10%] left-[-15%] w-[50%] h-[50%] rounded-full bg-pink-50/50 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-slate-50/50 blur-3xl" />

      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        
        {/* Logo and Centered Line exactly as in the reference image */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <span className="text-3.5xl font-black tracking-tight text-slate-850">
              FACILITIES <span className="text-[#FF2E63]">BP</span>
            </span>
          </div>
          <div className="w-16 h-1 bg-[#FF2E63] mx-auto rounded-full mt-3" />
        </div>

        {/* Login White Card with pink left accent border following the rounded corners */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-[0_15px_45px_rgba(0,0,0,0.03)] relative overflow-hidden">
          
          {/* Accent Pink line on the left side, matching rounded corners */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#FF2E63] rounded-l-[32px]" />

          <div className="pl-3">
            {/* Header with Pink Dot and Text */}
            <div className="mb-6">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2E63] shrink-0" />
                Acesso ao Sistema
              </h2>
              <p className="text-[11px] text-slate-450 mt-2 leading-relaxed font-medium">
                Registre a sua identificação de Operador para registrar cotações com carimbo de auditoria de compras.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* NAME FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="full-name" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800 block">
                  NOME
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
                    placeholder="Ex: SEU NOME"
                    className="w-full bg-[#F4F6F9]/60 text-[13px] font-bold text-slate-700 placeholder-slate-400 border border-slate-150 rounded-2xl py-3 pl-4 pr-11 focus:outline-hidden focus:ring-2 focus:ring-[#FF2E63]/15 focus:border-[#FF2E63] transition-all"
                    autoFocus
                  />
                  <div className="absolute right-4 top-3.5 text-slate-400">
                    <User className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>

              {/* CPF FIELD */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="user-cpf" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800 block">
                  CPF
                </label>
                <div className="relative">
                  <input
                    id="user-cpf"
                    type="text"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#F4F6F9]/60 text-[13px] font-bold text-slate-700 placeholder-slate-400 border border-slate-150 rounded-2xl py-3 pl-4 pr-11 focus:outline-hidden focus:ring-2 focus:ring-[#FF2E63]/15 focus:border-[#FF2E63] transition-all"
                  />
                  <div className="absolute right-4 top-3.5 text-slate-400">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1.5 leading-snug">
                    ⚠️ {error}
                  </p>
                )}
              </div>

              {/* CENTERED RED/PINK BUTTON CONTAINING ROCKET EMOJI */}
              <div className="flex justify-center pt-3">
                <button
                  type="submit"
                  className="w-16 h-16 bg-[#FF2E63] hover:bg-[#FF2E63]/95 active:scale-95 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-[#FF2E63]/15 hover:shadow-xl hover:shadow-[#FF2E63]/25 transition-all cursor-pointer group"
                >
                  <span className="text-2.5xl group-hover:scale-110 transition-transform duration-200">
                    🚀
                  </span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center mt-8 text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          <span>Licenciado para BP S.A. • v2.8.0</span>
        </div>

      </div>
    </div>
  );
}
