"use client";
import React from 'react';
import type { ORSchedule, OperationAssignment, OperatingRoomName, Shift } from '@/lib/or-planner-types';
import { OPERATING_ROOMS, SHIFTS, SHIFT_TIMES } from '@/lib/or-planner-types';
import AssignmentCell from './AssignmentCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type OperatingRoomScheduleTableProps = {
  schedule: ORSchedule;
  onCellClick: (operation: OperationAssignment) => void;
};

const OperatingRoomScheduleTable: React.FC<OperatingRoomScheduleTableProps> = ({ schedule, onCellClick }) => {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-headline">OP Saalbelegungsplan</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="grid gap-px bg-border min-w-[calc(800px)]" 
               style={{ gridTemplateColumns: `minmax(100px, 1fr) repeat(${SHIFTS.length}, minmax(180px, 1fr))` }}>
            {/* Header Row */}
            <div className="p-3 font-semibold bg-card text-card-foreground sticky left-0 z-10">Saal / Schicht</div>
            {SHIFTS.map(shift => (
              <div key={shift} className="p-3 font-semibold bg-card text-card-foreground text-center">
                {shift} <span className="block text-xs text-muted-foreground">({SHIFT_TIMES[shift]})</span>
              </div>
            ))}

            {/* Data Rows */}
            {OPERATING_ROOMS.map(roomName => (
              <React.Fragment key={roomName}>
                <div className="p-3 font-semibold bg-card text-card-foreground sticky left-0 z-10 self-stretch flex items-center justify-start">
                  {roomName}
                </div>
                {SHIFTS.map(shiftName => {
                  const operation = schedule[roomName]?.[shiftName];
                  return (
                    <div key={`${roomName}-${shiftName}`} className="p-1 bg-background">
                      <AssignmentCell operation={operation} onClick={onCellClick} />
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

export default OperatingRoomScheduleTable;
