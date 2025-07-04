// src/components/or-planner/JuliaTrainingPanel.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Brain, CheckCircle, AlertCircle } from 'lucide-react';
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
      // Read file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Send to backend API for processing
      const formData = new FormData();
      formData.append('juliaSkillsFile', file);

      const response = await fetch('/api/julia-training/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadProgress(100);
      clearInterval(progressInterval);

      // Update training stats
      setTrainingStats({
        totalPatterns: result.patternsExtracted,
        confidence: result.confidenceScore,
        lastUpdated: new Date(),
      });

      // Notify parent component
      onTrainingDataUploaded(result.trainingData);

      toast({
        title: "Training-Daten erfolgreich hochgeladen",
        description: `${result.patternsExtracted} Muster von Julia erkannt. KI-Konfidenz: ${(result.confidenceScore * 100).toFixed(1)}%`,
      });

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
              Julias Excel hochladen
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
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Erwartetes Excel-Format:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Sheet "StaffSkills":</strong> Staff_ID, Name, Operation_Type, Complexity, Proficiency_Score, Preferred_Partners, Julia_Rating</li>
              <li><strong>Sheet "PairingHistory":</strong> Staff_1, Staff_2, Operation_Type, Success_Rate, Julia_Approval_Rate</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// API endpoint to handle Julia's training data upload
// src/pages/api/julia-training/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { JuliaSkillsAnalyzer } from '@/lib/julia-skills-parser';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

type UploadResponse = {
  success: boolean;
  patternsExtracted: number;
  confidenceScore: number;
  trainingData: any;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      patternsExtracted: 0, 
      confidenceScore: 0, 
      trainingData: null,
      error: 'Method not allowed' 
    });
  }

  try {
    // Parse the uploaded file
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);
    const uploadedFile = Array.isArray(files.juliaSkillsFile) 
      ? files.juliaSkillsFile[0] 
      : files.juliaSkillsFile;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        patternsExtracted: 0,
        confidenceScore: 0,
        trainingData: null,
        error: 'No file uploaded'
      });
    }

    // Read and process the Excel file
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const analyzer = new JuliaSkillsAnalyzer();
    await analyzer.parseJuliaExcelFile(fileBuffer);

    // Generate training examples and patterns
    const trainingExamples = analyzer.generateTrainingExamples();
    const compatibilityMatrix = analyzer.getStaffCompatibilityMatrix();
    
    // Calculate confidence score based on data quality
    const totalStaff = Object.keys(compatibilityMatrix).length;
    const pairingPatterns = trainingExamples.length;
    const confidenceScore = Math.min(0.95, (pairingPatterns * totalStaff) / 100);

    // Store the training data (in production, this would go to a database)
    const trainingData = {
      compatibilityMatrix,
      trainingExamples,
      uploadTimestamp: new Date().toISOString(),
      totalStaff,
      pairingPatterns,
    };

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.filepath);

    // Save to persistent storage (Redis/Database)
    // await saveJuliaTrainingData(trainingData);

    res.status(200).json({
      success: true,
      patternsExtracted: pairingPatterns,
      confidenceScore,
      trainingData,
      message: `Successfully processed Julia's expertise data: ${pairingPatterns} patterns from ${totalStaff} staff members.`
    });

  } catch (error: any) {
    console.error('Julia training upload error:', error);
    res.status(500).json({
      success: false,
      patternsExtracted: 0,
      confidenceScore: 0,
      trainingData: null,
      error: error.message || 'Failed to process training data'
    });
  }
}

// Integration into existing useORData hook
// Add this to src/hooks/useORData.ts

export function useORDataWithJuliaTraining() {
  const [juliaTrainingData, setJuliaTrainingData] = useState<any>(null);
  const [juliaTrainingStatus, setJuliaTrainingStatus] = useState<'none' | 'uploaded' | 'processing' | 'active'>('none');

  // Existing useORData logic...

  const handleJuliaTrainingDataUploaded = useCallback((trainingData: any) => {
    setJuliaTrainingData(trainingData);
    setJuliaTrainingStatus('active');
    
    // Trigger re-evaluation of current suggestions with Julia's training data
    if (currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' || currentWorkflowStepKey === 'JULIA_REVIEW') {
      loadEnhancedGptSuggestions();
    }
    
    toast({
      title: "KI mit Julias Expertise trainiert",
      description: "Neue Personalvorschläge berücksichtigen jetzt Julias Erfahrung.",
    });
  }, [currentWorkflowStepKey, toast]);

  const loadEnhancedGptSuggestions = useCallback(async () => {
    if (!juliaTrainingData) {
      return loadGptSuggestions(); // Fallback to regular suggestions
    }

    setIsLoading(true);
    
    const input = {
      operatingRooms: allAssignmentsList
        .filter(op => op.status === 'empty' || op.status === 'critical_pending')
        .map(op => ({
          name: op.room,
          shift: op.shift,
          operationComplexity: op.complexity || 'Mittel',
          operationType: 'General', // Could be enhanced based on op.procedureName
        })),
      availableStaff: staff.filter(s => !s.isSick).map(s => s.name),
      sickStaff: staff.filter(s => s.isSick).map(s => s.name),
      juliaTrainingData: juliaTrainingData,
      previousJuliaOverrides: juliaOverrides,
    };

    try {
      const enhancedSuggestions = await fetchEnhancedAiStaffingSuggestions(input);
      
      // Update schedule with enhanced suggestions
      setSchedule(prev => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        enhancedSuggestions.assignments.forEach(sugg => {
          const room = sugg.operatingRoom as OperatingRoomName;
          const shift = sugg.shift as Shift;
          const targetOp = newSchedule[room]?.[shift];
          if (targetOp) {
            const staffMembers = sugg.staff
              .map(name => staff.find(s => s.name === name))
              .filter(Boolean) as StaffMember[];
            
            targetOp.gptSuggestedStaff = staffMembers;
            targetOp.assignedStaff = staffMembers; 
            targetOp.aiReasoning = `${sugg.reason} (Konfidenz: ${(sugg.confidenceScore * 100).toFixed(1)}%, Julia-Wahrscheinlichkeit: ${(sugg.juliaLikelihood * 100).toFixed(1)}%)`;
            targetOp.status = targetOp.status === 'empty' || targetOp.status === 'critical_pending' ? 'pending_gpt' : targetOp.status;
          }
        });
        return newSchedule;
      });

      toast({ 
        title: "Erweiterte KI-Vorschläge basierend auf Julias Expertise", 
        description: `${enhancedSuggestions.assignments.length} Vorschläge generiert mit durchschnittlicher Julia-Wahrscheinlichkeit von ${(enhancedSuggestions.assignments.reduce((acc, a) => acc + a.juliaLikelihood, 0) / enhancedSuggestions.assignments.length * 100).toFixed(1)}%` 
      });
      
    } catch (error: any) {
      console.error("Enhanced AI suggestions error:", error);
      toast({ 
        title: "Erweiterte KI-Vorschläge fehlgeschlagen", 
        description: "Fallback auf Standard-KI-Vorschläge.", 
        variant: "destructive" 
      });
      await loadGptSuggestions(); // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [juliaTrainingData, allAssignmentsList, staff, juliaOverrides, toast]);

  return {
    // ... existing returns
    juliaTrainingData,
    juliaTrainingStatus,
    handleJuliaTrainingDataUploaded,
    loadEnhancedGptSuggestions,
  };
}
