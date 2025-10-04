import jsPDF from 'jspdf';

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  delivery_date?: string;
  customer_snapshot: any;
  items: any[];
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  status: string;
  payment_terms?: string;
  layout_snapshot?: LayoutConfig;
  tenant_info?: TenantInfo;
  is_reverse_charge?: boolean;
  reverse_charge_note?: string;
  early_payment_discount_percentage?: number;
  early_payment_discount_days?: number;
  early_payment_discount_amount?: number;
}

interface TenantInfo {
  company_name: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  vat_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  bank_name?: string;
  bank_account_holder?: string;
  iban?: string;
  bic?: string;
  is_small_business?: boolean;
  small_business_note?: string;
  default_vat_rate?: number;
}

interface LayoutConfig {
  template_name?: string;
  logo_url?: string | null;
  logo_width?: number;
  logo_height?: number;
  logo_position?: 'top-left' | 'top-center' | 'top-right';
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_color?: string;
  font_family?: 'helvetica' | 'times' | 'courier';
  font_size_base?: number;
  font_size_heading?: number;
  show_company_slogan?: boolean;
  company_slogan?: string;
  header_background_color?: string;
  header_text_color?: string;
  show_line_numbers?: boolean;
  show_tax_breakdown?: boolean;
  show_bank_details?: boolean;
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
}

export async function generateInvoicePDF(invoice: InvoiceData, customLayout?: LayoutConfig): Promise<Blob> {
  const layout = customLayout || invoice.layout_snapshot || {};
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor = hexToRgb(layout.primary_color || '#0ea5e9');
  const fontFamily = layout.font_family || 'helvetica';
  const fontSizeBase = layout.font_size_base || 10;
  const fontSizeHeading = layout.font_size_heading || 20;

  let yPos = layout.margin_top || 20;
  const leftMargin = layout.margin_left || 20;
  const rightMargin = pageWidth - (layout.margin_right || 20);
  const lineHeight = 7;

  if (layout.logo_url) {
    try {
      const logoData = await loadImageAsDataURL(layout.logo_url);
      if (logoData) {
        const logoWidth = layout.logo_width || 40;
        const logoHeight = layout.logo_height || 20;
        let logoX = leftMargin;

        if (layout.logo_position === 'top-center') {
          logoX = (pageWidth - logoWidth) / 2;
        } else if (layout.logo_position === 'top-right') {
          logoX = rightMargin - logoWidth;
        }

        doc.addImage(logoData, 'PNG', logoX, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5;
      }
    } catch (error) {
    }
  }

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(fontSizeHeading);
  doc.setTextColor(...primaryColor);
  doc.text('RECHNUNG', leftMargin, yPos);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(fontSizeBase);
  doc.setTextColor(100, 100, 100);
  yPos += 8;

  const companyName = invoice.tenant_info?.company_name || 'rechnung.best';
  doc.text(companyName, leftMargin, yPos);

  if (invoice.tenant_info?.address_line1) {
    yPos += 4;
    doc.setFontSize(fontSizeBase - 1);
    doc.text(invoice.tenant_info.address_line1, leftMargin, yPos);

    if (invoice.tenant_info.address_line2) {
      yPos += 4;
      doc.text(invoice.tenant_info.address_line2, leftMargin, yPos);
    }

    if (invoice.tenant_info.zip_code && invoice.tenant_info.city) {
      yPos += 4;
      doc.text(`${invoice.tenant_info.zip_code} ${invoice.tenant_info.city}`, leftMargin, yPos);
    }

    if (invoice.tenant_info.country && invoice.tenant_info.country !== 'DE') {
      yPos += 4;
      doc.text(invoice.tenant_info.country, leftMargin, yPos);
    }
  }

  if (invoice.tenant_info?.tax_id) {
    yPos += 4;
    doc.text(`Steuernr.: ${invoice.tenant_info.tax_id}`, leftMargin, yPos);
  }

  if (invoice.tenant_info?.vat_id) {
    yPos += 4;
    doc.text(`USt-IdNr.: ${invoice.tenant_info.vat_id}`, leftMargin, yPos);
  }

  doc.setFontSize(fontSizeBase);

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos + 3, rightMargin, yPos + 3);

  yPos = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Rechnungsempfänger:', leftMargin, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  yPos += lineHeight;
  const customerName = invoice.customer_snapshot?.company_name ||
    `${invoice.customer_snapshot?.first_name || ''} ${invoice.customer_snapshot?.last_name || ''}`.trim() ||
    'Kunde';
  doc.text(customerName, leftMargin, yPos);

  if (invoice.customer_snapshot?.email) {
    yPos += lineHeight - 1;
    doc.text(invoice.customer_snapshot.email, leftMargin, yPos);
  }

  if (invoice.customer_snapshot?.phone) {
    yPos += lineHeight - 1;
    doc.text(invoice.customer_snapshot.phone, leftMargin, yPos);
  }

  const detailsX = pageWidth - 80;
  let detailsY = 50;

  doc.setFont('helvetica', 'bold');
  doc.text('Rechnungsnummer:', detailsX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, detailsX + 45, detailsY);

  detailsY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Datum:', detailsX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('de-DE'), detailsX + 45, detailsY);

  detailsY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Fällig am:', detailsX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.due_date).toLocaleDateString('de-DE'), detailsX + 45, detailsY);

  if (invoice.delivery_date) {
    detailsY += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('Lieferdatum:', detailsX, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoice.delivery_date).toLocaleDateString('de-DE'), detailsX + 45, detailsY);
  }

  if (invoice.payment_terms) {
    detailsY += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlungsziel:', detailsX, detailsY);
    doc.setFont('helvetica', 'normal');
    const paymentTermsLabels: Record<string, string> = {
      'net_7': '7 Tage',
      'net_14': '14 Tage',
      'net_30': '30 Tage',
      'net_60': '60 Tage',
      'immediate': 'Sofort',
      'cash': 'Bar'
    };
    doc.text(paymentTermsLabels[invoice.payment_terms] || invoice.payment_terms, detailsX + 45, detailsY);
  }

  yPos = Math.max(yPos, detailsY) + 15;

  doc.setFillColor(241, 245, 249);
  doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('BESCHREIBUNG', leftMargin + 2, yPos);
  doc.text('MENGE', pageWidth - 110, yPos);
  doc.text('PREIS', pageWidth - 75, yPos);
  doc.text('GESAMT', pageWidth - 35, yPos);

  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  (invoice.items || []).forEach((item, index) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    const description = item.description || 'Artikel';
    const maxWidth = 95;
    const lines = doc.splitTextToSize(description, maxWidth);

    doc.setFont('helvetica', 'bold');
    doc.text(lines[0], leftMargin + 2, yPos);

    if (lines.length > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      for (let i = 1; i < lines.length; i++) {
        yPos += 4;
        doc.text(lines[i], leftMargin + 2, yPos);
      }
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    }

    const itemYPos = yPos - (lines.length - 1) * 4;

    doc.setFont('helvetica', 'normal');
    const quantity = `${(item.quantity || 1).toFixed(2)} ${item.unit || 'Stk.'}`;
    doc.text(quantity, pageWidth - 110, itemYPos, { align: 'left' });

    const unitPrice = `${(item.unit_price || 0).toFixed(2)} €`;
    doc.text(unitPrice, pageWidth - 75, itemYPos, { align: 'left' });

    const total = item.total_price || (item.quantity * item.unit_price) || 0;
    doc.text(`${total.toFixed(2)} €`, pageWidth - 22, itemYPos, { align: 'right' });

    if (item.notes) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      yPos += 4;
      const notesLines = doc.splitTextToSize(item.notes, maxWidth);
      notesLines.forEach((line: string) => {
        doc.text(line, leftMargin + 2, yPos);
        yPos += 3;
      });
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    }

    yPos += 8;

    if (index < invoice.items.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(leftMargin, yPos - 2, rightMargin, yPos - 2);
    }
  });

  yPos += 5;

  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = 20;
  }

  const totalsX = pageWidth - 80;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Zwischensumme:', totalsX, yPos);
  doc.text(`${(invoice.subtotal || 0).toFixed(2)} €`, pageWidth - 22, yPos, { align: 'right' });

  yPos += lineHeight;
  doc.text(`MwSt. (${invoice.tax_rate || 19}%):`, totalsX, yPos);
  doc.text(`${(invoice.tax_amount || 0).toFixed(2)} €`, pageWidth - 22, yPos, { align: 'right' });

  if (invoice.discount_amount && invoice.discount_amount > 0) {
    yPos += lineHeight;
    doc.setTextColor(22, 163, 74);
    doc.text('Rabatt:', totalsX, yPos);
    doc.text(`-${invoice.discount_amount.toFixed(2)} €`, pageWidth - 22, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(totalsX, yPos, rightMargin, yPos);

  yPos += lineHeight + 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Gesamtbetrag:', totalsX, yPos);
  doc.text(`${(invoice.total_amount || 0).toFixed(2)} €`, pageWidth - 22, yPos, { align: 'right' });

  if (invoice.tenant_info?.is_small_business) {
    yPos += 12;
    doc.setFillColor(255, 243, 205);
    const noteHeight = 15;
    doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, noteHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('Hinweis Kleinunternehmerregelung:', leftMargin + 3, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPos += 5;
    const smallBusinessNote = invoice.tenant_info.small_business_note || 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
    const noteLines = doc.splitTextToSize(smallBusinessNote, rightMargin - leftMargin - 10);
    noteLines.forEach((line: string) => {
      doc.text(line, leftMargin + 3, yPos);
      yPos += 3.5;
    });
    doc.setTextColor(0, 0, 0);
  }

  if (invoice.is_reverse_charge) {
    yPos += 12;
    doc.setFillColor(219, 234, 254);
    const noteHeight = 15;
    doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, noteHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text('Reverse Charge Verfahren:', leftMargin + 3, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPos += 5;
    const reverseChargeNote = invoice.reverse_charge_note || 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG';
    const rcLines = doc.splitTextToSize(reverseChargeNote, rightMargin - leftMargin - 10);
    rcLines.forEach((line: string) => {
      doc.text(line, leftMargin + 3, yPos);
      yPos += 3.5;
    });
    doc.setTextColor(0, 0, 0);
  }

  if (invoice.early_payment_discount_percentage && invoice.early_payment_discount_percentage > 0) {
    yPos += 12;
    doc.setFillColor(220, 252, 231);
    const noteHeight = 15;
    doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, noteHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text('Skonto bei vorzeitiger Zahlung:', leftMargin + 3, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPos += 5;
    const skontoAmount = invoice.early_payment_discount_amount || (invoice.total_amount * (invoice.early_payment_discount_percentage / 100));
    const skontoText = `Bei Zahlung innerhalb von ${invoice.early_payment_discount_days || 7} Tagen erhalten Sie ${invoice.early_payment_discount_percentage}% Skonto (${skontoAmount.toFixed(2)} €). Zahlbetrag dann: ${(invoice.total_amount - skontoAmount).toFixed(2)} €`;
    const skontoLines = doc.splitTextToSize(skontoText, rightMargin - leftMargin - 10);
    skontoLines.forEach((line: string) => {
      doc.text(line, leftMargin + 3, yPos);
      yPos += 3.5;
    });
    doc.setTextColor(0, 0, 0);
  }

  if (invoice.notes) {
    yPos += 15;

    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(248, 250, 252);
    const notesHeight = 30;
    doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, notesHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Notizen:', leftMargin + 3, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    yPos += 6;
    const notesLines = doc.splitTextToSize(invoice.notes, rightMargin - leftMargin - 10);
    notesLines.forEach((line: string) => {
      doc.text(line, leftMargin + 3, yPos);
      yPos += 4;
    });
  }

  const footerY = pageHeight - 30;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.line(leftMargin, footerY - 5, rightMargin, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  let footerText = '';
  if (invoice.tenant_info?.email) footerText += invoice.tenant_info.email + ' | ';
  if (invoice.tenant_info?.phone) footerText += invoice.tenant_info.phone + ' | ';
  if (invoice.tenant_info?.website) footerText += invoice.tenant_info.website;

  if (footerText) {
    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  }

  if (invoice.tenant_info?.bank_name && invoice.tenant_info?.iban && (layout.show_bank_details !== false)) {
    doc.text(`${invoice.tenant_info.bank_name} | IBAN: ${invoice.tenant_info.iban}${invoice.tenant_info.bic ? ' | BIC: ' + invoice.tenant_info.bic : ''}`,
      pageWidth / 2, footerY + 4, { align: 'center' });
  }

  doc.setFontSize(7);
  doc.text(`Zahlbar bis ${new Date(invoice.due_date).toLocaleDateString('de-DE')} | Vielen Dank für Ihren Auftrag!`,
    pageWidth / 2, footerY + 9, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}`,
    pageWidth / 2, footerY + 13, { align: 'center' });

  return doc.output('blob');
}

export function generateXRechnungXML(invoice: InvoiceData): Blob {
  const formatDate = (date: string) => date.split('T')[0];

  const customerName = invoice.customer_snapshot?.company_name ||
    `${invoice.customer_snapshot?.first_name || ''} ${invoice.customer_snapshot?.last_name || ''}`.trim() ||
    'Kunde';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoice.invoice_number}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.invoice_date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${(invoice.items || []).map((item, index) => `<ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description || 'Artikel')}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.unit_price || 0).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${(item.quantity || 1).toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${invoice.tax_rate || 19}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${((item.total_price || (item.quantity * item.unit_price)) || 0).toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('')}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>rechnung.best</ram:Name>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(customerName)}</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDate(invoice.invoice_date)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${(invoice.tax_amount || 0).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${(invoice.total_amount || 0).toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${(invoice.total_amount || 0).toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${(invoice.tax_amount || 0).toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${invoice.tax_rate || 19}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(invoice.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return new Blob([xml], { type: 'application/xml' });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateZUGFeRDPDF(invoice: InvoiceData): Promise<Blob> {
  return await generateInvoicePDF(invoice);
}
