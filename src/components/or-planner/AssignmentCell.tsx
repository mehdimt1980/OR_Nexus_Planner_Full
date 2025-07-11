"use client";
import React from 'react';
import type { OperationAssignment, OperationComplexity, StaffMember, Department } from '@/lib/or-planner-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  AlertCircle, 
  Check, 
  Edit3, 
  Bot, 
  Users, 
  Clock,
  UserCheck,
  Stethoscope,
  Calendar,
  PlayCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

type AssignmentCellProps = {
  operation: OperationAssignment | null;
  onClick: (operation: OperationAssignment) => void;
};

const complexityColors: Record<OperationComplexity, string> = {
  'Sehr Hoch': 'bg-red-500',
  'Hoch': 'bg-orange-500',
  'Mittel': 'bg-yellow-400',
  'Niedrig': 'bg-green-500',
};

const departmentColors: Record<Department, string> = {
  'UCH': 'bg-blue-500 text-white',
  'ACH': 'bg-green-500 text-white',
  'GCH': 'bg-orange-500 text-white',
  'GYN': 'bg-pink-500 text-white',
  'URO': 'bg-purple-500 text-white',
  'PCH': 'bg-indigo-500 text-white',
};

const statusConfig: Record<OperationAssignment['status'], { 
  bgColor: string; 
  borderColor: string; 
  textColor: string; 
  icon?: React.ElementType; 
  label: string;
  priority: number;
}> = {
  // Real hospital statuses
  planned: { 
    bgColor: 'bg-blue-500/20', 
    borderColor: 'border-blue-500/50', 
    textColor: 'text-blue-700 dark:text-blue-400', 
    icon: Calendar, 
    label: "Geplant",
    priority: 3
  },
  in_progress: { 
    bgColor: 'bg-yellow-500/20', 
    borderColor: 'border-yellow-500/50', 
    textColor: 'text-yellow-700 dark:text-yellow-400', 
    icon: PlayCircle, 
    label: "Läuft",
    priority: 1
  },
  completed: { 
    bgColor: 'bg-green-500/20', 
    borderColor: 'border-green-500/50', 
    textColor: 'text-green-700 dark:text-green-400', 
    icon: CheckCircle2, 
    label: "Beendet",
    priority: 5
  },
  protocol_incomplete: { 
    bgColor: 'bg-orange-500/20', 
    borderColor: 'border-orange-500/50', 
    textColor: 'text-orange-700 dark:text-orange-400', 
    icon: FileText, 
    label: "Protokoll fehlt",
    priority: 2
  },
  
  // Planning workflow statuses
  empty: { 
    bgColor: 'bg-muted/30', 
    borderColor: 'border-muted/50', 
    textColor: 'text-muted-foreground', 
    label: "Leer",
    priority: 6
  },
  pending_gpt: { 
    bgColor: 'bg-purple-500/20', 
    borderColor: 'border-purple-500/50', 
    textColor: 'text-purple-700 dark:text-purple-400', 
    icon: Bot, 
    label: "KI Vorschlag",
    priority: 4
  },
  critical_pending: { 
    bgColor: 'bg-red-500/20', 
    borderColor: 'border-red-500/50', 
    textColor: 'text-red-700 dark:text-red-400', 
    icon: AlertCircle, 
    label: "Kritisch",
    priority: 0
  },
  approved_julia: { 
    bgColor: 'bg-green-500/20', 
    borderColor: 'border-green-500/50', 
    textColor: 'text-green-700 dark:text-green-400', 
    icon: Check, 
    label: "Genehmigt",
    priority: 3
  },
  modified_julia: { 
    bgColor: 'bg-cyan-500/20', 
    borderColor: 'border-cyan-500/50', 
    textColor: 'text-cyan-700 dark:text-cyan-400', 
    icon: Edit3, 
    label: "Geändert",
    priority: 3
  },
  final_approved: { 
    bgColor: 'bg-teal-500/20', 
    borderColor: 'border-teal-500/50', 
    textColor: 'text-teal-700 dark:text-teal-400', 
    icon: CheckCircle2, 
    label: "Final",
    priority: 4
  },
};

const AssignmentCell: React.FC<AssignmentCellProps> = ({ operation, onClick }) => {
  if (!operation) {
    return (
      <div className="h-full min-h-[140px] bg-muted/10 border border-dashed border-border/50 rounded-md flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Kein Eingriff</span>
      </div>
    );
  }

  const config = statusConfig[operation.status] || statusConfig.empty;
  const Icon = config.icon;
  const assignedStaff = operation.assignedStaff || [];
  const departmentColor = departmentColors[operation.department] || 'bg-gray-500 text-white';

  // Format time for display
  const formatTime = (time: string) => {
    return time; // Already in HH:MM format
  };

  // Calculate estimated end time
  const getEstimatedEndTime = () => {
    if (!operation.scheduledTime || !operation.estimatedDuration) return null;
    
    const [hours, minutes] = operation.scheduledTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + operation.estimatedDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const endTime = getEstimatedEndTime();

  return (
    <div
      className={cn(
        "h-full min-h-[140px] p-3 rounded-lg border-2 cursor-pointer transition-all duration-150 ease-in-out hover:shadow-xl hover:scale-[1.02] relative",
        config.bgColor,
        config.borderColor,
        config.textColor,
        "flex flex-col justify-between text-xs"
      )}
      onClick={() => onClick(operation)}
      role="button"
      tabIndex={0}
      aria-label={`Details für ${operation.procedureName} um ${operation.scheduledTime} anzeigen`}
    >
      {/* Header Section */}
      <div className="space-y-2">
        {/* Time and Department Row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs font-semibold">{formatTime(operation.scheduledTime)}</span>
            {endTime && (
              <span className="text-xs text-muted-foreground">- {endTime}</span>
            )}
          </div>
          
          <Badge className={`text-xs px-1.5 py-0.5 ${departmentColor}`}>
            {operation.department}
          </Badge>
        </div>

        {/* Procedure Name */}
        <div>
          <p className="font-semibold text-sm leading-tight text-foreground/90 line-clamp-2" 
             title={operation.procedureName}>
            {operation.procedureName || 'Unbekannter Eingriff'}
          </p>
        </div>

        {/* Surgeon */}
        {operation.primarySurgeon && (
          <div className="flex items-center space-x-1">
            <Stethoscope className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate" title={operation.primarySurgeon}>
              {operation.primarySurgeon}
            </span>
          </div>
        )}

        {/* Complexity Indicator */}
        {operation.complexity && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Komplexität:</span>
            <span
              className={cn(
                "w-3 h-3 rounded-full inline-block",
                complexityColors[operation.complexity]
              )}
              title={`Komplexität: ${operation.complexity}`}
              aria-label={`Komplexität: ${operation.complexity}`}
            />
          </div>
        )}
      </div>

      {/* Staff Assignment Section */}
      <div className="space-y-2">
        {/* Assigned Staff */}
        <div className="space-y-1">
          {assignedStaff.length > 0 ? (
            assignedStaff.map((staff, index) => (
              <div key={staff.id || index} className="flex items-center space-x-1.5 text-foreground/80">
                <User className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate" title={staff.name}>
                  Pflege {index + 1}: {staff.name}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center space-x-1.5 text-muted-foreground italic">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Personal unbesetzt</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          {Icon && (
            <div className={cn("flex items-center space-x-1 text-xs font-medium", config.textColor)}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{config.label}</span>
            </div>
          )}
          
          {/* Duration Badge */}
          {operation.estimatedDuration && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {operation.estimatedDuration}min
            </Badge>
          )}
        </div>

        {/* Critical Notes */}
        {operation.status === 'critical_pending' && operation.notes && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-1.5 rounded text-center">
            <span className="font-medium" title={operation.notes}>
              {operation.notes.length > 30 ? `${operation.notes.substring(0, 30)}...` : operation.notes}
            </span>
          </div>
        )}

        {/* Julia Modification Reason */}
        {operation.status === 'modified_julia' && operation.juliaModificationReason && (
          <div className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 p-1.5 rounded">
            <span className="font-medium">Julia:</span>
            <span className="ml-1" title={operation.juliaModificationReason}>
              {operation.juliaModificationReason.length > 25 
                ? `${operation.juliaModificationReason.substring(0, 25)}...` 
                : operation.juliaModificationReason}
            </span>
          </div>
        )}
      </div>

      {/* Priority Indicator (small colored bar on left edge) */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          config.priority === 0 ? "bg-red-500" :
          config.priority === 1 ? "bg-yellow-500" :
          config.priority === 2 ? "bg-orange-500" :
          config.priority === 3 ? "bg-blue-500" :
          config.priority === 4 ? "bg-green-500" :
          "bg-gray-300"
        )}
      />
    </div>
  );
};

export default AssignmentCell;
