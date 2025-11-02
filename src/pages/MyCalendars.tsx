import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary: boolean;
};

type CalendarAssignment = {
  id: string;
  calendar_id: string;
  calendar_name: string | null;
};

export default function MyCalendars() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Check if user is connected to Google
      const accessToken = localStorage.getItem('google_access_token');
      if (!accessToken) {
        toast({
          title: "Niet verbonden",
          description: "Ga naar het dashboard om je Google Calendar te koppelen.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch available calendars from Google
      const { data: calendarData, error: calendarError } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list_calendars',
          accessToken,
        },
      });

      if (calendarError) throw calendarError;
      setCalendars(calendarData?.calendars || []);

      // Fetch existing assignments
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('calendar_assignments')
        .select('*')
        .eq('user_id', user.id);

      if (assignmentError) throw assignmentError;
      
      setAssignments(assignmentData || []);
      setSelectedCalendars(new Set(assignmentData?.map(a => a.calendar_id) || []));
    } catch (error: any) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Fout",
        description: error.message || "Kan kalenders niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendar = (calendarId: string) => {
    const newSelected = new Set(selectedCalendars);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedCalendars(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all existing assignments
      const { error: deleteError } = await supabase
        .from('calendar_assignments')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (selectedCalendars.size > 0) {
        const newAssignments = Array.from(selectedCalendars).map(calId => {
          const cal = calendars.find(c => c.id === calId);
          return {
            user_id: user.id,
            calendar_id: calId,
            calendar_name: cal?.summary || null,
          };
        });

        const { error: insertError } = await supabase
          .from('calendar_assignments')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      toast({
        title: "Opgeslagen!",
        description: `${selectedCalendars.size} kalender(s) geselecteerd`,
      });

      fetchData();
    } catch (error: any) {
      console.error('Error saving calendar selections:', error);
      toast({
        title: "Fout",
        description: error.message || "Kan selecties niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <p className="text-center text-muted-foreground">Kalenders laden...</p>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Geen verbinding</CardTitle>
            <CardDescription>
              Je Google Calendar is niet gekoppeld. Ga naar het dashboard om deze te koppelen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mijn Kalenders</h1>
        <p className="text-muted-foreground">
          Selecteer welke Google Calendars je wilt synchroniseren
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {calendars.map((calendar) => {
          const isSelected = selectedCalendars.has(calendar.id);
          
          return (
            <Card 
              key={calendar.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
              }`}
              onClick={() => toggleCalendar(calendar.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{calendar.summary}</h3>
                      {calendar.primary && (
                        <Badge variant="secondary" className="text-xs">
                          Hoofdkalender
                        </Badge>
                      )}
                    </div>
                    
                    {calendar.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {calendar.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {calendar.id}
                    </p>
                  </div>
                  
                  {calendar.backgroundColor && (
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-border flex-shrink-0"
                      style={{ backgroundColor: calendar.backgroundColor }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {selectedCalendars.size} van {calendars.length} kalender(s) geselecteerd
        </p>
        <Button onClick={handleSave} disabled={saving}>
          <Calendar className="h-4 w-4 mr-2" />
          {saving ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}
