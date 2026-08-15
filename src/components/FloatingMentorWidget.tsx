import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrainCircuit, X, Send, Bot, User, Sparkles, ChevronDown, MessageSquare, Minimize2, Maximize2 } from "lucide-react";
import { AnalysisResponse } from "../types";
import { DigitalTwin } from "../core/DigitalTwin";

interface FloatingMentorWidgetProps {
  diagnosisResult: AnalysisResponse;
  digitalTwin?: DigitalTwin | null;
  userName: string;
  onOpenFullMentor?: () => void;
}

export function FloatingMentorWidget({
  diagnosisResult,
  digitalTwin,
  userName,
  onOpenFullMentor
}: FloatingMentorWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "ai"; text: string }>>([
    {
      id: "1",
      role: "ai",
      text: `Olá, ${userName ? userName.split(" ")[0] : "Criador"}! Sou o Mentor Estratégico do seu OS (Score ${digitalTwin?.metrics?.overallScore || diagnosisResult.scoring.score}/100). Em que posso te orientar agora?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isTyping) return;

    const userMsg = { id: Date.now().toString(), role: "user" as const, text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          digitalTwin,
          diagnosisResult,
          history: messages.slice(-4)
        })
      });

      const data = await res.json();
      if (data.success && data.text) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", text: data.text }]);
      } else {
        throw new Error(data.message || "Erro ao consultar o mentor.");
      }
    } catch (err) {
      console.warn("[Floating Mentor Error]", err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: `Com base no seu diagnóstico estrutural: Foque nas primeiras linhas da sua Bio e estruture seus 3 primeiros segundos de Reels com perguntas que toquem na dor do seu público.`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating launcher trigger - Adaptive for Mobile & Desktop without blocking content */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-5 right-5 z-40"
        >
          <button
            type="button"
            id="btn_floating_mentor_open"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#FF5E36] via-[#E1306C] to-[#833AB4] hover:brightness-110 text-white rounded-full shadow-2xl shadow-[#E1306C]/40 border border-white/20 font-bold text-xs cursor-pointer transition-all active:scale-95 group min-h-[44px]"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <BrainCircuit size={14} className="animate-pulse text-white" />
            </div>
            <span className="hidden sm:inline-block font-display">Mentor IA</span>
            <span className="inline-block sm:hidden text-[11px]">Mentor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
        </motion.div>
      )}

      {/* Responsive Drawer / Floating Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />

            {/* Panel Container (Bottom Sheet on Mobile, Floating Dock on Desktop) */}
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`fixed z-50 bg-[#080B14] border border-white/15 shadow-2xl flex flex-col overflow-hidden ${
                /* Mobile: Bottom Sheet */
                "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl md:inset-x-auto md:bottom-5 md:right-5 md:w-[380px] md:h-[540px] md:rounded-3xl md:max-h-none"
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5E36] via-[#E1306C] to-[#833AB4] flex items-center justify-center text-white shadow-md">
                    <BrainCircuit size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
                      Mentor Estratégico
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Online</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">Score {digitalTwin?.metrics?.overallScore || diagnosisResult.scoring.score} • Contexto Ativo</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenFullMentor && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenFullMentor();
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="Abrir tela cheia"
                    >
                      <Maximize2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                  >
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] ${msg.role === "user" ? "bg-slate-700 text-white" : "bg-[#E1306C] text-white"}`}>
                      {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div
                      className={`p-3 rounded-2xl leading-relaxed ${
                        msg.role === "user"
                          ? "bg-slate-800 text-white rounded-tr-sm"
                          : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm shadow-inner"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2.5 max-w-[90%]">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-[#E1306C] text-white">
                      <Sparkles size={12} className="animate-pulse" />
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="px-3 py-1.5 bg-slate-950/80 border-t border-white/5 flex gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
                <button
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleSend("Como destravar meu score de conversão?")}
                  className="text-[10px] text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  Destravar Conversão
                </button>
                <button
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleSend("Qual a melhor chamada para o WhatsApp?")}
                  className="text-[10px] text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  CTA WhatsApp
                </button>
                <button
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleSend("Sugerir gancho para meu próximo Reel")}
                  className="text-[10px] text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  Gancho para Reel
                </button>
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-slate-950 border-t border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pergunte ao Mentor IA..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E1306C] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="px-3 py-2.5 bg-gradient-to-r from-[#FF5E36] to-[#E1306C] hover:brightness-110 disabled:opacity-40 text-white rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center min-w-[36px]"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
