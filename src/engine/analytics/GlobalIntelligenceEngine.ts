import { DigitalTwin } from "../../core/DigitalTwin";

export interface GlobalNicheBenchmark {
  niche: string;
  averageScore: number;
  topPercentileScore: number;
  averageConversionVelocity: number;
  topPercentileConversionVelocity: number;
  winningPatterns: string[];
  decliningPatterns: string[];
}

export class GlobalIntelligenceEngine {
  // Banco de dados simulado da "Inteligência Coletiva" (Módulos 4, 5 e 12)
  private static readonly globalDatabase: Record<string, GlobalNicheBenchmark> = {
    "moda": {
      niche: "Moda",
      averageScore: 45,
      topPercentileScore: 82,
      averageConversionVelocity: 15,
      topPercentileConversionVelocity: 45,
      winningPatterns: ["Vídeos curtos de bastidores (Behind the scenes)", "CTAs no primeiro comentário em vez da legenda", "Provas sociais em formato carrossel narrativo"],
      decliningPatterns: ["Fotos estáticas de catálogo isoladas", "Legendas muito longas sem quebra de padrão", "Uso excessivo de hashtags genéricas"]
    },
    "estética": {
      niche: "Estética",
      averageScore: 50,
      topPercentileScore: 88,
      averageConversionVelocity: 18,
      topPercentileConversionVelocity: 52,
      winningPatterns: ["Antes e depois em vídeo (processo)", "Humanização do profissional (storytelling)", "Tirar dúvidas comuns nos Stories (Caixinhas)"],
      decliningPatterns: ["Apenas fotos de resultados sem contexto", "Falta de clareza no link da bio", "Banners promocionais no feed"]
    }
  };

  /**
   * Módulo 5: Benchmarking por Nicho
   * Retorna os dados agregados dos players do mesmo mercado.
   */
  static getBenchmarkForNiche(niche: string): GlobalNicheBenchmark {
    const key = niche.toLowerCase();
    
    // Busca no BD mockado, ou retorna um baseline genérico para outros nichos
    return this.globalDatabase[key] || {
      niche: niche,
      averageScore: 40,
      topPercentileScore: 75,
      averageConversionVelocity: 12,
      topPercentileConversionVelocity: 35,
      winningPatterns: [
        "Retenção focada nos 3 primeiros segundos de Reels", 
        "CTAs claros e direcionados a uma única ação na Bio",
        "Responder comentários com vídeos"
      ],
      decliningPatterns: [
        "Conteúdo excessivamente genérico e sem nicho", 
        "Falta de identidade visual definida",
        "CTAs múltiplos confundindo o usuário"
      ]
    };
  }

  /**
   * Módulo 12 e 4: Avalia o Digital Twin contra a Inteligência Global
   */
  static compareTwinToGlobal(twin: DigitalTwin): {
    status: "ABOVE_AVERAGE" | "BELOW_AVERAGE" | "TOP_PERFORMER";
    gapToTop: number;
    recommendedPatternToAdopt: string;
    patternToDrop: string;
  } {
    const benchmark = this.getBenchmarkForNiche(twin.identity.niche);
    
    let status: "ABOVE_AVERAGE" | "BELOW_AVERAGE" | "TOP_PERFORMER" = "BELOW_AVERAGE";
    if (twin.metrics.overallScore >= benchmark.topPercentileScore) {
      status = "TOP_PERFORMER";
    } else if (twin.metrics.overallScore >= benchmark.averageScore) {
      status = "ABOVE_AVERAGE";
    }

    const gapToTop = Math.max(0, benchmark.topPercentileScore - twin.metrics.overallScore);

    // Módulo 4: Extração de padrões baseados na falha de consistência ou conversão
    const recommendedPatternToAdopt = twin.metrics.conversionVelocity < benchmark.averageConversionVelocity 
      ? benchmark.winningPatterns[1] // Foco em CTAs
      : benchmark.winningPatterns[0];  // Foco em engajamento topo de funil

    const patternToDrop = benchmark.decliningPatterns[0];

    return {
      status,
      gapToTop,
      recommendedPatternToAdopt,
      patternToDrop
    };
  }
}
