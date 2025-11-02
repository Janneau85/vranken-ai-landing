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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();
    console.log('Meal automation action:', action);

    switch (action) {
      case 'generate_shopping_list': {
        // Genereer boodschappenlijst o.b.v. weekplanning
        const { start_date, end_date } = data;
        
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
          .gte('meal_date', start_date)
          .lte('meal_date', end_date);

        if (mealError) throw mealError;

        // Verzamel alle ingrediënten
        const ingredients = new Map();
        for (const plan of mealPlans || []) {
          if (plan.recipes?.recipe_ingredients) {
            for (const ingredient of plan.recipes.recipe_ingredients) {
              const key = ingredient.ingredient_name.toLowerCase();
              if (ingredients.has(key)) {
                // Combineer hoeveelheden (simpele optelling voor demo)
                const existing = ingredients.get(key);
                ingredients.set(key, {
                  ...existing,
                  quantity: `${existing.quantity} + ${ingredient.quantity}`
                });
              } else {
                ingredients.set(key, {
                  name: ingredient.ingredient_name,
                  quantity: `${ingredient.quantity} ${ingredient.unit}`,
                  category: 'Overig'
                });
              }
            }
          }
        }

        // Voeg items toe aan shopping list
        const itemsToAdd = Array.from(ingredients.values());
        if (itemsToAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('shopping_list_items')
            .insert(itemsToAdd);

          if (insertError) throw insertError;
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            items_added: itemsToAdd.length,
            message: `${itemsToAdd.length} ingrediënten toegevoegd aan boodschappenlijst`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'notify_cooking_time': {
        // Stuur reminder voor de kok van vandaag
        const today = new Date().toISOString().split('T')[0];
        
        const { data: todayMeals, error: mealError } = await supabase
          .from('meal_plan')
          .select(`
            *,
            profiles (name)
          `)
          .eq('meal_date', today)
          .eq('meal_type', 'diner');

        if (mealError) throw mealError;

        const reminders = todayMeals?.map(meal => ({
          meal: meal.custom_meal_name || 'Onbekende maaltijd',
          cook: meal.profiles?.name || 'Niet toegewezen',
          assigned_to: meal.assigned_to
        })) || [];

        return new Response(
          JSON.stringify({ 
            success: true,
            reminders: reminders,
            message: `${reminders.length} kook reminders voor vandaag`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest_weekly_meals': {
        // Gebruik AI om weekmenu te genereren (placeholder voor AI integratie)
        // Dit kan later worden uitgebreid met Lovable AI of OpenAI
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'AI meal suggestions kunnen hier worden toegevoegd'
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
    console.error('Meal automation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
