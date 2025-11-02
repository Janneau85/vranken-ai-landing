import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type CalendarAssignment = {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name: string | null;
  created_at: string;
};

type UserWithAssignments = {
  user_id: string;
  email: string;
  calendars: CalendarAssignment[];
};

export default function AdminCalendars() {
  const [users, setUsers] = useState<UserWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCalendarAssignments();
  }, []);

  const fetchCalendarAssignments = async () => {
    try {
      setLoading(true);

      // Fetch all calendar assignments
      const { data: assignments, error: assignError } = await supabase
        .from("calendar_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignError) throw assignError;

      // Get unique user IDs
      const userIds = [...new Set(assignments?.map(a => a.user_id) || [])];

      // Fetch user emails using RPC or auth admin
      const usersMap = new Map<string, string>();
      for (const userId of userIds) {
        // Since we can't access auth.users directly, we'll just use the user_id
        usersMap.set(userId, userId);
      }

      // Group assignments by user
      const userAssignments: UserWithAssignments[] = userIds.map(userId => ({
        user_id: userId,
        email: usersMap.get(userId) || userId,
        calendars: assignments?.filter(a => a.user_id === userId) || [],
      }));

      setUsers(userAssignments);
    } catch (error: any) {
      console.error("Error fetching calendar assignments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch calendar assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId || !calendarId) {
      toast({
        title: "Error",
        description: "User ID en Calendar ID zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("calendar_assignments").insert({
        user_id: selectedUserId,
        calendar_id: calendarId,
        calendar_name: calendarName || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Calendar toegewezen aan gebruiker",
      });

      setSelectedUserId("");
      setCalendarId("");
      setCalendarName("");
      fetchCalendarAssignments();
    } catch (error: any) {
      console.error("Error adding calendar assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add calendar assignment",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("calendar_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Calendar toewijzing verwijderd",
      });

      fetchCalendarAssignments();
    } catch (error: any) {
      console.error("Error removing calendar assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove calendar assignment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar Toewijzingen</h1>
        <p className="text-muted-foreground">
          Wijs Google Calendars toe aan gebruikers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe toewijzing</CardTitle>
          <CardDescription>
            Voeg een calendar toe aan een gebruiker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendarId">Calendar ID</Label>
            <Input
              id="calendarId"
              placeholder="primary of specifieke calendar ID"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendarName">Calendar Naam (optioneel)</Label>
            <Input
              id="calendarName"
              placeholder="Bijv. Team Calendar"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
            />
          </div>
          <Button onClick={handleAddAssignment}>Toewijzen</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Huidige toewijzingen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Calendar ID</TableHead>
                <TableHead>Calendar Naam</TableHead>
                <TableHead>Toegevoegd</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.flatMap((user) =>
                user.calendars.map((calendar) => (
                  <TableRow key={calendar.id}>
                    <TableCell className="font-mono text-sm">
                      {calendar.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{calendar.calendar_id}</TableCell>
                    <TableCell>{calendar.calendar_name || "-"}</TableCell>
                    <TableCell>
                      {new Date(calendar.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(calendar.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Geen toewijzingen gevonden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
