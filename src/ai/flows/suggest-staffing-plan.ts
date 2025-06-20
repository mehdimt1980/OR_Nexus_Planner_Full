
'use server';

/**
 * @fileOverview An AI agent that suggests an optimal staffing plan for the OR schedule, assigning two staff members per room.
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
        staff: z.array(z.string()).describe('An array of two assigned staff members.'), // Changed to array
        reason: z.string().describe('The reason for this assignment pairing.'),
      })
    )
    .describe('An array of staff assignments, with two staff members for each operating room and shift.'),
});
export type SuggestStaffingPlanOutput = z.infer<typeof SuggestStaffingPlanOutputSchema>;

export async function suggestStaffingPlan(input: SuggestStaffingPlanInput): Promise<SuggestStaffingPlanOutput> {
  return suggestStaffingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStaffingPlanPrompt',
  input: {schema: SuggestStaffingPlanInputSchema},
  output: {schema: SuggestStaffingPlanOutputSchema},
  prompt: `You are an expert OR manager tasked with creating an optimal staffing plan for operating rooms. You must assign exactly two staff members to each operating room.

  Consider the following operating rooms, their shifts, and the complexity of the operations:
  {{#each operatingRooms}}
  - Operating Room: {{name}}, Shift: {{shift}}, Complexity: {{operationComplexity}}
  {{/each}}

  Available Staff: {{#each availableStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Sick Staff: {{#each sickStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Based on this information, generate a staffing plan that assigns exactly two staff members to each operating room. Maximize efficiency and resource utilization. Take into account staff availability, skills (assume general skills unless specified otherwise by complexity), and operation complexity. Provide clear reasons for each assignment pairing. For example, you might pair an experienced staff member with a less experienced one, or two staff members whose skills complement each other for a complex procedure.

  Return the staffing plan in the following JSON format:
  { "assignments": [ { "operatingRoom": "string", "shift": "string", "staff": ["string", "string"], "reason": "string" } ] }`,
});

const suggestStaffingPlanFlow = ai.defineFlow(
  {
    name: 'suggestStaffingPlanFlow',
    inputSchema: SuggestStaffingPlanInputSchema,
    outputSchema: SuggestStaffingPlanOutputSchema,
  },
  async input => {
    const {output, usage} = await prompt(input); // Destructure usage for potential debugging
    if (!output) {
      console.error('SuggestStaffingPlanFlow: AI prompt did not return a parsable output.', { usageInfo: usage, inputData: input });
      throw new Error('AI prompt did not return a parsable output. This could be due to safety filters, model issues, or an invalid response format from the AI.');
    }
    // Ensure each assignment has two staff members, or log an error/handle appropriately
    output.assignments.forEach(assignment => {
      if (!assignment.staff || assignment.staff.length !== 2) {
        console.warn('SuggestStaffingPlanFlow: AI returned an assignment without exactly two staff members.', { assignment });
        // Potentially, you could try to fill with placeholders or throw a more specific error
        // For now, we'll let it pass but it might cause issues downstream if not handled.
        // To be robust, you might want to ensure the AI *always* returns two, or have a fallback.
      }
    });
    return output;
  }
);
