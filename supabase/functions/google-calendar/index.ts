import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, accessToken, refreshToken, code, redirectUri, calendarId, userId } = body;
    console.log('Google Calendar function called with action:', action);

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Initialize Supabase client for list_calendars_for_user action
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle token exchange
    if (action === 'exchange_code' && code && redirectUri) {
      console.log('Exchanging authorization code for tokens');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      return new Response(
        JSON.stringify({ 
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle token refresh
    if (action === 'refresh_token' && refreshToken) {
      console.log('Refreshing access token');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token refresh failed:', error);
        throw new Error('Failed to refresh access token');
      }

      const tokenData = await tokenResponse.json();
      return new Response(
        JSON.stringify({ 
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle listing calendars
    if (action === 'list_calendars' && accessToken) {
      console.log('Fetching calendar list');
      
      const calendarListResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!calendarListResponse.ok) {
        const error = await calendarListResponse.text();
        console.error('Failed to fetch calendar list:', error);
        throw new Error('Failed to fetch calendar list');
      }

      const calendarListData = await calendarListResponse.json();
      const calendars = calendarListData.items?.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        primary: cal.primary || false,
      })) || [];
      
      console.log(`Successfully fetched ${calendars.length} calendars`);

      return new Response(
        JSON.stringify({ calendars }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle getting calendar events
    if (action === 'get_events' && accessToken) {
      const targetCalendar = calendarId || 'primary';
      console.log(`Fetching calendar events from: ${targetCalendar}`);
      
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events?` +
        `timeMin=${now.toISOString()}&` +
        `timeMax=${oneMonthLater.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime&` +
        `maxResults=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!eventsResponse.ok) {
        const error = await eventsResponse.text();
        console.error('Failed to fetch events:', error);
        throw new Error('Failed to fetch calendar events');
      }

      const eventsData = await eventsResponse.json();
      console.log(`Successfully fetched ${eventsData.items?.length || 0} events from ${targetCalendar}`);

      return new Response(
        JSON.stringify({ events: eventsData.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle listing calendars for a user (admin only)
    if (action === 'list_calendars_for_user' && userId) {
      console.log('Admin listing calendars for user:', userId);
      
      // Get the requesting user from the auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if requester is admin
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch user's token from database
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'User has not connected Google Calendar yet' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let userAccessToken = tokenData.access_token;

      // Check if token is expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
        if (!tokenData.refresh_token) {
          return new Response(
            JSON.stringify({ error: 'Token expired and no refresh token available' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to refresh token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const refreshData = await refreshResponse.json();
        userAccessToken = refreshData.access_token;

        // Update token in database
        const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
        await supabaseClient
          .from('google_tokens')
          .update({
            access_token: refreshData.access_token,
            expires_at: expiresAt,
          })
          .eq('user_id', userId);
      }

      // Fetch calendars
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
          },
        }
      );

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Calendar API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calendars from Google' }),
          { status: calendarResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarData = await calendarResponse.json();
      
      return new Response(
        JSON.stringify(calendarData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action or missing parameters');

  } catch (error) {
    console.error('Error in google-calendar function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
