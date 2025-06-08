"use server";
import type { SummarizeGptLearningInput, SummarizeGptLearningOutput } from "@/ai/flows/summarize-gpt-learning";
import { summarizeGptLearning } from "@/ai/flows/summarize-gpt-learning";
import type { SuggestStaffingPlanInput, SuggestStaffingPlanOutput } from "@/ai/flows/suggest-staffing-plan";
import { suggestStaffingPlan } from "@/ai/flows/suggest-staffing-plan";

export async function fetchAiStaffingSuggestions(
  input: SuggestStaffingPlanInput
): Promise<SuggestStaffingPlanOutput> {
  try {
    return await suggestStaffingPlan(input);
  } catch (error) {
    console.error("Error fetching AI staffing suggestions:", error);
    // Fallback or rethrow, depending on desired error handling
    throw new Error("Failed to get AI staffing suggestions.");
  }
}

export async function fetchAiLearningSummary(
  input: SummarizeGptLearningInput
): Promise<SummarizeGptLearningOutput> {
  try {
    return await summarizeGptLearning(input);
  } catch (error) {
    console.error("Error fetching AI learning summary:", error);
    // Fallback or rethrow
    throw new Error("Failed to get AI learning summary.");
  }
}
