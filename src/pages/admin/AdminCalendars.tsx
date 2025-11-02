import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function AdminCalendars() {
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchAssignments(), fetchUsers()]);
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

  const handleAddAssignment = async () => {
    if (!userId.trim() || !calendarId.trim()) {
      toast({
        title: "Fout",
        description: "Vul zowel Gebruikers ID als Kalender ID in",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("calendar_assignments")
        .insert({
          user_id: userId.trim(),
          calendar_id: calendarId.trim(),
          calendar_name: calendarName.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Kalender toewijzing succesvol toegevoegd",
      });

      setUserId("");
      setCalendarId("");
      setCalendarName("");
      fetchAssignments();
    } catch (error: any) {
      console.error("Error adding calendar assignment:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan kalender toewijzing niet toevoegen",
        variant: "destructive",
      });
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
          Alleen admins kunnen kalenders toewijzen aan gebruikers. Om te weten welke kalender IDs beschikbaar zijn voor een gebruiker, 
          vraag de gebruiker om in te loggen in hun Google Calendar en de kalender instellingen te bekijken, of gebruik 'primary' voor hun hoofdkalender.
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
            <Label htmlFor="userId">Selecteer Gebruiker</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Kies een gebruiker..." />
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
          <div>
            <Label htmlFor="calendarId">Google Kalender ID</Label>
            <Input
              id="calendarId"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="bijv. primary of daphnepaes3@gmail.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Gebruik 'primary' voor hoofdkalender, of een email adres / kalender ID zoals 'daphnepaes3@gmail.com', 'janneau@gmail.com', etc.
            </p>
          </div>
          <div>
            <Label htmlFor="calendarName">Kalender Naam (optioneel)</Label>
            <Input
              id="calendarName"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              placeholder="bijv. Daphne, Janneau, AI, etc."
            />
          </div>
          <Button onClick={handleAddAssignment} disabled={!userId || !calendarId}>
            Toewijzing Toevoegen
          </Button>
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
