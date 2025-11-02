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

    const { action, todoId } = await req.json();
    console.log('Sync todos action:', action, 'todoId:', todoId);

    // Get active todo calendar config
    const { data: config, error: configError } = await supabase
      .from('todo_calendar_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'No active todo calendar configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get master account tokens
    const MASTER_ACCOUNT_ID = 'b64ce1b2-e684-4568-87ac-0e5bc867366d';
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', MASTER_ACCOUNT_ID)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Master account not connected to Google Calendar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token needs refresh
    if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: tokenData.refresh_token!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from('google_tokens')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('user_id', MASTER_ACCOUNT_ID);
    }

    switch (action) {
      case 'create_event': {
        // Get todo details
        const { data: todo, error: todoError } = await supabase
          .from('todos')
          .select('*, profiles!todos_assigned_to_fkey(name)')
          .eq('id', todoId)
          .single();

        if (todoError || !todo) {
          throw new Error('Todo not found');
        }

        // Create Google Calendar event
        const event = {
          summary: `📋 ${todo.title}`,
          description: `${todo.description || ''}\n\nCategorie: ${todo.category || 'Geen'}\nPrioriteit: ${todo.priority}\nToegewezen aan: ${todo.profiles?.name || 'Niemand'}`,
          start: {
            dateTime: todo.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timeZone: 'Europe/Amsterdam',
          },
          end: {
            dateTime: todo.due_date 
              ? new Date(new Date(todo.due_date).getTime() + 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            timeZone: 'Europe/Amsterdam',
          },
          extendedProperties: {
            private: {
              todoId: todo.id,
              appSource: 'vranken-family-dashboard'
            }
          }
        };

        const createResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendar_id)}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`Failed to create calendar event: ${error}`);
        }

        const createdEvent = await createResponse.json();

        // Store event ID in todo
        await supabase
          .from('todos')
          .update({ 
            notes: `Google Calendar Event ID: ${createdEvent.id}`
          })
          .eq('id', todoId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            eventId: createdEvent.id,
            message: 'Todo toegevoegd aan kalender'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_event': {
        // Get todo to find event ID
        const { data: todo, error: todoError } = await supabase
          .from('todos')
          .select('notes')
          .eq('id', todoId)
          .single();

        if (todoError || !todo) {
          throw new Error('Todo not found');
        }

        // Extract event ID from notes
        const eventIdMatch = todo.notes?.match(/Google Calendar Event ID: (.+)/);
        if (!eventIdMatch) {
          return new Response(
            JSON.stringify({ success: true, message: 'No calendar event linked' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const eventId = eventIdMatch[1];

        // Delete from Google Calendar
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendar_id)}/events/${eventId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const error = await deleteResponse.text();
          throw new Error(`Failed to delete calendar event: ${error}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Event verwijderd van kalender'
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
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
