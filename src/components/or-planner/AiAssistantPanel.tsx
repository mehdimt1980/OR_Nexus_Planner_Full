"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, Save, Brain, TrendingUp as ImprovementIcon, Settings2 as NextOptimizationIcon } from 'lucide-react';
import type { Icon as LucideIconComponent } from 'lucide-react'; // Renamed to avoid confusion with the type

export type LearningProgressItem = {
  text: string;
  icon: LucideIconComponent; // This now correctly refers to the component type
};

type AiAssistantPanelProps = {
  aiRawLearningSummary: string; // The raw summary from Genkit
  structuredLearningPoints: LearningProgressItem[]; // For "GPT-4 Lernfortschritt" display
  onOptimizeClick: () => void;
  onFinalizePlanClick: () => void;
  currentWorkflowStepKey: WorkflowStepKey;
  isLoading: boolean;
};

const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  aiRawLearningSummary,
  structuredLearningPoints,
  onOptimizeClick,
  onFinalizePlanClick,
  currentWorkflowStepKey,
  isLoading
}) => {
  // ... rest of your component code
  return (
    <Card className="shadow-lg">
      {/* ... */}
      <CardContent className="space-y-3">
        {structuredLearningPoints.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {structuredLearningPoints.map((item, index) => (
              <li key={index} className="flex items-start space-x-2">
                <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" /> {/* This uses the component */}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
           <p className="text-sm text-muted-foreground">Keine strukturierten Lernpunkte verfügbar.</p>
        )}
        {/* ... */}
      </CardContent>
      {/* ... */}
    </Card>
  );
};

// Default icons if needed elsewhere
AiAssistantPanel.defaultLearningIcons = {
  Learned: Brain,
  Improvement: ImprovementIcon,
  NextOptimization: NextOptimizationIcon,
};

export default AiAssistantPanel;
