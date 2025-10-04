import { useState, useEffect } from 'react';
import { FileText, Eye, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface ReceiptThumbnailProps {
  receiptId: string;
  entryId: string;
  onDeleted: () => void;
}

interface Receipt {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
  uploaded_by: string;
}

export function ReceiptThumbnail({ receiptId, entryId, onDeleted }: ReceiptThumbnailProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    loadReceipt();
    checkIfDeletable();
  }, [receiptId]);

  const loadReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) throw error;
      setReceipt(data);

      if (data.storage_path) {
        const { data: urlData } = await supabase
          .storage
          .from('receipts')
          .createSignedUrl(data.storage_path, 3600);

        if (urlData?.signedUrl) {
          setImageUrl(urlData.signedUrl);
        }
      }
    } catch (error) {
    }
  };

  const checkIfDeletable = async () => {
    if (!user) return;

    try {
      const { data: entry, error: entryError } = await supabase
        .from('cashbook_entries')
        .select('entry_date')
        .eq('id', entryId)
        .single();

      if (entryError) throw entryError;

      const entryDate = new Date(entry.entry_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;

      const { data: closing, error: closingError } = await supabase
        .from('cashbook_monthly_closings')
        .select('id, status')
        .eq('tenant_id', user.tenant_id)
        .eq('closing_year', entryYear)
        .eq('closing_month', entryMonth)
        .eq('status', 'finalized')
        .maybeSingle();

      if (closingError && closingError.code !== 'PGRST116') {
        throw closingError;
      }

      setCanDelete(!closing);
    } catch (error) {
      setCanDelete(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt || !canDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError('');

      const { error: storageError } = await supabase
        .storage
        .from('receipts')
        .remove([receipt.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (dbError) throw dbError;

      const { error: updateError } = await supabase
        .from('cashbook_entries')
        .update({ receipt_id: null })
        .eq('id', entryId);

      if (updateError) throw updateError;

      setShowDeleteConfirm(false);
      onDeleted();
    } catch (error: any) {
      setDeleteError(error.message || 'Fehler beim Löschen des Belegs');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!receipt) {
    return (
      <div className="inline-flex items-center px-3 py-1 text-xs text-gray-400 dark:text-secondary-600">
        <FileText className="h-3 w-3" />
      </div>
    );
  }

  const isImage = receipt.file_type.startsWith('image/');
  const isPdf = receipt.file_type === 'application/pdf';

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          onClick={() => setShowPreview(true)}
          className="group relative"
          title={receipt.file_name}
        >
          {isImage && imageUrl ? (
            <img
              src={imageUrl}
              alt="Beleg"
              className="h-10 w-10 object-cover rounded border border-gray-300 dark:border-secondary-600 hover:border-blue-500 transition-colors"
            />
          ) : (
            <div className="h-10 w-10 bg-gray-100 dark:bg-secondary-700 rounded border border-gray-300 dark:border-secondary-600 hover:border-blue-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600 dark:text-secondary-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center transition-all">
            <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
          </div>
        </button>

        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Beleg löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-secondary-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50">{receipt.file_name}</h3>
                <p className="text-sm text-gray-500 dark:text-secondary-400">
                  {(receipt.file_size / 1024).toFixed(1)} KB • {new Date(receipt.created_at).toLocaleString('de-DE')}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 dark:text-secondary-600 hover:text-gray-600 dark:text-secondary-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {isImage && imageUrl && (
                <img
                  src={imageUrl}
                  alt={receipt.file_name}
                  className="max-w-full h-auto mx-auto"
                />
              )}
              {isPdf && imageUrl && (
                <iframe
                  src={imageUrl}
                  className="w-full h-full min-h-[600px]"
                  title={receipt.file_name}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50 mb-2">Beleg löschen?</h3>
                <p className="text-sm text-gray-600 dark:text-secondary-400 mb-2">
                  Möchten Sie den Beleg "{receipt.file_name}" wirklich löschen?
                </p>
                <p className="text-sm text-gray-600 dark:text-secondary-400">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                {!canDelete && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      Der Beleg kann nicht gelöscht werden, da für diesen Monat bereits ein Monatsabschluss finalisiert wurde.
                    </p>
                  </div>
                )}
                {deleteError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">{deleteError}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || !canDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Lösche...' : 'Beleg löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
