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

interface ParsedOperation extends OperationAssignment {
  validationErrors: string[];
  csvRowIndex: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  duplicateTimeSlots: Array<{
    room: string;
    date: string;
    time: string;
    operations: ParsedOperation[];
  }>;
  totalOperations: number;
  validOperations: number;
}

interface CSVImportPanelProps {
  onImport: (operations: OperationAssignment[]) => void;
  currentDate?: string;
}

const CSVImportPanel: React.FC<CSVImportPanelProps> = ({ 
  onImport, 
  currentDate = new Date().toISOString().split('T')[0] 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<HospitalCSVRow[]>([]);
  const [parsedOperations, setParsedOperations] = useState<ParsedOperation[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Complexity inference based on German procedure names
  const inferComplexity = useCallback((procedureName: string): OperationComplexity => {
    const name = procedureName.toLowerCase();
    
    // Sehr Hoch
    if (name.includes('osteosynthese') || 
        name.includes('instrumentierung') || 
        name.includes('thyreoidektomie')) {
      return 'Sehr Hoch';
    }
    
    // Hoch
    if (name.includes('cholezystektomie') || 
        name.includes('hernie') || 
        name.includes('mamma') || 
        name.includes('nephrolithopaxie')) {
      return 'Hoch';
    }
    
    // Mittel
    if (name.includes('exzision') || 
        name.includes('lappenplastik') || 
        name.includes('metallentfernung')) {
      return 'Mittel';
    }
    
    // Niedrig
    if (name.includes('bet') || 
        name.includes('tumor kopf')) {
      return 'Niedrig';
    }
    
    return 'Mittel'; // Default
  }, []);

  // Map time to shift for backward compatibility
  const mapTimeToShift = useCallback((time: string): 'BD1' | 'BD2' | 'BD3' | 'RD' => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return 'BD1';
    if (hour >= 12 && hour < 16) return 'BD2';  
    if (hour >= 16 && hour < 20) return 'BD3';
    return 'RD';
  }, []);

  // Validate CSV row and convert to operation
  const parseCSVRowToOperation = useCallback((row: HospitalCSVRow, index: number): ParsedOperation => {
    const errors: string[] = [];
    
    // Validate required fields
    if (!row.Datum) errors.push('Datum fehlt');
    if (!row.Zeit) errors.push('Zeit fehlt');
    if (!row.Eingriff) errors.push('Eingriff fehlt');
    if (!row['OP-Orgaeinheit']) errors.push('OP-Orgaeinheit fehlt');
    if (!row['OP-Saal']) errors.push('OP-Saal fehlt');
    
    // Validate and normalize room name
    let room: OperatingRoomName | null = null;
    if (row['OP-Saal']) {
      const roomMatch = row['OP-Saal'].match(/SAAL (\d+)/i);
      if (roomMatch) {
        const roomCandidate = `SAAL ${roomMatch[1]}` as OperatingRoomName;
        if (OPERATING_ROOMS.includes(roomCandidate)) {
          room = roomCandidate;
        } else {
          errors.push(`Unbekannter Saal: ${row['OP-Saal']}`);
        }
      } else {
        errors.push(`Ungültiges Saal-Format: ${row['OP-Saal']}`);
      }
    }
    
    // Validate department
    const department = row['OP-Orgaeinheit'] as Department;
    if (department && !DEPARTMENTS.includes(department)) {
      errors.push(`Unbekannte Orgaeinheit: ${department}`);
    }
    
    // Validate time format
    if (row.Zeit && !/^\d{2}:\d{2}$/.test(row.Zeit)) {
      errors.push(`Ungültiges Zeitformat: ${row.Zeit} (erwartet: HH:MM)`);
    }
    
    // Validate date format
    if (row.Datum) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\.\d{2}\.\d{4}$/;
      if (!dateRegex.test(row.Datum)) {
        errors.push(`Ungültiges Datumsformat: ${row.Datum} (erwartet: YYYY-MM-DD oder DD.MM.YYYY)`);
      }
    }
    
    // Normalize date format (DD.MM.YYYY to YYYY-MM-DD)
    let normalizedDate = row.Datum;
    if (row.Datum && row.Datum.includes('.')) {
      const parts = row.Datum.split('.');
      if (parts.length === 3) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    
    // Determine complexity
    const complexity = inferComplexity(row.Eingriff || '');
    
    // Map CSV status to internal status
    const status = CSV_STATUS_MAPPING[row['OP-Status']] || 'planned';
    
    const operation: ParsedOperation = {
      id: `${room}-${normalizedDate}-${row.Zeit}-${index}`,
      room: room || 'SAAL 1', // fallback
      department,
      scheduledDate: normalizedDate || '',
      scheduledTime: row.Zeit || '',
      procedureName: row.Eingriff || '',
      primarySurgeon: row['1.Operateur'] || '',
      complexity,
      estimatedDuration: 90, // default duration
      assignedStaff: [],
      gptSuggestedStaff: [],
      status,
      notes: row.Anmerkung,
      shift: mapTimeToShift(row.Zeit || '07:00'),
      validationErrors: errors,
      csvRowIndex: index
    };
    
    return operation;
  }, [inferComplexity, mapTimeToShift]);

  // Validate all operations and check for conflicts
  const validateOperations = useCallback((operations: ParsedOperation[]): ValidationResult => {
    const validOperations = operations.filter(op => op.validationErrors.length === 0);
    const errors: string[] = [];
    
    // Check for duplicate time slots in same room
    const timeSlotMap = new Map<string, ParsedOperation[]>();
    
    validOperations.forEach(op => {
      const key = `${op.room}-${op.scheduledDate}-${op.scheduledTime}`;
      if (!timeSlotMap.has(key)) {
        timeSlotMap.set(key, []);
      }
      timeSlotMap.get(key)!.push(op);
    });
    
    const duplicateTimeSlots = Array.from(timeSlotMap.entries())
      .filter(([, ops]) => ops.length > 1)
      .map(([key, ops]) => {
        const [room, date, time] = key.split('-');
        return { room, date, time, operations: ops };
      });
    
    if (duplicateTimeSlots.length > 0) {
      errors.push(`${duplicateTimeSlots.length} Zeitkonflikte gefunden`);
    }
    
    // Check for missing required data
    const operationsWithErrors = operations.filter(op => op.validationErrors.length > 0);
    if (operationsWithErrors.length > 0) {
      errors.push(`${operationsWithErrors.length} Einträge mit Validierungsfehlern`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      duplicateTimeSlots,
      totalOperations: operations.length,
      validOperations: validOperations.length
    };
  }, []);

  // Handle file selection
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
    
    Papa.parse(file, {
      header: true,
      delimiter: ';', // German CSV format
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawData = results.data as HospitalCSVRow[];
          setCsvData(rawData);
          
          // Parse and validate operations
          const operations = rawData.map((row, index) => parseCSVRowToOperation(row, index));
          setParsedOperations(operations);
          
          // Validate
          const validation = validateOperations(operations);
          setValidationResult(validation);
          
          setShowPreview(true);
          setIsLoading(false);
          
          toast({
            title: "CSV erfolgreich analysiert",
            description: `${operations.length} Operationen gefunden, ${validation.validOperations} gültig`
          });
          
        } catch (error) {
          setIsLoading(false);
          toast({
            title: "Parsing-Fehler",
            description: "Die CSV-Datei konnte nicht verarbeitet werden.",
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
  }, [parseCSVRowToOperation, validateOperations, toast]);

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

  // Import confirmed operations
  const handleConfirmImport = useCallback(() => {
    if (!validationResult || !validationResult.isValid) {
      toast({
        title: "Import nicht möglich",
        description: "Bitte beheben Sie zuerst alle Validierungsfehler.",
        variant: "destructive"
      });
      return;
    }
    
    const validOperations = parsedOperations.filter(op => op.validationErrors.length === 0);
    
    // Remove validation-specific fields before import
    const cleanOperations: OperationAssignment[] = validOperations.map(op => {
      const { validationErrors, csvRowIndex, ...cleanOp } = op;
      return cleanOp;
    });
    
    onImport(cleanOperations);
    
    toast({
      title: "Import erfolgreich",
      description: `${cleanOperations.length} Operationen wurden importiert.`,
      className: "bg-green-600 text-white"
    });
    
    // Reset state
    handleReset();
  }, [validationResult, parsedOperations, onImport, toast]);

  // Reset component state
  const handleReset = useCallback(() => {
    setCsvData([]);
    setParsedOperations([]);
    setValidationResult(null);
    setShowPreview(false);
    setFileName('');
    setIsLoading(false);
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
            {validationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{validationResult.totalOperations}</p>
                        <p className="text-sm text-muted-foreground">Gesamt</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{validationResult.validOperations}</p>
                        <p className="text-sm text-muted-foreground">Gültig</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {validationResult.totalOperations - validationResult.validOperations}
                        </p>
                        <p className="text-sm text-muted-foreground">Fehler</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Validation Errors */}
                {validationResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Validierungsfehler:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Duplicate Time Slots */}
                {validationResult.duplicateTimeSlots.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Zeitkonflikte gefunden:</strong>
                      <div className="mt-2 space-y-1">
                        {validationResult.duplicateTimeSlots.map((conflict, index) => (
                          <div key={index} className="text-sm">
                            {conflict.room} am {conflict.date} um {conflict.time}: 
                            {conflict.operations.length} Operationen
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
