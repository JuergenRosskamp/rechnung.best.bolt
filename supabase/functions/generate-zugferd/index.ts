import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { PDFDocument, PDFName, PDFString, PDFArray, PDFDict, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  total_vat: number;
  total: number;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
  customer_vat_id?: string;
  tenant_company_name: string;
  tenant_address: string;
  tenant_city: string;
  tenant_zip: string;
  tenant_country: string;
  tenant_tax_id: string;
  tenant_vat_id: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_rate: number;
    discount_percentage: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId");

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: userData } = await supabaseClient
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invoice } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        customers (
          display_name,
          address_line1,
          city,
          zip_code,
          country,
          vat_id
        )
      `)
      .eq("id", invoiceId)
      .eq("tenant_id", userData.tenant_id)
      .single();

    if (!invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: items } = await supabaseClient
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    const { data: tenant } = await supabaseClient
      .from("tenants")
      .select("*")
      .eq("id", userData.tenant_id)
      .single();

    if (!tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfBytes = await generateZUGFeRDPDF({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      total_vat: invoice.total_vat,
      total: invoice.total,
      customer_name: invoice.customers.display_name,
      customer_address: invoice.customers.address_line1 || "",
      customer_city: invoice.customers.city || "",
      customer_zip: invoice.customers.zip_code || "",
      customer_country: invoice.customers.country || "DE",
      customer_vat_id: invoice.customers.vat_id,
      tenant_company_name: tenant.company_name,
      tenant_address: tenant.address_line1 || "",
      tenant_city: tenant.city || "",
      tenant_zip: tenant.zip_code || "",
      tenant_country: tenant.country || "DE",
      tenant_tax_id: tenant.tax_id || "",
      tenant_vat_id: tenant.vat_id || "",
      items: items || [],
    });

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="zugferd-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating ZUGFeRD:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateZUGFeRDPDF(data: InvoiceData): Promise<Uint8Array> {
  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 10;
  const fontSizeLarge = 14;
  const fontSizeTitle = 20;

  let yPosition = height - 50;

  // Company header
  page.drawText(data.tenant_company_name, {
    x: 50,
    y: yPosition,
    size: fontSizeLarge,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;
  page.drawText(`${data.tenant_address}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 15;
  page.drawText(`${data.tenant_zip} ${data.tenant_city}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (data.tenant_vat_id) {
    yPosition -= 15;
    page.drawText(`USt-IdNr.: ${data.tenant_vat_id}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Customer address
  yPosition = height - 150;
  page.drawText(data.customer_name, {
    x: 320,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText(data.customer_address, {
    x: 320,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText(`${data.customer_zip} ${data.customer_city}`, {
    x: 320,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Invoice title
  yPosition = height - 280;
  page.drawText("RECHNUNG", {
    x: 50,
    y: yPosition,
    size: fontSizeTitle,
    font: fontBold,
    color: rgb(0, 0.3, 0.6),
  });

  // Invoice details
  yPosition -= 40;
  page.drawText(`Rechnungsnummer: ${data.invoice_number}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  const formattedDate = new Date(data.invoice_date).toLocaleDateString("de-DE");
  page.drawText(`Rechnungsdatum: ${formattedDate}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  const formattedDueDate = new Date(data.due_date).toLocaleDateString("de-DE");
  page.drawText(`Fälligkeitsdatum: ${formattedDueDate}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Add ZUGFeRD badge
  yPosition -= 30;
  page.drawText("Diese Rechnung enthält ZUGFeRD-Daten", {
    x: 50,
    y: yPosition,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Table header
  yPosition -= 30;
  const tableLeft = 50;
  const colWidths = [250, 50, 60, 80, 80];

  page.drawRectangle({
    x: tableLeft,
    y: yPosition - 5,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: 20,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText("Beschreibung", {
    x: tableLeft + 5,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Menge", {
    x: tableLeft + colWidths[0] + 5,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Einheit", {
    x: tableLeft + colWidths[0] + colWidths[1] + 5,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Einzelpreis", {
    x: tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Gesamt", {
    x: tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5,
    y: yPosition,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  // Table rows
  for (const item of data.items) {
    const itemTotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);

    page.drawText(item.description.substring(0, 40), {
      x: tableLeft + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(item.quantity.toFixed(2), {
      x: tableLeft + colWidths[0] + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(item.unit, {
      x: tableLeft + colWidths[0] + colWidths[1] + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`€${item.unit_price.toFixed(2)}`, {
      x: tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`€${itemTotal.toFixed(2)}`, {
      x: tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
  }

  // Totals
  yPosition -= 20;
  const totalsX = width - 200;

  page.drawText(`Zwischensumme:`, {
    x: totalsX,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`€${data.subtotal.toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText(`MwSt. (19%):`, {
    x: totalsX,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`€${data.total_vat.toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;
  page.drawLine({
    start: { x: totalsX, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText(`Gesamtbetrag:`, {
    x: totalsX,
    y: yPosition,
    size: fontSizeLarge,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(`€${data.total.toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: fontSizeLarge,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Footer
  const footerY = 80;
  page.drawText(`Zahlbar bis ${formattedDueDate}`, {
    x: 50,
    y: footerY,
    size: fontSize,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Generate ZUGFeRD XML
  const zugferdXML = generateZUGFeRDXML(data);

  // Embed XML as attachment (PDF/A-3 compliant)
  await embedZUGFeRDXML(pdfDoc, zugferdXML, data.invoice_number);

  return await pdfDoc.save();
}

function generateZUGFeRDXML(data: InvoiceData): string {
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#conformant#urn:zugferd.de:2p1:extended</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(data.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${data.invoice_date.replace(/-/g, '')}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.tenant_company_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.tenant_zip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.tenant_address)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.tenant_city)}</ram:CityName>
          <ram:CountryID>${escapeXml(data.tenant_country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(data.tenant_vat_id)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.customer_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.customer_zip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.customer_address)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.customer_city)}</ram:CityName>
          <ram:CountryID>${escapeXml(data.customer_country)}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${data.invoice_date.replace(/-/g, '')}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${data.subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${data.subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${data.total_vat.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${data.total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${data.total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return xml;
}

async function embedZUGFeRDXML(pdfDoc: PDFDocument, xmlContent: string, invoiceNumber: string): Promise<void> {
  const xmlBytes = new TextEncoder().encode(xmlContent);

  // Create file specification for embedded file
  const fileSpec = pdfDoc.context.obj({
    Type: 'Filespec',
    F: PDFString.of('zugferd-invoice.xml'),
    UF: PDFString.of('zugferd-invoice.xml'),
    AFRelationship: PDFName.of('Alternative'),
    Desc: PDFString.of(`ZUGFeRD Invoice ${invoiceNumber}`),
  });

  // Embed the XML file
  const embeddedFile = pdfDoc.context.obj({
    Type: 'EmbeddedFile',
    Subtype: 'text/xml',
    Params: {
      ModDate: PDFString.of(new Date().toISOString()),
    },
  });

  const stream = pdfDoc.context.stream(xmlBytes, {
    Type: 'EmbeddedFile',
    Subtype: 'text/xml',
  });

  // Link everything together
  const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root) as PDFDict;
  const namesDict = catalog.get(PDFName.of('Names')) as PDFDict || pdfDoc.context.obj({});
  const embeddedFilesDict = namesDict.get(PDFName.of('EmbeddedFiles')) as PDFDict || pdfDoc.context.obj({});
  const namesArray = embeddedFilesDict.get(PDFName.of('Names')) as PDFArray || pdfDoc.context.obj([]);

  namesArray.push(PDFString.of('zugferd-invoice.xml'));
  namesArray.push(fileSpec);

  embeddedFilesDict.set(PDFName.of('Names'), namesArray);
  namesDict.set(PDFName.of('EmbeddedFiles'), embeddedFilesDict);
  catalog.set(PDFName.of('Names'), namesDict);
}
