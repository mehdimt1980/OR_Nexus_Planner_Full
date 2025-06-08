"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardStatsProps = {
  juliaProgress: { reviewed: number; total: number };
  criticalAlertsCount: number;
  juliaModificationsCount: number;
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ juliaProgress, criticalAlertsCount, juliaModificationsCount }) => {
  const progressPercentage = juliaProgress.total > 0 ? (juliaProgress.reviewed / juliaProgress.total) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Julias Prüfung</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{juliaProgress.reviewed}/{juliaProgress.total}</div>
          <p className="text-xs text-muted-foreground">Genehmigungen abgeschlossen</p>
          <Progress value={progressPercentage} className="mt-2 h-2" />
        </CardContent>
      </Card>
      <Card className={criticalAlertsCount > 0 ? "border-red-500 dark:border-red-400 bg-red-500/5" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kritische Meldungen</CardTitle>
          <AlertTriangle className={cn("h-4 w-4", criticalAlertsCount > 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{criticalAlertsCount}</div>
          <p className="text-xs text-muted-foreground">z.B. Personalmangel, dringende Fälle</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">KI Lerninteraktionen</CardTitle>
          <BrainCircuit className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{juliaModificationsCount}</div>
          <p className="text-xs text-muted-foreground">Manuelle Anpassungen von Julia</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
