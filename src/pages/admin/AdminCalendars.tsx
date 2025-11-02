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

type CalendarAssignment = {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name: string | null;
  created_at: string;
};

export default function AdminCalendars() {
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Kalender Beheer</h1>

      <div className="bg-card p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Wijs Kalender Toe aan Gebruiker</h2>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="userId">Gebruikers ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Voer gebruiker UUID in"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tip: Ga naar Users & Roles om gebruikers IDs te vinden
            </p>
          </div>
          <div>
            <Label htmlFor="calendarId">Google Kalender ID</Label>
            <Input
              id="calendarId"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="bijv. primary of kalender@group.calendar.google.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Gebruik 'primary' voor de hoofdkalender of een specifieke kalender ID
            </p>
          </div>
          <div>
            <Label htmlFor="calendarName">Kalender Naam (optioneel)</Label>
            <Input
              id="calendarName"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              placeholder="bijv. Werk Kalender"
            />
          </div>
          <Button onClick={handleAddAssignment}>Toewijzing Toevoegen</Button>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Huidige Toewijzingen</h2>
        {assignments.length === 0 ? (
          <p className="text-muted-foreground">Nog geen kalender toewijzingen.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gebruikers ID</TableHead>
                <TableHead>Kalender ID</TableHead>
                <TableHead>Kalender Naam</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-mono text-sm">
                    {assignment.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.calendar_id}</Badge>
                  </TableCell>
                  <TableCell>{assignment.calendar_name || "-"}</TableCell>
                  <TableCell>
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
      </div>
    </div>
  );
}
