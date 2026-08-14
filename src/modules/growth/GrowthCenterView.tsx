import React from "react";
import { motion } from "motion/react";
import { CheckCircle, Circle, Rocket, Calendar, Target, Zap, ArrowRight, LayoutTemplate } from "lucide-react";
import { AnalysisResponse } from "../../types";
import { DigitalTwin, createDefaultDigitalTwin } from "../../core/DigitalTwin";

interface GrowthCenterViewProps {
  diagnosisResult: AnalysisResponse;
  digitalTwin?: DigitalTwin | null;
}

export function GrowthCenterView({ diagnosisResult, digitalTwin: rawTwin }: GrowthCenterViewProps) {
  const digitalTwin = rawTwin || createDefaultDigitalTwin(diagnosisResult);
  const { diagnosis } = diagnosisResult;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-5xl mx-auto pb-12"
    >
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Rocket size={14} /> Execution Engine
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">O que executar agora</h1>
        <p className="text-slate-400">Tarefas adaptáveis que evoluem conforme o seu Execution Score (Atual: {digitalTwin.metrics?.executionScore || 50}).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Mission of the week */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target size={120} />
            </div>
            <div className="relative z-10 space-y-4">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                 <Zap size={14} /> Ação de Maior ROI
              </span>
              <h2 className="text-2xl font-bold text-white">{diagnosis.tomorrow_action.title}</h2>
              <p className="text-slate-300 max-w-md leading-relaxed">{diagnosis.tomorrow_action.instruction}</p>
              
              <button className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
                <CheckCircle size={16} /> Marcar como Executado (+5 XP)
              </button>
            </div>
          </div>

          {/* Execution Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LayoutTemplate size={18} className="text-slate-400" />
                Plano Tático Dinâmico
              </h3>
              <span className="text-xs text-slate-500 font-mono">Gerado pela IA Global</span>
            </div>

            <div className="space-y-4">
              {diagnosis.recommended_actions.map((act, idx) => (
                <div key={idx} className="flex gap-4 group cursor-pointer">
                  <div className="mt-1 text-slate-600 group-hover:text-emerald-400 transition-colors">
                    {idx === 0 ? <CheckCircle size={20} className="text-emerald-500" /> : <Circle size={20} />}
                  </div>
                  <div className="space-y-1 pb-4 border-b border-slate-800/60 w-full group-hover:border-slate-700 transition-colors">
                    <h4 className={`text-sm font-bold ${idx === 0 ? "text-slate-400 line-through" : "text-slate-200"}`}>{act.title}</h4>
                    <p className="text-xs text-slate-500">{act.instruction}</p>
                    {idx !== 0 && (
                      <button className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        Solicitar Agente de Execução <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              Padrões Identificados
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 block mb-1">Ponto de Fuga</span>
                <p className="text-sm text-slate-300 font-medium">Usuários desistem após acessar o link da bio.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 block mb-1">Fortaleza</span>
                <p className="text-sm text-slate-400 font-medium">Bom uso de paleta de cores. Mantém identidade consistente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
