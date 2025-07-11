import type { 
  OperationAssignment, 
  OperationComplexity, 
  Department, 
  OperatingRoomName 
} from './or-planner-types';
import { OPERATING_ROOMS, DEPARTMENTS } from './or-planner-types';
import { format, addDays, addMinutes } from 'date-fns';

/**
 * German medical procedures by department with realistic complexity
 */
const GERMAN_PROCEDURES: Record<Department, Array<{
  name: string;
  complexity: OperationComplexity;
  duration: number;
  commonSurgeons: string[];
}>> = {
  'UCH': [
    { name: 'Hüft-TEP links', complexity: 'Hoch', duration: 180, commonSurgeons: ['Dr. Weber', 'Dr. Zimmermann'] },
    { name: 'Knie-TEP rechts', complexity: 'Hoch', duration: 150, commonSurgeons: ['Dr. Weber', 'Dr. Hoffmann'] },
    { name: 'Schulter-Arthroskopie', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Weber', 'Dr. Müller'] },
    { name: 'Kreuzbandplastik', complexity: 'Hoch', duration: 120, commonSurgeons: ['Dr. Zimmermann', 'Dr. Fischer'] },
    { name: 'Metallentfernung Unterschenkel', complexity: 'Niedrig', duration: 45, commonSurgeons: ['Dr. Müller', 'Dr. Hoffmann'] },
    { name: 'Osteosynthese Radius', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Weber', 'Dr. Fischer'] },
    { name: 'Wirbelsäulen-Instrumentierung L4/L5', complexity: 'Sehr Hoch', duration: 240, commonSurgeons: ['Dr. Zimmermann'] },
    { name: 'Meniskus-Teilresektion', complexity: 'Niedrig', duration: 60, commonSurgeons: ['Dr. Müller', 'Dr. Hoffmann'] },
  ],
  'ACH': [
    { name: 'Cholezystektomie laparoskopisch', complexity: 'Hoch', duration: 120, commonSurgeons: ['Dr. Schmidt', 'Dr. Becker'] },
    { name: 'Appendektomie', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Becker', 'Dr. Wagner'] },
    { name: 'Hernioplastik inguinal', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Schmidt', 'Dr. Wagner'] },
    { name: 'Sigmaresektion', complexity: 'Sehr Hoch', duration: 180, commonSurgeons: ['Dr. Schmidt'] },
    { name: 'Hemikolektomie rechts', complexity: 'Sehr Hoch', duration: 210, commonSurgeons: ['Dr. Schmidt', 'Dr. Becker'] },
    { name: 'Nabelhernie-Repair', complexity: 'Niedrig', duration: 60, commonSurgeons: ['Dr. Wagner', 'Dr. Becker'] },
    { name: 'Gallenblasen-Revision', complexity: 'Hoch', duration: 150, commonSurgeons: ['Dr. Schmidt', 'Dr. Becker'] },
  ],
  'GYN': [
    { name: 'Hysterektomie total', complexity: 'Hoch', duration: 150, commonSurgeons: ['Dr. Lange', 'Dr. Koch'] },
    { name: 'Sectio caesarea', complexity: 'Mittel', duration: 45, commonSurgeons: ['Dr. Lange', 'Dr. Koch', 'Dr. Richter'] },
    { name: 'Laparoskopie diagnostisch', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Koch', 'Dr. Richter'] },
    { name: 'Ovarial-Zyste Exstirpation', complexity: 'Mittel', duration: 120, commonSurgeons: ['Dr. Lange', 'Dr. Koch'] },
    { name: 'Hysteroskopie mit Kürettage', complexity: 'Niedrig', duration: 30, commonSurgeons: ['Dr. Koch', 'Dr. Richter'] },
    { name: 'Mammareduktion beidseits', complexity: 'Hoch', duration: 180, commonSurgeons: ['Dr. Lange'] },
  ],
  'URO': [
    { name: 'TUR-P', complexity: 'Hoch', duration: 90, commonSurgeons: ['Dr. Klein', 'Dr. Wolf'] },
    { name: 'Nephrektomie links', complexity: 'Sehr Hoch', duration: 180, commonSurgeons: ['Dr. Klein'] },
    { name: 'Ureteroskopie mit Steinextraktion', complexity: 'Hoch', duration: 90, commonSurgeons: ['Dr. Klein', 'Dr. Wolf'] },
    { name: 'Zystoskopie diagnostisch', complexity: 'Niedrig', duration: 30, commonSurgeons: ['Dr. Wolf', 'Dr. Krause'] },
    { name: 'Nephrolithopaxie', complexity: 'Hoch', duration: 120, commonSurgeons: ['Dr. Klein', 'Dr. Wolf'] },
    { name: 'AV-Fistel Anlage', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Wolf', 'Dr. Krause'] },
  ],
  'GCH': [
    { name: 'Varizen-Stripping beidseits', complexity: 'Niedrig', duration: 60, commonSurgeons: ['Dr. Neumann', 'Dr. Braun'] },
    { name: 'AV-Fistel Revision', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Neumann', 'Dr. Braun'] },
    { name: 'Carotis-TEA', complexity: 'Sehr Hoch', duration: 180, commonSurgeons: ['Dr. Neumann'] },
    { name: 'Bypass femoropopliteal', complexity: 'Sehr Hoch', duration: 240, commonSurgeons: ['Dr. Neumann'] },
    { name: 'Port-Implantation', complexity: 'Niedrig', duration: 45, commonSurgeons: ['Dr. Braun', 'Dr. Schwarz'] },
  ],
  'PCH': [
    { name: 'Liposuktion Abdomen', complexity: 'Mittel', duration: 120, commonSurgeons: ['Dr. Jung', 'Dr. Hartmann'] },
    { name: 'Abdominoplastik', complexity: 'Hoch', duration: 240, commonSurgeons: ['Dr. Jung'] },
    { name: 'Lipom-Exstirpation', complexity: 'Niedrig', duration: 30, commonSurgeons: ['Dr. Hartmann', 'Dr. Peters'] },
    { name: 'Narben-Korrektur', complexity: 'Niedrig', duration: 60, commonSurgeons: ['Dr. Jung', 'Dr. Hartmann'] },
    { name: 'Lappenplastik lokaler Defekt', complexity: 'Mittel', duration: 90, commonSurgeons: ['Dr. Jung', 'Dr. Peters'] },
  ],
};

/**
 * German OP statuses that match real hospital workflows
 */
const GERMAN_OP_STATUSES = [
  'OP geplant',
  'OP abgeschlossen', 
  'OP-Protokoll nicht abgeschlossen',
  'OP läuft',
  'OP verspätet'
];

/**
 * Realistic German medical notes/comments
 */
const GERMAN_NOTES = [
  'Pat. nüchtern, Aufklärung erfolgt',
  'Prämedikation durchgeführt',
  'Antibiotika-Prophylaxe gegeben',
  'Besondere Lagerung erforderlich',
  'Bildwandler bereithalten',
  'Implantate bestellt',
  'Angehörige informiert',
  'Notfall-OP',
  'Zweitmeinung eingeholt',
  'Nachbetreuung auf Station',
  'Physiotherapie postoperativ',
  'Kompression erforderlich',
];

/**
 * Generate realistic German demo CSV data
 */
export function generateDemoCSV(options: {
  startDate?: Date;
  numberOfDays?: number;
  operationsPerDay?: number;
  includeWeekends?: boolean;
} = {}): string {
  const {
    startDate = new Date(),
    numberOfDays = 5,
    operationsPerDay = 15,
    includeWeekends = false
  } = options;

  const operations: any[] = [];
  const csvHeaders = [
    'Datum',
    'Zeit', 
    'Eingriff',
    'OP-Orgaeinheit',
    'OP-Saal',
    '1.Operateur',
    'OP-Status',
    'Anmerkung'
  ];

  for (let day = 0; day < numberOfDays; day++) {
    const currentDate = addDays(startDate, day);
    
    // Skip weekends if not included
    if (!includeWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
      continue;
    }

    const dailyOperations = generateDayOperations(currentDate, operationsPerDay);
    operations.push(...dailyOperations);
  }

  // Create CSV content
  const csvContent = [
    csvHeaders.join(';'),
    ...operations.map(op => csvHeaders.map(header => op[header] || '').join(';'))
  ].join('\n');

  return csvContent;
}

/**
 * Generate operations for a single day
 */
function generateDayOperations(date: Date, operationCount: number): any[] {
  const operations: any[] = [];
  const usedTimeSlots = new Set<string>();
  const roomUtilization = new Map<OperatingRoomName, number>();

  // Initialize room utilization
  OPERATING_ROOMS.forEach(room => roomUtilization.set(room, 0));

  for (let i = 0; i < operationCount; i++) {
    // Select random department
    const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
    const procedures = GERMAN_PROCEDURES[department];
    const procedure = procedures[Math.floor(Math.random() * procedures.length)];
    
    // Select surgeon
    const surgeon = procedure.commonSurgeons[Math.floor(Math.random() * procedure.commonSurgeons.length)];
    
    // Find available room and time
    const { room, time } = findAvailableSlot(date, procedure.duration, usedTimeSlots, roomUtilization);
    
    if (!room || !time) continue; // Skip if no slot available
    
    // Mark time slot as used
    usedTimeSlots.add(`${room}-${time}`);
    roomUtilization.set(room, (roomUtilization.get(room) || 0) + 1);
    
    // Generate status (most should be planned)
    const statusWeights = {
      'OP geplant': 0.7,
      'OP abgeschlossen': 0.15,
      'OP-Protokoll nicht abgeschlossen': 0.05,
      'OP läuft': 0.05,
      'OP verspätet': 0.05
    };
    const status = weightedRandom(GERMAN_OP_STATUSES, statusWeights);
    
    // Generate notes (30% chance)
    const notes = Math.random() < 0.3 ? 
      GERMAN_NOTES[Math.floor(Math.random() * GERMAN_NOTES.length)] : 
      '';

    operations.push({
      'Datum': format(date, 'dd.MM.yyyy'),
      'Zeit': time,
      'Eingriff': procedure.name,
      'OP-Orgaeinheit': department,
      'OP-Saal': room,
      '1.Operateur': surgeon,
      'OP-Status': status,
      'Anmerkung': notes
    });
  }

  return operations;
}

/**
 * Find available room and time slot
 */
function findAvailableSlot(
  date: Date, 
  duration: number, 
  usedTimeSlots: Set<string>,
  roomUtilization: Map<OperatingRoomName, number>
): { room: OperatingRoomName | null; time: string | null } {
  
  // Operating hours: 7:00 - 18:00
  const startHour = 7;
  const endHour = 18;
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random room selection with preference for less utilized rooms
    const availableRooms = OPERATING_ROOMS.filter(room => 
      (roomUtilization.get(room) || 0) < 6 // Max 6 operations per room per day
    );
    
    if (availableRooms.length === 0) break;
    
    const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    
    // Random time within operating hours
    const randomHour = startHour + Math.floor(Math.random() * (endHour - startHour));
    const randomMinute = Math.random() < 0.5 ? 0 : 30; // 30-minute intervals
    const time = `${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}`;
    
    // Check if slot is available
    const slotKey = `${room}-${time}`;
    if (!usedTimeSlots.has(slotKey)) {
      // Check if operation would fit before end of day
      const opStartTime = new Date(date);
      opStartTime.setHours(randomHour, randomMinute, 0, 0);
      const opEndTime = addMinutes(opStartTime, duration);
      
      if (opEndTime.getHours() <= endHour) {
        return { room, time };
      }
    }
  }
  
  return { room: null, time: null };
}

/**
 * Weighted random selection
 */
function weightedRandom<T>(items: T[], weights: Record<string, number>): T {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    const weight = weights[item as string] || 0;
    if (random < weight) {
      return item;
    }
    random -= weight;
  }
  
  return items[0]; // Fallback
}

/**
 * Convert demo data to real format for testing
 */
export function convertDemoToRealFormat(demoOperations: OperationAssignment[]): string {
  const csvHeaders = [
    'Datum',
    'Zeit', 
    'Eingriff',
    'OP-Orgaeinheit',
    'OP-Saal',
    '1.Operateur',
    'OP-Status',
    'Anmerkung'
  ];

  const csvRows = demoOperations.map(op => [
    format(new Date(op.scheduledDate), 'dd.MM.yyyy'),
    op.scheduledTime,
    op.procedureName,
    op.department,
    op.room,
    op.primarySurgeon || '',
    mapStatusToGerman(op.status),
    op.notes || ''
  ]);

  return [
    csvHeaders.join(';'),
    ...csvRows.map(row => row.join(';'))
  ].join('\n');
}

/**
 * Map internal status to German CSV status
 */
function mapStatusToGerman(status: string): string {
  const statusMap: Record<string, string> = {
    'planned': 'OP geplant',
    'in_progress': 'OP läuft',
    'completed': 'OP abgeschlossen',
    'protocol_incomplete': 'OP-Protokoll nicht abgeschlossen',
    'pending_gpt': 'OP geplant',
    'approved_julia': 'OP geplant',
    'modified_julia': 'OP geplant',
    'final_approved': 'OP geplant',
    'empty': 'OP geplant',
    'critical_pending': 'OP geplant'
  };
  
  return statusMap[status] || 'OP geplant';
}

/**
 * Generate sample data with specific characteristics for testing
 */
export function generateTestScenarios(): Record<string, string> {
  return {
    'minimal': generateDemoCSV({ numberOfDays: 1, operationsPerDay: 5 }),
    'typical_week': generateDemoCSV({ numberOfDays: 5, operationsPerDay: 15 }),
    'busy_period': generateDemoCSV({ numberOfDays: 3, operationsPerDay: 25 }),
    'weekend_coverage': generateDemoCSV({ numberOfDays: 7, operationsPerDay: 8, includeWeekends: true }),
    'emergency_heavy': generateDemoCSV({ numberOfDays: 2, operationsPerDay: 20 })
  };
}

/**
 * Validate generated CSV against expected format
 */
export function validateGeneratedCSV(csvContent: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    rowCount: number;
    departmentDistribution: Record<string, number>;
    timeSpread: { earliest: string; latest: string };
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(';');
    const dataRows = lines.slice(1);
    
    // Check headers
    const expectedHeaders = ['Datum', 'Zeit', 'Eingriff', 'OP-Orgaeinheit', 'OP-Saal', '1.Operateur', 'OP-Status', 'Anmerkung'];
    if (!expectedHeaders.every(h => headers.includes(h))) {
      errors.push('Fehlende oder falsche CSV-Spalten');
    }
    
    // Analyze data
    const departmentDistribution: Record<string, number> = {};
    const times: string[] = [];
    
    dataRows.forEach((row, index) => {
      const fields = row.split(';');
      if (fields.length !== headers.length) {
        warnings.push(`Zeile ${index + 2}: Falsche Spaltenanzahl`);
      }
      
      const department = fields[headers.indexOf('OP-Orgaeinheit')];
      const time = fields[headers.indexOf('Zeit')];
      
      if (department) {
        departmentDistribution[department] = (departmentDistribution[department] || 0) + 1;
      }
      
      if (time) {
        times.push(time);
      }
    });
    
    times.sort();
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        rowCount: dataRows.length,
        departmentDistribution,
        timeSpread: {
          earliest: times[0] || '',
          latest: times[times.length - 1] || ''
        }
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`CSV-Parsing-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`],
      warnings: [],
      statistics: {
        rowCount: 0,
        departmentDistribution: {},
        timeSpread: { earliest: '', latest: '' }
      }
    };
  }
}
