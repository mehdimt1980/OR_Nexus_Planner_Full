
import type { StaffMember, OperationComplexity, OperationAssignment, ORSchedule } from './or-planner-types';
import { OPERATING_ROOMS, SHIFTS, type OperatingRoomName, type Shift } from './or-planner-types';

export const STAFF_MEMBERS: StaffMember[] = [
  { id: 'staff_1', name: 'Karin R.', skills: ['Allgemein', 'DaVinci'] },
  { id: 'staff_2', name: 'Fatima R.', skills: ['Allgemein', 'Herz-Thorax'] },
  { id: 'staff_3', name: 'Gerhard K.', skills: ['Allgemein', 'Neuro'] },
  { id: 'staff_4', name: 'Ulla K.', skills: ['Allgemein', 'DaVinci', 'EPZ'] },
  { id: 'staff_5', name: 'Michael B.', skills: ['Allgemein'] },
  { id: 'staff_6', name: 'Sandra P.', skills: ['Allgemein', 'GYN'] },
  { id: 'staff_7', name: 'Jürgen S.', skills: ['Allgemein', 'URO'] },
  { id: 'staff_8', name: 'Anja M.', skills: ['Allgemein', 'PCH'] },
  { id: 'staff_9', name: 'Thomas L.', skills: ['Allgemein'] },
  { id: 'staff_10', name: 'Sabine W.', skills: ['Allgemein', 'HNO'] },
];

// Defines which OR/Shift slots are active and need staffing (19 total)
// And their typical complexity.
const ACTIVE_OPERATIONS_TEMPLATE: { room: OperatingRoomName, shift: Shift, procedureName: string, complexity: OperationComplexity }[] = [
  // UCH (3)
  { room: 'UCH', shift: 'BD1', procedureName: 'Hüft-TEP', complexity: 'Hoch' },
  { room: 'UCH', shift: 'BD2', procedureName: 'Knie-Arthroskopie', complexity: 'Mittel' },
  { room: 'UCH', shift: 'BD3', procedureName: 'Radiusfraktur', complexity: 'Mittel' },
  // EPZ/HNO (2)
  { room: 'EPZ/HNO', shift: 'BD1', procedureName: 'Tonsillektomie', complexity: 'Mittel' },
  { room: 'EPZ/HNO', shift: 'BD2', procedureName: 'Septumplastik', complexity: 'Mittel' },
  // ACH (3)
  { room: 'ACH', shift: 'BD1', procedureName: 'Appendektomie', complexity: 'Mittel' },
  { room: 'ACH', shift: 'BD2', procedureName: 'Cholezystektomie', complexity: 'Hoch' },
  { room: 'ACH', shift: 'BD3', procedureName: 'Hernien-OP', complexity: 'Mittel' },
  // GYN (2)
  { room: 'GYN', shift: 'BD1', procedureName: 'Hysterektomie', complexity: 'Hoch' },
  { room: 'GYN', shift: 'BD2', procedureName: 'Sectio', complexity: 'Hoch' },
  // GCH (3)
  { room: 'GCH', shift: 'BD1', procedureName: 'Varizen-Stripping', complexity: 'Niedrig' },
  { room: 'GCH', shift: 'BD2', procedureName: 'Port-Implantation', complexity: 'Niedrig' },
  { room: 'GCH', shift: 'BD3', procedureName: 'AV-Fistel', complexity: 'Mittel' },
  // URO (2)
  { room: 'URO', shift: 'BD1', procedureName: 'TUR-P', complexity: 'Hoch' },
  { room: 'URO', shift: 'BD2', procedureName: 'Nierensteinentfernung', complexity: 'Hoch' },
  // DaVinci (2) - BD2 potentially critical due to Ulla K. sickness
  { room: 'DaVinci', shift: 'BD1', procedureName: 'DaVinci Prostatektomie', complexity: 'Sehr Hoch' },
  { room: 'DaVinci', shift: 'BD2', procedureName: 'DaVinci Nephrektomie', complexity: 'Sehr Hoch' }, // Critical slot
  // PCH (2)
  { room: 'PCH', shift: 'BD1', procedureName: 'Liposuktion', complexity: 'Mittel' },
  { room: 'PCH', shift: 'BD2', procedureName: 'Blepharoplastik', complexity: 'Niedrig' },
];

export const INITIAL_SCHEDULE_TEMPLATE = (): ORSchedule => {
  const schedule = {} as ORSchedule;
  OPERATING_ROOMS.forEach(room => {
    schedule[room] = {} as Record<Shift, OperationAssignment | null>;
    SHIFTS.forEach(shift => {
      const templateOp = ACTIVE_OPERATIONS_TEMPLATE.find(op => op.room === room && op.shift === shift);
      if (templateOp) {
        const isCriticalDaVinci = room === 'DaVinci' && shift === 'BD2';
        schedule[room][shift] = {
          id: `${room}-${shift}`,
          room,
          shift,
          procedureName: templateOp.procedureName,
          complexity: templateOp.complexity,
          assignedStaff: [], // Initialize as empty array
          gptSuggestedStaff: [], // Initialize as empty array
          status: isCriticalDaVinci ? 'critical_pending' : 'empty',
          notes: isCriticalDaVinci ? "Ulla K. (DaVinci-Expertin) krankgemeldet! Benötigt 2 erfahrene Pfleger." : undefined,
        };
      } else {
        schedule[room][shift] = null; // Inactive slot
      }
    });
  });
  return schedule;
};

export const getStaffMemberById = (id: string): StaffMember | undefined => STAFF_MEMBERS.find(s => s.id === id);
export const getStaffMemberByName = (name: string): StaffMember | undefined => STAFF_MEMBERS.find(s => s.name === name);

export const AVAILABLE_STAFF_FOR_AI = STAFF_MEMBERS.filter(s => !s.isSick).map(s => s.name);
export const SICK_STAFF_FOR_AI = STAFF_MEMBERS.filter(s => s.isSick).map(s => s.name);
