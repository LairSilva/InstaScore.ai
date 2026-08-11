import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisSchema } from "./src/schemas/diagnosis";
import { calculateScoring, CRITERIA } from "./src/config/methodology";
import { GEMINI_MODEL } from "./src/config/ai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits to support base64 screenshot uploads (max 15MB)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Initialize Google GenAI securely (server-side only) with lazy initialization
let aiInstance: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("API_KEY_MISSING");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Health check route with structured system status
app.get("/api/health", (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  const status = hasApiKey ? "healthy" : "degraded";
  
  res.json({
    status,
    database: "ok",
    storage: "ok",
    ai: hasApiKey ? "ok" : "missing_api_key",
    queue: "ok",
    timestamp: new Date().toISOString()
  });
});

/**
 * Parses and validates the uploaded image from its base64 data URI format.
 */
function parseBase64Image(dataUri: string) {
  if (!dataUri) return null;
  const matches = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    // If it is just raw base64 without prefix, default to image/jpeg
    if (dataUri.length > 100 && !dataUri.includes(";")) {
      return {
        mimeType: "image/jpeg",
        data: dataUri
      };
    }
    return null;
  }
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

/**
 * System instruction for the Auditor.
 */
const SYSTEM_INSTRUCTION = `Você é o Auditor Estratégico do InstaScore.ai.

Sua função é analisar capturas de tela de perfis do Instagram com base exclusivamente nas evidências fornecidas e na metodologia oficial.

Não invente métricas.
Não presuma resultados que não estão visíveis.
Não preveja seguidores, viralização, alcance ou vendas.
Não avalie a personalidade, aparência física ou características pessoais das pessoas mostradas nas imagens.
Não critique gostos estéticos de forma subjetiva.

Avalie somente elementos relacionados à comunicação, posicionamento, clareza, conteúdo, autoridade, descoberta e conversão.

Para cada critério, atribua uma nota entre 0 e 4 somente quando houver evidência suficiente.
Quando não houver evidência, retorne null.

Toda nota deverá possuir:
- evidência observada;
- justificativa objetiva;
- nível de confiança entre 0 e 1.

A evidência deve descrever o que está realmente visível.
A justificativa deve explicar a relação entre a evidência e o critério.

Não forneça uma nota total.
Não faça cálculos matemáticos.
Não altere os pesos.
Não crie critérios adicionais.

Retorne todos os IDs da metodologia exatamente uma vez. Os IDs obrigatórios são:
${CRITERIA.map(c => `- ${c.id}`).join("\n")}

As recomendações devem ser específicas para o nicho, público e objetivo informados.
As ações precisam ser possíveis de executar.

Quando os prints estiverem ilegíveis, incompletos ou contraditórios, registre os elementos ausentes.
Seja direto, analítico, respeitoso e transparente.`;

/**
 * JSON response schema configured for the Gemini API call to ensure strict structural compliance.
 */
const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    methodology_version: { type: Type.STRING, description: "Must be exactly 'instascore-structural-0.1-alpha'" },
    analysis_type: { type: Type.STRING, description: "Must be exactly 'structural'" },
    metadata: {
      type: Type.OBJECT,
      properties: {
        is_data_sufficient: { type: Type.BOOLEAN },
        missing_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
        overall_confidence: { type: Type.NUMBER }
      },
      required: ["is_data_sufficient", "missing_elements", "overall_confidence"]
    },
    evaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion_id: { type: Type.STRING, description: "The specific criterion ID from the methodology." },
          grade: { type: Type.INTEGER, description: "An integer score between 0 and 4, or null if no evidence is found." },
          confidence: { type: Type.NUMBER, description: "Confidence rating for this score between 0 and 1." },
          evidence: { type: Type.STRING, description: "Factual text describing what was observed in the images for this specific criterion." },
          justification: { type: Type.STRING, description: "Detailed strategy reasoning why this grade was assigned." }
        },
        required: ["criterion_id", "grade", "confidence", "evidence", "justification"]
      }
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion_id: { type: Type.STRING },
          title: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["criterion_id", "title", "reason"]
      },
      description: "Top 3 strengths observed. Max 3 items."
    },
    critical_gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion_id: { type: Type.STRING },
          title: { type: Type.STRING },
          reason: { type: Type.STRING },
          impact: { type: Type.STRING }
        },
        required: ["criterion_id", "title", "reason", "impact"]
      },
      description: "Priority gaps identified. Max 5 items."
    },
    recommended_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion_id: { type: Type.STRING },
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          effort: { type: Type.STRING, description: "Must be 'low', 'medium' or 'high'" },
          expected_effect: { type: Type.STRING }
        },
        required: ["criterion_id", "title", "instruction", "effort", "expected_effect"]
      },
      description: "Recommended strategic actions, exactly 5 items."
    },
    tomorrow_action: {
      type: Type.OBJECT,
      properties: {
        criterion_id: { type: Type.STRING },
        title: { type: Type.STRING },
        instruction: { type: Type.STRING }
      },
      required: ["criterion_id", "title", "instruction"]
    },
    disclaimer: { type: Type.STRING, description: "Mandatory methodology disclaimer." }
  },
  required: [
    "methodology_version",
    "analysis_type",
    "metadata",
    "evaluations",
    "strengths",
    "critical_gaps",
    "recommended_actions",
    "tomorrow_action",
    "disclaimer"
  ]
};

// Route for analyzing screenshots
/**
 * Call Gemini API with exponential backoff on transient errors and fallbacks to alternative models.
 */
async function callGeminiWithRetryAndFallback(params: {
  parts: any[];
  systemInstruction: string;
  responseSchema: any;
  temperature: number;
}): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = [
    GEMINI_MODEL, // e.g. "gemini-3.5-flash"
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        console.log(`[AI] calling model: ${model} (attempt ${attempts + 1}/${maxAttempts})`);
        const ai = getGoogleGenAI();
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: params.parts },
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: "application/json",
            responseSchema: params.responseSchema,
            temperature: params.temperature
          }
        });

        if (response && response.text) {
          console.log(`[AI] Success using model: ${model}`);
          return {
            text: response.text,
            modelUsed: model
          };
        }
        throw new Error("Empty response returned from Gemini model " + model);
      } catch (err: any) {
        lastError = err;
        attempts++;
        const errStr = JSON.stringify(err) + " " + String(err) + " " + (err.message || "");
        console.warn(`[AI] Error using model ${model} (attempt ${attempts}):`, err.message || err);

        const isTransient = err.status === 503 ||
                            err.status === 429 ||
                            errStr.includes("503") ||
                            errStr.includes("UNAVAILABLE") ||
                            errStr.includes("high demand") ||
                            errStr.includes("RESOURCE_EXHAUSTED") ||
                            errStr.includes("429") ||
                            errStr.includes("rate limit") ||
                            errStr.includes("overloaded") ||
                            errStr.includes("fetch failed");

        if (isTransient && attempts < maxAttempts) {
          const delay = attempts * 1500;
          console.log(`[AI] Transient error detected. Retrying ${model} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If not transient, or max attempts reached, exit this loop to try fallback model
          break;
        }
      }
    }
    console.warn(`[AI] Model ${model} failed all attempts or returned a non-transient error, attempting fallback...`);
  }

  throw lastError || new Error("All Gemini models and retries failed to complete analysis.");
}

app.post("/api/analyze", async (req, res) => {
  console.log("[InstaScore] Request received");
  try {
    const { userName, niche, objective, targetAudience, handle, print1, print2, print3, consent } = req.body;

    // Validate request inputs before calling Gemini API
    if (!consent) {
      return res.status(400).json({
        success: false,
        error: " É necessário autorizar o processamento temporário das imagens para gerar o diagnóstico."
      });
    }

    if (!userName || !userName.trim()) {
      return res.status(400).json({ success: false, error: "Precisamos saber como gostaria de ser chamado." });
    }

    if (!niche || !niche.trim()) {
      return res.status(400).json({ success: false, error: "Precisamos saber qual é o seu negócio ou nicho." });
    }

    if (!objective || !objective.trim()) {
      return res.status(400).json({ success: false, error: "Precisamos saber qual é seu principal objetivo no Instagram." });
    }

    if (!targetAudience || !targetAudience.trim()) {
      return res.status(400).json({ success: false, error: "Precisamos saber quem é o público que você quer alcançar." });
    }

    if (!print1) {
      return res.status(400).json({ success: false, error: "Precisamos da captura de tela inicial do perfil (Print 1)." });
    }

    if (!print2) {
      return res.status(400).json({ success: false, error: "Precisamos da captura de tela do topo do feed (Print 2)." });
    }

    const img1 = parseBase64Image(print1);
    if (!img1) {
      return res.status(400).json({ success: false, error: "A imagem da captura inicial (Print 1) está inválida ou ilegível." });
    }

    const img2 = parseBase64Image(print2);
    if (!img2) {
      return res.status(400).json({ success: false, error: "A imagem do topo do feed (Print 2) está inválida ou ilegível." });
    }

    const img3 = print3 ? parseBase64Image(print3) : null;
    console.log("[InstaScore] Uploads validated");

    const apiKeyToCheck = process.env.GEMINI_API_KEY;
    if (!apiKeyToCheck) {
      console.warn("[InstaScore] API Key is missing");
      return res.status(500).json({
        success: false,
        error: "API_KEY_MISSING",
        message: "A configuração da inteligência artificial está incompleta."
      });
    }

    // Build the parts array for the Gemini Multimodal prompt
    const parts: any[] = [];

    // Add screenshots
    parts.push({
      inlineData: {
        mimeType: img1.mimeType,
        data: img1.data
      }
    });

    parts.push({
      inlineData: {
        mimeType: img2.mimeType,
        data: img2.data
      }
    });

    if (img3) {
      parts.push({
        inlineData: {
          mimeType: img3.mimeType,
          data: img3.data
        }
      });
    }

    // Context-rich strategic text prompt
    const contextPrompt = `Aqui estão as capturas de tela do perfil do Instagram de ${userName} (@${handle || "Não informado"}).
Nicho/Negócio do usuário: "${niche}"
Objetivo Principal no Instagram: "${objective}"
Público Alvo Desejado: "${targetAudience}"

Instruções Adicionais de Análise:
1. O Print 1 mostra a tela inicial do perfil (foto, nome, bio, link, destaques).
2. O Print 2 mostra o topo do feed (6 a 9 posts recentes).
${img3 ? "3. O Print 3 mostra estatísticas adicionais (Insights) para contexto de métricas." : "3. O usuário não enviou o Print de Insights."}

Por favor, analise as capturas e preencha todos os 25 critérios obrigatórios da nossa metodologia de auditoria. Lembre-se de avaliar TODOS os 25 critérios do seu SYSTEM INSTRUCTION sem omitir nenhum ID de critério! Atribua notas inteiras de 0 a 4 (ou null se for totalmente impossível identificar qualquer evidência para aquele critério). Retorne os dados em formato JSON estrito conforme o esquema fornecido.`;

    parts.push({ text: contextPrompt });

    // AI model call with response schema
    let responseText = "";
    let parsedDiagnosis: any = null;
    let stage: "gemini_api_call" | "structured_output_validation" = "gemini_api_call";

    try {
      console.log(`[InstaScore] Calling Gemini API...`);
      const response = await callGeminiWithRetryAndFallback({
        parts,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0.2
      });

      responseText = response.text || "";
      console.log("[InstaScore] Gemini response received");
      parsedDiagnosis = JSON.parse(responseText);

      stage = "structured_output_validation";
      // Zod Validation
      DiagnosisSchema.parse(parsedDiagnosis);
      console.log("[InstaScore] Structured output validated");
    } catch (firstError: any) {
      if (firstError.name === "ZodError") {
        const issues = firstError.issues.map((issue: any) => ({
          path: issue.path.join("."),
          code: issue.code,
          expected: issue.expected,
          received: issue.received
        }));
        console.warn("[InstaScore] Structured output validation failed. Invalid fields:", JSON.stringify(issues));
      } else {
        console.warn("[InstaScore] First execution or validation attempt failed:", firstError.message || firstError);
      }
      
      console.log("[InstaScore] Attempting correctional retry...");
      stage = "gemini_api_call";

      // Automatic single retry with correctional instructions
      const correctionPrompt = `A tentativa anterior de gerar a análise falhou com o seguinte erro de validação ou estrutura:
"${firstError.message || firstError}"

Por favor, reanalise e certifique-se de que:
1. Todos os 25 critérios estão presentes em 'evaluations' com seus IDs exatos e notas válidas de 0 a 4 (ou null se ausente).
2. 'strengths' tem no máximo 3 itens.
3. 'critical_gaps' tem no máximo 5 itens.
4. 'recommended_actions' tem no máximo 5 ou 10 itens válidos (preferencialmente 5 ações estratégicas).
5. 'tomorrow_action' e 'disclaimer' estão preenchidos de forma consistente.
6. A saída seja estritamente compatível com o JSON Schema exigido.

Retorne o JSON de diagnóstico corrigido imediatamente.`;

      // Copy original screenshots and add the correction text
      const retryParts = [...parts, { text: correctionPrompt }];

      try {
        const retryResponse = await callGeminiWithRetryAndFallback({
          parts: retryParts,
          systemInstruction: SYSTEM_INSTRUCTION,
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0.1
        });

        responseText = retryResponse.text || "";
        console.log("[InstaScore] Gemini response received");
        parsedDiagnosis = JSON.parse(responseText);

        stage = "structured_output_validation";
        // Final validation (will throw if it fails again, caught by internal catch)
        DiagnosisSchema.parse(parsedDiagnosis);
        console.log("[InstaScore] Structured output validated");
      } catch (retryError: any) {
        if (retryError.name === "ZodError") {
          const issues = retryError.issues.map((issue: any) => ({
            path: issue.path.join("."),
            code: issue.code,
            expected: issue.expected,
            received: issue.received
          }));
          console.error("[InstaScore] Final Structured output validation failed:", JSON.stringify(issues));
          return res.status(422).json({
            success: false,
            error: "ANALYSIS_VALIDATION_FAILED",
            message: "Recebemos uma resposta incompleta durante a análise. Tente novamente.",
            stage: "structured_output_validation"
          });
        } else {
          console.error("[InstaScore] Correctional retry call failed:", retryError.message || retryError);
          return res.status(500).json({
            success: false,
            error: "ANALYSIS_FAILED",
            message: "Recebemos uma resposta incompleta durante a análise. Tente novamente.",
            stage: stage
          });
        }
      }
    }

    // Now, run the mathematical calculations in the backend to determine scores
    const evaluations = parsedDiagnosis.evaluations;

    // Check if any required criteria are missing, fill them as null to prevent crash
    const criteriaIdsInResponse = new Set(evaluations.map((e: any) => e.criterion_id));
    for (const criterion of CRITERIA) {
      if (!criteriaIdsInResponse.has(criterion.id)) {
        evaluations.push({
          criterion_id: criterion.id,
          grade: null,
          confidence: 0,
          evidence: "Informação ausente nas imagens analisadas.",
          justification: "Não foi possível coletar evidências estruturais suficientes para avaliar este critério."
        });
      }
    }

    // Recalculate deterministic scoring
    const scoringResult = calculateScoring(evaluations, objective);
    console.log("[InstaScore] Score calculated");

    console.log("[InstaScore] Response sent");
    return res.json({
      success: true,
      diagnosis: parsedDiagnosis,
      scoring: scoringResult
    });

  } catch (error: any) {
    console.error("[InstaScore] Error in /api/analyze route handler:", error);
    return res.status(500).json({
      success: false,
      error: "ANALYSIS_FAILED",
      message: error.message || "Não foi possível concluir o diagnóstico.",
      stage: "unknown"
    });
  }
});

// Vite + Express Setup for Dev/Production
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (host: 0.0.0.0)`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start Express/Vite server:", err);
});
