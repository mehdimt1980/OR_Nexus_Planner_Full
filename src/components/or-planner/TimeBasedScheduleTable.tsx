// src/components/or-planner/TimeBasedScheduleTable.tsx
"use client";
import React, { useMemo } from 'react';
import type { TimeBasedSchedule, OperationAssignment, OperatingRoomName } from '@/lib/or-planner-types';
import { TIME_SLOTS, timeToMinutes, addMinutesToTime } from '@/lib/or-planner-types';
import AssignmentCell from './AssignmentCell';
import RoomDepartmentInfo from './RoomDepartmentInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type TimeBasedScheduleTableProps = {
  schedule: TimeBasedSchedule;
  onCellClick: (operation: OperationAssignment) => void;
};

const TimeBasedScheduleTable: React.FC<TimeBasedScheduleTableProps> = ({ schedule, onCellClick }) => {
  // Get active rooms and time slots from the schedule
  const activeRooms = Object.keys(schedule) as OperatingRoomName[];
  
  // Get all scheduled times and create time grid
  const allTimes = useMemo(() => {
    const times = new Set<string>();
    
    Object.values(schedule).forEach(operations => {
      operations.forEach(op => {
        if (op.scheduledTime) {
          times.add(op.scheduledTime);
        }
      });
    });
    
    // Add standard time slots for empty periods
    TIME_SLOTS.forEach(time => times.add(time));
    
    return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }, [schedule]);

  // Group operations by room and time slot
  const getOperationForTimeSlot = (room: OperatingRoomName, timeSlot: string): OperationAssignment | null => {
    const roomOperations = schedule[room] || [];
    
    // Find operation that starts at this time or is running during this time
    return roomOperations.find(op => {
      if (!op.scheduledTime) return false;
      
      const opStartMinutes = timeToMinutes(op.scheduledTime);
      const opEndMinutes = opStartMinutes + (op.estimatedDuration || 60);
      const slotMinutes = timeToMinutes(timeSlot);
      
      // Check if the time slot falls within the operation duration
      return slotMinutes >= opStartMinutes && slotMinutes < opEndMinutes;
    }) || null;
  };

  // Filter to show only relevant time slots (with operations or during business hours)
  const relevantTimeSlots = useMemo(() => {
    return allTimes.filter(time => {
      const minutes = timeToMinutes(time);
      const hasOperation = activeRooms.some(room => getOperationForTimeSlot(room, time));
      const isBusinessHours = minutes >= 6 * 60 && minutes <= 20 * 60; // 6 AM to 8 PM
      
      return hasOperation || isBusinessHours;
    });
  }, [allTimes, activeRooms]);

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-headline">OP Zeitplan</CardTitle>
        <p className="text-sm text-muted-foreground">
          Zeitbasierte Ansicht • {relevantTimeSlots.length} Zeitslots • {activeRooms.length} Säle
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="grid gap-px bg-border min-w-[calc(800px)]" 
               style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${relevantTimeSlots.length}, minmax(140px, 1fr))` }}>
            
            {/* Header Row */}
            <div className="p-3 font-semibold bg-card text-card-foreground sticky left-0 z-10">Saal / Zeit</div>
            {relevantTimeSlots.map(timeSlot => (
              <div key={timeSlot} className="p-2 font-semibold bg-card text-card-foreground text-center">
                <div className="text-sm">{timeSlot}</div>
                <div className="text-xs text-muted-foreground">
                  {timeToMinutes(timeSlot) < 12 * 60 ? 'Vormittag' : 'Nachmittag'}
                </div>
              </div>
            ))}

            {/* Data Rows */}
            {activeRooms.map(roomName => (
              <React.Fragment key={roomName}>
                <div className="p-3 font-semibold bg-card text-card-foreground sticky left-0 z-10 self-stretch flex flex-col justify-center">
                  <div className="font-bold">{roomName}</div>
                  <RoomDepartmentInfo roomName={roomName} className="text-xs mt-1" />
                </div>
                {relevantTimeSlots.map(timeSlot => {
                  const operation = getOperationForTimeSlot(roomName, timeSlot);
                  const isOperationStart = operation && operation.scheduledTime === timeSlot;
                  
                  return (
                    <div key={`${roomName}-${timeSlot}`} className="p-1 bg-background">
                      {isOperationStart ? (
                        <AssignmentCell 
                          operation={operation} 
                          onClick={onCellClick}
                        />
                      ) : operation ? (
                        // Show continuation of ongoing operation
                        <div className="h-full min-h-[120px] bg-gray-100 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-500">← {operation.procedureName}</span>
                        </div>
                      ) : (
                        // Empty time slot
                        <div className="h-full min-h-[120px] bg-muted/10 border border-dashed border-border/30 rounded-md" />
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TimeBasedScheduleTable;
