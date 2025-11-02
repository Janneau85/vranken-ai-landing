import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { action, accessToken, refreshToken, code, redirectUri, calendarId } = body;
    console.log('Google Calendar function called with action:', action);

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

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
