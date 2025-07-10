// src/components/or-planner/RoomDepartmentInfo.tsx
"use client";
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ROOM_DEPARTMENT_MAPPING, DEPARTMENT_SPECIALIZATIONS, type OperatingRoomName, type DepartmentName } from '@/lib/or-planner-types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RoomDepartmentInfoProps {
  roomName: OperatingRoomName;
  className?: string;
}

export const RoomDepartmentInfo: React.FC<RoomDepartmentInfoProps> = ({ roomName, className }) => {
  const department = ROOM_DEPARTMENT_MAPPING[roomName] as DepartmentName;
  const departmentInfo = department ? DEPARTMENT_SPECIALIZATIONS[department] : null;

  if (!departmentInfo) {
    return null;
  }

  const getDepartmentColor = (dept: DepartmentName) => {
    const colors = {
      'UCH': 'bg-red-100 text-red-700 hover:bg-red-200',
      'ACH': 'bg-blue-100 text-blue-700 hover:bg-blue-200', 
      'GCH': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      'GYN': 'bg-pink-100 text-pink-700 hover:bg-pink-200',
      'URO': 'bg-green-100 text-green-700 hover:bg-green-200',
      'PCH': 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      'EPZ/HNO': 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
    };
    return colors[dept] || 'bg-gray-100 text-gray-700';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${getDepartmentColor(department)} border-0 ${className}`}>
            {department}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-semibold">{departmentInfo.name}</div>
            <div className="text-xs text-muted-foreground">{departmentInfo.description}</div>
            <div className="text-xs mt-1">
              Komplexitäten: {departmentInfo.complexities.join(', ')}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RoomDepartmentInfo;
