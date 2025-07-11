"use client";
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Eye,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Activity
} from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import type { 
  HospitalCSVRow, 
  OperationAssignment, 
  OperationComplexity,
  Department,
  OperatingRoomName 
} from '@/lib/or-planner-types';
import { 
  OPERATING_ROOMS, 
  DEPARTMENTS,
  CSV_STATUS_MAPPING 
} from '@/lib/or-planner-types';
import { 
  validateCSVStructure, 
  validateCompleteImport,
  type ValidationError,
  type ConflictDetails
} from '@/lib/csv-validation';
import { 
  transformCSVToOperations,
  validateTransformationResult,
  type TransformationProgress 
} from '@/lib/csv-transformer';

interface CSVImportPanelProps {
  onImport: (operations: OperationAssignment[], csvData: any[]) => void;
  currentDate?: string;
}

const CSVImportPanel: React.FC<CSVImportPanelProps> = ({ 
  onImport, 
  currentDate = new Date().toISOString().split('T')[0] 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [transformationResult, setTransformationResult] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [transformationProgress, setTransformationProgress] = useState<TransformationProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection with comprehensive validation
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte wählen Sie eine CSV-Datei aus.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setFileName(file.name);
    setTransformationProgress(null);
    
    Papa.parse(file, {
      header: true,
      delimiter: ';', // German CSV format
      encoding: 'UTF-8',
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Clean up headers
        return header.trim().replace(/^\uFEFF/, ''); // Remove BOM
      },
      transform: (value: string, header: string) => {
        // Clean up values
        if (!value) return '';
        return String(value).trim();
      },
      complete: async (results) => {
        try {
          console.log('Raw CSV data:', results.data.slice(0, 3));
          
          // STEP 1: Filter out invalid rows
          const validRows = (results.data as any[]).filter((row, index) => {
            // Skip completely empty rows
            if (!row || Object.keys(row).length === 0) {
              console.log(`Skipping empty row ${index + 1}`);
              return false;
            }
            
            // Skip rows where all important values are empty
            const hasRequiredData = row.Datum && row.Zeit && row.Eingriff && row['OP-Orgaeinheit'] && row['OP-Saal'];
            if (!hasRequiredData) {
              console.log(`Skipping incomplete row ${index + 1}:`, {
                Datum: row.Datum,
                Zeit: row.Zeit,
                Eingriff: row.Eingriff,
                'OP-Orgaeinheit': row['OP-Orgaeinheit'],
                'OP-Saal': row['OP-Saal']
              });
              return false;
            }
            
            // Skip header repetitions
            if (row.Datum === 'Datum' || row.Zeit === 'Zeit') {
              console.log(`Skipping header repetition at row ${index + 1}`);
              return false;
            }
            
            return true;
          });
          
          console.log(`Filtered: ${results.data.length} → ${validRows.length} valid rows`);
          
          if (validRows.length === 0) {
            setIsLoading(false);
            toast({
              title: "Keine gültigen Daten",
              description: "Die CSV-Datei enthält keine gültigen Operationsdaten. Überprüfen Sie, ob alle Pflichtfelder ausgefüllt sind.",
              variant: "destructive"
            });
            return;
          }
          
          // STEP 2: Enhanced validation with detailed error reporting
          setTransformationProgress({
            currentRow: 0,
            totalRows: validRows.length,
            phase: 'validating',
            message: 'Validiere gefilterte Daten...'
          });
          
          const structureValidation = validateCSVStructure(validRows);
          
          if (!structureValidation.isValid) {
            setIsLoading(false);
            const firstError = structureValidation.errors[0];
            
            // Provide more helpful error messages
            let helpfulMessage = firstError?.messageDE || "Unbekannter Validierungsfehler";
            
            if (firstError?.code === 'EMPTY_REQUIRED_FIELD') {
              helpfulMessage += "\n\nHilfe: Stellen Sie sicher, dass alle Zeilen folgende Felder haben:\n" +
                "• Datum (DD.MM.YYYY)\n" +
                "• Zeit (HH:MM)\n" +
                "• Eingriff (Operationsname)\n" +
                "• OP-Orgaeinheit (UCH, ACH, GYN, URO, GCH, PCH)\n" +
                "• OP-Saal (SAAL 1, SAAL 2, etc.)";
            }
            
            toast({
              title: "CSV-Validierung fehlgeschlagen",
              description: helpfulMessage,
              variant: "destructive"
            });
            return;
          }
          
          // STEP 3: Transform to operations
          setTransformationProgress({
            currentRow: 0,
            totalRows: validRows.length,
            phase: 'transforming',
            message: 'Konvertiere zu Operationsdaten...'
          });
          
          const transformResult = transformCSVToOperations(validRows, (progress) => {
            setTransformationProgress(progress);
          });
          
          // STEP 4: Final validation
          const transformValidation = validateTransformationResult(transformResult);
          
          if (!transformValidation.isValid) {
            setIsLoading(false);
            toast({
              title: "Transformation fehlgeschlagen",
              description: transformValidation.summary,
              variant: "destructive"
            });
            return;
          }
          
          // STEP 5: Success!
          setTransformationResult(transformResult);
          setValidationResult({
            structureValidation,
            operationValidation: [],
            timeConflicts: [],
            roomValidation: [],
            overallValid: true
          });
          setShowPreview(true);
          setIsLoading(false);
          
          // Show success message with warnings if any
          const warningCount = structureValidation.warnings.length + transformResult.warnings.length;
          
          toast({
            title: "CSV erfolgreich verarbeitet",
            description: `${transformResult.operations.length} Operationen gefunden${warningCount > 0 ? ` (${warningCount} Warnungen)` : ''}`,
            className: "bg-green-600 text-white"
          });
          
          if (warningCount > 0) {
            setTimeout(() => {
              toast({
                title: `${warningCount} Warnungen beim Import`,
                description: "Überprüfen Sie die Vorschau auf mögliche Probleme.",
                variant: "default"
              });
            }, 2000);
          }
          
        } catch (error) {
          setIsLoading(false);
          console.error('CSV processing error:', error);
          toast({
            title: "Verarbeitungsfehler",
            description: `Ein unerwarteter Fehler ist aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
            variant: "destructive"
          });
        }
      },
      error: (error) => {
        setIsLoading(false);
        toast({
          title: "CSV-Fehler",
          description: `Fehler beim Lesen der CSV-Datei: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  }, [toast]);
  
  // Also add this helper function to show users what valid data looks like:
  const showCSVFormatHelp = () => {
    const exampleCSV = `Datum;Zeit;Eingriff;OP-Orgaeinheit;OP-Saal;1.Operateur;OP-Status;Anmerkung
  10.07.2025;07:30;Hüft-TEP links;UCH;SAAL 1;Dr. Weber;OP geplant;Pat. nüchtern
  10.07.2025;09:00;Cholezystektomie;ACH;SAAL 2;Dr. Schmidt;OP geplant;Laparoskopisch
  10.07.2025;10:30;Sectio caesarea;GYN;SAAL 3;Dr. Lange;OP geplant;Notfall`;
    
    console.log('Example CSV format:');
    console.log(exampleCSV);
    
    return exampleCSV;
  };
  
  // Add this button to your UI to help users understand the format:
  <Button
    variant="outline"
    onClick={() => {
      const example = showCSVFormatHelp();
      const blob = new Blob([example], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'beispiel-op-plan.csv';
      link.click();
      
      toast({
        title: "Beispiel-CSV heruntergeladen",
        description: "Verwenden Sie diese Datei als Vorlage für Ihre Daten.",
      });
    }}
  >
    📋 Beispiel-CSV herunterladen
  </Button>

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Import confirmed operations with enhanced validation
  const handleConfirmImport = useCallback(() => {
    if (!validationResult || !transformationResult) {
      toast({
        title: "Import nicht möglich",
        description: "Keine validierten Daten zum Importieren verfügbar.",
        variant: "destructive"
      });
      return;
    }

    const hasErrors = validationResult.structureValidation.errors.length > 0 ||
                     transformationResult.errors.length > 0 ||
                     validationResult.timeConflicts.some((c: ConflictDetails) => c.severity === 'high');

    if (hasErrors) {
      const continueImport = window.confirm(
        "Es wurden Fehler oder kritische Konflikte gefunden. Möchten Sie trotzdem importieren? " +
        "Dies könnte zu Problemen im Operationsplan führen."
      );
      
      if (!continueImport) {
        return;
      }
    }

    // Pass both operations and original CSV data for comprehensive validation
    onImport(transformationResult.operations, csvData);
    
    // Reset state
    handleReset();
  }, [validationResult, transformationResult, csvData, onImport, toast]);

  // Reset component state
  const handleReset = useCallback(() => {
    setCsvData([]);
    setTransformationResult(null);
    setValidationResult(null);
    setShowPreview(false);
    setFileName('');
    setIsLoading(false);
    setTransformationProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getComplexityColor = (complexity: OperationComplexity) => {
    switch (complexity) {
      case 'Sehr Hoch': return 'bg-red-500 text-white';
      case 'Hoch': return 'bg-orange-500 text-white';
      case 'Mittel': return 'bg-yellow-500 text-black';
      case 'Niedrig': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-6 w-6" />
          <span>OP-Plan CSV Import</span>
        </CardTitle>
        <CardDescription>
          Importieren Sie Operationspläne aus dem Krankenhausinformationssystem (CSV-Format mit Semikolon-Trennung)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!showPreview ? (
          // Upload Section
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-spin mx-auto h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
                  <p className="text-muted-foreground">CSV wird verarbeitet...</p>
                  <Progress value={33} className="w-full max-w-xs mx-auto" />
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">CSV-Datei hier ablegen</p>
                    <p className="text-muted-foreground">
                      oder klicken Sie zum Auswählen einer Datei
                    </p>
                  </div>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mx-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Datei auswählen
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erwartetes CSV-Format:</strong> Semikolon-getrennt mit Spalten: 
                Datum, Zeit, Eingriff, OP-Orgaeinheit, OP-Saal, 1.Operateur, OP-Status, Anmerkung
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          // Preview Section
          <div className="space-y-6">
            {/* File Info and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedOperations.length} Einträge gefunden
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleReset}>
                  <X className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  disabled={!validationResult?.isValid}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import bestätigen
                </Button>
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && transformationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{transformationResult.statistics.totalRows}</p>
                        <p className="text-sm text-muted-foreground">CSV Zeilen</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{transformationResult.operations.length}</p>
                        <p className="text-sm text-muted-foreground">Operationen</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold text-orange-600">
                          {transformationResult.warnings.length + validationResult.structureValidation.warnings.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Warnungen</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {transformationResult.errors.length + validationResult.timeConflicts.filter((c: ConflictDetails) => c.severity === 'high').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Kritische Fehler</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Critical Errors */}
                {(transformationResult.errors.length > 0 || validationResult.timeConflicts.some((c: ConflictDetails) => c.severity === 'high')) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Kritische Fehler gefunden:</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {transformationResult.errors.slice(0, 3).map((error: ValidationError, index: number) => (
                          <li key={index} className="text-sm">
                            {error.rowIndex !== undefined ? `Zeile ${error.rowIndex + 1}: ` : ''}{error.messageDE}
                          </li>
                        ))}
                        {validationResult.timeConflicts
                          .filter((c: ConflictDetails) => c.severity === 'high')
                          .slice(0, 2)
                          .map((conflict: ConflictDetails, index: number) => (
                            <li key={`conflict-${index}`} className="text-sm">
                              Zeitkonflikt in {conflict.room} um {conflict.timeSlot}: {conflict.conflictingOperations.length} Operationen
                            </li>
                          ))}
                      </ul>
                      {(transformationResult.errors.length + validationResult.timeConflicts.filter((c: ConflictDetails) => c.severity === 'high').length) > 5 && (
                        <p className="mt-2 text-sm">...und weitere Fehler</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {(transformationResult.warnings.length > 0 || validationResult.structureValidation.warnings.length > 0) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warnungen:</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {transformationResult.warnings.slice(0, 3).map((warning: ValidationError, index: number) => (
                          <li key={index} className="text-sm">
                            {warning.rowIndex !== undefined ? `Zeile ${warning.rowIndex + 1}: ` : ''}{warning.messageDE}
                          </li>
                        ))}
                        {validationResult.structureValidation.warnings.slice(0, 2).map((warning: ValidationError, index: number) => (
                          <li key={`struct-${index}`} className="text-sm">{warning.messageDE}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Time Conflicts */}
                {validationResult.timeConflicts.length > 0 && (
                  <Alert variant={validationResult.timeConflicts.some((c: ConflictDetails) => c.severity === 'high') ? "destructive" : "default"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Zeitkonflikte gefunden ({validationResult.timeConflicts.length}):</strong>
                      <div className="mt-2 space-y-1">
                        {validationResult.timeConflicts.slice(0, 3).map((conflict: ConflictDetails, index: number) => (
                          <div key={index} className="text-sm">
                            <span className={`font-medium ${conflict.severity === 'high' ? 'text-red-600' : conflict.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'}`}>
                              {conflict.severity === 'high' ? '🔴' : conflict.severity === 'medium' ? '🟡' : '🟢'}
                            </span>
                            {' '}
                            {conflict.room} um {conflict.timeSlot}: {conflict.conflictingOperations.length} Operationen
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Separator />

            {/* Operations Preview */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Operationen-Vorschau</h3>
              </div>
              
              <ScrollArea className="h-96 w-full border rounded-md">
                <div className="p-4 space-y-2">
                  {parsedOperations.map((operation, index) => (
                    <Card 
                      key={index} 
                      className={`p-4 ${operation.validationErrors.length > 0 ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{operation.scheduledDate}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{operation.scheduledTime}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{operation.room}</span>
                          <Badge variant="outline" className="text-xs">
                            {operation.department}
                          </Badge>
                        </div>
                        
                        <div className="col-span-2">
                          <p className="font-semibold text-sm truncate" title={operation.procedureName}>
                            {operation.procedureName}
                          </p>
                          {operation.primarySurgeon && (
                            <div className="flex items-center space-x-1 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {operation.primarySurgeon}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <Badge className={`text-xs ${getComplexityColor(operation.complexity!)}`}>
                            {operation.complexity}
                          </Badge>
                          {operation.validationErrors.length > 0 && (
                            <div className="space-y-1">
                              {operation.validationErrors.map((error, errorIndex) => (
                                <Badge key={errorIndex} variant="destructive" className="text-xs">
                                  {error}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVImportPanel;
