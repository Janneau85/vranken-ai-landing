import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Assistant called with messages:", messages.length);

    const systemPrompt = `Je bent een vriendelijke AI assistent voor een gezins-app. Je helpt gebruikers met:
- Boodschappenlijst beheer (items toevoegen, categoriseren)
- Todo's en taken organiseren (toevoegen, prioriteren, toewijzen)
- Kalender events bekijken en plannen
- Algemene vragen over het gezinsleven

Je spreekt Nederlands en bent behulpzaam, vriendelijk en to-the-point.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "add_shopping_item",
              description: "Voeg een item toe aan de boodschappenlijst",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Naam van het item" },
                  quantity: { type: "string", description: "Hoeveelheid (optioneel)" },
                  category: { type: "string", description: "Categorie zoals Groente, Zuivel, etc." }
                },
                required: ["name"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "add_todo",
              description: "Voeg een taak toe aan de todo lijst",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Titel van de taak" },
                  description: { type: "string", description: "Beschrijving (optioneel)" },
                  priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioriteit" },
                  category: { type: "string", description: "Categorie zoals Huishouden, School, etc." }
                },
                required: ["title", "priority"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Betaling vereist. Voeg credits toe aan je Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway fout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});