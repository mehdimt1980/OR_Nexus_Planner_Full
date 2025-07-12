"use client";
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  AlertTriangle, 
  BrainCircuit, 
  Building, 
  Clock, 
  CheckCircle,
  FileCheck,
  TrendingUp,
  Calendar,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from '@/lib/or-planner-types';

type DepartmentProgress = {
  name: Department;
  total: number;
  reviewed: number;
  progress: number;
};

type RoomUtilization = {
  name: string;
  operationCount: number;
  utilizationRate: number;
  status: 'active' | 'low' | 'high';
};

type StatusBreakdown = {
  planned: number;
  completed: number;
  pending: number;
  critical: number;
};

type TimeDistribution = {
  morning: number;    // 07:00-11:59
  afternoon: number;  // 12:00-17:00
};

type DashboardStatsProps = {
  juliaProgress: { reviewed: number; total: number };
  criticalAlertsCount: number;
  juliaModificationsCount: number;
  // Enhanced props for 29 operations
  departmentProgress?: DepartmentProgress[];
  roomUtilization?: RoomUtilization[];
  statusBreakdown?: StatusBreakdown;
  timeDistribution?: TimeDistribution;
  importedOperationsCount?: number;
  totalSurgeons?: number;
};

// Department color mapping
const departmentColors: Record<Department, string> = {
  ACH: 'bg-blue-500',
  GCH: 'bg-red-500', 
  PCH: 'bg-green-500',
  URO: 'bg-yellow-500',
  GYN: 'bg-pink-500',
  UCH: 'bg-orange-500'
};

const departmentNames: Record<Department, string> = {
  ACH: 'Allgemeinchirurgie',
  GCH: 'Gefäßchirurgie',
  PCH: 'Plastische Chirurgie',
  URO: 'Urologie',
  GYN: 'Gynäkologie',
  UCH: 'Unfallchirurgie'
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  juliaProgress, 
  criticalAlertsCount, 
  juliaModificationsCount,
  departmentProgress = [],
  roomUtilization = [],
  statusBreakdown,
  timeDistribution,
  importedOperationsCount,
  totalSurgeons
}) => {
  const progressPercentage = juliaProgress.total > 0 ? (juliaProgress.reviewed / juliaProgress.total) * 100 : 0;

  // Calculate additional metrics
  const metrics = useMemo(() => {
    const totalOperations = juliaProgress.total;
    const averageOpsPerRoom = roomUtilization.length > 0 
      ? Math.round((totalOperations / roomUtilization.length) * 10) / 10 
      : 0;
    
    const activeRooms = roomUtilization.filter(room => room.operationCount > 0).length;
    
    return {
      totalOperations,
      averageOpsPerRoom,
      activeRooms,
      completionRate: Math.round(progressPercentage)
    };
  }, [juliaProgress.total, roomUtilization, progressPercentage]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Enhanced Progress Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Julia's Prüfung</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {juliaProgress.reviewed}/{juliaProgress.total}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Genehmigungen abgeschlossen ({metrics.completionRate}%)
          </p>
          <Progress value={progressPercentage} className="h-2 mb-3" />
          
          {/* Status Breakdown */}
          {statusBreakdown && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Genehmigt
                </span>
                <Badge variant="outline" className="text-xs">
                  {juliaProgress.reviewed}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  Ausstehend
                </span>
                <Badge variant="outline" className="text-xs">
                  {statusBreakdown.pending}
                </Badge>
              </div>
              {statusBreakdown.critical > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Kritisch
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {statusBreakdown.critical}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Distribution Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Abteilungen</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{departmentProgress.length}</div>
          <p className="text-xs text-muted-foreground mb-3">
            Medizinische Fachbereiche
          </p>
          
          <div className="space-y-2">
            {departmentProgress.slice(0, 4).map((dept) => (
              <div key={dept.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className={cn("w-2 h-2 rounded-full", departmentColors[dept.name])} 
                  />
                  <span className="text-xs font-medium">{dept.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {dept.reviewed}/{dept.total}
                  </span>
                  <div className="w-12">
                    <Progress value={dept.progress} className="h-1" />
                  </div>
                </div>
              </div>
            ))}
            
            {departmentProgress.length > 4 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{departmentProgress.length - 4} weitere
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Room Utilization Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">OP-Säle</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeRooms}/8</div>
          <p className="text-xs text-muted-foreground mb-3">
            Aktive Säle (Ø {metrics.averageOpsPerRoom} OPs/Saal)
          </p>
          
          {/* Room Grid */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {Array.from({ length: 8 }, (_, i) => {
              const saalNumber = i + 1;
              const room = roomUtilization.find(r => r.name === `SAAL ${saalNumber}`);
              const operationCount = room?.operationCount || 0;
              const isActive = operationCount > 0;
              
              return (
                <div
                  key={saalNumber}
                  className={cn(
                    "aspect-square rounded text-xs flex flex-col items-center justify-center border",
                    isActive 
                      ? "bg-green-100 border-green-300 text-green-800" 
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  )}
                  title={`SAAL ${saalNumber}: ${operationCount} Operationen`}
                >
                  <div className="font-medium">{saalNumber}</div>
                  <div className="text-xs">{operationCount}</div>
                </div>
              );
            })}
          </div>
          
          {/* Time Distribution */}
          {timeDistribution && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Vormittag (7-12h)</span>
                <Badge variant="outline" className="text-xs">
                  {timeDistribution.morning}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Nachmittag (12-17h)</span>
                <Badge variant="outline" className="text-xs">
                  {timeDistribution.afternoon}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Critical Alerts Card */}
      <Card className={criticalAlertsCount > 0 ? "border-red-500 dark:border-red-400 bg-red-500/5" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <AlertTriangle className={cn(
            "h-4 w-4", 
            criticalAlertsCount > 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{criticalAlertsCount}</div>
          <p className="text-xs text-muted-foreground mb-3">
            Kritische Meldungen
          </p>
          
          <div className="space-y-2">
            {/* Import Status */}
            {importedOperationsCount && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <FileCheck className="h-3 w-3 text-green-500" />
                  CSV Import
                </span>
                <Badge variant="outline" className="text-xs bg-green-50">
                  {importedOperationsCount} OPs
                </Badge>
              </div>
            )}
            
            {/* AI Learning */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <BrainCircuit className="h-3 w-3 text-blue-500" />
                KI Anpassungen
              </span>
              <Badge variant="outline" className="text-xs">
                {juliaModificationsCount}
              </Badge>
            </div>
            
            {/* Surgeon Count */}
            {totalSurgeons && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3 text-purple-500" />
                  Operateure
                </span>
                <Badge variant="outline" className="text-xs">
                  {totalSurgeons}
                </Badge>
              </div>
            )}
            
            {criticalAlertsCount > 0 && (
              <>
                <Separator className="my-2" />
                <div className="text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Personalengpässe oder Konflikte erkannt
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
