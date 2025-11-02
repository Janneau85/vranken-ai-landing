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
    console.log('Todo automation action:', action);

    switch (action) {
      case 'create_recurring_todos': {
        // Maak recurring taken aan o.b.v. todo_templates
        const { data: templates, error: fetchError } = await supabase
          .from('todo_templates')
          .select('*')
          .eq('is_active', true);

        if (fetchError) throw fetchError;

        const todosToCreate = templates?.map(template => ({
          title: template.title,
          description: template.description,
          category: template.category,
          assigned_to: template.default_assigned_to,
          status: 'open',
          priority: 'medium'
        })) || [];

        if (todosToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from('todos')
            .insert(todosToCreate);

          if (insertError) throw insertError;
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            created_count: todosToCreate.length,
            message: `${todosToCreate.length} recurring taken aangemaakt`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_reminders': {
        // Haal overdue tasks op en stuur reminders
        const today = new Date().toISOString();
        
        const { data: overdueTodos, error: fetchError } = await supabase
          .from('todos')
          .select(`
            *,
            profiles!todos_assigned_to_fkey (id, name)
          `)
          .eq('status', 'open')
          .lt('due_date', today)
          .order('due_date', { ascending: true });

        if (fetchError) throw fetchError;

        const reminders = overdueTodos?.map(todo => ({
          todo_id: todo.id,
          title: todo.title,
          assigned_to: todo.profiles?.name || 'Niet toegewezen',
          user_id: todo.assigned_to,
          days_overdue: Math.floor(
            (new Date().getTime() - new Date(todo.due_date).getTime()) / (1000 * 60 * 60 * 24)
          )
        })) || [];

        return new Response(
          JSON.stringify({ 
            success: true,
            reminders: reminders,
            message: `${reminders.length} overdue taken gevonden`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_random_chore': {
        // Wijs een taak random toe aan een familielid
        const { todo_id } = data;
        
        // Haal alle profiles op
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id');

        if (profileError) throw profileError;

        if (!profiles || profiles.length === 0) {
          throw new Error('Geen profielen gevonden');
        }

        // Selecteer random profiel
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

        // Update todo
        const { error: updateError } = await supabase
          .from('todos')
          .update({ assigned_to: randomProfile.id })
          .eq('id', todo_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ 
            success: true,
            assigned_to: randomProfile.id,
            message: 'Taak random toegewezen'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'calculate_stats': {
        // Bereken statistieken voor gamification
        const { user_id } = data;
        
        const { data: userTodos, error: fetchError } = await supabase
          .from('todos')
          .select('status, priority')
          .eq('assigned_to', user_id);

        if (fetchError) throw fetchError;

        const stats = {
          total: userTodos?.length || 0,
          completed: userTodos?.filter(t => t.status === 'completed').length || 0,
          open: userTodos?.filter(t => t.status === 'open').length || 0,
          high_priority: userTodos?.filter(t => t.priority === 'high' && t.status === 'open').length || 0
        };

        return new Response(
          JSON.stringify({ 
            success: true,
            stats: stats
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
    console.error('Todo automation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
