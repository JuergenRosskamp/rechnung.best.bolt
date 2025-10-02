import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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
  customer_tax_id?: string;
  tenant_company_name: string;
  tenant_address: string;
  tenant_city: string;
  tenant_zip: string;
  tenant_country: string;
  tenant_tax_id: string;
  tenant_vat_id: string;
  tenant_email: string;
  tenant_phone?: string;
  leitweg_id?: string;
  payment_terms?: string;
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
    const leitwegId = url.searchParams.get("leitwegId") || undefined;

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
          vat_id,
          tax_id
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

    const xmlContent = generateXRechnungXML({
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
      customer_tax_id: invoice.customers.tax_id,
      tenant_company_name: tenant.company_name,
      tenant_address: tenant.address_line1 || "",
      tenant_city: tenant.city || "",
      tenant_zip: tenant.zip_code || "",
      tenant_country: tenant.country || "DE",
      tenant_tax_id: tenant.tax_id || "",
      tenant_vat_id: tenant.vat_id || "",
      tenant_email: tenant.email || "",
      tenant_phone: tenant.phone,
      leitweg_id: leitwegId,
      payment_terms: invoice.payment_terms,
      items: items || [],
    });

    return new Response(xmlContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="xrechnung-${invoice.invoice_number}.xml"`,
      },
    });
  } catch (error) {
    console.error("Error generating XRechnung:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateXRechnungXML(data: InvoiceData): string {
  const currentDate = new Date().toISOString().split('T')[0];

  // Calculate VAT breakdown
  const vatBreakdown = new Map<number, { net: number; vat: number }>();

  for (const item of data.items) {
    const itemNet = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
    const itemVat = itemNet * (item.vat_rate / 100);

    const current = vatBreakdown.get(item.vat_rate) || { net: 0, vat: 0 };
    vatBreakdown.set(item.vat_rate, {
      net: current.net + itemNet,
      vat: current.vat + itemVat,
    });
  }

  // Determine tax category code
  const getTaxCategory = (rate: number): string => {
    if (rate === 0) return "Z"; // Zero rated
    if (rate === 7 || rate === 19) return "S"; // Standard rate
    return "S"; // Default to standard
  };

  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <!-- Exchange Context -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <!-- Document Header -->
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(data.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${data.invoice_date.replace(/-/g, '')}</udt:DateTimeString>
    </ram:IssueDateTime>`;

  if (data.leitweg_id) {
    xml += `
    <ram:IncludedNote>
      <ram:Content>Leitweg-ID: ${escapeXml(data.leitweg_id)}</ram:Content>
      <ram:SubjectCode>REG</ram:SubjectCode>
    </ram:IncludedNote>`;
  }

  xml += `
  </rsm:ExchangedDocument>

  <!-- Transaction -->
  <rsm:SupplyChainTradeTransaction>

    <!-- Line Items -->`;

  data.items.forEach((item, index) => {
    const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
    const lineVat = lineTotal * (item.vat_rate / 100);

    xml += `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unit_price.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${escapeXml(item.unit.toUpperCase())}">${item.quantity.toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${getTaxCategory(item.vat_rate)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.vat_rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  });

  xml += `

    <!-- Seller (Supplier) -->
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.tenant_company_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.tenant_zip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.tenant_address)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.tenant_city)}</ram:CityName>
          <ram:CountryID>${escapeXml(data.tenant_country)}</ram:CountryID>
        </ram:PostalTradeAddress>`;

  if (data.tenant_vat_id) {
    xml += `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(data.tenant_vat_id)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`;
  }

  if (data.tenant_tax_id) {
    xml += `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${escapeXml(data.tenant_tax_id)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`;
  }

  xml += `
      </ram:SellerTradeParty>

      <!-- Buyer (Customer) -->
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.customer_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.customer_zip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.customer_address)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.customer_city)}</ram:CityName>
          <ram:CountryID>${escapeXml(data.customer_country)}</ram:CountryID>
        </ram:PostalTradeAddress>`;

  if (data.customer_vat_id) {
    xml += `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(data.customer_vat_id)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`;
  }

  xml += `
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <!-- Delivery -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${data.invoice_date.replace(/-/g, '')}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- Settlement (Payment Terms & Amounts) -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>`;

  // Payment terms
  if (data.payment_terms) {
    xml += `
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${escapeXml(data.payment_terms)}</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${data.due_date.replace(/-/g, '')}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>`;
  }

  // VAT breakdown
  vatBreakdown.forEach((amounts, rate) => {
    xml += `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amounts.vat.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${amounts.net.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${getTaxCategory(rate)}</ram:CategoryCode>
        <ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
  });

  xml += `

      <!-- Monetary Summation -->
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
