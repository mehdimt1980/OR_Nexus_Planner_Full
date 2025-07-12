import { 
  CSVOperation, 
  OperationComplexity, 
  Department, 
  OperatingRoomName, 
  OperationStatus,
  CSVImportResult,
  OperationAssignment,
  TimeSlot
} from './or-planner-types';

// Complete CSV operation type matching all 28 columns from German hospital system
export type RawCSVOperation = {
  Datum: string;                              // "10.07.2025"
  Zeit: string;                               // "7:20"
  Eingriff: string;                           // "Dupuytren`sche Kontraktur Hand (L)"
  Antibiotikaprophylaxe: string;              // Antibiotic prophylaxis
  'OP-Orgaeinheit': string;                   // "PCH"
  'weitere geplante Orgaeinheiten': string;   // Additional planned departments
  'OP-Saal': string;                          // "SAAL 8"
  Nachname: string;                           // Patient last name
  Vorname: string;                            // Patient first name
  Geburtsdatum: string;                       // "04.12.1965"
  Geburtsname: string;                        // Birth name
  Identitifikationsnummer: string;            // Patient ID
  'Vornamen bei Geburt': string;              // First names at birth
  'Verwendeter Name': string;                 // Used name
  'Geburtsort (Code)': string;                // Birth place code
  Fallnummer: string;                         // "4744545"
  'Patient-Orgaeinheit': string;              // Patient organizational unit
  Station: string;                            // "ST06"
  '1.Operateur': string;                      // "Michael Stoffels"
  Aufnahmedatum: string;                      // "10.07.2025"
  Aufnahmezeit: string;                       // "6:28"
  Falltyp: string;                            // "aktueller Fall"
  Fallstatus: string;                         // "stationär"
  Planungskontrolle: string;                  // Planning control
  Anmerkung: string;                          // "2xverschoben Holding..."
  Maßnahmen: string;                          // "0/0 Maßnahmen geprüft"
  'OP-Status': string;                        // "OP-Protokoll nicht abgeschlossen"
  Prämedikationsstatus: string;               // "Nicht begonnen"
};

// German medical procedure complexity mapping with regex patterns
const GERMAN_PROCEDURE_COMPLEXITY: Array<{
  pattern: RegExp;
  complexity: OperationComplexity;
  description: string;
}> = [
  // Sehr Hoch (Very High)
  { pattern: /major.*amputation|amputation.*major/i, complexity: 'Sehr Hoch', description: 'Major Amputation' },
  { pattern: /thyreoidektomie/i, complexity: 'Sehr Hoch', description: 'Thyroidectomy' },
  { pattern: /osteosynthese.*acetabulum/i, complexity: 'Sehr Hoch', description: 'Acetabular Osteosynthesis' },
  { pattern: /herz.*operation|herzchirurgie/i, complexity: 'Sehr Hoch', description: 'Cardiac Surgery' },
  { pattern: /wirbelsäule.*fusion|spondylodese/i, complexity: 'Sehr Hoch', description: 'Spinal Fusion' },
  { pattern: /transplantation/i, complexity: 'Sehr Hoch', description: 'Transplantation' },
  
  // Hoch (High)
  { pattern: /mamma.*bet|brustkrebs.*bet/i, complexity: 'Hoch', description: 'Breast Cancer Surgery BET' },
  { pattern: /hernie.*tapp/i, complexity: 'Hoch', description: 'Hernia TAPP' },
  { pattern: /ureterorenoskopie/i, complexity: 'Hoch', description: 'Ureterorenoscopy' },
  { pattern: /kniegelenk.*ersatz|knie.*tep/i, complexity: 'Hoch', description: 'Knee Replacement' },
  { pattern: /hüftgelenk.*ersatz|hüft.*tep/i, complexity: 'Hoch', description: 'Hip Replacement' },
  { pattern: /laparoskopie.*komplex/i, complexity: 'Hoch', description: 'Complex Laparoscopy' },
  
  // Mittel (Medium)
  { pattern: /dupuytren/i, complexity: 'Mittel', description: 'Dupuytren Contracture' },
  { pattern: /cholezystektomie/i, complexity: 'Mittel', description: 'Cholecystectomy' },
  { pattern: /arthroskopie/i, complexity: 'Mittel', description: 'Arthroscopy' },
  { pattern: /appendektomie/i, complexity: 'Mittel', description: 'Appendectomy' },
  { pattern: /hernie.*inguinal/i, complexity: 'Mittel', description: 'Inguinal Hernia' },
  { pattern: /gallenblase/i, complexity: 'Mittel', description: 'Gallbladder Surgery' },
  
  // Niedrig (Low)
  { pattern: /lokale.*exzision/i, complexity: 'Niedrig', description: 'Local Excision' },
  { pattern: /kleine.*eingriffe/i, complexity: 'Niedrig', description: 'Minor Procedures' },
  { pattern: /biopsie/i, complexity: 'Niedrig', description: 'Biopsy' },
  { pattern: /zyste.*entfernung/i, complexity: 'Niedrig', description: 'Cyst Removal' },
  { pattern: /hautläsion/i, complexity: 'Niedrig', description: 'Skin Lesion' },
  { pattern: /naht.*revision/i, complexity: 'Niedrig', description: 'Suture Revision' }
];

// German error messages
const ERROR_MESSAGES = {
  INVALID_DATE: 'Ungültiges Datum. Format muss DD.MM.YYYY sein',
  INVALID_TIME: 'Ungültige Zeit. Format muss HH:MM sein',
  INVALID_DEPARTMENT: 'Ungültige Abteilung. Muss eine von ACH, GCH, PCH, URO, GYN, UCH sein',
  INVALID_ROOM: 'Ungültiger OP-Saal. Muss SAAL 1-8 sein',
  MISSING_REQUIRED_FIELD: 'Erforderliches Feld fehlt',
  INVALID_PROCEDURE: 'Ungültiger Eingriff',
  INVALID_SURGEON: 'Ungültiger Operateur',
  INVALID_CASE_NUMBER: 'Ungültige Fallnummer',
  PARSE_ERROR: 'Fehler beim Parsen der CSV-Datei',
  ENCODING_ERROR: 'Fehler bei der Zeichenkodierung'
};

// Validation functions
export class GermanCSVValidator {
  static validateDate(dateStr: string): boolean {
    if (!dateStr) return false;
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year;
  }

  static validateTime(timeStr: string): boolean {
    if (!timeStr) return false;
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(timeStr)) return false;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  static validateDepartment(dept: string): dept is Department {
    const validDepartments: Department[] = ['ACH', 'GCH', 'PCH', 'URO', 'GYN', 'UCH'];
    return validDepartments.includes(dept as Department);
  }

  static validateRoom(room: string): room is OperatingRoomName {
    const validRooms: OperatingRoomName[] = [
      'SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 
      'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'
    ];
    return validRooms.includes(room as OperatingRoomName);
  }

  static validateOperationStatus(status: string): status is OperationStatus {
    const validStatuses: OperationStatus[] = [
      'OP geplant', 
      'OP abgeschlossen', 
      'OP-Protokoll nicht abgeschlossen'
    ];
    return validStatuses.includes(status as OperationStatus);
  }

  static assessComplexity(procedureName: string): OperationComplexity {
    if (!procedureName) return 'Mittel';
    
    for (const { pattern, complexity } of GERMAN_PROCEDURE_COMPLEXITY) {
      if (pattern.test(procedureName)) {
        return complexity;
      }
    }
    
    // Default complexity based on procedure length and keywords
    const lowerProc = procedureName.toLowerCase();
    if (lowerProc.includes('komplex') || lowerProc.includes('revision') || 
        lowerProc.includes('rekonstruktion')) {
      return 'Hoch';
    }
    
    return 'Mittel';
  }

  static estimateDuration(procedureName: string, complexity: OperationComplexity): number {
    const baseDurations: Record<OperationComplexity, number> = {
      'Sehr Hoch': 240, // 4 hours
      'Hoch': 150,      // 2.5 hours  
      'Mittel': 90,     // 1.5 hours
      'Niedrig': 45     // 45 minutes
    };
    
    let duration = baseDurations[complexity];
    
    // Adjust based on specific procedure keywords
    const lowerProc = procedureName.toLowerCase();
    if (lowerProc.includes('mikrochirurgie')) duration += 60;
    if (lowerProc.includes('endoskopie')) duration -= 15;
    if (lowerProc.includes('laparoskopie')) duration -= 20;
    if (lowerProc.includes('revision')) duration += 30;
    
    return Math.max(30, duration); // Minimum 30 minutes
  }
}

// CSV Parser class
export class GermanHospitalCSVParser {
  private static readonly EXPECTED_COLUMNS = 28;
  private static readonly DELIMITER = ';';

  static async parseCSV(csvContent: string): Promise<CSVImportResult> {
    try {
      // Handle different encodings
      const normalizedContent = this.normalizeEncoding(csvContent);
      const lines = normalizedContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          success: false,
          errors: ['CSV-Datei muss mindestens eine Kopfzeile und eine Datenzeile enthalten']
        };
      }

      const headers = this.parseHeaders(lines[0]);
      const validationResult = this.validateHeaders(headers);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      const operations: CSVOperation[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const rowData = this.parseRow(lines[i], headers);
          const validatedOperation = this.validateAndTransformRow(rowData, i + 1);
          
          if (validatedOperation.operation) {
            operations.push(validatedOperation.operation);
          }
          
          errors.push(...validatedOperation.errors);
          warnings.push(...validatedOperation.warnings);
        } catch (error) {
          errors.push(`Zeile ${i + 1}: ${ERROR_MESSAGES.PARSE_ERROR} - ${error}`);
        }
      }

      const summary = this.generateSummary(operations);

      return {
        success: errors.length === 0,
        data: operations,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        summary
      };

    } catch (error) {
      return {
        success: false,
        errors: [`${ERROR_MESSAGES.PARSE_ERROR}: ${error}`]
      };
    }
  }

  private static normalizeEncoding(content: string): string {
    // Handle common German encoding issues
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Convert common CP1252 characters
      .replace(/ä/g, 'ä')
      .replace(/ö/g, 'ö')
      .replace(/ü/g, 'ü')
      .replace(/Ä/g, 'Ä')
      .replace(/Ö/g, 'Ö')
      .replace(/Ü/g, 'Ü')
      .replace(/ß/g, 'ß');
  }

  private static parseHeaders(headerLine: string): string[] {
    return headerLine.split(this.DELIMITER).map(header => header.trim());
  }

  private static validateHeaders(headers: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (headers.length !== this.EXPECTED_COLUMNS) {
      errors.push(`Erwartet ${this.EXPECTED_COLUMNS} Spalten, aber ${headers.length} gefunden`);
    }

    // Check for required columns
    const requiredColumns = [
      'Datum', 'Zeit', 'Eingriff', 'OP-Orgaeinheit', 'OP-Saal', 
      '1.Operateur', 'OP-Status', 'Fallnummer'
    ];

    for (const required of requiredColumns) {
      if (!headers.includes(required)) {
        errors.push(`Erforderliche Spalte fehlt: ${required}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private static parseRow(line: string, headers: string[]): RawCSVOperation {
    const values = this.splitCSVLine(line);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row as RawCSVOperation;
  }

  private static splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === this.DELIMITER && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private static validateAndTransformRow(
    row: RawCSVOperation, 
    lineNumber: number
  ): { operation?: CSVOperation; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!row.Datum) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.MISSING_REQUIRED_FIELD} - Datum`);
    } else if (!GermanCSVValidator.validateDate(row.Datum)) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.INVALID_DATE} - ${row.Datum}`);
    }

    if (!row.Zeit) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.MISSING_REQUIRED_FIELD} - Zeit`);
    } else if (!GermanCSVValidator.validateTime(row.Zeit)) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.INVALID_TIME} - ${row.Zeit}`);
    }

    if (!row.Eingriff) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.MISSING_REQUIRED_FIELD} - Eingriff`);
    }

    if (!row['OP-Orgaeinheit']) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.MISSING_REQUIRED_FIELD} - OP-Orgaeinheit`);
    } else if (!GermanCSVValidator.validateDepartment(row['OP-Orgaeinheit'])) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.INVALID_DEPARTMENT} - ${row['OP-Orgaeinheit']}`);
    }

    if (!row['OP-Saal']) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.MISSING_REQUIRED_FIELD} - OP-Saal`);
    } else if (!GermanCSVValidator.validateRoom(row['OP-Saal'])) {
      errors.push(`Zeile ${lineNumber}: ${ERROR_MESSAGES.INVALID_ROOM} - ${row['OP-Saal']}`);
    }

    if (!row['1.Operateur']) {
      warnings.push(`Zeile ${lineNumber}: Kein Operateur angegeben`);
    }

    if (!row.Fallnummer) {
      warnings.push(`Zeile ${lineNumber}: Keine Fallnummer angegeben`);
    }

    // If there are critical errors, return early
    if (errors.length > 0) {
      return { errors, warnings };
    }

    // Transform to CSVOperation
    const complexity = GermanCSVValidator.assessComplexity(row.Eingriff);
    const estimatedDuration = GermanCSVValidator.estimateDuration(row.Eingriff, complexity);

    const operation: CSVOperation = {
      datum: row.Datum,
      zeit: row.Zeit,
      eingriff: row.Eingriff,
      opOrgaeinheit: row['OP-Orgaeinheit'] as Department,
      opSaal: row['OP-Saal'] as OperatingRoomName,
      erstOperateur: row['1.Operateur'],
      opStatus: row['OP-Status'] as OperationStatus,
      fallnummer: row.Fallnummer,
      anmerkung: row.Anmerkung || undefined,
      
      // Patient information
      patientName: `${row.Vorname} ${row.Nachname}`.trim() || undefined,
      geburtsdatum: row.Geburtsdatum || undefined,
      
      // Medical details
      antibiotikaprophylaxe: row.Antibiotikaprophylaxe || undefined,
      
      // Administrative
      aufnahmedatum: row.Aufnahmedatum || undefined,
      station: row.Station || undefined,
      falltyp: row.Falltyp || undefined,
      fallstatus: row.Fallstatus || undefined,
      
      // Computed fields
      estimatedDuration,
      complexity,
      requiredSkills: this.deriveRequiredSkills(row.Eingriff, row['OP-Orgaeinheit'] as Department)
    };

    return { operation, errors, warnings };
  }

  private static deriveRequiredSkills(procedure: string, department: Department): string[] {
    const skills: string[] = [];
    
    // Department-based skills
    switch (department) {
      case 'ACH':
        skills.push('Allgemeinchirurgie', 'Instrumentierung');
        break;
      case 'GCH':
        skills.push('Gefäßchirurgie', 'Instrumentierung');
        break;
      case 'PCH':
        skills.push('Plastische Chirurgie', 'Instrumentierung');
        break;
      case 'URO':
        skills.push('Urologie', 'Instrumentierung');
        break;
      case 'GYN':
        skills.push('Gynäkologie', 'Instrumentierung');
        break;
      case 'UCH':
        skills.push('Unfallchirurgie', 'Orthopädie', 'Instrumentierung');
        break;
    }

    // Procedure-specific skills
    const lowerProc = procedure.toLowerCase();
    if (lowerProc.includes('laparoskopie')) skills.push('Laparoskopie');
    if (lowerProc.includes('endoskopie')) skills.push('Endoskopie');
    if (lowerProc.includes('mikrochirurgie')) skills.push('Mikrochirurgie');
    if (lowerProc.includes('arthroskopie')) skills.push('Arthroskopie');

    return [...new Set(skills)]; // Remove duplicates
  }

  private static generateSummary(operations: CSVOperation[]) {
    if (operations.length === 0) {
      return {
        totalOperations: 0,
        byDepartment: {} as Record<Department, number>,
        byRoom: {} as Record<OperatingRoomName, number>,
        byStatus: {} as Record<OperationStatus, number>,
        timeRange: { earliest: '', latest: '' }
      };
    }

    const byDepartment: Record<Department, number> = {} as Record<Department, number>;
    const byRoom: Record<OperatingRoomName, number> = {} as Record<OperatingRoomName, number>;
    const byStatus: Record<OperationStatus, number> = {} as Record<OperationStatus, number>;
    
    let earliest = operations[0].zeit;
    let latest = operations[0].zeit;

    operations.forEach(op => {
      // Count by department
      byDepartment[op.opOrgaeinheit] = (byDepartment[op.opOrgaeinheit] || 0) + 1;
      
      // Count by room
      byRoom[op.opSaal] = (byRoom[op.opSaal] || 0) + 1;
      
      // Count by status
      byStatus[op.opStatus] = (byStatus[op.opStatus] || 0) + 1;
      
      // Track time range
      if (op.zeit < earliest) earliest = op.zeit;
      if (op.zeit > latest) latest = op.zeit;
    });

    return {
      totalOperations: operations.length,
      byDepartment,
      byRoom,
      byStatus,
      timeRange: { earliest, latest }
    };
  }

  // Convert CSV operation to internal OperationAssignment format
  static csvToOperationAssignment(csvOp: CSVOperation): OperationAssignment {
    const [day, month, year] = csvOp.datum.split('.');
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    const timeSlot: TimeSlot = {
      start: csvOp.zeit.padStart(5, '0'), // Ensure HH:MM format
      end: this.calculateEndTime(csvOp.zeit, csvOp.estimatedDuration || 60),
      duration: csvOp.estimatedDuration
    };

    const operationId = `${csvOp.opSaal}-${csvOp.zeit}-${date}`;

    return {
      id: operationId,
      room: csvOp.opSaal,
      timeSlot,
      date,
      procedureName: csvOp.eingriff,
      complexity: csvOp.complexity,
      department: csvOp.opOrgaeinheit,
      surgeon: csvOp.erstOperateur,
      patient: {
        name: csvOp.patientName,
        caseNumber: csvOp.fallnummer
      },
      assignedStaff: [], // To be populated by AI suggestions
      status: 'pending_gpt',
      operationStatus: csvOp.opStatus,
      notes: csvOp.anmerkung,
      csvData: csvOp
    };
  }

  private static calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }
}

// Export utility functions
export const parseGermanHospitalCSV = GermanHospitalCSVParser.parseCSV;
export const validateGermanMedicalData = GermanCSVValidator;

// Type guard functions
export function isValidGermanDate(dateStr: string): boolean {
  return GermanCSVValidator.validateDate(dateStr);
}

export function isValidGermanTime(timeStr: string): boolean {
  return GermanCSVValidator.validateTime(timeStr);
}

export function assessGermanProcedureComplexity(procedure: string): OperationComplexity {
  return GermanCSVValidator.assessComplexity(procedure);
}
