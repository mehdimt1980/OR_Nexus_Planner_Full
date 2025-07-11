"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, Save, Brain, TrendingUp as ImprovementIcon, Settings2 as NextOptimizationIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowStepKey } from '@/lib/or-planner-types';

export type LearningProgressItem = {
  text: string;
  icon: LucideIcon;
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
  const canOptimize = currentWorkflowStepKey === 'JULIA_REVIEW' || currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY';
  const canFinalize = currentWorkflowStepKey === 'TORSTEN_FINAL_APPROVAL';

  const displaySummary = isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' 
    ? "KI generiert Vorschläge..." 
    : isLoading 
    ? "KI lernt..." 
    : aiRawLearningSummary || "Keine Lernpunkte bisher.";

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg font-headline">KI Lernfortschritt</CardTitle>
        </div>
        <CardDescription>Was die KI aus Julias Anpassungen gelernt hat und nächste Schritte.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {structuredLearningPoints.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {structuredLearningPoints.map((item, index) => (
              <li key={index} className="flex items-start space-x-2">
                <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
           <p className="text-sm text-muted-foreground">Keine strukturierten Lernpunkte verfügbar.</p>
        )}
        
        <div>
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wider">Roh-Lernzusammenfassung:</h4>
          <ScrollArea className="h-24 w-full rounded-md border p-2 bg-muted/20 text-xs">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {displaySummary}
            </p>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button 
          onClick={onOptimizeClick} 
          disabled={!canOptimize || isLoading}
          variant="outline"
          className="w-full sm:w-auto bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary hover:text-primary"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          KI Optimierung
        </Button>
        <Button 
          onClick={onFinalizePlanClick} 
          disabled={!canFinalize || isLoading}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          Plan Final Freigeben
        </Button>
      </CardFooter>
    </Card>
  );
};

// Default icons if needed elsewhere - exported as separate constant
export const defaultLearningIcons = {
  Learned: Brain,
  Improvement: ImprovementIcon,
  NextOptimization: NextOptimizationIcon,
};

export default AiAssistantPanel;
