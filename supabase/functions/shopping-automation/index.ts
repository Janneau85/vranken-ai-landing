import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();
    console.log('Shopping automation action:', action);

    switch (action) {
      case 'add_recurring_items': {
        // Haal alle actieve recurring items op
        const { data: recurringItems, error: fetchError } = await supabase
          .from('shopping_recurring_items')
          .select('*')
          .eq('is_active', true);

        if (fetchError) throw fetchError;

        const itemsToAdd = [];
        const now = new Date();

        for (const item of recurringItems || []) {
          // Check of het tijd is om het item toe te voegen
          if (!item.last_added || 
              (now.getTime() - new Date(item.last_added).getTime()) / (1000 * 60 * 60 * 24) >= item.frequency_days) {
            itemsToAdd.push({
              name: item.name,
              quantity: item.quantity,
              category: item.category,
              is_checked: false
            });

            // Update last_added timestamp
            await supabase
              .from('shopping_recurring_items')
              .update({ last_added: now.toISOString() })
              .eq('id', item.id);
          }
        }

        if (itemsToAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('shopping_list_items')
            .insert(itemsToAdd);

          if (insertError) throw insertError;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            added_count: itemsToAdd.length,
            message: `${itemsToAdd.length} recurring items toegevoegd`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'notify_list_updated': {
        // Deze endpoint kan door n8n gebruikt worden om notificaties te versturen
        // Bijv. via WhatsApp, Telegram, of email
        const { item_name, action_type } = data;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Notificatie trigger voor: ${action_type} - ${item_name}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest_items': {
        // Deze endpoint kan AI gebruiken om items voor te stellen
        // O.b.v. meal plan of eerdere aankopen
        const { data: mealPlans, error: mealError } = await supabase
          .from('meal_plan')
          .select(`
            *,
            recipes (
              id,
              name,
              recipe_ingredients (
                ingredient_name,
                quantity,
                unit
              )
            )
          `)
          .gte('meal_date', new Date().toISOString().split('T')[0])
          .limit(7);

        if (mealError) throw mealError;

        // Extract ingredients from recipes
        const suggestions = [];
        for (const plan of mealPlans || []) {
          if (plan.recipes?.recipe_ingredients) {
            for (const ingredient of plan.recipes.recipe_ingredients) {
              suggestions.push({
                name: ingredient.ingredient_name,
                quantity: `${ingredient.quantity} ${ingredient.unit}`,
                category: 'Overig'
              });
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            suggestions: suggestions
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Shopping automation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
