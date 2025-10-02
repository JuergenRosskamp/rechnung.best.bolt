import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReceiptData {
  date?: string;
  amount?: number;
  vatRate?: number;
  description?: string;
  category?: string;
  merchantName?: string;
  documentType?: 'income' | 'expense';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { receiptId, filePath } = await req.json();

    if (!receiptId || !filePath) {
      throw new Error("Receipt ID and file path are required");
    }

    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from("receipts")
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du bist ein KI-Assistent für die Beleganerkennung in einem GoBD-konformen Kassenbuch.
            Extrahiere folgende Informationen aus dem Beleg:
            - date: Datum im Format YYYY-MM-DD
            - amount: Bruttobetrag als Zahl (nur die Zahl, kein Währungszeichen)
            - vatRate: MwSt-Satz (0, 7 oder 19)
            - description: Kurze Beschreibung des Kaufs/der Dienstleistung
            - merchantName: Name des Händlers/Lieferanten
            - documentType: "income" für Einnahmen oder "expense" für Ausgaben (meistens "expense")
            - category: Kategorie (z.B. "Büromaterial", "Reisekosten", "Porto", "Bewirtung")

            Antworte NUR mit einem JSON-Objekt, ohne zusätzlichen Text.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              },
              {
                type: "text",
                text: "Extrahiere die Beleg-Informationen aus diesem Bild."
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiResult = await openaiResponse.json();
    const extractedText = openaiResult.choices[0]?.message?.content || "{}";

    let ocrData: ReceiptData;
    try {
      ocrData = JSON.parse(extractedText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", extractedText);
      ocrData = {
        description: "Fehler bei der Beleganerkennung",
        documentType: "expense"
      };
    }

    const { error: updateError } = await supabaseClient
      .from("receipt_uploads")
      .update({
        ocr_status: "completed",
        ocr_data: ocrData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiptId);

    if (updateError) {
      throw new Error(`Failed to update receipt: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: ocrData,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing receipt:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
