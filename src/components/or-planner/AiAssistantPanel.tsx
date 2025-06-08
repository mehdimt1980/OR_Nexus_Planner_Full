"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, Save } from 'lucide-react'; // Lightbulb for insights, Sparkles for optimize
import type { WorkflowStepKey } from '@/lib/or-planner-types';

type AiAssistantPanelProps = {
  learningSummary: string;
  onOptimizeClick: () => void;
  onFinalizePlanClick: () => void;
  currentWorkflowStepKey: WorkflowStepKey;
  isLoading: boolean;
};

const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ learningSummary, onOptimizeClick, onFinalizePlanClick, currentWorkflowStepKey, isLoading }) => {
  const canOptimize = currentWorkflowStepKey === 'JULIA_REVIEW' || currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY';
  const canFinalize = currentWorkflowStepKey === 'TORSTEN_FINAL_APPROVAL';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg font-headline">KI Assistenz</CardTitle>
        </div>
        <CardDescription>Einsichten und Aktionen der Personalplanungs-KI.</CardDescription>
      </CardHeader>
      <CardContent>
        <h4 className="text-sm font-semibold mb-1 text-card-foreground">Lernzusammenfassung der KI:</h4>
        <ScrollArea className="h-32 w-full rounded-md border p-3 bg-muted/30">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' ? "KI generiert Vorschläge..." : isLoading ? "KI lernt..." : learningSummary || "Keine Lernpunkte bisher."}
          </p>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
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

export default AiAssistantPanel;
