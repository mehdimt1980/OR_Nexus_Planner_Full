
// Summarize what GPT has learned from Julia's manual overrides of staff assignments.

'use server';

/**
 * @fileOverview This flow summarizes what the AI has learned from Julia's manual adjustments,
 * considering that assignments involve pairs of staff.
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
      'A list of descriptions of Julia’s overrides of the AI staffing suggestions. Each description should detail the change from original staff pair to Julia\'s selected staff pair and the reason. Format: "OperationID: [Original Staff1, Original Staff2] -> [Julia Staff1, Julia Staff2] (Reason for change)"'
    ),
  numOverrides: z.number().describe('The number of manual overrides Julia made to the AI suggestions.'),
  totalAssignments: z.number().describe('The total number of staff assignments made (each assignment slot counts as one).'),
});
export type SummarizeGptLearningInput = z.infer<typeof SummarizeGptLearningInputSchema>;

const SummarizeGptLearningOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the patterns and reasons for Julia’s overrides, highlighting what the AI has learned and potential areas for improvement for staff pairings.'
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
  prompt: `You are an AI learning summarization expert for operating room scheduling. You are helping to optimize the assignment of pairs of care staff (Pfleges) to operating rooms.

  You are provided with a list of manual overrides that Julia, the head nurse, made to your AI staffing pair suggestions, along with the total number of assignment slots and overrides.

  Your goal is to identify patterns and reasons for these overrides (especially concerning staff pairings) and provide a concise summary of what the AI has learned and where improvements can be made in suggesting staff pairs.

  Here's the information about Julia's overrides:
  Number of Overrides: {{{numOverrides}}}
  Total Assignment Slots: {{{totalAssignments}}}
  {{#if juliaOverrides}}
  Overrides Descriptions (Original Pair -> Julia's Pair (Reason)):
  {{#each juliaOverrides}}
  - {{{this}}}
  {{/each}}
  {{else}}
  (No specific override details from Julia were provided for this learning cycle.)
  {{/if}}

  Based on this information, summarize the key learnings and potential areas for improvement in suggesting staff PAIRS, in a way that Torsten, the OR Manager, can easily understand. Focus on actionable insights regarding how to better suggest compatible and effective staff pairs.
  `,
});

const summarizeGptLearningFlow = ai.defineFlow(
  {
    name: 'summarizeGptLearningFlow',
    inputSchema: SummarizeGptLearningInputSchema,
    outputSchema: SummarizeGptLearningOutputSchema,
  },
  async input => {
    const {output, usage} = await summarizeGptLearningPrompt(input);
     if (!output) {
      console.error('SummarizeGptLearningFlow: AI prompt did not return a parsable output.', { usageInfo: usage, inputData: input });
      throw new Error('AI prompt for learning summary did not return a parsable output. This could be due to safety filters, model issues, or an invalid response format from the AI.');
    }
    return output;
  }
);

