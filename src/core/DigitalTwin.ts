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
