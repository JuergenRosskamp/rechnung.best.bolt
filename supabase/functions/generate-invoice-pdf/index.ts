import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  total_vat: number;
  total: number;
  status: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get invoice ID from request
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

    // Initialize Supabase client
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

    // Get user info
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

    // Get user's tenant_id
    const { data: userData, error: userDataError } = await supabaseClient
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch invoice with tenant isolation
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        customers (
          display_name,
          address_line1,
          address_line2,
          city,
          zip_code,
          country
        )
      `)
      .eq("id", invoiceId)
      .eq("tenant_id", userData.tenant_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabaseClient
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoice items" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch tenant information
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .select("*")
      .eq("id", userData.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate PDF
    const pdfBytes = await generateInvoicePDF({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      total_vat: invoice.total_vat,
      total: invoice.total,
      status: invoice.status,
      customer_name: invoice.customers.display_name,
      customer_address: invoice.customers.address_line1 || "",
      customer_city: invoice.customers.city || "",
      customer_zip: invoice.customers.zip_code || "",
      customer_country: invoice.customers.country || "DE",
      tenant_company_name: tenant.company_name,
      tenant_address: tenant.address_line1 || "",
      tenant_city: tenant.city || "",
      tenant_zip: tenant.zip_code || "",
      tenant_country: tenant.country || "DE",
      tenant_tax_id: tenant.tax_id || "",
      tenant_vat_id: tenant.vat_id || "",
      items: items || [],
    });

    // Return PDF
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();

  // Load fonts
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

  if (data.tenant_tax_id) {
    yPosition -= 15;
    page.drawText(`Steuernummer: ${data.tenant_tax_id}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

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

  // Customer address (right side)
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

  // Table header
  yPosition -= 40;
  const tableTop = yPosition;
  const tableLeft = 50;
  const colWidths = [250, 50, 60, 80, 80];

  // Header background
  page.drawRectangle({
    x: tableLeft,
    y: yPosition - 5,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: 20,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Header text
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

    page.drawText(item.description, {
      x: tableLeft + 5,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: colWidths[0] - 10,
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

  // Totals section
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
  // Draw line
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

  page.drawText("Vielen Dank für Ihren Auftrag!", {
    x: 50,
    y: footerY - 15,
    size: fontSize,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
