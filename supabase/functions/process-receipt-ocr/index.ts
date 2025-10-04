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

    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.warn("No Anthropic API key found, using mock data");
      const mockData: ReceiptData = {
        description: "Beleg hochgeladen - Bitte Daten manuell eingeben",
        documentType: "expense"
      };

      await supabaseClient
        .from("receipt_uploads")
        .update({
          ocr_status: "completed",
          ocr_data: mockData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", receiptId);

      return new Response(
        JSON.stringify({
          success: true,
          data: mockData,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let messageContent;
    if (isPdf) {
      messageContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          }
        },
        {
          type: "text",
          text: `Analysiere diesen Beleg für ein deutsches Kassenbuch und extrahiere folgende Informationen:

- date: Datum im Format YYYY-MM-DD
- amount: Bruttobetrag als Zahl (nur die Zahl, keine Währung)
- vatRate: MwSt-Satz in Deutschland (0, 7 oder 19)
- description: Kurze Beschreibung des Kaufs/der Dienstleistung
- merchantName: Name des Händlers/Lieferanten
- documentType: "income" für Einnahmen oder "expense" für Ausgaben (meistens "expense")
- category: Passende Kategorie aus: "Büromaterial", "Reisekosten", "Porto", "Bewirtung", "Wareneinkauf", "Sonstiges"

Antworte NUR mit einem validen JSON-Objekt, ohne zusätzlichen Text. Beispiel:
{"date":"2025-10-03","amount":49.99,"vatRate":19,"description":"Büromaterial","merchantName":"Staples","documentType":"expense","category":"Büromaterial"}`
        }
      ];
    } else {
      const mimeType = filePath.toLowerCase().match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                       filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                       filePath.toLowerCase().endsWith('.gif') ? 'image/gif' :
                       filePath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          }
        },
        {
          type: "text",
          text: `Analysiere diesen Beleg für ein deutsches Kassenbuch und extrahiere folgende Informationen:

- date: Datum im Format YYYY-MM-DD
- amount: Bruttobetrag als Zahl (nur die Zahl, keine Währung)
- vatRate: MwSt-Satz in Deutschland (0, 7 oder 19)
- description: Kurze Beschreibung des Kaufs/der Dienstleistung
- merchantName: Name des Händlers/Lieferanten
- documentType: "income" für Einnahmen oder "expense" für Ausgaben (meistens "expense")
- category: Passende Kategorie aus: "Büromaterial", "Reisekosten", "Porto", "Bewirtung", "Wareneinkauf", "Sonstiges"

Antworte NUR mit einem validen JSON-Objekt, ohne zusätzlichen Text. Beispiel:
{"date":"2025-10-03","amount":49.99,"vatRate":19,"description":"Büromaterial","merchantName":"Staples","documentType":"expense","category":"Büromaterial"}`
        }
      ];
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${errorText}`);
    }

    const anthropicResult = await anthropicResponse.json();
    const extractedText = anthropicResult.content?.[0]?.text || "{}";

    let ocrData: ReceiptData;
    try {
      const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      ocrData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", extractedText);
      ocrData = {
        description: "Fehler bei der Beleganerkennung - Bitte Daten prüfen",
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
