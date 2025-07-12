import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Button
} from '@/components/ui/button';
import {
  Progress
} from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Badge
} from '@/components/ui/badge';
import {
  ScrollArea
} from '@/components/ui/scroll-area';
import {
  Separator
} from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Download,
  Eye,
  FileCheck,
  Clock,
  Users,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { GermanHospitalCSVParser } from '@/lib/csv-parser';
import { createScheduleFromCSV } from '@/lib/or-planner-data';
import type { 
  CSVOperation, 
  CSVImportResult, 
  OperationAssignment,
  Department,
  OperatingRoomName 
} from '@/lib/or-planner-types';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (operations: OperationAssignment[]) => void;
  isLoading?: boolean;
}

type ImportState = 'idle' | 'file-selected' | 'validating' | 'importing' | 'success' | 'error';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  columnCount: number;
  expectedColumns: string[];
  foundColumns: string[];
  missingColumns: string[];
  dataPreview: string[][];
}

const EXPECTED_COLUMNS = [
  'Datum', 'Zeit', 'Eingriff', 'OP-Orgaeinheit', 'OP-Saal', '1.Operateur', 
  'Fallnummer', 'OP-Status', 'Anmerkung', 'Antibiotikaprophylaxe'
];

const REQUIRED_COLUMNS = [
  'Datum', 'Zeit', 'Eingriff', 'OP-Orgaeinheit', 'OP-Saal', '1.Operateur', 'Fallnummer'
];

export default function CSVImportModal({ 
  isOpen, 
  onClose, 
  onImportSuccess, 
  isLoading = false 
}: CSVImportModalProps) {
  const [importState, setImportState] = useState<ImportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setImportState('idle');
    setSelectedFile(null);
    setCsvContent('');
    setValidationResult(null);
    setImportResult(null);
    setImportProgress(0);
    onClose();
  }, [onClose]);

  // File validation and preview
  const validateCSVStructure = useCallback((content: string): ValidationResult => {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return {
        isValid: false,
        errors: ['CSV-Datei muss mindestens eine Kopfzeile und eine Datenzeile enthalten'],
        warnings: [],
        columnCount: 0,
        expectedColumns: EXPECTED_COLUMNS,
        foundColumns: [],
        missingColumns: EXPECTED_COLUMNS,
        dataPreview: []
      };
    }

    const headers = lines[0].split(';').map(h => h.trim());
    const missingRequired = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    const dataPreview = lines.slice(0, 6).map(line => line.split(';').map(cell => cell.trim()));

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check column count
    if (headers.length < 20) {
      errors.push(`Zu wenige Spalten gefunden (${headers.length}). Mindestens 20 erwartet.`);
    }

    // Check required columns
    if (missingRequired.length > 0) {
      errors.push(`Erforderliche Spalten fehlen: ${missingRequired.join(', ')}`);
    }

    // Check data format in preview
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const cells = lines[i].split(';');
      const dateIndex = headers.indexOf('Datum');
      const timeIndex = headers.indexOf('Zeit');
      const roomIndex = headers.indexOf('OP-Saal');
      const deptIndex = headers.indexOf('OP-Orgaeinheit');

      if (dateIndex >= 0 && cells[dateIndex]) {
        const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!datePattern.test(cells[dateIndex].trim())) {
          errors.push(`Zeile ${i + 1}: Ungültiges Datumsformat (${cells[dateIndex]})`);
        }
      }

      if (timeIndex >= 0 && cells[timeIndex]) {
        const timePattern = /^\d{1,2}:\d{2}$/;
        if (!timePattern.test(cells[timeIndex].trim())) {
          warnings.push(`Zeile ${i + 1}: Ungewöhnliches Zeitformat (${cells[timeIndex]})`);
        }
      }

      if (roomIndex >= 0 && cells[roomIndex]) {
        const validRooms = ['SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'];
        if (!validRooms.includes(cells[roomIndex].trim())) {
          warnings.push(`Zeile ${i + 1}: Unbekannter OP-Saal (${cells[roomIndex]})`);
        }
      }

      if (deptIndex >= 0 && cells[deptIndex]) {
        const validDepts = ['ACH', 'GCH', 'PCH', 'URO', 'GYN', 'UCH'];
        if (!validDepts.includes(cells[deptIndex].trim())) {
          warnings.push(`Zeile ${i + 1}: Unbekannte Abteilung (${cells[deptIndex]})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      columnCount: headers.length,
      expectedColumns: EXPECTED_COLUMNS,
      foundColumns: headers,
      missingColumns: missingRequired,
      dataPreview
    };
  }, []);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setImportState('validating');

    try {
      const content = await file.text();
      setCsvContent(content);
      
      const validation = validateCSVStructure(content);
      setValidationResult(validation);
      
      setImportState('file-selected');
    } catch (error) {
      toast.error('Fehler beim Lesen der Datei');
      setImportState('error');
    }
  }, [validateCSVStructure]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv']
    },
    maxFiles: 1,
    disabled: isLoading || importState === 'importing'
  });

  // Handle import process
  const handleImport = useCallback(async () => {
    if (!csvContent || !validationResult?.isValid) return;

    setImportState('importing');
    setImportProgress(0);

    try {
      // Simulate progress steps
      setImportProgress(20);
      
      // Parse CSV
      const parseResult = await GermanHospitalCSVParser.parseCSV(csvContent);
      setImportProgress(60);
      
      if (!parseResult.success || !parseResult.data) {
        setImportResult(parseResult);
        setImportState('error');
        return;
      }

      setImportProgress(80);

      // Convert to operation assignments
      const operationAssignments = parseResult.data.map(
        csvOp => GermanHospitalCSVParser.csvToOperationAssignment(csvOp)
      );

      setImportProgress(100);
      setImportResult(parseResult);
      setImportState('success');

      // Call success callback
      setTimeout(() => {
        onImportSuccess(operationAssignments);
        toast.success(`${operationAssignments.length} Operationen erfolgreich importiert`);
      }, 500);

    } catch (error) {
      console.error('Import error:', error);
      setImportState('error');
      toast.error('Fehler beim Importieren der Daten');
    }
  }, [csvContent, validationResult, onImportSuccess]);

  // Render validation summary
  const ValidationSummary = useMemo(() => {
    if (!validationResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {validationResult.isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <h3 className="font-semibold">
            {validationResult.isValid ? 'Validierung erfolgreich' : 'Validierungsfehler'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Spalten gefunden:</span> {validationResult.columnCount}
          </div>
          <div>
            <span className="font-medium">Datenzeilen:</span> {validationResult.dataPreview.length - 1}
          </div>
        </div>

        {validationResult.errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Fehler gefunden</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validationResult.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warnungen</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationResult.warnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
                {validationResult.warnings.length > 5 && (
                  <li>... und {validationResult.warnings.length - 5} weitere</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }, [validationResult]);

  // Render data preview table
  const DataPreviewTable = useMemo(() => {
    if (!validationResult?.dataPreview || validationResult.dataPreview.length < 2) return null;

    const headers = validationResult.dataPreview[0];
    const rows = validationResult.dataPreview.slice(1, 6);

    return (
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Datenvorschau (erste 5 Zeilen)
        </h3>
        <ScrollArea className="h-64 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.slice(0, 8).map((header, index) => (
                  <TableHead key={index} className="min-w-24 text-xs">
                    {header}
                    {REQUIRED_COLUMNS.includes(header) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        Erforderlich
                      </Badge>
                    )}
                  </TableHead>
                ))}
                {headers.length > 8 && (
                  <TableHead className="text-xs text-muted-foreground">
                    +{headers.length - 8} weitere...
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.slice(0, 8).map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="text-xs max-w-32 truncate">
                      {cell || '-'}
                    </TableCell>
                  ))}
                  {row.length > 8 && (
                    <TableCell className="text-xs text-muted-foreground">
                      ...
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  }, [validationResult]);

  // Render import summary
  const ImportSummary = useMemo(() => {
    if (!importResult?.summary) return null;

    const { summary } = importResult;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h3 className="font-semibold">Import erfolgreich</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="font-medium">Operationen gesamt:</span>
              <Badge variant="secondary">{summary.totalOperations}</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Zeitbereich:</span>
              <span className="text-sm">{summary.timeRange.earliest} - {summary.timeRange.latest}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="font-medium">Nach Abteilungen:</span>
            </div>
            <div className="space-y-1">
              {Object.entries(summary.byDepartment).map(([dept, count]) => (
                <div key={dept} className="flex justify-between text-sm">
                  <span>{dept}:</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">OP-Säle:</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(summary.byRoom).map(([room, count]) => (
              <div key={room} className="flex justify-between text-xs p-2 bg-muted rounded">
                <span>{room}:</span>
                <Badge variant="outline" className="text-xs">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [importResult]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            OP-Plan CSV Import
          </DialogTitle>
          <DialogDescription>
            Importieren Sie einen OP-Plan aus einer CSV-Datei. 
            Die Datei muss im deutschen Krankenhausformat vorliegen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Idle State - File Drop Zone */}
          {importState === 'idle' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : isDragReject 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'CSV-Datei hier ablegen...' : 'CSV-Datei ziehen oder klicken'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unterstützte Formate: .csv (Semikolon-getrennt)
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertTitle>Erwartetes Format</AlertTitle>
                <AlertDescription>
                  Die CSV-Datei sollte deutsche Krankenhausdaten mit Spalten wie Datum, Zeit, 
                  Eingriff, OP-Orgaeinheit, OP-Saal enthalten. Semikolon als Trennzeichen.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Validating State */}
          {importState === 'validating' && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p>Datei wird validiert...</p>
              </div>
            </div>
          )}

          {/* File Selected State - Show Validation & Preview */}
          {importState === 'file-selected' && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6 p-1">
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Badge variant="outline">{(selectedFile.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                )}

                {ValidationSummary}

                {validationResult?.isValid && DataPreviewTable}
              </div>
            </ScrollArea>
          )}

          {/* Importing State */}
          {importState === 'importing' && (
            <div className="space-y-4 p-8">
              <div className="text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="font-medium">Import läuft...</p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {importProgress < 40 && 'Daten werden gelesen...'}
                  {importProgress >= 40 && importProgress < 80 && 'Operationen werden verarbeitet...'}
                  {importProgress >= 80 && 'Import wird abgeschlossen...'}
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {importState === 'success' && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6 p-1">
                {ImportSummary}
              </div>
            </ScrollArea>
          )}

          {/* Error State */}
          {importState === 'error' && (
            <div className="space-y-4 p-8">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Import fehlgeschlagen</AlertTitle>
                <AlertDescription>
                  {importResult?.errors?.[0] || 'Ein unbekannter Fehler ist aufgetreten.'}
                </AlertDescription>
              </Alert>
              
              <Button 
                variant="outline" 
                onClick={() => setImportState('idle')}
                className="w-full"
              >
                Erneut versuchen
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {importState === 'success' ? 'Schließen' : 'Abbrechen'}
          </Button>
          
          <div className="space-x-2">
            {importState === 'file-selected' && validationResult?.isValid && (
              <Button 
                onClick={handleImport}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Daten importieren
              </Button>
            )}
            
            {importState === 'success' && (
              <Button onClick={handleClose}>
                Fertig
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
