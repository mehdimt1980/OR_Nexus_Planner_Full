"use client";
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Upload, 
  Database, 
  PlayCircle, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  FileText,
  Calendar,
  Clock,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { OperationAssignment, Department, OperatingRoomName } from '@/lib/or-planner-types';
import { generateDemoCSV } from '@/lib/demo-data-generator';
import { format } from 'date-fns';

/**
 * Statistics about imported data
 */
export interface DataSourceStatistics {
  operationCount: number;
  departmentBreakdown: Record<Department, number>;
  roomUtilization: Record<OperatingRoomName, number>;
  timeRange: {
    earliest: string;
    latest: string;
    totalHours: number;
  };
  complexityDistribution: Record<string, number>;
  staffingStatus: {
    assigned: number;
    pending: number;
    approved: number;
    modified: number;
  };
  qualityScore: number; // 0-100
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    count: number;
  }>;
}

/**
 * Information about the current data source
 */
export interface DataSourceInfo {
  type: 'demo' | 'imported' | 'mixed';
  fileName?: string;
  importDate?: string;
  lastModified?: string;
  version?: string;
  statistics: DataSourceStatistics;
  hasBackup: boolean;
  canExport: boolean;
}

interface DataSourcePanelProps {
  dataSourceInfo: DataSourceInfo;
  onImportCSV: () => void;
  onExportCSV: () => void;
  onClearData: () => void;
  onGenerateDemo: () => void;
  onRestoreBackup?: () => void;
  isLoading?: boolean;
}

/**
 * DataSourcePanel - Comprehensive control panel for data source management
 * 
 * Features:
 * - Current data source visualization
 * - Import/export functionality
 * - Data quality indicators
 * - Statistics and analytics
 * - Plan management tools
 */
const DataSourcePanel: React.FC<DataSourcePanelProps> = ({
  dataSourceInfo,
  onImportCSV,
  onExportCSV,
  onClearData,
  onGenerateDemo,
  onRestoreBackup,
  isLoading = false
}) => {
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const { toast } = useToast();

  const handleGenerateDemoData = useCallback(async () => {
    try {
      const demoCSV = generateDemoCSV();
      const blob = new Blob([demoCSV], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `demo-or-plan-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast({
        title: "Demo-CSV generiert",
        description: "Demo-Daten wurden als CSV-Datei heruntergeladen.",
        className: "bg-blue-600 text-white"
      });
    } catch (error) {
      toast({
        title: "Fehler beim Generieren",
        description: `Demo-CSV konnte nicht erstellt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleClearWithConfirmation = useCallback(() => {
    if (dataSourceInfo.type !== 'demo') {
      const confirmed = window.confirm(
        "Sind Sie sicher, dass Sie alle importierten Daten löschen möchten? " +
        "Diese Aktion kann nicht rückgängig gemacht werden."
      );
      if (!confirmed) return;
    }
    onClearData();
  }, [dataSourceInfo.type, onClearData]);

  const getDataSourceIcon = () => {
    switch (dataSourceInfo.type) {
      case 'imported': return Database;
      case 'demo': return PlayCircle;
      case 'mixed': return RefreshCw;
      default: return FileText;
    }
  };

  const getDataSourceColor = () => {
    switch (dataSourceInfo.type) {
      case 'imported': return 'bg-green-500';
      case 'demo': return 'bg-blue-500';
      case 'mixed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreLabel = (score: number) => {
    if (score >= 90) return 'Exzellent';
    if (score >= 70) return 'Gut';
    if (score >= 50) return 'Akzeptabel';
    return 'Verbesserung erforderlich';
  };

  const DataSourceIcon = getDataSourceIcon();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getDataSourceColor()} text-white`}>
              <DataSourceIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Datenquelle Verwaltung</CardTitle>
              <CardDescription>
                {dataSourceInfo.type === 'demo' && 'Demo-Modus aktiv'}
                {dataSourceInfo.type === 'imported' && `CSV-Import: ${dataSourceInfo.fileName || 'Unbekannt'}`}
                {dataSourceInfo.type === 'mixed' && 'Gemischte Datenquellen'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={dataSourceInfo.type === 'imported' ? 'default' : 'outline'}>
            {dataSourceInfo.statistics.operationCount} Operationen
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Data Source Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Zeitraum</p>
                <p className="text-xs text-muted-foreground">
                  {dataSourceInfo.statistics.timeRange.earliest} - {dataSourceInfo.statistics.timeRange.latest}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dataSourceInfo.statistics.timeRange.totalHours}h Gesamtzeit
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Abteilungen</p>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(dataSourceInfo.statistics.departmentBreakdown).length} aktive Bereiche
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(dataSourceInfo.statistics.departmentBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([dept, count]) => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Datenqualität</p>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${getQualityScoreColor(dataSourceInfo.statistics.qualityScore)}`}>
                    {dataSourceInfo.statistics.qualityScore}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getQualityScoreLabel(dataSourceInfo.statistics.qualityScore)}
                  </span>
                </div>
                <Progress 
                  value={dataSourceInfo.statistics.qualityScore} 
                  className="mt-1 h-2"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Staffing Status */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Personal-Zuweisung Status
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{dataSourceInfo.statistics.staffingStatus.assigned}</p>
              <p className="text-xs text-muted-foreground">Zugewiesen</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{dataSourceInfo.statistics.staffingStatus.pending}</p>
              <p className="text-xs text-muted-foreground">Ausstehend</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{dataSourceInfo.statistics.staffingStatus.approved}</p>
              <p className="text-xs text-muted-foreground">Genehmigt</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{dataSourceInfo.statistics.staffingStatus.modified}</p>
              <p className="text-xs text-muted-foreground">Geändert</p>
            </div>
          </div>
        </div>

        {/* Issues and Warnings */}
        {dataSourceInfo.statistics.issues.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
              Datenqualität Hinweise
            </h4>
            <ScrollArea className="h-24">
              <div className="space-y-2">
                {dataSourceInfo.statistics.issues.map((issue, index) => (
                  <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                    <div className="flex items-center space-x-2">
                      {issue.type === 'error' && <AlertCircle className="h-4 w-4" />}
                      {issue.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                      {issue.type === 'info' && <Info className="h-4 w-4" />}
                      <AlertDescription className="flex-1">
                        {issue.message}
                        {issue.count > 1 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {issue.count}x
                          </Badge>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Detailed Statistics Toggle */}
        <div>
          <Button
            variant="outline"
            onClick={() => setShowDetailedStats(!showDetailedStats)}
            className="w-full justify-between"
          >
            <span className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Detaillierte Statistiken
            </span>
            <span className="text-xs">
              {showDetailedStats ? 'Ausblenden' : 'Anzeigen'}
            </span>
          </Button>

          {showDetailedStats && (
            <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
              {/* Complexity Distribution */}
              <div>
                <h5 className="text-sm font-medium mb-2">Komplexitätsverteilung</h5>
                <div className="space-y-1">
                  {Object.entries(dataSourceInfo.statistics.complexityDistribution).map(([complexity, count]) => (
                    <div key={complexity} className="flex justify-between items-center">
                      <span className="text-xs">{complexity}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(count / dataSourceInfo.statistics.operationCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Utilization */}
              <div>
                <h5 className="text-sm font-medium mb-2">Saal-Auslastung</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dataSourceInfo.statistics.roomUtilization).map(([room, utilization]) => (
                    <div key={room} className="text-xs flex justify-between">
                      <span>{room}</span>
                      <span className={utilization > 80 ? 'text-red-600' : utilization > 60 ? 'text-yellow-600' : 'text-green-600'}>
                        {utilization}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={onImportCSV}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>CSV Import</span>
          </Button>

          <Button
            variant="outline"
            onClick={onExportCSV}
            disabled={isLoading || !dataSourceInfo.canExport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerateDemoData}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Demo CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleClearWithConfirmation}
            disabled={isLoading}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Zurücksetzen</span>
          </Button>
        </div>

        {/* Backup Restore Button */}
        {dataSourceInfo.hasBackup && onRestoreBackup && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={onRestoreBackup}
              disabled={isLoading}
              className="w-full flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Backup wiederherstellen</span>
            </Button>
          </div>
        )}

        {/* Metadata */}
        {(dataSourceInfo.importDate || dataSourceInfo.lastModified) && (
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              {dataSourceInfo.importDate && (
                <div>Importiert: {dataSourceInfo.importDate}</div>
              )}
              {dataSourceInfo.lastModified && (
                <div>Zuletzt geändert: {dataSourceInfo.lastModified}</div>
              )}
              {dataSourceInfo.version && (
                <div>Version: {dataSourceInfo.version}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataSourcePanel;
