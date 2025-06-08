// Summarize what GPT has learned from Julia's manual overrides of staff assignments.

'use server';

/**
 * @fileOverview This flow summarizes what the AI has learned from Julia's manual adjustments.
 *
 * - summarizeGptLearning - A function that summarizes the GPT learning process.
 * - SummarizeGptLearningInput - The input type for the summarizeGptLearning function.
 * - SummarizeGptLearningOutput - The return type for the summarizeGptLearning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeGptLearningInputSchema = z.object({
  juliaOverrides: z
    .array(z.string())
    .describe(
      'A list of descriptions of Julia\u2019s overrides of the AI staffing suggestions, explaining the reason for the override.'
    ),
  numOverrides: z.number().describe('The number of manual overrides Julia made to the AI suggestions.'),
  totalAssignments: z.number().describe('The total number of staff assignments made.'),
});
export type SummarizeGptLearningInput = z.infer<typeof SummarizeGptLearningInputSchema>;

const SummarizeGptLearningOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the patterns and reasons for Julia\u2019s overrides, highlighting what the AI has learned and potential areas for improvement.'
    ),
});
export type SummarizeGptLearningOutput = z.infer<typeof SummarizeGptLearningOutputSchema>;

export async function summarizeGptLearning(input: SummarizeGptLearningInput): Promise<SummarizeGptLearningOutput> {
  return summarizeGptLearningFlow(input);
}

const summarizeGptLearningPrompt = ai.definePrompt({
  name: 'summarizeGptLearningPrompt',
  input: {schema: SummarizeGptLearningInputSchema},
  output: {schema: SummarizeGptLearningOutputSchema},
  prompt: `You are an AI learning summarization expert for operating room scheduling.

  You are provided with a list of manual overrides that Julia, the head nurse, made to your AI staffing suggestions, along with the total number of assignments and overrides.

  Your goal is to identify patterns and reasons for these overrides and provide a concise summary of what the AI has learned and where improvements can be made.

  Here's the information about Julia's overrides:
  Number of Overrides: {{{numOverrides}}}
  Total Assignments: {{{totalAssignments}}}
  Overrides Descriptions: {{#each juliaOverrides}}- {{{this}}}{{#unless @last}}\n{{/unless}}{{/each}}

  Based on this information, summarize the key learnings and potential areas for improvement in a way that Torsten, the OR Manager, can easily understand. Focus on actionable insights.
  `,
});

const summarizeGptLearningFlow = ai.defineFlow(
  {
    name: 'summarizeGptLearningFlow',
    inputSchema: SummarizeGptLearningInputSchema,
    outputSchema: SummarizeGptLearningOutputSchema,
  },
  async input => {
    const {output} = await summarizeGptLearningPrompt(input);
    return output!;
  }
);
