import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid document ID.");

const sessionBaseSchema = z.object({
  mode: z.enum(["interview", "regular", "mock"]),

  role: z.string().trim().max(150).optional().default(""),

  company: z.string().trim().max(150).optional().default(""),

  resumeDocumentId: objectIdSchema.nullable().optional(),

  documentIds: z.array(objectIdSchema).max(20).default([]),

  instructions: z.string().max(20000).default(""),

  language: z.string().trim().min(2).max(20).default("en"),

  model: z.string().trim().min(1).max(100),

  answerFormat: z.enum([
    "bullet_points",
    "script_bullets",
    "full_script"
  ]).default("bullet_points"),

  saveTranscript: z.boolean().default(false)
});

function validateRoleBasedSession(data, ctx) {
  if (
    (data.mode === "interview" || data.mode === "mock") &&
    data.role !== undefined &&
    !data.role.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["role"],
      message: "Role is required."
    });
  }

  if (
    (data.mode === "interview" || data.mode === "mock") &&
    data.company !== undefined &&
    !data.company.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["company"],
      message: "Company is required."
    });
  }
}

export const createSessionSchema = z.object({
  body: sessionBaseSchema.superRefine((data, ctx) => {
    if (
      data.mode === "interview" ||
      data.mode === "mock"
    ) {
      if (!data.role.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["role"],
          message: "Role is required."
        });
      }

      if (!data.company.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["company"],
          message: "Company is required."
        });
      }
    }
  })
});

export const updateSessionSchema = z.object({
  body: sessionBaseSchema
    .partial()
    .superRefine(validateRoleBasedSession)
});