import CryptoJS from 'crypto-js';
import { supabase } from './supabase';

export async function calculatePdfHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
  return CryptoJS.SHA256(wordArray).toString();
}

export async function archiveInvoicePdf(
  invoiceId: string,
  pdfBlob: Blob,
  format: 'standard' | 'zugferd' | 'xrechnung'
): Promise<{ success: boolean; error?: string }> {
  try {
    const pdfHash = await calculatePdfHash(pdfBlob);
    const pdfSize = pdfBlob.size;

    const fileName = `invoices/${invoiceId}/${format}-${Date.now()}.${format === 'xrechnung' ? 'xml' : 'pdf'}`;

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(fileName, pdfBlob, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('invoice-pdfs')
      .getPublicUrl(fileName);

    const { error: archiveError } = await supabase
      .rpc('archive_invoice_pdf', {
        p_invoice_id: invoiceId,
        p_pdf_format: format,
        p_pdf_url: publicUrl,
        p_pdf_hash: pdfHash,
        p_pdf_size_bytes: pdfSize,
      });

    if (archiveError) {
      return { success: false, error: archiveError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function finalizeInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('finalize_invoice', {
      invoice_id_param: invoiceId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getInvoiceArchives(invoiceId: string) {
  const { data, error } = await supabase
    .from('invoice_pdfs')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('generated_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

export async function verifyPdfIntegrity(pdfUrl: string, expectedHash: string): Promise<boolean> {
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const actualHash = await calculatePdfHash(blob);
    return actualHash === expectedHash;
  } catch (err) {
    return false;
  }
}
