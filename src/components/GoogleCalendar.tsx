import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ExternalLink, Unplug, RefreshCcw } from "lucide-react";

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

interface GoogleCalendarProps {
  isAdmin: boolean;
}

const GOOGLE_CLIENT_ID = "180123280397-91i67vlquc2mm835toa1r4jbuvp7rvc0.apps.googleusercontent.com";
const REDIRECT_URI = window.location.origin + "/dashboard";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
].join(" ");

const GoogleCalendar = ({ isAdmin }: GoogleCalendarProps) => {
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
      
      // Sync tokens to database if not already there
      syncTokensToDatabase(accessToken, refreshToken);
      
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

  const syncTokensToDatabase = async (accessToken: string, refreshToken: string | null) => {
    if (!refreshToken) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if tokens already exist in database
      const { data: existingTokens } = await supabase
        .from('google_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingTokens) return; // Already synced

      // Store tokens in database
      const expiresAt = localStorage.getItem('google_token_expires_at') || null;
      
      await supabase
        .from('google_tokens')
        .upsert({
          user_id: user.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
        }, {
          onConflict: 'user_id'
        });

      console.log('Tokens synced to database');
    } catch (error) {
      console.error('Error syncing tokens to database:', error);
    }
  };

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

      // Store tokens in localStorage
      localStorage.setItem('google_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('google_refresh_token', data.refresh_token);
      }

      // Also store in database for admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.refresh_token) {
        const expiresAt = data.expires_in 
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null;

        const { error: dbError } = await supabase
          .from('google_tokens')
          .upsert({
            user_id: user.id,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt,
          }, {
            onConflict: 'user_id'
          });

        if (dbError) {
          console.error('Error storing tokens in database:', dbError);
        }
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
      `include_granted_scopes=true&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  };

  const fetchEvents = async (accessToken: string, refreshToken: string | null, isRetry = false) => {
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
      const { data: calendarListData, error: listError } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list_calendars',
          accessToken,
        },
      });

      // If we get a 401 error, try to refresh token
      if (listError && !isRetry && refreshToken) {
        console.log('Token expired, refreshing...');
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          return fetchEvents(newToken, refreshToken, true);
        }
        throw new Error('Failed to refresh token');
      }

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
          
          // If 401 error on first calendar, try to refresh token
          if (allEvents.length === 0 && !isRetry && refreshToken) {
            const newToken = await refreshAccessToken(refreshToken);
            if (newToken) {
              return fetchEvents(newToken, refreshToken, true);
            }
          }
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
      
      toast({
        title: "Fout bij laden",
        description: "Kon evenementen niet laden. Probeer opnieuw te koppelen.",
        variant: "destructive",
      });
      setIsConnected(false);
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
    try {
      console.log('Refreshing access token...');
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'refresh_token',
          refreshToken,
        },
      });

      if (error) throw error;

      if (data?.access_token) {
        localStorage.setItem('google_access_token', data.access_token);
        
        // Also update in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expiresAt = data.expires_in 
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null;
            
          await supabase
            .from('google_tokens')
            .update({
              access_token: data.access_token,
              expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
        
        console.log('Token successfully refreshed');
        return data.access_token;
      }
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      setIsConnected(false);
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
      return null;
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

  const formatEventTime = (event: CalendarEvent) => {
    const startDate = event.start.dateTime || event.start.date;
    if (!startDate) return '';
    
    const date = new Date(startDate);
    const isAllDay = !event.start.dateTime;
    
    if (isAllDay) {
      return 'Hele dag';
    }
    
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    }).sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || '';
      const bTime = b.start.dateTime || b.start.date || '';
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  };

  const getNext7DaysEvents = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(tomorrow);
      date.setDate(tomorrow.getDate() + i);
      return date;
    });

    return next7Days.map(date => {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === date.getTime();
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return {
        date,
        events: dayEvents.sort((a, b) => {
          const aTime = a.start.dateTime || a.start.date || '';
          const bTime = b.start.dateTime || b.start.date || '';
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        }),
        isToday: date.getTime() === today.getTime()
      };
    });
  };

  const todayEvents = getTodayEvents();
  const weekEvents = getNext7DaysEvents();

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Familie Agenda
              </CardTitle>
              <CardDescription>
                Vandaag en komende week
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {!isConnected ? (
                  <Button onClick={connectToGoogle} disabled={loading} size="sm">
                    {loading ? "Verbinden..." : "Koppel Calendar"}
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const accessToken = localStorage.getItem('google_access_token');
                        const refreshToken = localStorage.getItem('google_refresh_token');
                        if (accessToken) fetchEvents(accessToken, refreshToken);
                      }} 
                      disabled={loading}
                      className="opacity-70 hover:opacity-100 transition-colors p-1 rounded hover:text-[hsl(47_95%_55%)]"
                      aria-label="Ververs"
                      title="Ververs"
                    >
                      <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={disconnect}
                          className="opacity-50 hover:opacity-100 hover:text-destructive transition-all p-1 rounded"
                        >
                          <Unplug className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ontkoppelen</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Evenementen laden...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Geen komende evenementen</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Vandaag Sectie - Grotere tekst en neemt meer ruimte */}
            <div className="md:col-span-5 md:border-r md:pr-6">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Vandaag
              </h3>
              <p className="text-lg text-muted-foreground mb-4">
                {new Date().toLocaleDateString('nl-NL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
              
              {todayEvents.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <p className="text-lg text-muted-foreground">Geen afspraken vandaag 🎉</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="p-5 border-2 rounded-lg hover:bg-accent/50 transition-colors"
                      style={{
                        borderLeftWidth: '5px',
                        borderLeftColor: event.backgroundColor || 'hsl(var(--primary))',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-bold text-lg flex-1">{event.summary}</h4>
                        {event.htmlLink && (
                          <a 
                            href={event.htmlLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex-shrink-0"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-base text-muted-foreground">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">{formatEventTime(event)}</span>
                      </div>
                      {event.location && (
                        <p className="text-base text-muted-foreground mt-3">
                          📍 {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-base text-muted-foreground mt-3 line-clamp-3">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Komende Week Sectie */}
            <div className="md:col-span-7">
              <h3 className="text-xl font-bold mb-4">Komende 7 dagen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekEvents.map(({ date, events: dayEvents }) => (
                  <div 
                    key={date.toISOString()} 
                    className="border rounded-lg p-4 bg-card"
                  >
                    <div className="mb-3 pb-2 border-b">
                      <h3 className="font-semibold">
                        {date.toLocaleDateString('nl-NL', { weekday: 'short' })}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Geen afspraken</p>
                      ) : (
                        dayEvents.map((event) => (
                          <div 
                            key={event.id}
                            className="p-2 border rounded hover:bg-accent/50 transition-colors"
                            style={{
                              borderLeftWidth: '3px',
                              borderLeftColor: event.backgroundColor || 'hsl(var(--primary))',
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{event.summary}</h4>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatEventTime(event)}</span>
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
                                  className="text-primary hover:text-primary/80 flex-shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default GoogleCalendar;
