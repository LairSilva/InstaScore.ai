// Módulo 1: Estrutura Central do Digital Twin e Módulo 8: Growth Scores
// O Digital Twin é a representação viva do usuário. Ele nunca esquece e evolui a cada ação.

export interface GrowthScores {
  overallScore: number;
  authorityVelocity: number;
  growthVelocity: number;
  conversionVelocity: number;
  executionScore: number;
  consistencyScore: number;
  momentumScore: number;
  learningScore: number;
}

export interface UserIdentity {
  niche: string;
  objectives: string[];
  targetAudience: string;
  toneOfVoice: string; // Linguagem
  visualStyle: string; // Estilo visual
  brandIdentity: string; // Identidade
}

export interface ContentState {
  currentBio: string; // Bio
  currentCta: string; // CTA
  bestPostingTimes: string[]; // Horários
  postingFrequency: string; // Frequência
  feedStrategyPatterns: string[]; // Feed
  reelsStrategyPatterns: string[]; // Reels
  contentThemes: string[]; // Conteúdos
  discoveredPatterns: string[]; // Padrões
}

export interface UserHistory {
  events: any[]; // Histórico
  evolutionLog: any[]; // Evolução
  conversionRate: number; // Conversão
}

// Módulo 1: O Digital Twin Completo
export interface DigitalTwin {
  id: string;
  handle: string;
  
  identity: UserIdentity;
  content: ContentState;
  metrics: GrowthScores;
  historyData: UserHistory;
  
  memoryGraphIds: string[];
}

export function createDefaultDigitalTwin(
  diagnosisResult?: any | null,
  userName?: string,
  handle?: string,
  niche?: string,
  objective?: string,
  targetAudience?: string
): DigitalTwin {
  const score = diagnosisResult?.scoring?.score || 50;
  const cats = diagnosisResult?.scoring?.categories || {};
  return {
    id: "twin-" + (handle || "usuario"),
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
      currentBio: diagnosisResult?.diagnosis?.evaluations?.find((e: any) => e.criterion_id === "positioning.offer_clarity")?.evidence || "Bio em análise",
      currentCta: diagnosisResult?.diagnosis?.evaluations?.find((e: any) => e.criterion_id === "conversion.explicit_cta")?.evidence || "CTA em análise",
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
}
