// src/ai/flows/enhanced-staffing-with-julia-training.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { JuliaSkillsAnalyzer } from '@/lib/julia-skills-parser';

const EnhancedStaffingInput = z.object({
  operatingRooms: z.array(z.object({
    name: z.string(),
    shift: z.string(),
    operationComplexity: z.string(),
    operationType: z.string().optional(),
  })),
  availableStaff: z.array(z.string()),
  sickStaff: z.array(z.string()),
  juliaTrainingData: z.any().optional(), // Excel data buffer
  previousJuliaOverrides: z.array(z.object({
    operationId: z.string(),
    originalSuggestion: z.array(z.string()),
    juliaSelection: z.array(z.string()),
    reason: z.string(),
  })).optional(),
});

const EnhancedStaffingOutput = z.object({
  assignments: z.array(z.object({
    operatingRoom: z.string(),
    shift: z.string(),
    staff: z.array(z.string()),
    reason: z.string(),
    confidenceScore: z.number(), // New: 0-1 confidence based on Julia's patterns
    juliaLikelihood: z.number(),  // New: How likely Julia would approve this
    alternativePairings: z.array(z.object({
      staff: z.array(z.string()),
      reason: z.string(),
      score: z.number(),
    })).optional(),
  })),
  learningInsights: z.object({
    patternsUsed: z.array(z.string()),
    newPatternsDetected: z.array(z.string()),
    confidenceLevel: z.string(),
  }),
});

export type EnhancedStaffingInput = z.infer<typeof EnhancedStaffingInput>;
export type EnhancedStaffingOutput = z.infer<typeof EnhancedStaffingOutput>;

// Global analyzer instance (in production, this should be a singleton service)
let juliaAnalyzer: JuliaSkillsAnalyzer | null = null;

const enhancedStaffingPrompt = ai.definePrompt({
  name: 'enhancedStaffingWithJuliaTraining',
  input: { schema: EnhancedStaffingInput },
  output: { schema: EnhancedStaffingOutput },
  prompt: `You are an expert OR manager with deep knowledge of Julia W.'s (Head Nurse) decision-making patterns and staff expertise assessments.

{{#if juliaTrainingData}}
JULIA'S EXPERTISE DATABASE:
{{juliaTrainingData}}
{{/if}}

{{#if previousJuliaOverrides}}
JULIA'S RECENT DECISIONS TO LEARN FROM:
{{#each previousJuliaOverrides}}
- Operation {{operationId}}: Changed [{{originalSuggestion}}] to [{{juliaSelection}}] because: {{reason}}
{{/each}}
{{/if}}

CURRENT STAFFING REQUEST:
Operating Rooms and Requirements:
{{#each operatingRooms}}
- {{name}} ({{shift}}): {{operationComplexity}} complexity{{#if operationType}} - {{operationType}}{{/if}}
{{/each}}

Available Staff: {{#each availableStaff}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Unavailable Staff: {{#each sickStaff}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

INSTRUCTIONS:
1. Analyze each operation using Julia's documented expertise patterns
2. Consider staff compatibility based on her historical approval rates
3. Prioritize pairings that Julia has previously approved (high juliaLikelihood score)
4. For each assignment, provide:
   - Primary staff pairing with reasoning based on Julia's patterns
   - Confidence score (0-1) based on similarity to Julia's past decisions
   - Julia likelihood score (0-1) predicting her approval probability
   - Alternative pairings if the primary choice might be questioned

5. Include learning insights about which patterns you're applying

CRITICAL REQUIREMENTS:
- Each OR must have exactly 2 staff members assigned
- Match Julia's documented decision-making style
- Higher complexity = higher expertise requirements (as per Julia's patterns)
- Consider staff pairing success rates from historical data
- Explain reasoning in Julia's typical analytical style

Return structured JSON with assignments, confidence scores, and learning insights.`,
});

export async function enhancedStaffingWithJuliaTraining(
  input: EnhancedStaffingInput
): Promise<EnhancedStaffingOutput> {
  
  // Initialize analyzer if needed
  if (!juliaAnalyzer && input.juliaTrainingData) {
    juliaAnalyzer = new JuliaSkillsAnalyzer();
    await juliaAnalyzer.parseJuliaExcelFile(input.juliaTrainingData);
  }

  // Enhance the prompt with Julia's expertise
  let enhancedPromptData = { ...input };
  
  if (juliaAnalyzer) {
    const compatibilityMatrix = juliaAnalyzer.getStaffCompatibilityMatrix();
    const trainingExamples = juliaAnalyzer.generateTrainingExamples();
    
    enhancedPromptData.juliaTrainingData = `
STAFF COMPATIBILITY MATRIX (Julia's Historical Success Rates):
${JSON.stringify(compatibilityMatrix, null, 2)}

JULIA'S SUCCESSFUL DECISION PATTERNS:
${trainingExamples.map(ex => `
Input: ${ex.input}
Julia's Choice: ${ex.expectedOutput}
Reasoning: ${ex.reasoning}
`).join('\n')}

OPERATION-SPECIFIC EXPERTISE:
${input.operatingRooms.map(room => 
  juliaAnalyzer!.generateEnhancedStaffPrompt(
    room.operationType || 'General', 
    room.operationComplexity
  )
).join('\n\n')}
`;
  }

  const enhancedStaffingFlow = ai.defineFlow({
    name: 'enhancedStaffingFlow',
    inputSchema: EnhancedStaffingInput,
    outputSchema: EnhancedStaffingOutput,
  }, async (flowInput) => {
    const { output, usage } = await enhancedStaffingPrompt(enhancedPromptData);
    
    if (!output) {
      console.error('Enhanced staffing flow: AI did not return parsable output', { 
        usageInfo: usage, 
        inputData: flowInput 
      });
      throw new Error('AI could not generate enhanced staffing suggestions with Julia training data.');
    }

    // Post-process to ensure quality
    output.assignments.forEach(assignment => {
      // Ensure confidence scores are reasonable
      if (assignment.confidenceScore > 1) assignment.confidenceScore = 1;
      if (assignment.confidenceScore < 0) assignment.confidenceScore = 0;
      
      // Ensure exactly 2 staff members
      if (assignment.staff.length !== 2) {
        console.warn(`Enhanced staffing: Assignment for ${assignment.operatingRoom} does not have exactly 2 staff members`);
      }
    });

    return output;
  });

  return await enhancedStaffingFlow(input);
}

// Continuous learning function - updates the model based on Julia's feedback
export async function updateJuliaLearningModel(newOverride: {
  operationId: string;
  originalSuggestion: string[];
  juliaSelection: string[];
  reason: string;
  operationType: string;
  complexity: string;
}) {
  if (!juliaAnalyzer) return;

  // This would update your persistent learning database
  // For now, we'll prepare the data structure for future ML training
  const learningDataPoint = {
    timestamp: new Date().toISOString(),
    context: {
      operationType: newOverride.operationType,
      complexity: newOverride.complexity,
      originalAISuggestion: newOverride.originalSuggestion,
      juliaCorrection: newOverride.juliaSelection,
      juliaReasoning: newOverride.reason,
    },
    features: {
      // Extract features that could be used for ML training
      complexityLevel: newOverride.complexity,
      staffExperienceLevels: newOverride.juliaSelection.map(staff => 
        // Get experience level from your staff database
        'experienced' // placeholder
      ),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    },
    label: 'julia_approved', // This is what we want to predict
  };

  // In a real system, this would be saved to your ML training database
  console.log('New learning data point:', learningDataPoint);
  
  // Could also trigger retraining of a custom model here
  // await triggerModelRetraining();
}

// Function to evaluate AI suggestions against Julia's likely preferences
export function evaluateAgainstJuliaPatterns(
  suggestions: Array<{staff: string[], operationType: string, complexity: string}>
): Array<{suggestion: string[], juliaLikelihood: number, reasoning: string}> {
  
  if (!juliaAnalyzer) {
    return suggestions.map(s => ({
      suggestion: s.staff,
      juliaLikelihood: 0.5, // Unknown
      reasoning: 'No Julia training data available'
    }));
  }

  const compatibilityMatrix = juliaAnalyzer.getStaffCompatibilityMatrix();
  
  return suggestions.map(suggestion => {
    const [staff1, staff2] = suggestion.staff;
    const compatibility = compatibilityMatrix[staff1]?.[staff2] || 0.5;
    
    // Simple heuristic based on compatibility and complexity
    let likelihood = compatibility;
    
    // Adjust based on complexity requirements
    if (suggestion.complexity === 'Sehr Hoch' && compatibility < 0.8) {
      likelihood *= 0.7; // Julia would be less likely to approve high complexity with low compatibility
    }
    
    return {
      suggestion: suggestion.staff,
      juliaLikelihood: likelihood,
      reasoning: `Based on historical pairing success rate of ${(compatibility * 100).toFixed(1)}% between ${staff1} and ${staff2}`
    };
  });
}
