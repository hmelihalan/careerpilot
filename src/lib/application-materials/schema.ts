import { z } from "zod";

export const interviewQuestionSchema = z
  .object({
    category: z.enum(["Technical", "Behavioral", "Company-Specific"]),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    question: z.string().trim().min(1).max(500),
    guidance: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const generatedApplicationMaterialsSchema = z
  .object({
    coverLetter: z.string().trim().min(100).max(6_000),
    followUpMessage: z.string().trim().min(50).max(2_000),
    interviewQuestions: z.array(interviewQuestionSchema).length(9),
  })
  .strict()
  .superRefine((value, context) => {
    const categories = ["Technical", "Behavioral", "Company-Specific"] as const;
    for (const category of categories) {
      if (
        value.interviewQuestions.filter((question) => question.category === category)
          .length !== 3
      ) {
        context.addIssue({
          code: "custom",
          path: ["interviewQuestions"],
          message: `Exactly three ${category} questions are required.`,
        });
      }
    }
  });

export const interviewQuestionsSchema = z.array(interviewQuestionSchema).max(12);

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type GeneratedApplicationMaterials = z.infer<
  typeof generatedApplicationMaterialsSchema
>;

export const applicationMaterialsJsonSchema = {
  type: "object",
  properties: {
    coverLetter: { type: "string" },
    followUpMessage: { type: "string" },
    interviewQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["Technical", "Behavioral", "Company-Specific"],
          },
          difficulty: {
            type: "string",
            enum: ["Easy", "Medium", "Hard"],
          },
          question: { type: "string" },
          guidance: { type: "string" },
        },
        required: ["category", "difficulty", "question", "guidance"],
        additionalProperties: false,
      },
    },
  },
  required: ["coverLetter", "followUpMessage", "interviewQuestions"],
  additionalProperties: false,
} as const;
