// src/components/or-planner/CSVImportPanel.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import type { RealOPPlanRow, ImportedOperation } from '@/lib/real-op-plan-types';
import { transformRealOPData } from '@/lib/real-op-plan-transformer';

interface CSVImportPanelProps {
  onImportSuccess: (operations: ImportedOperation[]) => void;
  isDisabled?: boolean;
}

export const CSVImportPanel: React.FC<CSVImportPanelProps> = ({
  onImportSuccess,
  isDisabled = false
}) => {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    total: number;
    successful: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Falsches Dateiformat",
        description: "Bitte laden Sie eine CSV-Datei hoch.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 200);

      // Read and parse CSV
      const csvText = await file.text();
      
      const parseResult = Papa.parse<RealOPPlanRow>(csvText, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        dynamicTyping: false, // Keep as strings for better control
        encoding: 'utf-8'
      });

      clearInterval(progressInterval);
      setImportProgress(95);

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      // Transform data
      const operations: ImportedOperation[] = [];
      const errors: string[] = [];

      parseResult.data.forEach((row, index) => {
        try {
          if (row.Zeit && row['OP-Saal'] && row.Eingriff) {
            const operation = transformRealOPData(row, index);
            operations.push(operation);
          }
        } catch (error: any) {
          errors.push(`Row ${index + 1}: ${error.message}`);
        }
      });

      setImportProgress(100);
      
      const results = {
        total: parseResult.data.length,
        successful: operations.length,
        errors
      };
      
      setImportResults(results);

      if (operations.length > 0) {
        onImportSuccess(operations);
        toast({
          title: "CSV Import erfolgreich",
          description: `${operations.length} Operationen importiert. ${errors.length} Fehler.`,
        });
      } else {
        toast({
          title: "Import-Fehler",
          description: "Keine gültigen Operationen gefunden.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('CSV import error:', error);
      toast({
        title: "Import-Fehler",
        description: error.message || "Fehler beim Lesen der CSV-Datei.",
        variant: "destructive"
      });
      setImportResults({
        total: 0,
        successful: 0,
        errors: [error.message || "Unbekannter Fehler"]
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [onImportSuccess, toast]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-headline">OP-Plan CSV Import</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Importieren Sie einen realen OP-Plan aus dem KIS
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Upload Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing || isDisabled}
              className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
            />
            <Button 
              variant="outline" 
              disabled={importing || isDisabled}
              onClick={() => document.querySelector('input[type="file"]')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              CSV auswählen
            </Button>
          </div>
          
          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Importiere OP-Plan... {importProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{importResults.total}</div>
                <div className="text-xs text-blue-600">CSV Zeilen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{importResults.successful}</div>
                <div className="text-xs text-green-600">Erfolgreich</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700">{importResults.errors.length}</div>
                <div className="text-xs text-red-600">Fehler</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Import-Fehler:</div>
                  <ul className="mt-1 text-xs space-y-1">
                    {importResults.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li>• ... und {importResults.errors.length - 5} weitere</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResults.successful > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Import erfolgreich! {importResults.successful} Operationen wurden importiert und können jetzt mit KI-Personal geplant werden.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Expected Format Guide */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="font-medium text-blue-800">Erwartetes CSV-Format:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Trennzeichen:</strong> Semikolon (;)</li>
            <li><strong>Erforderlich:</strong> Zeit, OP-Saal, Eingriff, OP-Orgaeinheit</li>
            <li><strong>Beispiel:</strong> 07:30;SAAL 1;Cholezystektomie;ACH</li>
          </ul>
        </div>

        {isDisabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              CSV-Import ist während der laufenden Planung deaktiviert. Bitte finalisieren Sie den aktuellen Plan.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
