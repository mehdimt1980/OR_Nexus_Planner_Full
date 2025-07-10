
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
  prompt: `You are an expert OR manager at Klinikum Gütersloh tasked with creating an optimal staffing plan for operating rooms. You must assign exactly two nursing staff members to each operating room.

  DEPARTMENT SPECIALIZATIONS:
  - UCH (Unfallchirurgie): Trauma surgery, orthopedics, fractures - requires high skill for complex procedures
  - ACH (Allgemeine Chirurgie): General surgery, abdominal procedures - versatile surgical experience needed
  - GCH (Gefäßchirurgie): Vascular surgery, vessel procedures - specialized vascular knowledge important
  - GYN (Gynäkologie): Gynecology, breast surgery - women's health procedures
  - URO (Urologie): Urology, kidney procedures - urological expertise preferred
  - PCH (Plastische Chirurgie): Plastic surgery, reconstructive procedures - precision and aesthetic considerations
  - EPZ/HNO: ENT surgery, endoscopic procedures - specialized equipment knowledge

  OPERATING ROOMS AND THEIR REQUIREMENTS:
  {{#each operatingRooms}}
  - Room: {{name}}, Shift: {{shift}}, Complexity: {{operationComplexity}}
    {{#if (eq name "SAAL 1")}}Department: UCH (Unfallchirurgie){{/if}}
    {{#if (eq name "SAAL 2")}}Department: GCH (Gefäßchirurgie){{/if}}
    {{#if (eq name "SAAL 3")}}Department: ACH (Allgemeine Chirurgie){{/if}}
    {{#if (eq name "SAAL 4")}}Department: GYN (Gynäkologie){{/if}}
    {{#if (eq name "SAAL 5")}}Department: GCH (Gefäßchirurgie){{/if}}
    {{#if (eq name "SAAL 6")}}Department: URO (Urologie){{/if}}
    {{#if (eq name "SAAL 7")}}Department: ACH (Allgemeine Chirurgie){{/if}}
    {{#if (eq name "SAAL 8")}}Department: PCH (Plastische Chirurgie){{/if}}
    {{#if (eq name "UCH")}}Department: UCH (Unfallchirurgie){{/if}}
    {{#if (eq name "ACH")}}Department: ACH (Allgemeine Chirurgie){{/if}}
    {{#if (eq name "GYN")}}Department: GYN (Gynäkologie){{/if}}
    {{#if (eq name "GCH")}}Department: GCH (Gefäßchirurgie){{/if}}
    {{#if (eq name "URO")}}Department: URO (Urologie){{/if}}
    {{#if (eq name "PCH")}}Department: PCH (Plastische Chirurgie){{/if}}
    {{#if (eq name "DaVinci")}}Department: URO (Urologie) - Robotic Surgery{{/if}}
    {{#if (eq name "EPZ/HNO")}}Department: EPZ/HNO{{/if}}
  {{/each}}

  AVAILABLE NURSING STAFF: {{#each availableStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  SICK/UNAVAILABLE STAFF: {{#each sickStaff}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  STAFFING GUIDELINES:
  - Each OR requires exactly TWO nursing staff members
  - Consider department specialization when possible (staff with relevant skills)
  - Balance workload across available staff
  - For "Sehr Hoch" complexity: Pair experienced staff or one expert with one competent nurse
  - For "Hoch" complexity: At least one experienced nurse required
  - For "Mittel/Niedrig" complexity: Can use less experienced staff or training opportunities
  - Avoid overloading any single staff member with multiple high-complexity assignments

  STAFF SKILL REFERENCES:
  - Karin R.: General, DaVinci (robotic surgery), URO
  - Fatima R.: General, GCH (Vascular), UCH (Trauma)
  - Gerhard K.: General, UCH (Trauma), ACH (General Surgery)
  - Ulla K.: General, DaVinci, EPZ/HNO, URO
  - Sandra P.: General, GYN (Gynecology)
  - Jürgen S.: General, URO (Urology)
  - Anja M.: General, PCH (Plastic Surgery)
  - Sabine W.: General, EPZ/HNO
  - Michael B.: General, ACH (General Surgery)
  - Thomas L.: General, ACH (General Surgery)
  - Marion K.: General, GCH (Vascular Surgery)
  - Petra H.: General, GYN, PCH

  DEPARTMENT PREFERRED STAFF:
  - UCH (Trauma): Fatima R., Gerhard K.
  - ACH (General Surgery): Gerhard K., Michael B., Thomas L.
  - GCH (Vascular): Fatima R., Marion K.
  - GYN (Gynecology): Sandra P., Petra H.
  - URO (Urology): Karin R., Ulla K., Jürgen S.
  - PCH (Plastic Surgery): Anja M., Petra H.
  - EPZ/HNO: Ulla K., Sabine W.

  Return a staffing plan that optimizes patient safety, staff expertise, and workload distribution.

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
