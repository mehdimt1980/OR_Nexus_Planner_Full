"use client";
import React, { useMemo } from 'react';
import type { OperationAssignment, OperatingRoomName, Department } from '@/lib/or-planner-types';
import { OPERATING_ROOMS } from '@/lib/or-planner-types';
import { ROOM_DEPARTMENT_MAPPING } from '@/lib/or-planner-data';
import AssignmentCell from './AssignmentCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';

// Time-based schedule type
type TimeBasedORSchedule = Record<OperatingRoomName, Record<string, OperationAssignment>>;

type OperatingRoomScheduleTableProps = {
  schedule: TimeBasedORSchedule;
  onCellClick: (operation: OperationAssignment) => void;
};

const OperatingRoomScheduleTable: React.FC<OperatingRoomScheduleTableProps> = ({ 
  schedule, 
  onCellClick 
}) => {
  // Extract and sort all unique time slots across all rooms
  const allTimeSlots = useMemo(() => {
    const timeSet = new Set<string>();
    
    OPERATING_ROOMS.forEach(room => {
      const roomSchedule = schedule[room] || {};
      Object.keys(roomSchedule).forEach(timeSlot => {
        timeSet.add(timeSlot);
      });
    });
    
    // Sort time slots chronologically
    return Array.from(timeSet).sort((a, b) => {
      const timeA = parseTime(a);
      const timeB = parseTime(b);
      return timeA - timeB;
    });
  }, [schedule]);

  // Helper function to parse time string to minutes for sorting
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get primary department for a room
  const getRoomDepartment = (room: OperatingRoomName): Department | null => {
    const departments = ROOM_DEPARTMENT_MAPPING[room];
    return departments && departments.length > 0 ? departments[0] : null;
  };

  // Get department color for styling
  const getDepartmentColor = (department: Department | null): string => {
    if (!department) return 'bg-gray-500';
    
    const colorMap: Record<Department, string> = {
      'UCH': 'bg-blue-500',
      'ACH': 'bg-green-500', 
      'GYN': 'bg-pink-500',
      'URO': 'bg-purple-500',
      'GCH': 'bg-orange-500',
      'PCH': 'bg-indigo-500'
    };
    
    return colorMap[department] || 'bg-gray-500';
  };

  // Format time for display
  const formatTimeSlot = (timeSlot: string): string => {
    return timeSlot; // Already in HH:MM format
  };

  // Get operation for room and time slot
  const getOperation = (room: OperatingRoomName, timeSlot: string): OperationAssignment | null => {
    return schedule[room]?.[timeSlot] || null;
  };

  // Calculate grid columns (room column + time slot columns)
  const gridColumns = `minmax(180px, 1fr) repeat(${allTimeSlots.length}, minmax(200px, 1fr))`;

  if (allTimeSlots.length === 0) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-headline">OP Saalbelegungsplan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">Keine Operationen geplant</p>
            <p className="text-sm">Importieren Sie CSV-Daten oder fügen Sie manuell Operationen hinzu.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center space-x-2">
          <Clock className="h-6 w-6" />
          <span>OP Saalbelegungsplan</span>
          <Badge variant="outline" className="ml-2">
            {allTimeSlots.length} Zeitslots
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div 
            className="grid gap-px bg-border min-w-fit" 
            style={{ gridTemplateColumns: gridColumns }}
          >
            {/* Header Row */}
            <div className="p-3 font-semibold bg-card text-card-foreground sticky left-0 z-20 border-r border-border">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Saal / Zeit</span>
              </div>
            </div>
            
            {/* Time Slot Headers */}
            {allTimeSlots.map(timeSlot => (
              <div key={timeSlot} className="p-3 font-semibold bg-card text-card-foreground text-center border-b border-border">
                <div className="flex flex-col items-center space-y-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">{formatTimeSlot(timeSlot)}</span>
                </div>
              </div>
            ))}

            {/* Room Rows */}
            {OPERATING_ROOMS.map(roomName => {
              const primaryDepartment = getRoomDepartment(roomName);
              const departmentColor = getDepartmentColor(primaryDepartment);
              const allDepartments = ROOM_DEPARTMENT_MAPPING[roomName] || [];
              
              return (
                <React.Fragment key={roomName}>
                  {/* Room Header */}
                  <div className="p-3 bg-card text-card-foreground sticky left-0 z-10 self-stretch flex flex-col justify-center border-r border-border">
                    <div className="space-y-2">
                      <div className="font-semibold text-base">{roomName}</div>
                      
                      {/* Primary Department */}
                      {primaryDepartment && (
                        <Badge className={`${departmentColor} text-white text-xs px-2 py-1`}>
                          {primaryDepartment}
                        </Badge>
                      )}
                      
                      {/* Additional Departments */}
                      {allDepartments.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {allDepartments.slice(1).map(dept => (
                            <Badge 
                              key={dept} 
                              variant="outline" 
                              className="text-xs px-1.5 py-0.5"
                            >
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Room Stats */}
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(schedule[roomName] || {}).length} OPs geplant
                      </div>
                    </div>
                  </div>

                  {/* Time Slot Cells */}
                  {allTimeSlots.map(timeSlot => {
                    const operation = getOperation(roomName, timeSlot);
                    return (
                      <div key={`${roomName}-${timeSlot}`} className="p-1 bg-background">
                        <AssignmentCell 
                          operation={operation} 
                          onClick={operation ? onCellClick : () => {}} 
                        />
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        {/* Summary Footer */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.keys(schedule[room] || {}).length, 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Geplante Operationen</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && (op.status === 'approved_julia' || op.status === 'final_approved')
                  ).length, 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Genehmigt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && op.status === 'pending_gpt'
                  ).length, 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">KI-Vorschläge</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && op.status === 'critical_pending'
                  ).length, 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Kritisch</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperatingRoomScheduleTable;
