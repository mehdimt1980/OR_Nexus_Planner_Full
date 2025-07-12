'use server';

/**
 * @fileOverview Enhanced AI agent for German hospital staffing optimization
 * 
 * Handles authentic German medical procedures, department specializations,
 * and realistic hospital workflow requirements for OR staff assignment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Enhanced input schema for real German hospital data
const SuggestStaffingPlanInputSchema = z.object({
  operatingRooms: z
    .array(
      z.object({
        name: z.string().describe('OP-Saal Name (z.B. "SAAL 1")'),
        shift: z.string().optional().describe('Legacy shift identifier (BD1, BD2, etc.)'),
        time: z.string().optional().describe('Operationszeit (z.B. "7:20")'),
        procedure: z.string().optional().describe('Deutscher Eingriff (z.B. "Dupuytren`sche Kontraktur Hand (L)")'),
        surgeon: z.string().optional().describe('Operateur Name (z.B. "Dr. med. Stoffels")'),
        department: z.string().optional().describe('Abteilung (ACH, GCH, PCH, URO, GYN, UCH)'),
        operationComplexity: z
          .string()
          .describe('Komplexitätsstufe (Sehr Hoch, Hoch, Mittel, Niedrig)'),
        duration: z.number().optional().describe('Geschätzte Dauer in Minuten'),
        specialRequirements: z.array(z.string()).optional().describe('Besondere Anforderungen')
      })
    )
    .describe('Array der zu besetzenden OP-Säle mit medizinischen Details'),
    
  availableStaff: z
    .array(z.string())
    .describe('Verfügbare Pflegekräfte (Gesamtliste)'),
    
  availableStaffByDepartment: z
    .record(z.array(z.string()))
    .optional()
    .describe('Verfügbare Pflegekräfte nach Abteilung gruppiert'),
    
  sickStaff: z
    .array(z.string())
    .describe('Kranke/nicht verfügbare Pflegekräfte'),
    
  workloadConstraints: z.object({
    maxOpsPerStaff: z.number().default(3).describe('Max. Operationen pro Pflegekraft'),
    preferSpecialistForComplex: z.boolean().default(true).describe('Spezialisten für komplexe Eingriffe bevorzugen'),
    requireTwoStaffMinimum: z.boolean().default(true).describe('Mindestens 2 Pflegekräfte pro OP')
  }).optional()
});

export type SuggestStaffingPlanInput = z.infer<typeof SuggestStaffingPlanInputSchema>;

// Enhanced output schema with detailed reasoning
const SuggestStaffingPlanOutputSchema = z.object({
  assignments: z
    .array(
      z.object({
        operatingRoom: z.string().describe('OP-Saal Name'),
        shift: z.string().optional().describe('Schicht (legacy)'),
        time: z.string().optional().describe('Operationszeit'),
        staff: z.array(z.string()).describe('Zugewiesene Pflegekräfte (2er-Team)'),
        reason: z.string().describe('Detaillierte Begründung für diese Personalzuteilung'),
        departmentMatch: z.boolean().describe('Ob Personal zur Abteilung passt'),
        complexityJustification: z.string().describe('Begründung basierend auf Eingriffs-Komplexität'),
        skillsMatch: z.array(z.string()).optional().describe('Passende Qualifikationen'),
        alternativeOptions: z.array(z.string()).optional().describe('Alternative Personaloptionen'),
        workloadBalance: z.string().optional().describe('Arbeitsbelastung Berücksichtigung')
      })
    )
    .describe('Detaillierte Personalzuweisungen mit Begründungen'),
    
  overallStrategy: z.string().describe('Gesamtstrategie der Personalverteilung'),
  
  warnings: z.array(z.string()).optional().describe('Warnungen oder Engpässe'),
  
  departmentUtilization: z.record(z.object({
    assigned: z.number(),
    available: z.number(),
    utilizationRate: z.number()
  })).optional().describe('Auslastung nach Abteilung'),
  
  recommendations: z.array(z.string()).optional().describe('Empfehlungen zur Optimierung')
});

export type SuggestStaffingPlanOutput = z.infer<typeof SuggestStaffingPlanOutputSchema>;

export async function suggestStaffingPlan(input: SuggestStaffingPlanInput): Promise<SuggestStaffingPlanOutput> {
  return suggestStaffingPlanFlow(input);
}

// Enhanced German hospital expertise prompt
const prompt = ai.definePrompt({
  name: 'enhancedGermanHospitalStaffingPrompt',
  input: {schema: SuggestStaffingPlanInputSchema},
  output: {schema: SuggestStaffingPlanOutputSchema},
  prompt: `Sie sind ein erfahrener OP-Koordinator im Klinikum Gütersloh und erstellen optimale Personalvorschläge für den OP-Plan. Sie haben fundierte Kenntnisse der deutschen Medizin und Krankenhausabläufe.

**OPERATIVE EINGRIFFE FÜR HEUTE:**
{{#each operatingRooms}}
- **{{name}}** {{#if time}}({{time}}){{/if}}{{#if shift}} - {{shift}}{{/if}}
  {{#if procedure}}Eingriff: "{{procedure}}"{{/if}}
  {{#if surgeon}}Operateur: {{surgeon}}{{/if}}
  {{#if department}}Abteilung: {{department}}{{/if}}
  Komplexität: **{{operationComplexity}}**
  {{#if duration}}Geschätzte Dauer: {{duration}} Min{{/if}}
  {{#if specialRequirements}}Besonderheiten: {{specialRequirements}}{{/if}}
{{/each}}

**VERFÜGBARES PERSONAL:**
{{#if availableStaffByDepartment}}
{{#each availableStaffByDepartment}}
- **{{@key}}**: {{#each this}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}
{{else}}
Gesamtes Personal: {{#each availableStaff}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

**NICHT VERFÜGBAR:** {{#each sickStaff}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

**ABTEILUNGSEXPERTISE:**
- **ACH (Allgemeinchirurgie)**: Thyreoidektomie, Cholezystektomie, Hernie-Reparatur, Laparoskopie, Endokrine Chirurgie
- **GCH (Gefäßchirurgie)**: Major-Amputationen, Endarteriektomie, Patchplastik, Gefäßinterventionen, Endovaskuläre Eingriffe
- **PCH (Plastische Chirurgie)**: Dupuytren-Kontraktur, Lappenplastiken, Hauttumor-Exzisionen, Mikrochirurgie, Handchirurgie
- **URO (Urologie)**: Ureterorenoskopie, TURP, Nephrolithopaxie, Endoskopie, Lasertherapie
- **GYN (Gynäkologie)**: Mamma-BET, Sentinel-Lymphknoten, Hysterektomie, Laparoskopie, Onkologie
- **UCH (Unfallchirurgie)**: Osteosynthese, Metallentfernung, Wirbelsäuleninstrumentierung, Frakturversorgung

**PERSONALANFORDERUNGEN NACH KOMPLEXITÄT:**
- **Sehr Hoch**: 2 erfahrene Fachkräfte, mindestens 1 Abteilungsspezialist erforderlich
  (z.B. Thyreoidektomie, Major-Amputation, Osteosynthese Acetabulum)
- **Hoch**: 2 qualifizierte Fachkräfte, mindestens 1 mit Abteilungserfahrung
  (z.B. Mamma-BET, Ureterorenoskopie, Hernie-TAPP)
- **Mittel**: 2 Fachkräfte, Standard-Qualifikation ausreichend
  (z.B. Dupuytren-Kontraktur, Cholezystektomie)
- **Niedrig**: 1-2 Fachkräfte, auch abteilungsfremde Springer möglich
  (z.B. kleine Exzisionen, einfache Eingriffe)

**OPTIMIERUNGSKRITERIEN:**
1. **Abteilungsspezifische Expertise**: Bevorzugen Sie Personal mit passender Fachabteilung
2. **Arbeitsbelastung**: Max. 3 Operationen pro Pflegekraft pro Schicht
3. **Komplexitätsverteilung**: Erfahrene Kräfte für schwierige Eingriffe
4. **Zeitliche Überschneidungen**: Berücksichtigen Sie Operationszeiten
5. **Notfallreserven**: Halten Sie Personal für Notfälle frei
6. **Skill-Matching**: Passende Qualifikationen für Spezialeingriffe

**DEUTSCHE MEDIZINISCHE BEGRIFFE VERSTEHEN:**
- Dupuytren = Handchirurgie, Mikrochirurgie erforderlich
- Thyreoidektomie = Endokrine Chirurgie, sehr komplex
- Mamma-BET = Gynäkologie, Onkologie-Kenntnisse
- TAPP = Laparoskopie-Expertise erforderlich
- Ureterorenoskopie = Endoskopie-Kenntnisse
- Osteosynthese = Unfallchirurgie, Orthopädie

**IHRE AUFGABE:**
Erstellen Sie für JEDEN OP-Saal ein optimales 2er-Team mit:
1. Detaillierter Begründung der Personalauswahl
2. Abteilungspassung und Skill-Matching
3. Komplexitätsbewertung
4. Alternative Optionen falls möglich
5. Arbeitsbelastungsverteilung

Antworten Sie professionell als deutscher OP-Koordinator mit medizinischer Expertise.`,
});

const suggestStaffingPlanFlow = ai.defineFlow(
  {
    name: 'enhancedGermanHospitalStaffingFlow',
    inputSchema: SuggestStaffingPlanInputSchema,
    outputSchema: SuggestStaffingPlanOutputSchema,
  },
  async input => {
    try {
      const {output, usage} = await prompt(input);
      
      if (!output) {
        console.error('Enhanced Staffing Flow: AI prompt did not return parsable output.', { 
          usageInfo: usage, 
          inputData: input 
        });
        throw new Error('AI-Prompt konnte keine gültige Antwort generieren. Möglicherweise aufgrund von Sicherheitsfiltern oder Modellproblemen.');
      }

      // Enhanced validation for German hospital requirements
      output.assignments.forEach((assignment, index) => {
        // Ensure exactly 2 staff members per operation
        if (!assignment.staff || assignment.staff.length !== 2) {
          console.warn(`Enhanced Staffing Flow: Assignment ${index} does not have exactly 2 staff members.`, { 
            assignment,
            expectedStaffCount: 2,
            actualStaffCount: assignment.staff?.length || 0
          });
          
          // Auto-correction: ensure 2 staff members
          if (!assignment.staff) {
            assignment.staff = ['Unzugewiesen 1', 'Unzugewiesen 2'];
          } else if (assignment.staff.length === 1) {
            assignment.staff.push('Zusätzliche Pflegekraft');
          } else if (assignment.staff.length > 2) {
            assignment.staff = assignment.staff.slice(0, 2);
          }
        }

        // Ensure German language reasoning
        if (!assignment.reason || assignment.reason.length < 20) {
          assignment.reason = `Personalzuweisung für ${assignment.operatingRoom} basierend auf Verfügbarkeit und Qualifikation.`;
        }

        // Ensure complexity justification
        if (!assignment.complexityJustification) {
          assignment.complexityJustification = `Personalauswahl entspricht der Eingriffsanforderung.`;
        }
      });

      // Add overall quality metrics
      const totalAssignments = output.assignments.length;
      const departmentMatches = output.assignments.filter(a => a.departmentMatch).length;
      const matchRate = totalAssignments > 0 ? Math.round((departmentMatches / totalAssignments) * 100) : 0;

      if (!output.overallStrategy) {
        output.overallStrategy = `Personalverteilung für ${totalAssignments} Operationen mit ${matchRate}% Abteilungspassung. Fokus auf Komplexitätserfordernisse und Arbeitsbelastungsoptimierung.`;
      }

      // Add recommendations if missing
      if (!output.recommendations) {
        output.recommendations = [
          'Überwachen Sie die Arbeitsbelastung während der Schicht',
          'Halten Sie Springer-Personal für Notfälle bereit',
          'Prüfen Sie Abteilungspassungen bei kritischen Eingriffen'
        ];
      }

      console.info('Enhanced Staffing Flow: Successfully generated German hospital staffing plan', {
        totalAssignments,
        departmentMatchRate: matchRate,
        hasWarnings: (output.warnings?.length || 0) > 0,
        avgReasoningLength: output.assignments.reduce((sum, a) => sum + a.reason.length, 0) / totalAssignments
      });

      return output;
      
    } catch (error) {
      console.error('Enhanced Staffing Flow: Critical error during AI processing', {
        error: error.message,
        inputOperationsCount: input.operatingRooms.length,
        availableStaffCount: input.availableStaff.length
      });
      
      // Fallback response for system reliability
      const fallbackOutput: SuggestStaffingPlanOutput = {
        assignments: input.operatingRooms.map(room => ({
          operatingRoom: room.name,
          shift: room.shift || 'Standard',
          time: room.time,
          staff: ['Fallback Personal 1', 'Fallback Personal 2'],
          reason: `Automatische Zuweisung für ${room.name} aufgrund von System-Einschränkungen. Manuelle Überprüfung erforderlich.`,
          departmentMatch: false,
          complexityJustification: `Fallback-Zuweisung für ${room.operationComplexity || 'unbekannte'} Komplexität.`,
          alternativeOptions: [],
          workloadBalance: 'Nicht berechnet - Fallback-Modus'
        })),
        overallStrategy: 'Fallback-Personalverteilung aktiv. Bitte manuell überprüfen und anpassen.',
        warnings: [
          'AI-System konnte keine optimale Lösung generieren',
          'Alle Zuweisungen müssen manuell überprüft werden',
          'Abteilungspassungen wurden nicht berücksichtigt'
        ],
        recommendations: [
          'Überprüfen Sie alle Personalzuweisungen manuell',
          'Stellen Sie Abteilungspassungen sicher',
          'Kontaktieren Sie IT-Support bei wiederholten Problemen'
        ]
      };
      
      return fallbackOutput;
    }
  }
);
