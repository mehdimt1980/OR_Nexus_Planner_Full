'use server';

/**
 * @fileOverview AI agent for German hospital OR staffing that considers department expertise,
 * German medical procedures, time conflicts, and real hospital workflows.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestStaffingPlanInputSchema = z.object({
  operations: z
    .array(
      z.object({
        id: z.string().describe('Unique operation ID'),
        room: z.string().describe('Operating room (e.g., SAAL 1, SAAL 2)'),
        department: z.string().describe('Medical department (UCH, ACH, GCH, GYN, URO, PCH)'),
        scheduledTime: z.string().describe('Scheduled time in HH:MM format'),
        procedureName: z.string().describe('German procedure name (e.g., Hüft-TEP, Cholezystektomie)'),
        primarySurgeon: z.string().optional().describe('Name of primary surgeon'),
        operationComplexity: z
          .string()
          .describe('Operation complexity (Sehr Hoch, Hoch, Mittel, Niedrig)'),
        estimatedDuration: z.number().optional().describe('Estimated duration in minutes'),
      })
    )
    .describe('Array of operations requiring staff assignment'),
  availableStaff: z
    .array(
      z.object({
        name: z.string().describe('Staff member name'),
        departmentExpertise: z.array(z.string()).describe('Department specializations'),
        skills: z.array(z.string()).optional().describe('Additional skills'),
        currentAssignments: z.array(z.string()).optional().describe('Current time slot assignments'),
      })
    )
    .describe('Available nursing staff with their expertise'),
  sickStaff: z
    .array(z.string())
    .describe('Names of staff members who are unavailable'),
  currentDate: z.string().optional().describe('Current date for planning (YYYY-MM-DD)'),
});
export type SuggestStaffingPlanInput = z.infer<typeof SuggestStaffingPlanInputSchema>;

const SuggestStaffingPlanOutputSchema = z.object({
  assignments: z
    .array(
      z.object({
        operationId: z.string().describe('The operation ID'),
        room: z.string().describe('Operating room name'),
        scheduledTime: z.string().describe('Operation time'),
        department: z.string().describe('Medical department'),
        assignedStaff: z
          .array(
            z.object({
              name: z.string().describe('Staff member name'),
              role: z.string().describe('Primary role for this operation (Lead, Support, Specialist)'),
              expertise: z.string().describe('Relevant expertise for this assignment'),
            })
          )
          .describe('Two nursing staff members assigned to this operation'),
        reasoning: z.string().describe('Detailed reasoning for this staff pairing'),
        conflictWarnings: z.array(z.string()).optional().describe('Any time or resource conflicts detected'),
      })
    )
    .describe('Staff assignments for each operation with detailed reasoning'),
  overallStrategy: z.string().describe('Overall staffing strategy explanation'),
  timeConflicts: z.array(z.string()).optional().describe('Detected time conflicts requiring attention'),
});
export type SuggestStaffingPlanOutput = z.infer<typeof SuggestStaffingPlanOutputSchema>;

export async function suggestStaffingPlan(input: SuggestStaffingPlanInput): Promise<SuggestStaffingPlanOutput> {
  return suggestStaffingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'germanHospitalStaffingPrompt',
  input: {schema: SuggestStaffingPlanInputSchema},
  output: {schema: SuggestStaffingPlanOutputSchema},
  prompt: `Du bist ein KI-Experte für die Personalplanung in deutschen Krankenhäusern und spezialisiert auf OP-Pflege-Zuordnungen. 
Du verstehst deutsche medizinische Verfahren und Abteilungsstrukturen.

KRANKENHAUS-ABTEILUNGEN UND SPEZIALISIERUNGEN:
- UCH (Unfallchirurgie): Trauma, Orthopädie, Knochenbrüche, Gelenkersatz
  * Typische Eingriffe: Hüft-TEP, Knie-TEP, Osteosynthesen, Wirbelsäulenchirurgie
  * Benötigt: Erfahrung mit Implantaten, Orthopädie-Instrumentierung
- ACH (Allgemeine Chirurgie): Bauchoperationen, Notfälle, Tumorchirurgie  
  * Typische Eingriffe: Cholezystektomie, Appendektomie, Darmresektionen
  * Benötigt: Laparoskopie-Kenntnisse, Allgemeinchirurgie-Erfahrung
- GCH (Gefäßchirurgie): Arterien, Venen, Dialysezugänge
  * Typische Eingriffe: Varizen-Stripping, AV-Fistel, Bypass-Operationen
  * Benötigt: Gefäßchirurgie-Kenntnisse, Mikroinstrumente
- GYN (Gynäkologie): Frauenheilkunde, Geburtshilfe
  * Typische Eingriffe: Hysterektomie, Sectio, Laparoskopische GYN-OPs
  * Benötigt: Gynäkologie-Erfahrung, Geburtshilfe bei Sectio
- URO (Urologie): Nieren, Blase, Prostata
  * Typische Eingriffe: TUR-P, Nephrektomie, Ureteroskopie
  * Benötigt: Urologische Instrumente, Endoskopie-Kenntnisse
- PCH (Plastische Chirurgie): Ästhetische und rekonstruktive Chirurgie
  * Typische Eingriffe: Mammareduktion, Liposuktion, Lappenplastiken
  * Benötigt: Feinchirurgie, ästhetische Chirurgie-Kenntnisse

DEUTSCHE OPERATIONSBEISPIELE UND KOMPLEXITÄT:
Sehr Hoch: Wirbelsäulen-Instrumentierung, Thyreoidektomie, große Tumorresektionen
Hoch: Cholezystektomie, Hüft-TEP, Sectio bei Risikopatienten, TUR-P
Mittel: Appendektomie, Hernioplastik, Metallentfernung, Hysteroskopie
Niedrig: Varizen-Stripping, kleinere Exzisionen, Lipom-Entfernung

OPERATIONEN ZU BEARBEITEN:
{{#each operations}}
Operation {{id}}:
- Raum: {{room}}
- Abteilung: {{department}}  
- Zeit: {{scheduledTime}}
- Eingriff: {{procedureName}}
- Operateur: {{primarySurgeon}}
- Komplexität: {{operationComplexity}}
- Geschätzte Dauer: {{estimatedDuration}} Minuten
{{/each}}

VERFÜGBARES PFLEGEPERSONAL:
{{#each availableStaff}}
{{name}}:
- Abteilungs-Expertise: {{#each departmentExpertise}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Zusätzliche Skills: {{#each skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Aktuelle Zuordnungen: {{#each currentAssignments}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

KRANKES PERSONAL (nicht verfügbar): {{#each sickStaff}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

PLANUNGSREGELN:
1. ABTEILUNGS-EXPERTISE: Weise Personal mit passender Abteilungs-Expertise zu
2. ZWEI-PERSONAL-REGEL: Jede Operation benötigt genau 2 Pflegekräfte
3. ZEITKONFLIKTE: Eine Pflegekraft kann nicht gleichzeitig in mehreren OPs sein
4. KOMPLEXITÄTS-MATCHING: Hohe Komplexität benötigt erfahrenes Personal
5. DEUTSCHE VERFAHREN: Berücksichtige spezielle Anforderungen deutscher Operationen
6. RAUMNUTZUNG: Beachte Raumzuordnungen und Abteilungslogik
7. OPERATEURSPRÄFERENZEN: Berücksichtige bekannte Präferenzen der Operateure

PERSONALZUORDNUNGS-STRATEGIE:
- Lead-Role: Erfahrenes Personal mit passender Abteilungs-Expertise
- Support-Role: Unterstützendes Personal, kann abteilungsübergreifend sein
- Bei sehr hoher Komplexität: Beide Personal mit relevanter Expertise
- Bei Zeitkonflikten: Alternative Zuordnungen vorschlagen

Erstelle eine optimale Personalzuordnung für alle Operationen unter Berücksichtigung deutscher Krankenhaus-Standards und medizinischer Verfahren. 
Erkläre deine Entscheidungen ausführlich auf Deutsch.`,
});

const suggestStaffingPlanFlow = ai.defineFlow(
  {
    name: 'germanHospitalStaffingFlow',
    inputSchema: SuggestStaffingPlanInputSchema,
    outputSchema: SuggestStaffingPlanOutputSchema,
  },
  async input => {
    try {
      const {output, usage} = await prompt(input);
      
      if (!output) {
        console.error('German Hospital Staffing Flow: AI prompt did not return a parsable output.', { 
          usageInfo: usage, 
          inputData: input 
        });
        throw new Error('AI konnte keine Personalvorschläge generieren. Dies könnte auf Sicherheitsfilter, Modellprobleme oder ungültiges Antwortformat zurückzuführen sein.');
      }

      // Validate assignments
      output.assignments.forEach((assignment, index) => {
        if (!assignment.assignedStaff || assignment.assignedStaff.length !== 2) {
          console.warn(`German Hospital Staffing: Assignment ${index} does not have exactly 2 staff members.`, { 
            assignment 
          });
        }
        
        // Validate that assigned staff exists in available staff
        assignment.assignedStaff.forEach(staffAssignment => {
          const staffExists = input.availableStaff.some(staff => staff.name === staffAssignment.name);
          if (!staffExists) {
            console.warn(`German Hospital Staffing: Assigned staff ${staffAssignment.name} not found in available staff list.`);
          }
        });
      });

      // Check for time conflicts in assignments
      const timeConflictCheck = new Map<string, string[]>();
      output.assignments.forEach(assignment => {
        assignment.assignedStaff.forEach(staff => {
          const key = `${staff.name}-${assignment.scheduledTime}`;
          if (!timeConflictCheck.has(key)) {
            timeConflictCheck.set(key, []);
          }
          timeConflictCheck.get(key)!.push(assignment.operationId);
        });
      });

      // Add conflict warnings to output if detected
      const conflicts: string[] = [];
      timeConflictCheck.forEach((operations, key) => {
        if (operations.length > 1) {
          const [staffName, time] = key.split('-');
          conflicts.push(`${staffName} hat Zeitkonflikt um ${time}: ${operations.join(', ')}`);
        }
      });

      if (conflicts.length > 0) {
        output.timeConflicts = conflicts;
      }

      return output;
    } catch (error) {
      console.error('Error in German Hospital Staffing Flow:', error);
      throw new Error(`Fehler bei der KI-Personalplanung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
);
