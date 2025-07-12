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
  CheckCircle,
  AlertTriangle,
  Stethoscope,
  Calendar,
  FileText
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AssignmentCellProps = {
  operation: OperationAssignment | null;
  onClick: (operation: OperationAssignment) => void;
};

// Department color themes
const departmentColors: Record<Department, {
  bg: string;
  border: string;
  text: string;
  badge: string;
}> = {
  ACH: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-300',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  GCH: {
    bg: 'bg-red-50 hover:bg-red-100',
    border: 'border-red-200 hover:border-red-300',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  PCH: {
    bg: 'bg-green-50 hover:bg-green-100',
    border: 'border-green-200 hover:border-green-300',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  URO: {
    bg: 'bg-yellow-50 hover:bg-yellow-100',
    border: 'border-yellow-200 hover:border-yellow-300',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  GYN: {
    bg: 'bg-pink-50 hover:bg-pink-100',
    border: 'border-pink-200 hover:border-pink-300',
    text: 'text-pink-900',
    badge: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  UCH: {
    bg: 'bg-orange-50 hover:bg-orange-100',
    border: 'border-orange-200 hover:border-orange-300',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-800 border-orange-200'
  }
};

// Complexity indicators
const complexityColors: Record<OperationComplexity, string> = {
  'Sehr Hoch': 'bg-red-500',
  'Hoch': 'bg-orange-500',
  'Mittel': 'bg-yellow-400',
  'Niedrig': 'bg-green-500',
};

// Real hospital status configuration
const hospitalStatusConfig: Record<string, { 
  bgColor: string; 
  borderColor: string; 
  textColor: string; 
  icon: React.ElementType; 
  label: string;
  priority: number;
}> = {
  // Real hospital statuses
  'OP geplant': { 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-300', 
    textColor: 'text-gray-700', 
    icon: Clock, 
    label: 'Geplant',
    priority: 1
  },
  'OP abgeschlossen': { 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-400', 
    textColor: 'text-green-700', 
    icon: CheckCircle, 
    label: 'Abgeschlossen',
    priority: 3
  },
  'OP-Protokoll nicht abgeschlossen': { 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-400', 
    textColor: 'text-orange-700', 
    icon: AlertTriangle, 
    label: 'Protokoll fehlt',
    priority: 2
  },
  
  // Workflow statuses (for compatibility)
  'empty': { 
    bgColor: 'bg-muted/30', 
    borderColor: 'border-muted/50', 
    textColor: 'text-muted-foreground', 
    icon: Calendar, 
    label: 'Leer',
    priority: 0
  },
  'pending_gpt': { 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-400', 
    textColor: 'text-yellow-700', 
    icon: Bot, 
    label: 'KI-Vorschlag',
    priority: 1
  },
  'critical_pending': { 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-500', 
    textColor: 'text-red-700', 
    icon: AlertCircle, 
    label: 'Kritisch',
    priority: 4
  },
  'approved_julia': { 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-400', 
    textColor: 'text-green-700', 
    icon: Check, 
    label: 'Genehmigt',
    priority: 2
  },
  'modified_julia': { 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-400', 
    textColor: 'text-blue-700', 
    icon: Edit3, 
    label: 'Geändert',
    priority: 2
  },
  'final_approved': { 
    bgColor: 'bg-emerald-50', 
    borderColor: 'border-emerald-400', 
    textColor: 'text-emerald-700', 
    icon: CheckCircle, 
    label: 'Final',
    priority: 3
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

  // Determine primary status (hospital status takes precedence)
  const primaryStatus = operation.operationStatus || operation.status;
  const statusConfig = hospitalStatusConfig[primaryStatus] || hospitalStatusConfig['empty'];
  const StatusIcon = statusConfig.icon;

  // Get department colors
  const departmentTheme = operation.department ? departmentColors[operation.department] : {
    bg: 'bg-gray-50 hover:bg-gray-100',
    border: 'border-gray-200 hover:border-gray-300',
    text: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const assignedStaff = operation.assignedStaff || [];
  const timeDisplay = operation.timeSlot?.start || 'N/A';
  
  // Extract surgeon name (from CSV data or assigned staff)
  const surgeonName = operation.surgeon || 
    (operation.csvData?.erstOperateur) || 
    assignedStaff.find(staff => staff.name.includes('Dr.'))?.name || 
    'Nicht zugewiesen';

  // Create tooltip content
  const tooltipContent = (
    <div className="space-y-2 max-w-80">
      <div>
        <p className="font-semibold">{operation.procedureName}</p>
        <p className="text-sm text-muted-foreground">{operation.room} • {timeDisplay}</p>
      </div>
      
      {operation.csvData?.fallnummer && (
        <div className="text-sm">
          <span className="font-medium">Fallnummer:</span> {operation.csvData.fallnummer}
        </div>
      )}
      
      <div className="text-sm">
        <span className="font-medium">Operateur:</span> {surgeonName}
      </div>
      
      {operation.department && (
        <div className="text-sm">
          <span className="font-medium">Abteilung:</span> {operation.department}
        </div>
      )}
      
      {operation.complexity && (
        <div className="text-sm">
          <span className="font-medium">Komplexität:</span> {operation.complexity}
        </div>
      )}
      
      {operation.notes && (
        <div className="text-sm">
          <span className="font-medium">Notizen:</span> {operation.notes}
        </div>
      )}
      
      {operation.csvData?.antibiotikaprophylaxe && (
        <div className="text-sm">
          <span className="font-medium">Antibiotikaprophylaxe:</span> {operation.csvData.antibiotikaprophylaxe}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "h-full min-h-[140px] p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
              departmentTheme.bg,
              departmentTheme.border,
              statusConfig.borderColor,
              "flex flex-col justify-between"
            )}
            onClick={() => onClick(operation)}
            role="button"
            tabIndex={0}
            aria-label={`Details für ${operation.procedureName} in ${operation.room} anzeigen`}
          >
            {/* Header: Time, Department, Complexity */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-bold px-2 py-1">
                  {timeDisplay}
                </Badge>
                {operation.department && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs px-1.5 py-0.5 border", departmentTheme.badge)}
                  >
                    {operation.department}
                  </Badge>
                )}
              </div>
              
              {operation.complexity && (
                <div className="flex items-center gap-1">
                  <span
                    className={cn("w-3 h-3 rounded-full", complexityColors[operation.complexity])}
                    title={`Komplexität: ${operation.complexity}`}
                  />
                </div>
              )}
            </div>

            {/* Procedure Name */}
            <div className="flex-1 mb-2">
              <p 
                className={cn("font-semibold text-sm leading-tight line-clamp-2", departmentTheme.text)} 
                title={operation.procedureName}
              >
                {operation.procedureName || 'Unbekannter Eingriff'}
              </p>
            </div>

            {/* Surgeon */}
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Stethoscope className="h-3 w-3 shrink-0" />
                <span className="truncate" title={surgeonName}>
                  {surgeonName.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            </div>

            {/* Staff Assignment Area */}
            <div className="space-y-1">
              {assignedStaff.length > 0 ? (
                <div className="space-y-1">
                  {assignedStaff.slice(0, 2).map((staff, index) => (
                    <div key={staff.id || index} className="flex items-center gap-1.5 text-xs">
                      <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate text-foreground/80" title={staff.name}>
                        {staff.name}
                      </span>
                    </div>
                  ))}
                  {assignedStaff.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{assignedStaff.length - 2} weitere
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                  <Users className="h-3 w-3 shrink-0" />
                  <span>Personal nicht zugewiesen</span>
                </div>
              )}

              {/* Status Indicator */}
              <div className={cn("flex items-center gap-1 pt-1 text-xs font-medium", statusConfig.textColor)}>
                <StatusIcon className="h-3 w-3 shrink-0" />
                <span>{statusConfig.label}</span>
                
                {/* Case Number (if available) */}
                {operation.csvData?.fallnummer && (
                  <Badge variant="outline" className="ml-auto text-xs px-1 py-0">
                    #{operation.csvData.fallnummer.slice(-4)}
                  </Badge>
                )}
              </div>

              {/* Critical Notes */}
              {(operation.status === 'critical_pending' || operation.notes) && (
                <div className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1">
                  <p className="line-clamp-1" title={operation.notes}>
                    {operation.notes || 'Kritischer Status'}
                  </p>
                </div>
              )}

              {/* Special Indicators */}
              <div className="flex items-center justify-between text-xs mt-1">
                {operation.csvData?.antibiotikaprophylaxe && (
                  <Badge variant="outline" className="text-xs px-1 py-0" title="Antibiotikaprophylaxe erforderlich">
                    AB
                  </Badge>
                )}
                
                {operation.aiReasoning && (
                  <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50" title="KI-Begründung verfügbar">
                    <Bot className="h-2.5 w-2.5" />
                  </Badge>
                )}
                
                {operation.juliaModificationReason && (
                  <Badge variant="outline" className="text-xs px-1 py-0 bg-green-50" title="Von Julia geändert">
                    <Edit3 className="h-2.5 w-2.5" />
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AssignmentCell;
