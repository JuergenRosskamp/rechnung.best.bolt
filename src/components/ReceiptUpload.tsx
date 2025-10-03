import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import * as pdfjsLib from 'pdfjs-dist';

interface ReceiptUploadProps {
  onReceiptProcessed: (data: ReceiptData) => void;
  onReceiptIdChange?: (receiptId: string | null) => void;
}

export interface ReceiptData {
  date?: string;
  amount?: number;
  vatRate?: number;
  description?: string;
  category?: string;
  merchantName?: string;
  documentType?: 'income' | 'expense';
}

export function ReceiptUpload({ onReceiptProcessed, onReceiptIdChange }: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf' | ''>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const generatePdfThumbnail = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas context not available');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/png');
  };

  const processFile = async (file: File) => {
    if (!user) {
      setError('Nicht angemeldet');
      setUploadStatus('error');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      setUploadedFileName(file.name);

      const isPdf = file.type === 'application/pdf';
      setFileType(isPdf ? 'pdf' : 'image');

      let preview: string;
      if (isPdf) {
        preview = await generatePdfThumbnail(file);
      } else {
        preview = URL.createObjectURL(file);
      }
      setPreviewUrl(preview);

      setUploadStatus('uploading');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.tenant_id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: receiptRecord, error: insertError } = await supabase
        .from('receipt_uploads')
        .insert({
          tenant_id: user.tenant_id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          ocr_status: 'processing',
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (onReceiptIdChange) {
        onReceiptIdChange(receiptRecord.id);
      }

      setUploadStatus('processing');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-receipt-ocr`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId: receiptRecord.id,
          filePath: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Beleganerkennung');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setUploadStatus('completed');
        onReceiptProcessed(result.data);
      } else {
        throw new Error(result.error || 'Unbekannter Fehler bei der Verarbeitung');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Hochladen des Belegs');
      setUploadStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        processFile(file);
      } else {
        setError('Nur Bilder (JPG, PNG) und PDF-Dateien werden unterstützt');
        setUploadStatus('error');
      }
    }
  };

  const handleClear = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadStatus('idle');
    setError('');
    setUploadedFileName('');
    setPreviewUrl('');
    setFileType('');
    setShowFullImage(false);
    if (onReceiptIdChange) {
      onReceiptIdChange(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Beleg hochladen oder scannen
        </label>
        {uploadStatus !== 'idle' && uploadStatus !== 'error' && (
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {uploadStatus === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-100'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">
              {isDragging ? 'Datei hier ablegen' : 'Datei hochladen oder hierher ziehen'}
            </span>
            <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</span>
          </div>

          <div
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors md:hidden cursor-pointer"
          >
            <Camera className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Mit Kamera scannen</span>
            <span className="text-xs text-gray-500 mt-1">Foto aufnehmen</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {uploadStatus === 'uploading' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Beleg wird hochgeladen...</p>
              <p className="text-xs text-blue-700 mt-1">{uploadedFileName}</p>
              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Beleg Vorschau"
                    className="max-h-32 rounded border border-blue-300 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                  />
                  <p className="text-xs text-blue-600 mt-1">Klicken zum Vergrößern</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'processing' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Loader2 className="h-5 w-5 text-yellow-600 animate-spin mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">KI analysiert den Beleg...</p>
              <p className="text-xs text-yellow-700 mt-1">Dies kann einen Moment dauern</p>
              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Beleg Vorschau"
                    className="max-h-32 rounded border border-yellow-300 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                  />
                  <p className="text-xs text-yellow-600 mt-1">Klicken zum Vergrößern</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Beleg erfolgreich erkannt!</p>
              <p className="text-xs text-green-700 mt-1">
                Die Daten wurden automatisch in das Formular übernommen. Bitte überprüfen Sie die Angaben.
              </p>
              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Beleg Vorschau"
                    className="max-h-32 rounded border border-green-300 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                  />
                  <p className="text-xs text-green-600 mt-1">Klicken zum Vergrößern</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Fehler beim Verarbeiten</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={handleClear}
                className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
              >
                Neuer Versuch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          Die KI-Beleganerkennung analysiert automatisch Datum, Betrag, MwSt., Händler und Kategorie.
          Der Beleg wird GoBD-konform archiviert. Formate: JPG, PNG, PDF (max. 10 MB)
        </p>
      </div>

      {showFullImage && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewUrl}
              alt="Beleg in voller Größe"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
