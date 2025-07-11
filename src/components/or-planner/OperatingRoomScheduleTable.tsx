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

  // Get operations count per room for stats
  const getRoomOperationsCount = (room: OperatingRoomName): number => {
    return Object.keys(schedule[room] || {}).length;
  };

  // Get room utilization percentage (assuming 8-hour day with 30-min slots = 16 slots max)
  const getRoomUtilization = (room: OperatingRoomName): number => {
    const operationsCount = getRoomOperationsCount(room);
    const maxSlots = 16; // 8 hours * 2 slots per hour
    return Math.round((operationsCount / maxSlots) * 100);
  };

  // Calculate grid columns (room column + time slot columns)
  const gridColumns = `minmax(220px, 1fr) repeat(${allTimeSlots.length}, minmax(220px, 1fr))`;

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
              const operationsCount = getRoomOperationsCount(roomName);
              const utilization = getRoomUtilization(roomName);
              
              return (
                <React.Fragment key={roomName}>
                  {/* Room Header */}
                  <div className="p-3 bg-card text-card-foreground sticky left-0 z-10 self-stretch flex flex-col justify-center border-r border-border">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">{roomName}</span>
                        {/* Utilization indicator */}
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            utilization >= 80 ? 'bg-red-500' :
                            utilization >= 60 ? 'bg-yellow-500' :
                            utilization >= 40 ? 'bg-green-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-xs text-muted-foreground">{utilization}%</span>
                        </div>
                      </div>
                      
                      {/* Primary Department */}
                      {primaryDepartment && (
                        <Badge className={`${departmentColor} text-white text-xs px-2 py-1 font-medium`}>
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
                              className="text-xs px-1.5 py-0.5 border-muted-foreground/30"
                            >
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Room Statistics */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Operationen:</span>
                          <span className="font-medium">{operationsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Auslastung:</span>
                          <span className={`font-medium ${
                            utilization >= 80 ? 'text-red-600' :
                            utilization >= 60 ? 'text-yellow-600' :
                            utilization >= 40 ? 'text-green-600' :
                            'text-gray-500'
                          }`}>{utilization}%</span>
                        </div>
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
        
        {/* Enhanced Summary Footer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.keys(schedule[room] || {}).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">Geplante Operationen</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && (op.status === 'approved_julia' || op.status === 'final_approved' || op.status === 'completed')
                  ).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">Genehmigt/Abgeschlossen</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && op.status === 'planned'
                  ).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">Geplant</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && op.status === 'pending_gpt'
                  ).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">KI-Vorschläge</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-600">
                {OPERATING_ROOMS.reduce((total, room) => 
                  total + Object.values(schedule[room] || {}).filter(op => 
                    op && op.status === 'critical_pending'
                  ).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">Kritisch</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-600">
                {allTimeSlots.length}
              </p>
              <p className="text-xs text-muted-foreground">Aktive Zeitslots</p>
            </div>
          </div>
          
          {/* Time Range Info */}
          {allTimeSlots.length > 0 && (
            <div className="mt-4 pt-4 border-t border-muted-foreground/20 flex justify-center items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Zeitbereich: {allTimeSlots[0]} - {allTimeSlots[allTimeSlots.length - 1]}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{OPERATING_ROOMS.length} OP-Säle aktiv</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OperatingRoomScheduleTable;
