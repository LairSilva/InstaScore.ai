import React, { useEffect, useState } from "react";
import { X, Download, Share2, Copy, CheckCircle } from "lucide-react";
import { generateShareCard } from "../lib/share-card";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  handle?: string;
  score: number;
  targetScore: number;
  strongestCategory: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  userName,
  handle,
  score,
  targetScore,
  strongestCategory,
}: ShareModalProps) {
  const [shareImage, setShareImage] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGenerating(true);
      generateShareCard(
        userName,
        handle || "",
        score,
        targetScore,
        strongestCategory
      ).then((imgData) => {
        setShareImage(imgData);
        setGenerating(false);
      });
    }
  }, [isOpen, userName, handle, score, targetScore, strongestCategory]);

  if (!isOpen) return null;

  const shareText = `Acabei de auditar a conformidade estratégica do meu Instagram no InstaScore.ai e obtive nota ${score}/100 na matriz C.A.G.E.! 🎯 A simulação matemática projeta um Score Alvo de até ${targetScore}/100 com os ajustes estruturais. Conheça a metodologia no InstaScore.ai!`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        // If web share with files is supported, try sharing the canvas blob
        if (shareImage && navigator.canShare) {
          const blob = await (await fetch(shareImage)).blob();
          const file = new File([blob], "instascore-diagnosis.png", { type: "image/png" });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "InstaScore.ai - Diagnóstico Estrutural",
              text: shareText,
            });
            return;
          }
        }
        
        // Fallback to text-only share
        await navigator.share({
          title: "InstaScore.ai - Diagnóstico Estrutural",
          text: shareText,
          url: "https://instascore.ai",
        });
      } catch (err) {
        console.warn("Share cancelled or not completed:", err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div
      id="share-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04050A]/85 backdrop-blur-2xl animate-fade-in"
    >
      <div
        id="share-modal-card"
        className="relative w-full max-w-lg rounded-3xl border border-white/10 glass-panel shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Share2 className="text-[#FA26A0]" size={20} /> Compartilhar meu InstaScore OS
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-xs text-slate-300 leading-relaxed">
            Seu card oficial de auditoria estrutural para publicar no Instagram Stories, LinkedIn ou WhatsApp.
          </p>

          {/* Canvas Image Preview */}
          <div className="relative rounded-2xl border border-white/10 bg-[#080B14] p-2 overflow-hidden flex items-center justify-center shadow-inner">
            {generating ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-4 border-[#E1306C] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono font-bold text-[#FA26A0]">Gerando card V6 HD...</p>
              </div>
            ) : shareImage ? (
              <img
                src={shareImage}
                alt="InstaScore Share Card Preview"
                className="w-full max-h-72 object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-mono">
                Erro ao gerar card de compartilhamento.
              </div>
            )}
          </div>

          {/* Shared Text Block */}
          <div className="bg-[#080B14]/80 rounded-xl p-3.5 border border-white/10">
            <p className="text-[10px] text-[#FA26A0] font-mono font-bold tracking-wider mb-1.5 flex justify-between uppercase">
              <span>Texto Sugerido</span>
              {copied && <span className="text-emerald-400 flex items-center gap-1 font-normal"><CheckCircle size={10} /> Copiado!</span>}
            </p>
            <p className="text-xs text-slate-300 font-mono leading-relaxed select-all">
              {shareText}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {shareImage && (
            <a
              href={shareImage}
              download="meu-instascore.png"
              id="download-share-img"
              className="btn-premium-primary px-4 py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Download size={16} /> Baixar PNG
            </a>
          )}

          <button
            onClick={copyToClipboard}
            id="copy-share-text"
            className="px-4 py-3 bg-[#1A0E33] hover:bg-[#231342] border border-[#E1306C]/30 text-slate-200 hover:text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
          >
            <Copy size={16} /> Copiar Texto
          </button>

          {typeof navigator.share === "function" && (
            <button
              onClick={handleWebShare}
              id="web-share-trigger"
              className="col-span-1 sm:col-span-2 px-4 py-3 bg-gradient-to-r from-[#FF5E36] via-[#E1306C] to-[#833AB4] hover:opacity-95 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(225,48,108,0.35)] cursor-pointer min-h-[44px]"
            >
              <Share2 size={16} /> Compartilhar Direto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
