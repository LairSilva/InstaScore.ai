import { z } from "zod";

export const EvaluationItemSchema = z.object({
  criterion_id: z.string(),
  grade: z.union([z.number().int().min(0).max(4), z.null()]),
  confidence: z.number().min(0).max(1),
  evidence: z.string().min(1, "Evidence is required"),
  justification: z.string().min(1, "Justification is required"),
});

export const StrengthItemSchema = z.object({
  criterion_id: z.string(),
  title: z.string().min(1),
  reason: z.string().min(1),
});

export const CriticalGapItemSchema = z.object({
  criterion_id: z.string(),
  title: z.string().min(1),
  reason: z.string().min(1),
  impact: z.string().min(1),
});

export const RecommendedActionItemSchema = z.object({
  criterion_id: z.string(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  effort: z.enum(["low", "medium", "high"]),
  expected_effect: z.string().min(1),
});

export const TomorrowActionSchema = z.object({
  criterion_id: z.string(),
  title: z.string().min(1),
  instruction: z.string().min(1),
});

export const DiagnosisSchema = z.object({
  methodology_version: z.literal("instascore-structural-0.1-alpha"),
  analysis_type: z.literal("structural"),
  metadata: z.object({
    is_data_sufficient: z.boolean(),
    missing_elements: z.array(z.string()),
    overall_confidence: z.number().min(0).max(1),
  }),
  evaluations: z.array(EvaluationItemSchema),
  strengths: z.array(StrengthItemSchema).max(3),
  critical_gaps: z.array(CriticalGapItemSchema).max(5),
  recommended_actions: z.array(RecommendedActionItemSchema).max(10), // Allow some buffer, prompt asks for exactly 5
  tomorrow_action: TomorrowActionSchema,
  disclaimer: z.string(),
}).strict();

export type DiagnosisInput = z.infer<typeof DiagnosisSchema>;
