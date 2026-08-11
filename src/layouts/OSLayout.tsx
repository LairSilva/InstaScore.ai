import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, Cpu, Globe, 
  Sparkles, 
  Rocket, 
  History, 
  Target, 
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  BrainCircuit
} from "lucide-react";
import BrandSymbol, { BrandLogo } from "../components/BrandSymbol";

interface OSLayoutProps {
  children: React.ReactNode;
  userName: string;
  handle?: string;
  score: number;
  onLogout: () => void;
  activeModule: string;
  onNavigate: (module: string) => void;
}

export function OSLayout({
  children,
  userName,
  handle,
  score,
  onLogout,
  activeModule,
  onNavigate
}: OSLayoutProps) {
  
  const modules = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "twin", label: "Digital Twin", icon: <Cpu size={18} /> },
    { id: "benchmark", label: "Global Benchmark", icon: <Globe size={18} /> },
    { id: "growth", label: "Growth Center", icon: <Rocket size={18} /> },
    { id: "simulator", label: "Simulador AI", icon: <Sparkles size={18} /> },
    { id: "mentor", label: "Mentor IA", icon: <BrainCircuit size={18} /> },
    { id: "history", label: "Timeline", icon: <History size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-deep-space bg-tech-grid flex flex-col md:flex-row font-sans text-slate-100 selection:bg-[#E1306C] selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 glass-panel border-r border-white/10 flex flex-col justify-between shrink-0 h-auto md:h-screen sticky top-0 z-30 backdrop-blur-2xl">
        <div className="p-4 sm:p-5 space-y-6">
          
          {/* Brand Logo Header */}
          <div className="pb-4 border-b border-white/10">
            <BrandLogo iconSize={36} textSize="md" showTagline />
          </div>

          {/* User Mini Profile */}
          <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/10 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5E36] via-[#E1306C] to-[#833AB4] flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(225,48,108,0.35)] text-sm shrink-0 font-mono">
              {score}
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-xs text-white truncate max-w-[130px] font-display">
                {handle ? `@${handle.replace("@", "")}` : userName.split(" ")[0]}
              </h2>
              <span className="text-[10px] text-[#FA26A0] font-mono font-semibold">InstaScore OS v6</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-3 font-mono">
              SISTEMA OPERACIONAL
            </h3>
            {modules.map((mod) => {
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => onNavigate(mod.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-[#FF5E36]/20 via-[#E1306C]/20 to-[#833AB4]/20 text-white border border-[#E1306C]/40 shadow-[0_0_20px_rgba(225,48,108,0.2)] font-bold" 
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className={isActive ? "text-[#FF5E36]" : "text-slate-500"}>
                    {mod.icon}
                  </span>
                  {mod.label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-[#E1306C]" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            Sair do OS
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
        <div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

