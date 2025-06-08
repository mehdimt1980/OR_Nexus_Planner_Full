'use server';

/**
 * @fileOverview An AI agent that suggests an optimal staffing plan for the OR schedule.
 *
 * - suggestStaffingPlan - A function that generates staff assignments for the OR schedule.
 * - SuggestStaffingPlanInput - The input type for the suggestStaffingPlan function.
 * - SuggestStaffingPlanOutput - The return type for the suggestStaffingPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestStaffingPlanInputSchema = z.object({
  operatingRooms: z
    .array(
      z.object({
        name: z.string().describe('The name of the operating room.'),
        shift: z.string().describe('The shift for the operating room.'),
        operationComplexity: z
          .string()
          .describe('The complexity level of the operation (Sehr Hoch, Hoch, Mittel, Niedrig).'),
      })
    )
    .describe('An array of operating rooms with their shift and operation complexity.'),
  availableStaff: z
    .array(z.string())
    .describe('An array of available staff members for assignment.'),
  sickStaff: z
    .array(z.string())
    .describe('An array of staff members who are sick and unavailable.'),
});
export type SuggestStaffingPlanInput = z.infer<typeof SuggestStaffingPlanInputSchema>;

const SuggestStaffingPlanOutputSchema = z.object({
  assignments: z
    .array(
      z.object({
        operatingRoom: z.string().describe('The operating room name.'),
        shift: z.string().describe('The shift for the operating room.'),
        staff: z.string().describe('The assigned staff member.'),
        reason: z.string().describe('The reason for this assignment.'),
      })
    )
    .describe('An array of staff assignments for each operating room and shift.'),
});
export type SuggestStaffingPlanOutput = z.infer<typeof SuggestStaffingPlanOutputSchema>;

export async function suggestStaffingPlan(input: SuggestStaffingPlanInput): Promise<SuggestStaffingPlanOutput> {
  return suggestStaffingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStaffingPlanPrompt',
  input: {schema: SuggestStaffingPlanInputSchema},
  output: {schema: SuggestStaffingPlanOutputSchema},
  prompt: `You are an expert OR manager tasked with creating an optimal staffing plan for operating rooms.

  Consider the following operating rooms, their shifts, and the complexity of the operations:
  {{#each operatingRooms}}
  - Operating Room: {{name}}, Shift: {{shift}}, Complexity: {{operationComplexity}}
  {{/each}}

  Available Staff: {{#each availableStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Sick Staff: {{#each sickStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Based on this information, generate a staffing plan that maximizes efficiency and resource utilization. Take into account staff availability and operation complexity.  Provide clear reasons for each assignment.

  Return the staffing plan in the following JSON format:
  { "assignments": [ { "operatingRoom": "string", "shift": "string", "staff": "string", "reason": "string" } ] }`,
});

const suggestStaffingPlanFlow = ai.defineFlow(
  {
    name: 'suggestStaffingPlanFlow',
    inputSchema: SuggestStaffingPlanInputSchema,
    outputSchema: SuggestStaffingPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
