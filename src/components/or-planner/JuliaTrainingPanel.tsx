// src/components/or-planner/JuliaTrainingPanel.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Brain, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JuliaTrainingPanelProps {
  onTrainingDataUploaded: (data: any) => void;
  currentTrainingStatus?: 'none' | 'uploaded' | 'processing' | 'active';
}

export const JuliaTrainingPanel: React.FC<JuliaTrainingPanelProps> = ({
  onTrainingDataUploaded,
  currentTrainingStatus = 'none'
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trainingStats, setTrainingStats] = useState<{
    totalPatterns: number;
    confidence: number;
    lastUpdated: Date;
  } | null>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Falsches Dateiformat",
        description: "Bitte laden Sie eine Excel-Datei (.xlsx oder .xls) hoch.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate file processing for now
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      // Read file as ArrayBuffer for future processing
      const fileBuffer = await file.arrayBuffer();
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadProgress(100);
      clearInterval(progressInterval);

      // Mock training data for demonstration
      const mockTrainingData = {
        patternsExtracted: 47,
        confidenceScore: 0.87,
        staffPatterns: [
          'Karin R. + Gerhard K. = 95% Erfolg bei Neuro-OPs',
          'Ulla K. + Sandra P. = Beste GYN-Paarung',
          'Fatima R. führt bei Herz-Thorax Operationen'
        ],
        complexityRules: [
          'Sehr Hoch: Nur erfahrene Paare (Bewertung >8)',
          'Hoch: Mindestens ein Experte pro Paar',
          'Mittel: Gute Trainingsgelegenheiten'
        ]
      };
      
      // Update training stats
      setTrainingStats({
        totalPatterns: mockTrainingData.patternsExtracted,
        confidence: mockTrainingData.confidenceScore,
        lastUpdated: new Date(),
      });

      // Notify parent component
      onTrainingDataUploaded(mockTrainingData);

      toast({
        title: "Training-Daten erfolgreich hochgeladen",
        description: `${mockTrainingData.patternsExtracted} Muster von Julia erkannt. KI-Konfidenz: ${(mockTrainingData.confidenceScore * 100).toFixed(1)}%`,
      });

      console.log('📊 Julia Training Data Loaded:', mockTrainingData);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload-Fehler",
        description: error.message || "Fehler beim Hochladen der Training-Daten.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [onTrainingDataUploaded, toast]);

  const getStatusIcon = () => {
    switch (currentTrainingStatus) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing': return <Brain className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'uploaded': return <FileSpreadsheet className="h-5 w-5 text-orange-500" />;
      default: return <Upload className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (currentTrainingStatus) {
      case 'active': return 'KI verwendet Julias Expertise';
      case 'processing': return 'Verarbeite Training-Daten...';
      case 'uploaded': return 'Training-Daten hochgeladen';
      default: return 'Keine Training-Daten';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <CardTitle className="text-lg font-headline">Julia's Expertise Training</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Status: {getStatusText()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {currentTrainingStatus === 'none' && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Laden Sie Julias Excel-Datei mit Personalfähigkeiten hoch, um die KI mit ihrer Expertise zu trainieren.
            </AlertDescription>
          </Alert>
        )}

        {currentTrainingStatus === 'active' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              KI nutzt jetzt Julias 15+ Jahre Erfahrung für bessere Personalvorschläge.
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
            />
            <Button 
              variant="outline" 
              disabled={uploading}
              onClick={() => document.querySelector('input[type="file"]')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {currentTrainingStatus === 'none' ? 'Excel hochladen' : 'Aktualisieren'}
            </Button>
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Analysiere Julias Expertise-Daten... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Training Statistics */}
        {trainingStats && (
          <div className="grid grid-cols-3 gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{trainingStats.totalPatterns}</div>
              <div className="text-xs text-green-600">Erkannte Muster</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{(trainingStats.confidence * 100).toFixed(1)}%</div>
              <div className="text-xs text-green-600">KI-Konfidenz</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-700">
                {trainingStats.lastUpdated.toLocaleDateString('de-DE')}
              </div>
              <div className="text-xs text-green-600">Letztes Update</div>
            </div>
          </div>
        )}

        {/* Expected Excel Format Guide */}
        {currentTrainingStatus === 'none' && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-medium text-blue-800">Erwartetes Excel-Format:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Personalfähigkeiten:</strong> Name, Bereich, Komplexität, Bewertung</li>
              <li><strong>Erfolgreiche Paarungen:</strong> Personal 1, Personal 2, Erfolgsrate</li>
              <li><strong>Julias Entscheidungen:</strong> Originaler Vorschlag vs. Julias Wahl</li>
            </ul>
            <p className="text-blue-600 mt-2">
              💡 <strong>Tipp:</strong> Je mehr historische Daten, desto besser lernt die KI!
            </p>
          </div>
        )}

        {/* Demo Information */}
        {currentTrainingStatus === 'none' && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            <Info className="h-3 w-3 inline mr-1" />
            <strong>Demo-Modus:</strong> Upload simuliert Julias Trainingsdaten für Demonstrationszwecke.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JuliaTrainingPanel;
