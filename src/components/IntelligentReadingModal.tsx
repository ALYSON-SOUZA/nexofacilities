import React, { useState, useRef } from "react";
import { X, Sparkles, Loader2, Upload, FileText, Image, CheckCircle } from "lucide-react";
import { QuoteItem } from "../types";
import { EmojiButton } from "./EmojiButton";

interface IntelligentReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  onMarkItemsAsBought: (matchedItemIds: string[]) => void;
}

export default function IntelligentReadingModal({
  isOpen,
  onClose,
  items,
  onMarkItemsAsBought,
}: IntelligentReadingModalProps) {
  const [pasteText, setPasteText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, envie apenas arquivos de imagem (JPEG, PNG, WEBP).");
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setImageBase64(base64Data);
      setImageMimeType(file.type);
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageBase64(null);
    setImageMimeType(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!pasteText.trim() && !imageBase64) {
      setError("Por favor, cole um texto ou envie uma imagem (nota fiscal, comprovante, print, etc.) para análise.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisSummary(null);
    setMatchedCount(null);

    try {
      const response = await fetch("/api/gemini/analyze-purchase-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: pasteText,
          imageBase64,
          imageMimeType,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha na comunicação com o servidor de inteligência artificial.");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysisSummary(data.summary || "Análise concluída, porém nenhum resumo foi gerado.");
      const matchedIds = Array.isArray(data.matchedItemIds) ? data.matchedItemIds : [];
      setMatchedCount(matchedIds.length);

      if (matchedIds.length > 0) {
        onMarkItemsAsBought(matchedIds);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocorreu um erro desconhecido ao processar a leitura inteligente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#ff2a6d]/10 text-[#ff2a6d] rounded-lg">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-[14px] font-black uppercase text-slate-850 tracking-wide">
                Leitura Inteligente de Compras
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                Marcar itens comprados via analysis IA (Imagem ou Texto)
              </p>
            </div>
          </div>
          <EmojiButton
            iconKey="fechar"
            onClick={onClose}
            size="sm"
            variant="neutral"
            className="h-8 w-8 min-h-[32px] min-w-[32px] border-0 bg-transparent hover:bg-slate-200"
          />
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
            Instruções: Forneça abaixo uma imagem da nota fiscal/comprovante ou cole o texto do pedido (print de conversa, lista, etc.). A inteligência artificial identificará os produtos e os marcará automaticamente como <span className="text-[#ff2a6d]">comprados/pagos</span> na cotação ativa.
          </p>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-black text-rose-700 uppercase">
              ⚠️ {error}
            </div>
          )}

          {/* Input Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image upload */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="mb-2 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Enviar Comprovante/Foto
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase block">
                  Formatos aceitos: Imagens (.jpg, .png, etc.)
                </span>
              </div>

              {!imageBase64 ? (
                <div className="w-full h-24 border-2 border-dashed border-slate-300 hover:border-[#ff2a6d] rounded-xl flex items-center justify-center bg-white">
                  <EmojiButton
                    iconKey="docs"
                    onClick={() => fileInputRef.current?.click()}
                    size="md"
                    variant="neutral"
                  />
                </div>
              ) : (
                <div className="w-full border border-slate-200 bg-white rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                      <Image className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-black text-slate-700 truncate block">
                      {fileName || "imagem_carregada.png"}
                    </span>
                  </div>
                  <EmojiButton
                    iconKey="limpar"
                    onClick={handleClearImage}
                    size="sm"
                    variant="danger"
                  />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Text Paste Area */}
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Cole o Texto/Nota (Opcional)
              </span>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Cole aqui a lista de compras, descrição de conversa ou texto extraído da Nota Fiscal..."
                className="w-full flex-1 min-h-[120px] p-3 text-[11px] font-bold text-slate-800 border border-slate-200 rounded-xl focus:border-[#ff2a6d] focus:ring-1 focus:ring-[#ff2a6d]/10 outline-none resize-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            {isAnalyzing ? (
              <div className="h-12 w-12 flex items-center justify-center bg-slate-100 rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin text-[#ff2a6d]" />
              </div>
            ) : (
              <EmojiButton
                iconKey="iniciarComparador"
                onClick={handleAnalyze}
                size="md"
                variant="primary"
              />
            )}
          </div>

          {/* Results Analysis Panel */}
          {analysisSummary && (
            <div className="mt-4 p-4 bg-[#0B4F6C]/5 border border-[#0B4F6C]/15 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-[#0B4F6C] font-black text-[11.5px] uppercase">
                <CheckCircle className="h-4 w-4" />
                Resultado da Análise IA
              </div>
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                {analysisSummary}
              </p>
              {matchedCount !== null && (
                <div className="text-[10px] font-black uppercase text-[#ff2a6d] pt-1">
                  🎯 {matchedCount} {matchedCount === 1 ? 'item foi' : 'itens foram'} identificados e marcados como comprado na planilha!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-150 flex justify-end">
          <EmojiButton
            iconKey="fechar"
            onClick={onClose}
            size="md"
            variant="neutral"
          />
        </div>
      </div>
    </div>
  );
}
