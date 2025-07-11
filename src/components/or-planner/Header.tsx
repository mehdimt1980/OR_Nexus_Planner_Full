"use client";
import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  CalendarDays, 
  Clock, 
  Upload, 
  Database, 
  PlayCircle,
  FileText,
  Users,
  AlertCircle
} from 'lucide-react'; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DataMode = 'demo' | 'imported';

type HeaderProps = {
  dataMode: DataMode;
  importedDataInfo?: {
    fileName: string;
    operationCount: number;
    importDate: string;
  } | null;
  onShowImport: () => void;
  currentDate: string;
};

const Header: React.FC<HeaderProps> = ({ 
  dataMode, 
  importedDataInfo, 
  onShowImport, 
  currentDate 
}) => {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [currentSystemDate, setCurrentSystemDate] = useState<string | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
      setCurrentSystemDate(now.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }));
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format planning date for display
  const formatPlanningDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('de-DE', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // User data - in a real app, this would come from auth/context
  const user = {
    name: "Julia Woogk",
    initials: "JW",
    role: "OP-Pflege Leitung",
    department: "OP-Management"
  };

  // Data source indicators
  const getDataSourceConfig = () => {
    if (dataMode === 'imported') {
      return {
        icon: Database,
        label: 'Echte Daten',
        color: 'bg-green-500 text-white',
        description: 'Daten aus dem Krankenhausinformationssystem'
      };
    }
    return {
      icon: PlayCircle,
      label: 'Demo-Modus',
      color: 'bg-blue-500 text-white',
      description: 'Demonstrationsdaten für Tests und Schulungen'
    };
  };

  const dataSourceConfig = getDataSourceConfig();
  const DataSourceIcon = dataSourceConfig.icon;

  return (
    <header className="bg-card text-card-foreground p-3 sm:p-4 shadow-md sticky top-0 z-50 border-b">
      <div className="container mx-auto">
        {/* Main Header Row */}
        <div className="flex justify-between items-center mb-2">
          {/* Left Section - Logo and Title */}
          <div className="flex items-center space-x-3">
            <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl font-headline font-semibold text-primary">
                Nexus OR Planner
              </h1>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Klinikum Gütersloh - Intelligente OP-Planung
              </span>
            </div>
          </div>
          
          {/* Right Section - User and Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Data Source Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${dataSourceConfig.color} flex items-center space-x-1`}>
                      <DataSourceIcon className="h-3 w-3" />
                      <span className="text-xs">{dataSourceConfig.label}</span>
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{dataSourceConfig.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Import Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onShowImport}
              className="hidden sm:flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>CSV Import</span>
            </Button>

            {/* Mobile Import Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onShowImport}
              className="sm:hidden"
            >
              <Upload className="h-4 w-4" />
            </Button>

            {/* User Profile */}
            <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-border">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-xs">
                <span className="font-semibold text-card-foreground">{user.name}</span>
                <span className="text-muted-foreground">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Info Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 text-xs sm:text-sm">
          {/* Left Section - Date and Time Info */}
          <div className="flex flex-wrap items-center gap-4">
            {/* System Date/Time */}
            <div className="flex items-center space-x-1.5 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="font-medium text-foreground/90">
                {currentSystemDate || 'Lade...'}
              </span>
            </div>
            
            <div className="flex items-center space-x-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium text-foreground/90">
                {currentTime || '00:00:00'}
              </span>
            </div>

            {/* Planning Date (if different from system date) */}
            {currentDate && currentDate !== new Date().toISOString().split('T')[0] && (
              <div className="flex items-center space-x-1.5">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <CalendarDays className="h-3 w-3" />
                  <span>Plan: {formatPlanningDate(currentDate)}</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Right Section - Import Info */}
          {importedDataInfo && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-32" title={importedDataInfo.fileName}>
                  {importedDataInfo.fileName}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{importedDataInfo.operationCount} OPs</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Database className="h-3 w-3" />
                <span>Importiert: {formatPlanningDate(importedDataInfo.importDate)}</span>
              </div>
            </div>
          )}

          {/* Demo Mode Indicator */}
          {dataMode === 'demo' && !importedDataInfo && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <PlayCircle className="h-3 w-3" />
              <span>Demonstrationsmodus aktiv</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
