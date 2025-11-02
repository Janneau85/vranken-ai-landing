import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar as CalendarIcon, CheckSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast as sonnerToast } from "sonner";

type CalendarAssignment = {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  name: string | null;
  email?: string;
};

type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
};

type TodoCalendarConfig = {
  id: string;
  calendar_id: string;
  calendar_name: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminCalendars() {
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userCalendars, setUserCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [todoCalendarConfig, setTodoCalendarConfig] = useState<TodoCalendarConfig | null>(null);
  const [todoCalendars, setTodoCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoadingTodoCalendars, setIsLoadingTodoCalendars] = useState(false);
  const [selectedTodoCalendarId, setSelectedTodoCalendarId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchAssignments(), fetchUsers(), fetchTodoCalendarConfig()]);
  };

  const fetchTodoCalendarConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("todo_calendar_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setTodoCalendarConfig(data);
    } catch (error) {
      console.error("Error fetching todo calendar config:", error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching calendar assignments:", error);
      toast({
        title: "Fout",
        description: "Kan kalender toewijzingen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' }
      });

      if (error) throw error;
      
      if (data?.users) {
        setUsers(data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email
        })));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fout",
        description: "Kan gebruikers niet laden",
        variant: "destructive",
      });
    }
  };

  const fetchUserCalendars = async (selectedUserId: string) => {
    if (!selectedUserId) {
      setUserCalendars([]);
      setSelectedCalendarId("");
      return;
    }

    setIsLoadingCalendars(true);
    try {
      // Always fetch calendars from the master janneauv@gmail.com account
      const MASTER_ACCOUNT_ID = 'b64ce1b2-e684-4568-87ac-0e5bc867366d'; // janneauv@gmail.com
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'list_calendars_for_user',
          userId: MASTER_ACCOUNT_ID
        }
      });

      if (error) throw error;

      if (data?.items) {
        setUserCalendars(data.items);
      } else {
        setUserCalendars([]);
        sonnerToast.error("Kan kalenders niet ophalen uit het master account");
      }
    } catch (error: any) {
      console.error("Error fetching calendars from master account:", error);
      sonnerToast.error("Fout bij ophalen van kalenders uit master account");
      setUserCalendars([]);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleUserChange = (selectedUserId: string) => {
    setUserId(selectedUserId);
    setSelectedCalendarId("");
    fetchUserCalendars(selectedUserId);
  };

  const handleAddAssignment = async () => {
    if (!userId || !selectedCalendarId) {
      sonnerToast.error("Selecteer een gebruiker en kalender");
      return;
    }

    const selectedCalendar = userCalendars.find(c => c.id === selectedCalendarId);

    try {
      const { error } = await supabase
        .from("calendar_assignments")
        .insert({
          user_id: userId,
          calendar_id: selectedCalendarId,
          calendar_name: selectedCalendar?.summary || null,
        });

      if (error) throw error;

      sonnerToast.success("Kalender toegewezen aan gebruiker");
      setUserId("");
      setSelectedCalendarId("");
      setUserCalendars([]);
      fetchAssignments();
    } catch (error: any) {
      console.error("Error adding calendar assignment:", error);
      sonnerToast.error(error.message || "Fout bij toewijzen van kalender");
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("calendar_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Kalender toewijzing succesvol verwijderd",
      });

      fetchAssignments();
    } catch (error: any) {
      console.error("Error removing calendar assignment:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan kalender toewijzing niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const fetchTodoCalendarsFromMaster = async () => {
    setIsLoadingTodoCalendars(true);
    try {
      const MASTER_ACCOUNT_ID = 'b64ce1b2-e684-4568-87ac-0e5bc867366d';
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'list_calendars_for_user',
          userId: MASTER_ACCOUNT_ID
        }
      });

      if (error) throw error;

      if (data?.items) {
        setTodoCalendars(data.items);
      } else {
        setTodoCalendars([]);
        sonnerToast.error("Kan kalenders niet ophalen uit het master account");
      }
    } catch (error: any) {
      console.error("Error fetching calendars from master account:", error);
      sonnerToast.error("Fout bij ophalen van kalenders uit master account");
      setTodoCalendars([]);
    } finally {
      setIsLoadingTodoCalendars(false);
    }
  };

  const handleSetTodoCalendar = async () => {
    if (!selectedTodoCalendarId) {
      sonnerToast.error("Selecteer een kalender");
      return;
    }

    const selectedCalendar = todoCalendars.find(c => c.id === selectedTodoCalendarId);

    try {
      // Deactivate existing config if any
      if (todoCalendarConfig) {
        await supabase
          .from("todo_calendar_config")
          .update({ is_active: false })
          .eq("id", todoCalendarConfig.id);
      }

      // Insert new config
      const { error } = await supabase
        .from("todo_calendar_config")
        .insert({
          calendar_id: selectedTodoCalendarId,
          calendar_name: selectedCalendar?.summary || '',
          is_active: true
        });

      if (error) throw error;

      sonnerToast.success("Todo kalender succesvol gekoppeld");
      setSelectedTodoCalendarId("");
      setTodoCalendars([]);
      fetchTodoCalendarConfig();
    } catch (error: any) {
      console.error("Error setting todo calendar:", error);
      sonnerToast.error(error.message || "Fout bij koppelen van todo kalender");
    }
  };

  const handleRemoveTodoCalendar = async () => {
    if (!todoCalendarConfig) return;

    try {
      const { error } = await supabase
        .from("todo_calendar_config")
        .update({ is_active: false })
        .eq("id", todoCalendarConfig.id);

      if (error) throw error;

      sonnerToast.success("Todo kalender ontkoppeld");
      fetchTodoCalendarConfig();
    } catch (error: any) {
      console.error("Error removing todo calendar:", error);
      sonnerToast.error(error.message || "Fout bij ontkoppelen van todo kalender");
    }
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || 'Onbekende gebruiker';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Kalender Beheer</h1>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Let op:</strong> Alle kalenders worden opgehaald uit het janneauv@gmail.com account.
          Selecteer een gebruiker en wijs een kalender toe aan deze gebruiker.
        </AlertDescription>
      </Alert>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Wijs Kalender Toe aan Gebruiker</CardTitle>
          <CardDescription>
            Selecteer een gebruiker en voer de Google Kalender details in
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="userId">Gebruiker</Label>
            <Select value={userId} onValueChange={handleUserChange}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Selecteer gebruiker..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {userId && (
            <div>
              <Label htmlFor="calendar">Google Kalender</Label>
              {isLoadingCalendars ? (
                <div className="flex items-center gap-2 p-3 border rounded-md text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 animate-spin" />
                  Kalenders ophalen...
                </div>
              ) : userCalendars.length > 0 ? (
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger id="calendar">
                    <SelectValue placeholder="Selecteer kalender..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {userCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2 py-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          <span className="font-medium">{calendar.summary}</span>
                          {calendar.primary && (
                            <Badge variant="secondary" className="ml-1 text-xs">Primary</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {calendar.id.substring(0, 20)}...
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Kan kalenders niet ophalen uit het master account (janneauv@gmail.com).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Button 
            onClick={handleAddAssignment}
            disabled={!userId || !selectedCalendarId || isLoadingCalendars}
          >
            Toevoegen
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Todo Kalender Koppeling
          </CardTitle>
          <CardDescription>
            Koppel een kalender voor automatische todo synchronisatie
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {todoCalendarConfig ? (
            <div className="space-y-4">
              <Alert>
                <CalendarIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Actieve todo kalender:</div>
                  <div className="text-sm">
                    <strong>{todoCalendarConfig.calendar_name}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {todoCalendarConfig.calendar_id}
                  </div>
                </AlertDescription>
              </Alert>
              <Button 
                variant="destructive" 
                onClick={handleRemoveTodoCalendar}
              >
                Ontkoppel Todo Kalender
              </Button>
            </div>
          ) : (
            <>
              {todoCalendars.length === 0 ? (
                <Button 
                  onClick={fetchTodoCalendarsFromMaster}
                  disabled={isLoadingTodoCalendars}
                >
                  {isLoadingTodoCalendars ? "Laden..." : "Kalenders Ophalen"}
                </Button>
              ) : (
                <>
                  <div>
                    <Label htmlFor="todoCalendar">Selecteer Todo Kalender</Label>
                    <Select value={selectedTodoCalendarId} onValueChange={setSelectedTodoCalendarId}>
                      <SelectTrigger id="todoCalendar">
                        <SelectValue placeholder="Selecteer kalender..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {todoCalendars.map((calendar) => (
                          <SelectItem key={calendar.id} value={calendar.id}>
                            <div className="flex items-center gap-2 py-1">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                              />
                              <span className="font-medium">{calendar.summary}</span>
                              {calendar.primary && (
                                <Badge variant="secondary" className="ml-1 text-xs">Primary</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSetTodoCalendar}
                      disabled={!selectedTodoCalendarId}
                    >
                      Koppel Todo Kalender
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setTodoCalendars([]);
                        setSelectedTodoCalendarId("");
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Huidige Toewijzingen</CardTitle>
          <CardDescription>Overzicht van alle kalender toewijzingen per gebruiker</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nog geen kalender toewijzingen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Kalender ID</TableHead>
                  <TableHead>Kalender Naam</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {getUserName(assignment.user_id)}
                      <div className="text-xs text-muted-foreground font-mono">
                        {assignment.user_id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.calendar_id}</Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.calendar_name ? (
                        <span className="font-medium">{assignment.calendar_name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                      >
                        Verwijder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
