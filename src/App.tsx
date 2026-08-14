import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Share2,
  RefreshCw,
  TrendingUp,
  Target,
  FileText,
  Percent,
  Search,
  Shield,
  Heart,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users
} from "lucide-react";

import BrandSymbol, { BrandLogo } from "./components/BrandSymbol";
import FileUploader from "./components/FileUploader";
import ShareModal from "./components/ShareModal";
import FeedbackForm from "./components/FeedbackForm";
import LandingViewV7 from "./components/LandingViewV7";
import StartModeOnboarding from "./components/StartModeOnboarding";
import StartModeResultView from "./components/StartModeResultView";
import { StartModeResult } from "./types/start-mode";
import { 
  saveDiagnosisToFirestore, 
  saveStartProjectToFirestore, 
  saveDigitalTwinToFirestore,
  testFirebaseConnection 
} from "./lib/firebase";
import { initGA, trackPageView } from "./lib/analytics";

import { CATEGORIES, CRITERIA, CategoryResult } from "./config/methodology";
import { DEMO_DIAGNOSIS, DEMO_SCORING } from "./data/demo-diagnosis";
import { OnboardingData, AnalysisResponse } from "./types";
import { ResultView } from "./components/ResultView";
import { OSLayout } from "./layouts/OSLayout";
import { DigitalTwin, GrowthScores, createDefaultDigitalTwin } from "./core/DigitalTwin";
import { GrowthEngine } from "./core/GrowthEngine";
import { GrowthCenterView } from "./modules/growth/GrowthCenterView";
import { SimulatorView } from "./modules/simulator/SimulatorView";
import { MentorView } from "./modules/mentor/MentorView";
import { GlobalBenchmarkView } from "./modules/benchmark/GlobalBenchmarkView";
import { DigitalTwinView } from "./modules/twin/DigitalTwinView";
import { TimelineView } from "./modules/history/TimelineView";
import { PaywallModal } from "./components/PaywallModal";
import { MyPlanView } from "./components/MyPlanView";
import { ProContentGenerator } from "./components/ProContentGenerator";
import { useEntitlements } from "./hooks/useEntitlements";
import { Crown, CreditCard } from "lucide-react";

export default function App() {
  // Navigation View State
  const [view, setView] = useState<"landing" | "onboarding" | "processing" | "result" | "start-onboarding" | "start-result" | "my-plan">("landing");

  // Commercial entitlements hook
  const {
    userId,
    isPro,
    planConfig,
    isPaywallOpen,
    paywallReason,
    openPaywall,
    closePaywall,
    refreshStatus
  } = useEntitlements();

  // Start Mode Result Data State
  const [startModeResult, setStartModeResult] = useState<StartModeResult | null>(null);

  // Conversational Onboarding Question Step: 1 to 10
  const [onboardingStep, setOnboardingStep] = useState(1);
  // OS Module State
  const [activeOsModule, setActiveOsModule] = useState<string>("dashboard");

  // Onboarding Data Fields
  const [userName, setUserName] = useState("");
  const [niche, setNiche] = useState("");
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [handle, setHandle] = useState("");
  const [print1, setPrint1] = useState<string | undefined>(undefined);
  const [print2, setPrint2] = useState<string | undefined>(undefined);
  const [print3, setPrint3] = useState<string | undefined>(undefined);
  const [wantsPrint3, setWantsPrint3] = useState<boolean | null>(null); // true, false, or null
  const [consent, setConsent] = useState(false);

  // Error States
  const [errorText, setErrorText] = useState<string | null>(null);

  // Loading Progression (Processing States)
  const [processingState, setProcessingState] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "uploading" | "analyzing" | "validating" | "success" | "error">("idle");

  // Result Diagnosis State
  const [diagnosisResult, setDiagnosisResult] = useState<AnalysisResponse | null>(null);
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Synchronous fallback / derived active DigitalTwin to guarantee never null during rendering
  const activeDigitalTwin = React.useMemo(() => {
    if (digitalTwin) return digitalTwin;
    if (diagnosisResult) {
      return createDefaultDigitalTwin(diagnosisResult, userName, handle, niche, objective, targetAudience);
    }
    return null;
  }, [digitalTwin, diagnosisResult, userName, handle, niche, objective, targetAudience]);

  // Modal Share Controller
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Interactive UI details (e.g. which category is currently expanded to inspect criteria)
  const [expandedCategory, setExpandedCategory] = useState<string | null>("positioning");

  // Suggestion presets for Nicho / Negócio
  const NICHE_PRESETS = [
    "Estética",
    "Loja de Roupas",
    "Restaurante",
    "Advocacia",
    "Fotografia",
    "Criador de Conteúdo",
    "Dentista",
    "Psicólogo"
  ];

  // Preset Cards for Objectives
  const OBJECTIVE_PRESETS = [
    { title: "Vender produtos", desc: "E-commerce, infoprodutos, catálogo físico ou varejo" },
    { title: "Vender serviços", desc: "Consultorias, mentorias, assessorias, tratamentos ou projetos" },
    { title: "Gerar contatos e oportunidades", desc: "Direcionar leads qualificados para o WhatsApp comercial" },
    { title: "Fortalecer autoridade", desc: "Ganhar relevância, respeito e notoriamente no seu nicho" },
    { title: "Aumentar alcance e reconhecimento", desc: "Ampliar visualizações e ser descoberto por novas pessoas" },
    { title: "Construir comunidade", desc: "Engajar seguidores fieis e criar defensores da marca" },
  ];

  // Active Loading progression logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "processing") {
      if (analysisStatus === "success") {
        setProcessingProgress(100);
        const timer = setTimeout(() => {
          setView("result");
        }, 1200);
        return () => clearTimeout(timer);
      } else if (analysisStatus === "error") {
        return;
      }

      // Normal progress rise: rise smoothly up to 92% and wait there
      interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (analysisStatus === "uploading") {
            if (prev < 15) return prev + 1;
          } else if (analysisStatus === "analyzing") {
            if (prev < 85) {
              const remaining = 85 - prev;
              const step = Math.max(1, Math.floor(remaining / 12)); // slow down as we approach 85
              return prev + step;
            }
          } else if (analysisStatus === "validating") {
            if (prev < 92) return prev + 1;
          } else {
            // General fallback progression
            if (prev < 92) {
              const remaining = 92 - prev;
              const step = Math.max(1, Math.ceil(remaining / 15));
              return prev + step;
            }
          }
          return prev;
        });
      }, 500);
    } else {
      setProcessingProgress(0);
    }
    return () => clearInterval(interval);
  }, [view, analysisStatus]);

  // Sync processingState text with analysisStatus
  useEffect(() => {
    if (view === "processing") {
      switch (analysisStatus) {
        case "uploading":
          setProcessingState("Preparando e carregando suas capturas...");
          break;
        case "analyzing":
          setProcessingState("Inteligência artificial lendo suas mídias (isto pode levar até 1 minuto)...");
          break;
        case "validating":
          setProcessingState("Validando a integridade dos dados e calculando o InstaScore...");
          break;
        case "success":
          setProcessingState("Diagnóstico concluído!");
          break;
        case "error":
          setProcessingState("Erro na análise.");
          break;
        default:
          setProcessingState("Iniciando auditoria...");
      }
    }
  }, [view, analysisStatus]);

  // Handle Demo Mode Trigger
  const handleStartDemo = () => {
    setIsDemoMode(true);
    setAnalysisStatus("success");
    setErrorText(null);
    setDiagnosisResult({
      success: true,
      diagnosis: DEMO_DIAGNOSIS,
      scoring: DEMO_SCORING,
    });
    setUserName("Ana Silva");
    setHandle("anasilva.carreira");
    setNiche("Mentoria de Carreira");
    setObjective("Vender serviços");
    setView("result");
  };

  // Start Conversational Onboarding (Mode 1: Existing Profile Audit)
  const handleStartOnboarding = () => {
    setIsDemoMode(false);
    setAnalysisStatus("idle");
    setErrorText(null);
    setOnboardingStep(1);
    setView("onboarding");
  };

  // Start Mode 2: "Começar do Zero" (Start From Scratch)
  const handleStartFromScratch = () => {
    setIsDemoMode(false);
    setErrorText(null);
    setView("start-onboarding");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartModeComplete = (result: StartModeResult) => {
    setStartModeResult(result);
    saveStartProjectToFirestore(result).catch(err => console.warn('[Firebase] Save start project warning:', err));
    setView("start-result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Conversational Navigation Control
  const handleNextStep = () => {
    setErrorText(null);

    // Validate current step input before moving on
    if (onboardingStep === 2 && !userName.trim()) {
      setErrorText("Por favor, diga como gostaria de ser chamado.");
      return;
    }
    if (onboardingStep === 3 && !niche.trim()) {
      setErrorText("Por favor, insira o seu nicho ou negócio principal.");
      return;
    }
    if (onboardingStep === 4 && !objective) {
      setErrorText("Por favor, selecione o seu principal objetivo estratégico.");
      return;
    }
    if (onboardingStep === 5 && !targetAudience.trim()) {
      setErrorText("Por favor, informe quem é o público que você quer alcançar.");
      return;
    }
    if (onboardingStep === 7 && !print1) {
      setErrorText("A captura da tela inicial (Print 1) é obrigatória para prosseguir.");
      return;
    }
    if (onboardingStep === 8 && !print2) {
      setErrorText("A captura do topo do feed (Print 2) é obrigatória para prosseguir.");
      return;
    }

    // Step routing logic
    if (onboardingStep === 9) {
      // If user selected "Continuar sem Insights" without uploading
      if (wantsPrint3 === null) {
        setErrorText("Por favor, selecione uma das opções acima para continuar.");
        return;
      }
      if (wantsPrint3 === true && !print3) {
        setErrorText("Envie a captura de Insights ou selecione 'Continuar sem Insights'.");
        return;
      }
    }

    setOnboardingStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setErrorText(null);
    if (onboardingStep === 1) {
      setView("landing");
    } else {
      setOnboardingStep((prev) => prev - 1);
    }
  };

  // Submit diagnosis request to Server-side API with safe state orchestration
  const handleGenerateDiagnosis = async () => {
    if (!consent) {
      setErrorText("Você precisa marcar o consentimento de privacidade antes de continuar.");
      return;
    }

    setView("processing");
    setAnalysisStatus("uploading");
    setProcessingProgress(5);
    setErrorText(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000); // 120 seconds timeout for AI multimodal analysis

    try {
      const payload: OnboardingData & { userId: string } = {
        userId,
        userName,
        niche,
        objective,
        targetAudience,
        handle: handle.trim() || undefined,
        print1: print1!,
        print2: print2!,
        print3: (wantsPrint3 && print3) ? print3 : undefined,
        consent,
      };

      setAnalysisStatus("analyzing");
      setProcessingProgress(20);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Clear the timeout once the response is received
      clearTimeout(timeoutId);

      setAnalysisStatus("validating");
      setProcessingProgress(85);

      let data;
      try {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error(`O servidor retornou uma resposta inválida (não JSON). Código HTTP ${response.status}`);
        }
      } catch (readErr: any) {
        throw new Error(readErr.message || "Falha ao ler resposta do servidor.");
      }

      if (data.paywallRequired || data.error === "FREE_QUOTA_EXCEEDED") {
        setView("onboarding");
        setOnboardingStep(10);
        openPaywall(data.message || "Você atingiu o limite de 1 diagnóstico gratuito no plano Free. Faça upgrade para o InstaScore PRO para realizar mais análises.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || `Falha na análise. Código HTTP ${response.status}`);
      }

      if (!data.diagnosis || !data.scoring) {
        throw new Error("O servidor não retornou um diagnóstico válido.");
      }

      // Store results and set success state. Navigation happens after 100% completion delay
      setDiagnosisResult(data);
      saveDiagnosisToFirestore(data).catch(err => console.warn('[Firebase] Save diagnosis warning:', err));
      setAnalysisStatus("success");
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Diagnosis Submission Error:", err);
      
      setAnalysisStatus("error");
      if (err.name === "AbortError" || err.message?.toLowerCase().includes("aborted")) {
        setErrorText("A análise demorou mais que o esperado (tempo limite esgotado). Por favor, tente novamente.");
      } else {
        setErrorText(err.message || "Erro de conexão com o servidor. Verifique os dados e tente novamente.");
      }
    }
  };

  // Auto-construct DigitalTwin instance when diagnosisResult is populated
  useEffect(() => {
    if (diagnosisResult && diagnosisResult.scoring) {
      const score = diagnosisResult.scoring.score || 0;
      const cats = diagnosisResult.scoring.categories || {};
      
      const cleanHandle = (handle || "usuario").replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const twin: DigitalTwin = {
        id: "twin-" + (cleanHandle || "usuario"),
        handle: handle || "usuario",
        identity: {
          niche: niche || "Geral",
          objectives: [objective || "Crescimento"],
          targetAudience: targetAudience || "Geral",
          toneOfVoice: "Profissional Estratégico",
          visualStyle: "Moderno e Elegante",
          brandIdentity: userName || "Perfil Instagram",
        },
        content: {
          currentBio: diagnosisResult.diagnosis?.evaluations?.find(e => e.criterion_id === "positioning.offer_clarity")?.evidence || "Bio em análise",
          currentCta: diagnosisResult.diagnosis?.evaluations?.find(e => e.criterion_id === "conversion.explicit_cta")?.evidence || "CTA em análise",
          bestPostingTimes: ["09:00", "12:30", "18:00", "21:00"],
          postingFrequency: "5x por semana",
          feedStrategyPatterns: ["Carrosséis Educativos", "Post Estático de Prova Social"],
          reelsStrategyPatterns: ["Reels Curtos de Atração", "Vídeos Diretos de Conversão"],
          contentThemes: [niche || "Conteúdo Geral"],
          discoveredPatterns: ["Alta retenção com ganchos diretos na primeira frase"],
        },
        metrics: {
          overallScore: score,
          authorityVelocity: Math.round((cats.authority?.percentage || score) * 0.9),
          growthVelocity: Math.round((cats.seo?.percentage || score) * 0.85),
          conversionVelocity: Math.round((cats.conversion?.percentage || score) * 0.95),
          executionScore: cats.content?.percentage || Math.round(score * 0.95),
          consistencyScore: cats.positioning?.percentage || Math.round(score * 0.9),
          momentumScore: cats.seo?.percentage || Math.round(score * 0.85),
          learningScore: 85,
        },
        historyData: {
          events: [
            { id: "ev-1", title: "Auditoria C.A.G.E. Concluída", date: "Hoje", score: score }
          ],
          evolutionLog: [
            { date: "Diagnóstico", score: score }
          ],
          conversionRate: Number(((cats.conversion?.percentage || 50) * 0.05).toFixed(1)),
        },
        memoryGraphIds: ["mem-1", "mem-2"],
      };
      setDigitalTwin(twin);
      saveDigitalTwinToFirestore(twin).catch(err => console.warn('[Firebase] Save digital twin warning:', err));
    } else {
      setDigitalTwin(null);
    }
  }, [diagnosisResult, userName, handle, niche, objective, targetAudience]);

  // Initialize Google Analytics & test Firebase connection on mount, and restore saved state if available
  useEffect(() => {
    initGA();
    testFirebaseConnection().catch(err => console.warn('[Firebase] Connection test warning:', err));

    try {
      const savedDiag = localStorage.getItem("instascore_last_diagnosis");
      const savedStart = localStorage.getItem("instascore_last_start_result");
      const savedUser = localStorage.getItem("instascore_last_user_name");
      const savedHandle = localStorage.getItem("instascore_last_handle");
      if (savedDiag) {
        const parsed = JSON.parse(savedDiag);
        if (parsed?.diagnosis && parsed?.scoring) {
          setDiagnosisResult(parsed);
          if (savedUser) setUserName(savedUser);
          if (savedHandle) setHandle(savedHandle);
          setView("result");
        }
      } else if (savedStart) {
        const parsed = JSON.parse(savedStart);
        if (parsed?.startScore) {
          setStartModeResult(parsed);
          setView("start-result");
        }
      }
    } catch (e) {
      console.warn("Failed to restore state from localStorage", e);
    }
  }, []);

  // Save diagnosis to localStorage when updated
  useEffect(() => {
    if (diagnosisResult && !isDemoMode) {
      try {
        localStorage.setItem("instascore_last_diagnosis", JSON.stringify(diagnosisResult));
        if (userName) localStorage.setItem("instascore_last_user_name", userName);
        if (handle) localStorage.setItem("instascore_last_handle", handle);
      } catch (e) {
        console.warn("Failed to save diagnosis to localStorage", e);
      }
    }
  }, [diagnosisResult, isDemoMode, userName, handle]);

  // Save start mode result to localStorage when updated
  useEffect(() => {
    if (startModeResult) {
      try {
        localStorage.setItem("instascore_last_start_result", JSON.stringify(startModeResult));
      } catch (e) {
        console.warn("Failed to save start mode result to localStorage", e);
      }
    }
  }, [startModeResult]);

  // Track page view changes in GA
  useEffect(() => {
    trackPageView(`/${view}`, `Screen: ${view}`);
  }, [view]);

  // Reset diagnosis
  const handleReset = () => {
    try {
      localStorage.removeItem("instascore_last_diagnosis");
      localStorage.removeItem("instascore_last_start_result");
      localStorage.removeItem("instascore_last_user_name");
      localStorage.removeItem("instascore_last_handle");
    } catch (e) {
      // ignore
    }
    setUserName("");
    setNiche("");
    setObjective("");
    setTargetAudience("");
    setHandle("");
    setPrint1(undefined);
    setPrint2(undefined);
    setPrint3(undefined);
    setWantsPrint3(null);
    setConsent(false);
    setErrorText(null);
    setDiagnosisResult(null);
    setStartModeResult(null);
    setAnalysisStatus("idle");
    setIsDemoMode(false);
    setOnboardingStep(1);
    setView("landing");
  };

  // Helper to determine score color tags
  const getScoreInfo = (score: number | null) => {
    if (score === null) return { label: "Sob revisão", colorClass: "text-slate-400 bg-slate-900 border-slate-800" };
    if (score <= 40) return { label: "Crítico", colorClass: "text-rose-400 bg-rose-950/30 border-rose-800/50" };
    if (score <= 70) return { label: "Regular", colorClass: "text-amber-400 bg-amber-950/30 border-amber-800/50" };
    if (score <= 90) return { label: "Bom", colorClass: "text-indigo-400 bg-indigo-950/30 border-indigo-800/50" };
    return { label: "Excelente", colorClass: "text-emerald-400 bg-emerald-950/30 border-emerald-800/50" };
  };

  return (
    <div id="instascore-app-wrapper" className="min-h-screen bg-deep-space bg-tech-grid text-slate-100 flex flex-col justify-between selection:bg-[#E1306C] selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Auroras & Lights */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#833AB4]/20 rounded-full blur-[120px] animate-aurora"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#E1306C]/15 rounded-full blur-[140px] animate-aurora" style={{ animationDelay: '-4s' }}></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#38BDF8]/15 rounded-full blur-[130px] animate-aurora" style={{ animationDelay: '-8s' }}></div>
      </div>

      {/* 1. Header (Universal) */}
      <header id="app-global-header" className="border-b border-white/10 bg-[#04050A]/80 backdrop-blur-2xl sticky top-0 z-40 transition-all">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div
            onClick={handleReset}
            className="cursor-pointer group active:scale-95 transition-transform"
          >
            <BrandLogo iconSize={36} textSize="md" />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setView("my-plan")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                isPro
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {isPro ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pro</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Meu Plano (Free)</span>
                </>
              )}
            </button>

            {!isPro && (
              <button
                type="button"
                onClick={() => openPaywall()}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white shadow-sm hover:brightness-110 transition-all cursor-pointer hidden sm:flex items-center gap-1"
              >
                <span>Upgrade Pro</span>
              </button>
            )}

            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF5E36]/15 via-[#E1306C]/15 to-[#833AB4]/15 text-[#FA26A0] border border-[#E1306C]/30 select-none shadow-[0_0_15px_rgba(225,48,108,0.2)] hidden sm:inline-block">
              V11 Commercial
            </span>
            {view === "result" && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer hidden sm:block min-h-[44px] px-2"
              >
                Início
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Content Router */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col justify-center relative z-10">
        
        {/* VIEW 1: LANDING PAGE V7 */}
        {view === "landing" && (
          <LandingViewV7 
            onStartOnboarding={handleStartOnboarding}
            onStartFromScratch={handleStartFromScratch}
            onStartDemo={handleStartDemo}
          />
        )}

        {/* VIEW 1B: START MODE ONBOARDING ("COMEÇAR DO ZERO") */}
        {view === "start-onboarding" && (
          <StartModeOnboarding 
            onComplete={handleStartModeComplete}
            onCancel={handleReset}
          />
        )}

        {/* VIEW 1C: START MODE RESULT ("SEU INSTAGRAM COMEÇA AQUI") */}
        {view === "start-result" && startModeResult && (
          <StartModeResultView 
            data={startModeResult}
            onRestart={handleReset}
            onSwitchToAuditMode={handleStartOnboarding}
          />
        )}

        {/* VIEW 2: CONVERSATIONAL ONBOARDING */}
        {view === "onboarding" && (
          <div id="onboarding-container" className="max-w-2xl w-full mx-auto animate-fade-in bg-slate-900/20 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 relative">
            
            {/* Steps Progress Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium select-none">
              <button
                type="button"
                onClick={handleBackStep}
                className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer min-h-[44px]"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
              <span>Pergunta {onboardingStep} de 10</span>
              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-violet-500 h-full transition-all duration-300"
                  style={{ width: `${(onboardingStep / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2">
              {/* STEP 1: Welcome Greeting */}
              {onboardingStep === 1 && (
                <div id="onboard-step-1" className="space-y-6 text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-violet-950/40 rounded-2xl flex items-center justify-center border border-violet-800/20">
                    <BrandSymbol size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Bem-vindo ao InstaScore.ai</h2>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
                      "Olá! Eu sou o Auditor do InstaScore. Vou analisar a estrutura estratégica do seu perfil. Leva poucos minutos. Podemos começar?"
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      id="onboard-start-confirm"
                      onClick={handleNextStep}
                      className="w-full sm:w-auto px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all cursor-pointer min-h-[44px]"
                    >
                      Sim, vamos começar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Name Input */}
              {onboardingStep === 2 && (
                <div id="onboard-step-2" className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Como você gostaria de ser chamado?</h2>
                  <input
                    type="text"
                    id="input-username"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Seu nome ou como prefere ser chamado"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-base"
                  />
                  <p className="text-xs text-slate-500">Usaremos seu nome apenas para personalizar o cabeçalho do relatório.</p>
                </div>
              )}

              {/* STEP 3: Niche Selection */}
              {onboardingStep === 3 && (
                <div id="onboard-step-3" className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Qual é o seu negócio ou nicho?</h2>
                  <input
                    type="text"
                    id="input-niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Ex: Consultor de RH, Estética, Loja de roupas..."
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-base"
                  />
                  
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sugestões comuns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {NICHE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNiche(preset)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer min-h-[38px] ${
                            niche === preset
                              ? "bg-violet-950 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                              : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Objectives Pills */}
              {onboardingStep === 4 && (
                <div id="onboard-step-4" className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Qual é seu principal objetivo no Instagram?</h2>
                  <div className="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {OBJECTIVE_PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => setObjective(preset.title)}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                          objective === preset.title
                            ? "bg-violet-950/40 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full border ${objective === preset.title ? "bg-violet-400 border-violet-400" : "border-slate-600"}`}></span>
                          {preset.title}
                        </h3>
                        <p className="text-xs text-slate-400 ml-5 mt-0.5">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: Target Audience */}
              {onboardingStep === 5 && (
                <div id="onboard-step-5" className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Quem é o público que você quer alcançar?</h2>
                  <textarea
                    id="input-audience"
                    rows={3}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Ex: Mulheres de 25 a 45 anos que moram em Porto Alegre e buscam tratamentos estéticos de alta qualidade..."
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-base resize-none"
                  />
                  <p className="text-xs text-slate-500">Quanto mais específico for, mais precisas serão as recomendações da inteligência artificial.</p>
                </div>
              )}

              {/* STEP 6: Handle (Optional) */}
              {onboardingStep === 6 && (
                <div id="onboard-step-6" className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <h2 className="text-lg sm:text-xl font-bold text-white">Qual é seu @ do perfil?</h2>
                    <span className="text-xs text-slate-500 font-semibold">(Opcional)</span>
                  </div>
                  <input
                    type="text"
                    id="input-handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="Ex: @clinica_estetica"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-base"
                  />
                  
                  <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-900 text-left select-none flex gap-2.5">
                    <Shield className="text-violet-400 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong className="text-slate-300 font-semibold">Garantia de Privacidade:</strong> Não acessaremos nem solicitaremos a senha da sua conta em hipótese alguma. O @ será usado estritamente para identificar o seu relatório.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 7: Print 1 (Obrigatório) */}
              {onboardingStep === 7 && (
                <div id="onboard-step-7" className="space-y-4">
                  <FileUploader
                    id="uploader-print1"
                    label="Print 1: Página inicial do perfil"
                    description="Envie uma captura de tela da página inicial do seu perfil, mostrando foto, nome, bio, link principal e destaques."
                    required
                    value={print1}
                    onChange={setPrint1}
                  />
                </div>
              )}

              {/* STEP 8: Print 2 (Obrigatório) */}
              {onboardingStep === 8 && (
                <div id="onboard-step-8" className="space-y-4">
                  <FileUploader
                    id="uploader-print2"
                    label="Print 2: Topo do feed de publicações"
                    description="Agora envie uma captura de tela mostrando de 6 a 9 posts recentes do seu feed."
                    required
                    value={print2}
                    onChange={setPrint2}
                  />
                </div>
              )}

              {/* STEP 9: Print 3 (Opcional Insights) */}
              {onboardingStep === 9 && (
                <div id="onboard-step-9" className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Você gostaria de enviar um print de Insights?</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Você pode incluir uma captura complementar com estatísticas de alcance ou engajamento. Ela será usada como contexto complementar estratégico nesta versão Alpha.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    <button
                      type="button"
                      onClick={() => setWantsPrint3(true)}
                      className={`p-3 rounded-xl border text-left cursor-pointer min-h-[44px] ${
                        wantsPrint3 === true
                          ? "bg-violet-950/40 border-violet-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900/30"
                      }`}
                    >
                      <h3 className="font-bold text-sm">Sim, enviar Insights</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Adicionar um terceiro print opcional</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWantsPrint3(false);
                        setPrint3(undefined);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer min-h-[44px] ${
                        wantsPrint3 === false
                          ? "bg-violet-950/40 border-violet-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900/30"
                      }`}
                    >
                      <h3 className="font-bold text-sm font-semibold">Continuar sem Insights</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Seguir com o diagnóstico direto</p>
                    </button>
                  </div>

                  {wantsPrint3 === true && (
                    <div className="animate-fade-in pt-2">
                      <FileUploader
                        id="uploader-print3"
                        label="Print 3: Insights (Opcional)"
                        description="Envie o print de Insights contendo métricas do seu perfil."
                        value={print3}
                        onChange={setPrint3}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 10: Consent & Terms */}
              {onboardingStep === 10 && (
                <div id="onboard-step-10" className="space-y-6 text-center py-2">
                  <div className="mx-auto w-12 h-12 bg-indigo-950/50 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <Shield size={24} />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Privacidade e Termos</h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                      Para realizar o diagnóstico, nosso algoritmo e a API segura do Gemini processarão suas informações estratégicas e imagens temporariamente.
                    </p>
                  </div>

                  {/* Consent checkbox */}
                  <label
                    id="consent-wrapper"
                    className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-900 text-left max-w-md mx-auto cursor-pointer group hover:bg-slate-950 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id="checkbox-consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 accent-violet-500 rounded cursor-pointer min-w-[20px] min-h-[20px]"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed select-none">
                      Autorizo o processamento temporário das imagens exclusivamente para gerar este diagnóstico.
                    </span>
                  </label>

                  <div className="pt-4 max-w-sm mx-auto">
                    <button
                      type="button"
                      id="submit-diagnosis-request"
                      disabled={!consent}
                      onClick={handleGenerateDiagnosis}
                      className={`w-full px-6 py-3.5 rounded-xl font-bold transition-all text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                        consent
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-900/20 hover:scale-[1.01]"
                          : "bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed"
                      }`}
                    >
                      Gerar meu Diagnóstico Estrutural 🚀
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error notifications */}
            {errorText && (
              <div id="onboarding-error-box" className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorText}</span>
              </div>
            )}

            {/* General conversational buttons bottom drawer */}
            {onboardingStep > 1 && onboardingStep < 10 && (
              <div className="pt-4 border-t border-slate-900/60 flex justify-between">
                <button
                  type="button"
                  id="onboard-back-arrow"
                  onClick={handleBackStep}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-h-[44px]"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="onboard-next-arrow"
                  onClick={handleNextStep}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer min-h-[44px]"
                >
                  Continuar <ChevronRight size={14} />
                </button>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: PROCESSING STATE (Loader or Error) */}
        {view === "processing" && (
          <div className="w-full">
            {analysisStatus === "error" ? (
              <div id="processing-error-container" className="max-w-md w-full mx-auto text-center py-10 space-y-8 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-950/50 border border-rose-800/50 text-rose-500 mx-auto">
                  <AlertCircle size={32} />
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Não conseguimos concluir a análise</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {errorText || "Ocorreu um erro desconhecido ao processar o seu diagnóstico."}
                  </p>
                  <p className="text-xs text-rose-400/80 font-mono select-all">
                    Erro: {errorText?.includes("API_KEY_MISSING") ? "API_KEY_MISSING" : errorText?.includes("resposta incompleta") ? "ANALYSIS_VALIDATION_FAILED" : "ANALYSIS_FAILED"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleGenerateDiagnosis}
                    className="px-6 py-3 rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all text-white text-sm cursor-pointer min-h-[44px]"
                  >
                    Tentar novamente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("onboarding");
                      setOnboardingStep(10);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all text-slate-300 text-sm cursor-pointer min-h-[44px]"
                  >
                    Voltar e revisar os arquivos
                  </button>
                </div>
              </div>
            ) : (
              <div id="processing-loader-container" className="max-w-xl w-full mx-auto text-center py-8 space-y-8 animate-fade-in">
                
                {/* Score Pulse Orb Loader */}
                <div className="relative inline-flex items-center justify-center mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF5E36] via-[#E1306C] to-[#833AB4] blur-2xl opacity-40 animate-pulse"></div>
                  <div className="w-28 h-28 rounded-full border-4 border-white/10 border-t-[#FF5E36] border-r-[#E1306C] border-b-[#833AB4] animate-spin"></div>
                  <div className="absolute">
                    <BrandSymbol size={52} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-extrabold text-white font-display tracking-tight">Processando Inteligência de Perfil</h2>
                  
                  {/* Progress bar container */}
                  <div className="w-full bg-[#0D1222] h-3 rounded-full overflow-hidden border border-white/15 max-w-sm mx-auto shadow-inner relative">
                    <div
                      className="bg-gradient-to-r from-[#FF5E36] via-[#E1306C] to-[#833AB4] h-full transition-all duration-300 shadow-[0_0_15px_rgba(225,48,108,0.6)]"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#FA26A0] block font-mono font-bold tracking-widest">{processingProgress}% CONCLUÍDO</span>
                </div>

                {/* AI Interactive Terminal Checklist */}
                <div className="glass-panel rounded-2xl p-6 text-left space-y-3 font-mono text-xs shadow-2xl border border-white/10 max-w-lg mx-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 text-slate-400 font-bold text-[10px] tracking-widest uppercase">
                    <span>InstaScore AI Engine v6</span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      PROCESSANDO
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-3 text-emerald-400 font-medium transition-all">
                      <CheckCircle size={15} className="shrink-0" />
                      <span>Bio & posicionamento analisados</span>
                    </div>

                    <div className="flex items-center gap-3 text-emerald-400 font-medium transition-all">
                      <CheckCircle size={15} className="shrink-0" />
                      <span>Feed & estratégia temática verificados</span>
                    </div>

                    <div className="flex items-center gap-3 text-emerald-400 font-medium transition-all">
                      <CheckCircle size={15} className="shrink-0" />
                      <span>SEO & termos de busca identificados</span>
                    </div>

                    <div className={`flex items-center gap-3 transition-all ${processingProgress >= 60 ? "text-[#FF5E36] font-bold" : "text-slate-500"}`}>
                      {processingProgress >= 60 ? (
                        <RefreshCw size={15} className="animate-spin text-[#FF5E36] shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"></div>
                      )}
                      <span>Calculando dimensão C.A.G.E...</span>
                    </div>

                    <div className={`flex items-center gap-3 transition-all ${processingProgress >= 80 ? "text-[#FA26A0] font-bold" : "text-slate-500"}`}>
                      {processingProgress >= 80 ? (
                        <RefreshCw size={15} className="animate-spin text-[#FA26A0] shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"></div>
                      )}
                      <span>Mapeando prioridades de alto impacto...</span>
                    </div>

                    <div className={`flex items-center gap-3 transition-all ${processingProgress >= 90 ? "text-[#C084FC] font-bold" : "text-slate-500"}`}>
                      {processingProgress >= 90 ? (
                        <RefreshCw size={15} className="animate-spin text-[#C084FC] shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"></div>
                      )}
                      <span>Construindo plano estratégico do OS...</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Sua auditoria estrutural está sendo construída em tempo real. O resultado será exibido em instantes.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: OS VIEW */}
        {view === "result" && diagnosisResult && (
          <div className="fixed inset-0 z-50 bg-slate-950">
            <OSLayout
              userName={userName}
              handle={handle}
              score={diagnosisResult.scoring.score || 0}
              onLogout={handleReset}
              activeModule={activeOsModule}
              onNavigate={setActiveOsModule}
            >
              {activeOsModule === "dashboard" && (
                <ResultView 
                  digitalTwin={activeDigitalTwin}
                  diagnosisResult={diagnosisResult}
                  isDemoMode={isDemoMode}
                  userName={userName}
                  niche={niche}
                  handle={handle}
                  onReset={handleReset}
                  onShare={() => setIsShareModalOpen(true)}
                />
              )}
              {activeOsModule === "benchmark" && (
                <GlobalBenchmarkView
                  digitalTwin={activeDigitalTwin}
                />
              )}
              {activeOsModule === "twin" && (
                <DigitalTwinView
                  digitalTwin={activeDigitalTwin}
                />
              )}
              {activeOsModule === "simulator" && (
                <SimulatorView 
                  digitalTwin={activeDigitalTwin}
                  diagnosisResult={diagnosisResult}
                  currentScore={diagnosisResult.scoring.score || 0}
                />
              )}
              {activeOsModule === "growth" && (
                <GrowthCenterView 
                  diagnosisResult={diagnosisResult} 
                  digitalTwin={activeDigitalTwin} 
                />
              )}
              {activeOsModule === "mentor" && (
                <MentorView 
                  digitalTwin={activeDigitalTwin}
                  diagnosisResult={diagnosisResult}
                  userName={userName}
                />
              )}
              {activeOsModule === "history" && (
                <TimelineView 
                  digitalTwin={activeDigitalTwin}
                  diagnosisResult={diagnosisResult}
                  currentScore={diagnosisResult.scoring.score || 0}
                />
              )}
            </OSLayout>
          </div>
        )}

        {/* VIEW 5: MY PLAN VIEW */}
        {view === "my-plan" && (
          <MyPlanView
            onOpenPaywall={() => openPaywall()}
            onBack={() => {
              if (diagnosisResult) {
                setView("result");
              } else {
                setView("landing");
              }
            }}
          />
        )}
      </main>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={closePaywall}
        userId={userId}
        reason={paywallReason}
        onSuccess={() => {
          refreshStatus();
        }}
      />

      {/* 3. Footer (Universal) */}
      <footer id="app-global-footer" className="border-t border-slate-900/60 py-6 bg-slate-950 text-center select-none">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="text-xs text-slate-500">
            &copy; 2026 InstaScore.ai. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-xl mx-auto">
            O InstaScore.ai é um auditor estrutural independente e não possui vínculo, patrocínio ou afiliação oficial com o Instagram, Meta Inc. ou suas subsidiárias.
          </p>
        </div>
      </footer>
    </div>
  );
}
