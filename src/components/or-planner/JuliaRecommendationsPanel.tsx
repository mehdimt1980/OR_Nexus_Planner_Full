
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lightbulb, CheckCircle, TrendingUp, BarChart2, RefreshCw, Users, Zap, Siren } from 'lucide-react';
import type { Icon as LucideIcon } from 'lucide-react';

export type CriticalSituationData = {
  title: string;
  situation: string;
  gptSuggestion: string;
  alternative: string;
};

export type OptimizationSuggestionItem = {
  text: string;
  icon: LucideIcon;
};

type JuliaRecommendationsPanelProps = {
  criticalSituation: CriticalSituationData;
  optimizationSuggestions: OptimizationSuggestionItem[];
  onExtendStaff: () => void;
  onRescheduleStaff: () => void;
};

const JuliaRecommendationsPanel: React.FC<JuliaRecommendationsPanelProps> = ({
  criticalSituation,
  optimizationSuggestions,
  onExtendStaff,
  onRescheduleStaff,
}) => {
  return (
    <div className="space-y-4">
      {/* Kritische Situation Card */}
      <Card className="shadow-lg border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-lg font-headline">{criticalSituation.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start space-x-2 text-destructive-foreground bg-destructive/10 p-2 rounded-md">
            <Siren className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <p><span className="font-semibold">Situation:</span> {criticalSituation.situation}</p>
          </div>
          <div className="flex items-start space-x-2">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
            <p><span className="font-semibold">GPT Vorschlag:</span> {criticalSituation.gptSuggestion}</p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
            <p><span className="font-semibold">Alternative:</span> {criticalSituation.alternative}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onExtendStaff} variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
            Gerhard verlängern
          </Button>
          <Button onClick={onRescheduleStaff} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            Fatima umplanen
          </Button>
        </CardFooter>
      </Card>

      {/* Optimierungsvorschläge Card */}
      <Card className="shadow-lg border-blue-500/30 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" />
            <CardTitle className="text-lg font-headline">Optimierungsvorschläge</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {optimizationSuggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center space-x-2 text-blue-900 dark:text-blue-300">
              <suggestion.icon className="h-4 w-4 shrink-0" />
              <p>{suggestion.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default JuliaRecommendationsPanel;
