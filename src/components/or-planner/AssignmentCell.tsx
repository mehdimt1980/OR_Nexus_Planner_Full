
"use client";
import React from 'react';
import type { OperationAssignment, OperationComplexity, StaffMember } from '@/lib/or-planner-types';
import { SHIFT_TIMES } from '@/lib/or-planner-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { User, AlertCircle, Check, Edit3, Bot, Users } from 'lucide-react';

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

const statusConfig: Record<OperationAssignment['status'], { bgColor: string, borderColor: string, textColor: string, icon?: React.ElementType, label: string }> = {
  empty: { bgColor: 'bg-muted/30', borderColor: 'border-muted/50', textColor: 'text-muted-foreground', label: "Leer" },
  pending_gpt: { bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/50', textColor: 'text-yellow-700 dark:text-yellow-400', icon: Bot, label: "KI Vorschlag" },
  critical_pending: { bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50', textColor: 'text-red-700 dark:text-red-400', icon: AlertCircle, label: "Kritisch" },
  approved_julia: { bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50', textColor: 'text-green-700 dark:text-green-400', icon: Check, label: "Genehmigt" },
  modified_julia: { bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50', textColor: 'text-blue-700 dark:text-blue-400', icon: Edit3, label: "Geändert" },
  final_approved: { bgColor: 'bg-teal-500/20', borderColor: 'border-teal-500/50', textColor: 'text-teal-700 dark:text-teal-400', icon: Check, label: "Final" },
};


const AssignmentCell: React.FC<AssignmentCellProps> = ({ operation, onClick }) => {
  if (!operation) {
    return <div className="h-full min-h-[120px] bg-muted/10 border border-dashed border-border/50 rounded-md" />;
  }

  const config = statusConfig[operation.status] || statusConfig.empty;
  const Icon = config.icon;
  const assignedStaff = operation.assignedStaff || [];

  return (
    <div
      className={cn(
        "h-full min-h-[120px] p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-150 ease-in-out hover:shadow-xl hover:scale-[1.02]",
        config.bgColor,
        config.borderColor,
        config.textColor,
        "flex flex-col justify-between text-xs"
      )}
      onClick={() => onClick(operation)}
      role="button"
      tabIndex={0}
      aria-label={`Details für ${operation.room} ${operation.shift} anzeigen`}
    >
      <div>
        <div className="flex justify-between items-start mb-1">
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{SHIFT_TIMES[operation.shift]}</Badge>
          {operation.complexity && (
            <span
              className={cn("w-3 h-3 rounded-full inline-block ml-auto", complexityColors[operation.complexity])}
              title={`Komplexität: ${operation.complexity}`}
              aria-label={`Komplexität: ${operation.complexity}`}
            />
          )}
        </div>
        <p className="font-semibold text-sm truncate text-foreground/90" title={operation.procedureName}>{operation.procedureName || 'N/A'}</p>
      </div>

      <div className="mt-1">
        {assignedStaff.length > 0 ? (
          assignedStaff.map((staff, index) => (
            <div key={staff.id || index} className="flex items-center space-x-1.5 text-foreground/80 truncate" title={staff.name}>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{staff.name}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center space-x-1.5 text-muted-foreground italic">
             <Users className="h-3.5 w-3.5 shrink-0" /> {/* Users icon for multiple staff */}
            <span>Unbesetzt</span>
          </div>
        )}
        {Icon && (
          <div className={cn("flex items-center space-x-1 mt-1.5 text-xs font-medium", config.textColor)}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{config.label}</span>
          </div>
        )}
         {operation.status === 'critical_pending' && operation.notes && (
          <p className="text-xs text-red-600 dark:text-red-400 truncate mt-0.5" title={operation.notes}>{operation.notes}</p>
        )}
      </div>
    </div>
  );
};

export default AssignmentCell;
