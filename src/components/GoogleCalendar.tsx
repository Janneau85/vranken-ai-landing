import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ExternalLink } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  htmlLink?: string;
  location?: string;
  calendarId?: string;
  calendarName?: string;
  backgroundColor?: string;
}

const GOOGLE_CLIENT_ID = "180123280397-g3ulpf9rv6cetrlrh8veg3pmdkba9u3m.apps.googleusercontent.com";
const REDIRECT_URI = window.location.origin + "/dashboard";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const GoogleCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have tokens in localStorage
    const accessToken = localStorage.getItem('google_access_token');
    const refreshToken = localStorage.getItem('google_refresh_token');
    
    if (accessToken) {
      setIsConnected(true);
      fetchEvents(accessToken, refreshToken);
    }

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    try {
      setLoading(true);
      
      // Use edge function to exchange code for tokens (keeps client secret secure)
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'exchange_code',
          code,
          redirectUri: REDIRECT_URI,
        },
      });

      if (error || !data?.access_token) {
        throw new Error('Failed to get access token');
      }

      // Store tokens
      localStorage.setItem('google_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('google_refresh_token', data.refresh_token);
      }

      setIsConnected(true);
      await fetchEvents(data.access_token, data.refresh_token);

      toast({
        title: "Connected!",
        description: "Google Calendar successfully connected.",
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToGoogle = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  };

  const fetchEvents = async (accessToken: string, refreshToken: string | null) => {
    try {
      setLoading(true);

      // First, get user's assigned calendars
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: assignments, error: assignError } = await supabase
        .from('calendar_assignments')
        .select('calendar_id, calendar_name')
        .eq('user_id', user.id);

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        setEvents([]);
        toast({
          title: "Geen calendars",
          description: "Er zijn geen calendars aan jou toegewezen. Ga naar 'Mijn Kalenders' om kalenders te selecteren.",
        });
        setLoading(false);
        return;
      }

      // Fetch list of calendars to get colors
      const { data: calendarListData } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list_calendars',
          accessToken,
        },
      });

      const calendarColors = new Map();
      if (calendarListData?.calendars) {
        calendarListData.calendars.forEach((cal: any) => {
          calendarColors.set(cal.id, {
            backgroundColor: cal.backgroundColor,
            summary: cal.summary,
          });
        });
      }

      // Fetch events for each assigned calendar
      const allEvents: CalendarEvent[] = [];
      for (const assignment of assignments) {
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'get_events',
            accessToken,
            refreshToken,
            calendarId: assignment.calendar_id,
          },
        });

        if (error) {
          console.error(`Error fetching calendar ${assignment.calendar_id}:`, error);
          continue;
        }
        
        if (data?.events) {
          const calendarInfo = calendarColors.get(assignment.calendar_id);
          const enrichedEvents = data.events.map((event: CalendarEvent) => ({
            ...event,
            calendarId: assignment.calendar_id,
            calendarName: assignment.calendar_name || calendarInfo?.summary || assignment.calendar_id,
            backgroundColor: calendarInfo?.backgroundColor,
          }));
          allEvents.push(...enrichedEvents);
        }
      }

      // Sort events by start time
      allEvents.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || '';
        const bTime = b.start.dateTime || b.start.date || '';
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // If token expired, try to refresh
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (refreshToken) {
        await refreshAccessToken(refreshToken);
      } else {
        toast({
          title: "Session expired",
          description: "Please reconnect your Google Calendar.",
          variant: "destructive",
        });
        setIsConnected(false);
        localStorage.removeItem('google_access_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'refresh_token',
          refreshToken,
        },
      });

      if (error) throw error;

      if (data?.access_token) {
        localStorage.setItem('google_access_token', data.access_token);
        await fetchEvents(data.access_token, refreshToken);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      setIsConnected(false);
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
    }
  };

  const disconnect = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    setIsConnected(false);
    setEvents([]);
    toast({
      title: "Disconnected",
      description: "Google Calendar has been disconnected.",
    });
  };

  const formatEventDate = (event: CalendarEvent) => {
    const startDate = event.start.dateTime || event.start.date;
    if (!startDate) return '';
    
    const date = new Date(startDate);
    const isAllDay = !event.start.dateTime;
    
    if (isAllDay) {
      return date.toLocaleDateString('nl-NL', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          {isConnected 
            ? "Je komende evenementen" 
            : "Koppel je Google Calendar om evenementen te zien"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <Button onClick={connectToGoogle} disabled={loading}>
            {loading ? "Verbinden..." : "Koppel Google Calendar"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button 
                onClick={() => {
                  const accessToken = localStorage.getItem('google_access_token');
                  const refreshToken = localStorage.getItem('google_refresh_token');
                  if (accessToken) fetchEvents(accessToken, refreshToken);
                }} 
                disabled={loading}
                variant="outline"
              >
                {loading ? "Laden..." : "Ververs"}
              </Button>
              <Button onClick={disconnect} variant="ghost" size="sm">
                Ontkoppel
              </Button>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-8">Evenementen laden...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Geen komende evenementen</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 10).map((event) => (
                  <div 
                    key={event.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: event.backgroundColor || 'hsl(var(--primary))',
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{event.summary}</h4>
                          {event.calendarName && (
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: event.backgroundColor ? `${event.backgroundColor}20` : 'hsl(var(--accent))',
                                color: event.backgroundColor || 'hsl(var(--foreground))',
                              }}
                            >
                              {event.calendarName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventDate(event)}</span>
                        </div>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                      {event.htmlLink && (
                        <a 
                          href={event.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendar;
