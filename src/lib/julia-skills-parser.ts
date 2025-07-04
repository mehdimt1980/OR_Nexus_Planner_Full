// src/lib/julia-skills-parser.ts
import * as XLSX from 'xlsx';

export interface JuliaSkillAssessment {
  staffId: string;
  staffName: string;
  operationType: string;
  complexityLevel: 'Sehr Hoch' | 'Hoch' | 'Mittel' | 'Niedrig';
  proficiencyScore: number; // 1-10 scale
  pairingPreferences: string[]; // Preferred partners
  specialNotes: string;
  lastUpdated: Date;
  juliaRating: 'Excellent' | 'Good' | 'Average' | 'Needs Supervision';
}

export interface StaffPairingPattern {
  staff1: string;
  staff2: string;
  operationType: string;
  successRate: number;
  juliaApprovalRate: number;
  avgComplexityHandled: number;
  notes: string;
}

export class JuliaSkillsAnalyzer {
  private skillsData: JuliaSkillAssessment[] = [];
  private pairingPatterns: StaffPairingPattern[] = [];

  async parseJuliaExcelFile(fileBuffer: ArrayBuffer): Promise<void> {
    const workbook = XLSX.read(fileBuffer);
    
    // Parse main skills sheet
    if (workbook.SheetNames.includes('StaffSkills')) {
      const skillsSheet = workbook.Sheets['StaffSkills'];
      const rawData = XLSX.utils.sheet_to_json(skillsSheet);
      
      this.skillsData = rawData.map((row: any) => ({
        staffId: row['Staff_ID'] || row['ID'],
        staffName: row['Name'] || row['Staff_Name'],
        operationType: row['Operation_Type'] || row['Specialty'],
        complexityLevel: this.normalizeComplexity(row['Complexity']),
        proficiencyScore: parseInt(row['Proficiency_Score']) || 5,
        pairingPreferences: this.parsePairingPrefs(row['Preferred_Partners']),
        specialNotes: row['Notes'] || '',
        lastUpdated: new Date(row['Last_Updated'] || Date.now()),
        juliaRating: this.normalizeRating(row['Julia_Rating'])
      }));
    }

    // Parse pairing patterns sheet
    if (workbook.SheetNames.includes('PairingHistory')) {
      const pairingSheet = workbook.Sheets['PairingHistory'];
      const pairingData = XLSX.utils.sheet_to_json(pairingSheet);
      
      this.pairingPatterns = pairingData.map((row: any) => ({
        staff1: row['Staff_1'],
        staff2: row['Staff_2'],
        operationType: row['Operation_Type'],
        successRate: parseFloat(row['Success_Rate']) || 0.8,
        juliaApprovalRate: parseFloat(row['Julia_Approval_Rate']) || 0.7,
        avgComplexityHandled: parseFloat(row['Avg_Complexity']) || 2.5,
        notes: row['Notes'] || ''
      }));
    }
  }

  // Generate enhanced prompts for AI
  generateEnhancedStaffPrompt(operationType: string, complexity: string): string {
    const relevantSkills = this.skillsData.filter(
      skill => skill.operationType === operationType || skill.operationType === 'Allgemein'
    );

    const expertStaff = relevantSkills
      .filter(skill => skill.proficiencyScore >= 8 && skill.juliaRating === 'Excellent')
      .map(skill => `${skill.staffName} (Proficiency: ${skill.proficiencyScore}/10, Julia Rating: ${skill.juliaRating})`);

    const goodPairings = this.pairingPatterns
      .filter(pattern => pattern.successRate >= 0.85 && pattern.juliaApprovalRate >= 0.8)
      .map(pattern => `${pattern.staff1} + ${pattern.staff2} (Success: ${pattern.successRate * 100}%)`);

    return `
ENHANCED STAFF EXPERTISE FOR ${operationType.toUpperCase()} - ${complexity}:

Expert Staff (Julia's Top Rated):
${expertStaff.join('\n')}

Proven Successful Pairings:
${goodPairings.join('\n')}

Julia's Decision Patterns:
- For ${complexity} complexity: Prefers pairing experience levels ${this.getComplexityStrategy(complexity)}
- Avoid these combinations: ${this.getAvoidedPairings(operationType).join(', ')}
`;
  }

  // Create training examples from Julia's historical decisions
  generateTrainingExamples(): Array<{input: string, expectedOutput: string, reasoning: string}> {
    return this.pairingPatterns
      .filter(pattern => pattern.juliaApprovalRate >= 0.9) // Only high-approval patterns
      .map(pattern => ({
        input: `Assign staff for ${pattern.operationType} operation with avg complexity ${pattern.avgComplexityHandled}`,
        expectedOutput: JSON.stringify({
          staff: [pattern.staff1, pattern.staff2],
          reasoning: `Based on Julia's expertise: This pairing has ${pattern.successRate * 100}% success rate and ${pattern.juliaApprovalRate * 100}% approval rate from Julia.`
        }),
        reasoning: pattern.notes
      }));
  }

  // Get staff compatibility matrix
  getStaffCompatibilityMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};
    
    this.pairingPatterns.forEach(pattern => {
      if (!matrix[pattern.staff1]) matrix[pattern.staff1] = {};
      if (!matrix[pattern.staff2]) matrix[pattern.staff2] = {};
      
      const compatibilityScore = (pattern.successRate + pattern.juliaApprovalRate) / 2;
      matrix[pattern.staff1][pattern.staff2] = compatibilityScore;
      matrix[pattern.staff2][pattern.staff1] = compatibilityScore;
    });
    
    return matrix;
  }

  private normalizeComplexity(complexity: any): 'Sehr Hoch' | 'Hoch' | 'Mittel' | 'Niedrig' {
    const str = String(complexity).toLowerCase();
    if (str.includes('sehr hoch') || str.includes('very high')) return 'Sehr Hoch';
    if (str.includes('hoch') || str.includes('high')) return 'Hoch';
    if (str.includes('niedrig') || str.includes('low')) return 'Niedrig';
    return 'Mittel';
  }

  private normalizeRating(rating: any): 'Excellent' | 'Good' | 'Average' | 'Needs Supervision' {
    const str = String(rating).toLowerCase();
    if (str.includes('excellent') || str.includes('ausgezeichnet')) return 'Excellent';
    if (str.includes('good') || str.includes('gut')) return 'Good';
    if (str.includes('supervision') || str.includes('überwachung')) return 'Needs Supervision';
    return 'Average';
  }

  private parsePairingPrefs(prefs: any): string[] {
    if (!prefs) return [];
    return String(prefs).split(',').map(p => p.trim()).filter(Boolean);
  }

  private getComplexityStrategy(complexity: string): string {
    // Based on Julia's patterns from the data
    const strategies = {
      'Sehr Hoch': 'Expert + Expert or Expert + Good with supervision',
      'Hoch': 'Expert + Good or Good + Good',
      'Mittel': 'Good + Average or Expert + Trainee',
      'Niedrig': 'Any pairing, good for training opportunities'
    };
    return strategies[complexity as keyof typeof strategies] || 'Balanced experience levels';
  }

  private getAvoidedPairings(operationType: string): string[] {
    return this.pairingPatterns
      .filter(pattern => 
        pattern.operationType === operationType && 
        (pattern.successRate < 0.7 || pattern.juliaApprovalRate < 0.6)
      )
      .map(pattern => `${pattern.staff1} + ${pattern.staff2}`);
  }
}
