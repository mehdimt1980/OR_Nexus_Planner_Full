"use client";
import React from 'react';
import type { WorkflowStep } from '@/lib/or-planner-types';
import { CheckCircle, Zap, UserCheck, UserCog, ClipboardCheck } from 'lucide-react'; // Zap for AI, UserCheck for Julia, UserCog for Torsten
import { cn } from '@/lib/utils';

type WorkflowStatusIndicatorProps = {
  steps: WorkflowStep[];
};

const ICONS: Record<string, React.ElementType> = {
  PLAN_CREATED: ClipboardCheck,
  GPT_SUGGESTIONS_READY: Zap,
  JULIA_REVIEW: UserCheck,
  TORSTEN_FINAL_APPROVAL: UserCog,
  PLAN_FINALIZED: CheckCircle,
};


const WorkflowStatusIndicator: React.FC<WorkflowStatusIndicatorProps> = ({ steps }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow">
      <h2 className="text-lg font-semibold text-card-foreground mb-3">Workflow-Status</h2>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        {steps.map((step, index) => {
          const Icon = ICONS[step.key] || CheckCircle;
          return (
            <React.Fragment key={step.key}>
              <div className={cn(
                "flex items-center space-x-2 p-2 rounded-md min-w-[180px] flex-1 justify-center sm:justify-start",
                step.status === 'completed' && 'bg-green-500/10 text-green-700 dark:text-green-400',
                step.status === 'active' && 'bg-primary/10 text-primary animate-pulse-custom shadow-lg ring-2 ring-primary/50',
                step.status === 'pending' && 'bg-muted/50 text-muted-foreground'
              )}>
                <Icon className={cn("h-5 w-5", step.status === 'active' && 'text-primary')} />
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden sm:block h-px sm:h-auto sm:w-px bg-border mx-2 sm:mx-0 self-stretch"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStatusIndicator;
