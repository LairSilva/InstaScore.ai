import { calculateScoring, CRITERIA } from "./src/config/methodology";

/**
 * Mathematical Scoring Engine Test Suite.
 * Asserts all prompt-specified edge cases.
 */
function runTests() {
  console.log("==========================================");
  console.log("Iniciando testes do motor matemático InstaScore...");
  console.log("==========================================");

  let successCount = 0;
  let failCount = 0;

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      successCount++;
    } else {
      console.error(`❌ [FAIL] ${name} ${message ? "- " + message : ""}`);
      failCount++;
    }
  }

  // --- Caso 1: Todas as notas 0 devem gerar Score 0 ---
  const evaluationsAllZero = CRITERIA.map(c => ({
    criterion_id: c.id,
    grade: 0,
    confidence: 0.9,
    evidence: "Evidência zero",
    justification: "Justificativa zero"
  }));
  const resultAllZero = calculateScoring(evaluationsAllZero);
  assert("Todas as notas 0 geram Score 0", resultAllZero.score === 0, `Obtido: ${resultAllZero.score}`);
  assert("Cobertura de todas as notas 0 é 100%", resultAllZero.coverage === 100, `Obtido: ${resultAllZero.coverage}`);

  // --- Caso 2: Todas as notas 4 devem gerar Score 100 ---
  const evaluationsAllFour = CRITERIA.map(c => ({
    criterion_id: c.id,
    grade: 4,
    confidence: 0.9,
    evidence: "Evidência perfeita",
    justification: "Justificativa perfeita"
  }));
  const resultAllFour = calculateScoring(evaluationsAllFour);
  assert("Todas as notas 4 geram Score 100", resultAllFour.score === 100, `Obtido: ${resultAllFour.score}`);

  // --- Caso 3: Todas as notas 2 devem gerar aproximadamente 50 ---
  const evaluationsAllTwo = CRITERIA.map(c => ({
    criterion_id: c.id,
    grade: 2,
    confidence: 0.9,
    evidence: "Evidência média",
    justification: "Justificativa média"
  }));
  const resultAllTwo = calculateScoring(evaluationsAllTwo);
  assert("Todas as notas 2 geram Score em torno de 50", resultAllTwo.score === 50, `Obtido: ${resultAllTwo.score}`);

  // --- Caso 4: Critérios null devem reduzir cobertura ---
  // Let's set 5 criteria to null (their weights are 7 + 5 + 5 + 4 + 4 = 25 points)
  const evaluationsWithNull = CRITERIA.map(c => ({
    criterion_id: c.id,
    grade: c.category === "positioning" ? null : 2, // positioning criteria are null
    confidence: 0.9,
    evidence: "Evidência parcial",
    justification: "Justificativa parcial"
  }));
  const resultWithNull = calculateScoring(evaluationsWithNull);
  // Total weights = 100. Category 'positioning' weights = 25. Covered weight = 75.
  assert("Critérios null reduzem a cobertura", resultWithNull.coverage === 75, `Obtido: ${resultWithNull.coverage}`);
  assert("Score ainda é calculado quando cobertura é >= 75%", resultWithNull.score !== null, "Score foi nulo!");

  // --- Caso 5: Cobertura abaixo de 75% deve bloquear o Score definitivo ---
  // Let's set both 'positioning' (25) and 'seo' (15) to null, leaving 60% coverage
  const evaluationsLowCoverage = CRITERIA.map(c => ({
    criterion_id: c.id,
    grade: (c.category === "positioning" || c.category === "seo") ? null : 2,
    confidence: 0.9,
    evidence: "Evidência baixa cobertura",
    justification: "Justificativa baixa cobertura"
  }));
  const resultLowCoverage = calculateScoring(evaluationsLowCoverage);
  assert("Cobertura de 60% é calculada corretamente", resultLowCoverage.coverage === 60, `Obtido: ${resultLowCoverage.coverage}`);
  assert("Score definitivo é bloqueado se cobertura < 75%", resultLowCoverage.score === null, `Obtido: ${resultLowCoverage.score}`);

  // --- Caso 6: Score-alvo não pode ultrapassar 100 ---
  const resultAllFourTarget = calculateScoring(evaluationsAllFour);
  assert("Score-alvo simulado não ultrapassa 100", resultAllFourTarget.targetScore !== null && resultAllFourTarget.targetScore <= 100, `Obtido: ${resultAllFourTarget.targetScore}`);

  console.log("==========================================");
  console.log(`Testes finalizados: ${successCount} PASS, ${failCount} FAIL`);
  console.log("==========================================");

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
