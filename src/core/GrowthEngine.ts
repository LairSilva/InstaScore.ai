import { GrowthScores } from "./DigitalTwin";

// Módulo 8: Growth Engine
// Responsável por calcular e evoluir os novos indicadores da plataforma.
// A lógica matemática do crescimento contínuo.

export class GrowthEngine {
  /**
   * Bootstraps the initial GrowthScores based on an initial diagnostic score.
   * Na fase de transição, usamos o score base para derivar os novos indicadores.
   */
  static bootstrapScores(baseScore: number): GrowthScores {
    return {
      overallScore: baseScore,
      
      // Penaliza levemente execução e consistência no início, pois a IA ainda não mediu o longo prazo.
      executionScore: Math.max(10, Math.round(baseScore * 0.85)),
      consistencyScore: Math.max(10, Math.round(baseScore * 0.70)),
      
      // Momentum recebe um bônus se o base score for alto, indicando tração natural.
      momentumScore: Math.min(100, Math.round(baseScore * 1.1)),
      
      // Inicializa alto para incentivar a curva de aprendizado
      learningScore: 100, 
      
      // Velocidades variam dependendo da força inicial
      authorityVelocity: Math.max(10, Math.round(baseScore * 0.8)),
      growthVelocity: Math.min(100, Math.round(baseScore * 1.05)),
      
      // Conversão é sempre o maior gargalo inicial do mercado
      conversionVelocity: Math.max(5, Math.round(baseScore * 0.6)), 
    };
  }

  /**
   * Futuro Módulo 3 & 6: Atualiza os scores com base em uma nova ação executada.
   */
  static processActionImpact(currentScores: GrowthScores, actionMultiplier: number): GrowthScores {
    // Apenas estrutura inicial para a arquitetura (Stub)
    return {
      ...currentScores,
      executionScore: Math.min(100, currentScores.executionScore + (2 * actionMultiplier))
    };
  }
}
