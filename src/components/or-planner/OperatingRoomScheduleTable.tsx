"use client";
import React, { useMemo, useState } from 'react';
import type { 
  ORSchedule, 
  OperationAssignment, 
  OperatingRoomName, 
  Department,
  DailyORSchedule 
} from '@/lib/or-planner-types';
import { OPERATING_ROOMS } from '@/lib/or-planner-types';
import AssignmentCell from './AssignmentCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

type TimeSlotGroup = {
  label: string;
  startTime: string;
  endTime: string;
  slots: string[];
};

interface ScheduleTableProps {
  schedule: ORSchedule;
  onCellClick: (operation: OperationAssignment) => void;
  timeGrouping?: 'hourly' | 'grouped' | 'continuous';
  showEmptySlots?: boolean;
  selectedDate?: string;
}

// Department color mapping
const DEPARTMENT_COLORS: Record<Department, string> = {
  ACH: 'bg-blue-100 border-blue-300 text-blue-800',
  GCH: 'bg-green-100 border-green-300 text-green-800',
  PCH: 'bg-purple-100 border-purple-300 text-purple-800',
  URO: 'bg-orange-100 border-orange-300 text-orange-800',
  GYN: 'bg-pink-100 border-pink-300 text-pink-800',
  UCH: 'bg-red-100 border-red-300 text-red-800'
};

// Status color mapping
const STATUS_COLORS = {
  'empty': 'bg-gray-50 border-gray-200',
  'pending_gpt': 'bg-yellow-50 border-yellow-300',
  'approved_julia': 'bg-green-50 border-green-300',
  'modified_julia': 'bg-blue-50 border-blue-300',
  'final_approved': 'bg-emerald-50 border-emerald-300',
  'critical_pending': 'bg-red-50 border-red-400'
};

const OperatingRoomScheduleTable: React.FC<ScheduleTableProps> = ({ 
  schedule, 
  onCellClick, 
  timeGrouping = 'grouped',
  showEmptySlots = true,
  selectedDate 
}) => {
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  // Get available dates from schedule
  const availableDates = useMemo(() => {
    return Object.keys(schedule).sort();
  }, [schedule]);

  // Get current date to display
  const currentDate = selectedDate || availableDates[currentDateIndex] || new Date().toISOString().split('T')[0];
  const dailySchedule = schedule[currentDate];

  // Generate time slots based on actual operations
  const timeSlotGroups = useMemo((): TimeSlotGroup[] => {
    if (!dailySchedule) return [];

    // Collect all unique time slots from operations
    const allTimes = new Set<string>();
    OPERATING_ROOMS.forEach(room => {
      const roomOps = dailySchedule.rooms[room] || [];
      roomOps.forEach(op => {
        if (op.timeSlot?.start) {
          allTimes.add(op.timeSlot.start);
        }
      });
    });

    const sortedTimes = Array.from(allTimes).sort();

    if (timeGrouping === 'grouped') {
      // Group times into logical periods
      const groups: TimeSlotGroup[] = [];
      
      // Morning: 07:00 - 09:59
      const morningTimes = sortedTimes.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 7 && hour < 10;
      });
      
      if (morningTimes.length > 0) {
        groups.push({
          label: 'Vormittag',
          startTime: morningTimes[0],
          endTime: morningTimes[morningTimes.length - 1],
          slots: morningTimes
        });
      }

      // Mid-day: 10:00 - 11:59
      const middayTimes = sortedTimes.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 10 && hour < 12;
      });
      
      if (middayTimes.length > 0) {
        groups.push({
          label: 'Mittag',
          startTime: middayTimes[0],
          endTime: middayTimes[middayTimes.length - 1],
          slots: middayTimes
        });
      }

      // Afternoon: 12:00 - 15:00
      const afternoonTimes = sortedTimes.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 12 && hour <= 15;
      });
      
      if (afternoonTimes.length > 0) {
        groups.push({
          label: 'Nachmittag',
          startTime: afternoonTimes[0],
          endTime: afternoonTimes[afternoonTimes.length - 1],
          slots: afternoonTimes
        });
      }

      return groups;
    } else {
      // Continuous view - all times as one group
      return [{
        label: 'Alle Zeiten',
        startTime: sortedTimes[0] || '07:00',
        endTime: sortedTimes[sortedTimes.length - 1] || '15:00',
        slots: sortedTimes
      }];
    }
  }, [dailySchedule, timeGrouping]);

  // Get operation for specific room and time
  const getOperationForRoomAndTime = (room: OperatingRoomName, time: string): OperationAssignment | null => {
    if (!dailySchedule) return null;
    const roomOps = dailySchedule.rooms[room] || [];
    return roomOps.find(op => op.timeSlot?.start === time) || null;
  };

  // Enhanced AssignmentCell component for timeline view
  const TimelineAssignmentCell: React.FC<{
    operation: OperationAssignment | null;
    room: OperatingRoomName;
    time: string;
    onClick: (operation: OperationAssignment) => void;
  }> = ({ operation, room, time, onClick }) => {
    if (!operation) {
      return showEmptySlots ? (
        <div className="h-16 min-w-[160px] border border-dashed border-gray-200 rounded-md flex items-center justify-center text-xs text-gray-400">
          {time}
        </div>
      ) : null;
    }

    const departmentColor = operation.department ? DEPARTMENT_COLORS[operation.department] : 'bg-gray-100 border-gray-300';
    const statusColor = STATUS_COLORS[operation.status] || 'bg-gray-100 border-gray-300';

    return (
      <div 
        className={`h-16 min-w-[160px] p-2 rounded-md border-2 cursor-pointer hover:shadow-md transition-all duration-200 ${departmentColor} hover:scale-[1.02]`}
        onClick={() => onClick(operation)}
      >
        <div className="flex flex-col h-full justify-between">
          {/* Time and Status */}
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-xs px-1 py-0">
              {operation.timeSlot?.start}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${statusColor.includes('red') ? 'bg-red-400' : statusColor.includes('green') ? 'bg-green-400' : statusColor.includes('yellow') ? 'bg-yellow-400' : 'bg-gray-400'}`} />
          </div>
          
          {/* Procedure Name */}
          <div className="flex-1">
            <p className="text-xs font-medium leading-tight line-clamp-2" title={operation.procedureName}>
              {operation.procedureName || 'Unbekannter Eingriff'}
            </p>
          </div>
          
          {/* Surgeon and Department */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 truncate" title={operation.surgeon}>
              {operation.surgeon?.split(' ')[0] || 'N/A'}
            </span>
            <Badge variant="secondary" className="text-xs px-1">
              {operation.department}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // Navigation for multiple dates
  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
    } else if (direction === 'next' && currentDateIndex < availableDates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  if (!dailySchedule) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            OP-Saal Belegungsplan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Kein Operationsplan für das gewählte Datum verfügbar.</p>
            <p className="text-sm mt-2">Bitte importieren Sie zunächst einen CSV-Plan.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total operations for the day
  const totalOperations = OPERATING_ROOMS.reduce((total, room) => {
    return total + (dailySchedule.rooms[room]?.length || 0);
  }, 0);

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            OP-Saal Belegungsplan
          </CardTitle>
          
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateDate('prev')}
              disabled={currentDateIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium px-3 py-1 bg-muted rounded">
              {new Date(currentDate).toLocaleDateString('de-DE', { 
                weekday: 'short', 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateDate('next')}
              disabled={currentDateIndex === availableDates.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{totalOperations} Operationen</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span>8 OP-Säle</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{timeSlotGroups.reduce((sum, group) => sum + group.slots.length, 0)} Zeitslots</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Time Group Headers */}
            <div className="flex mb-4">
              <div className="w-24 flex-shrink-0" /> {/* Spacer for room names */}
              {timeSlotGroups.map((group, groupIndex) => (
                <div key={group.label} className="flex-1 min-w-max">
                  <div className="text-center mb-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      {group.label} ({group.startTime} - {group.endTime})
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {group.slots.map(time => (
                      <div key={time} className="min-w-[160px] text-center">
                        <div className="text-xs text-muted-foreground font-medium">
                          {time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mb-4" />

            {/* Schedule Grid */}
            <div className="space-y-2">
              {OPERATING_ROOMS.map(room => (
                <div key={room} className="flex items-center gap-4">
                  {/* Room Name - Sticky */}
                  <div className="w-20 flex-shrink-0 font-semibold text-sm py-2">
                    {room}
                  </div>
                  
                  {/* Time Slots */}
                  <div className="flex gap-2 flex-1">
                    {timeSlotGroups.map(group => (
                      <div key={group.label} className="flex gap-2">
                        {group.slots.map(time => {
                          const operation = getOperationForRoomAndTime(room, time);
                          return (
                            <TimelineAssignmentCell
                              key={time}
                              operation={operation}
                              room={room}
                              time={time}
                              onClick={onCellClick}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Abteilungen:</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(DEPARTMENT_COLORS).map(([dept, color]) => (
                  <div key={dept} className={`px-2 py-1 rounded text-xs border ${color}`}>
                    {dept}
                  </div>
                ))}
              </div>
              
              <div className="text-sm font-medium mb-2">Status:</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span>KI-Vorschlag</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>Genehmigt</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Geändert</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span>Kritisch</span>
                </div>
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OperatingRoomScheduleTable;
