import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const nameSchema = z.string()
  .trim()
  .min(1, { message: "Naam mag niet leeg zijn" })
  .max(100, { message: "Naam mag maximaal 100 tekens zijn" });

type UserRole = Tables<"user_roles">;

interface UserWithRoles {
  user_id: string;
  email: string;
  name: string | null;
  roles: string[];
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Group roles by user_id
      const usersMap = new Map<string, UserWithRoles>();
      
      rolesData?.forEach((role: UserRole) => {
        if (!usersMap.has(role.user_id)) {
          usersMap.set(role.user_id, {
            user_id: role.user_id,
            email: "",
            name: null,
            roles: []
          });
        }
        usersMap.get(role.user_id)!.roles.push(role.role);
      });

      // Fetch profile data for all users
      const userIds = Array.from(usersMap.keys());
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        profilesData?.forEach((profile) => {
          const user = usersMap.get(profile.id);
          if (user) {
            user.name = profile.name;
          }
        });
      }

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fout",
        description: "Kan gebruikers niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: "Fout",
        description: "Selecteer zowel gebruiker als rol",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUserId,
          role: selectedRole as "admin" | "user",
        });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Rol succesvol toegevoegd",
      });

      setSelectedUserId("");
      setSelectedRole("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan rol niet toevoegen",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as "admin" | "user");

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Rol succesvol verwijderd",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan rol niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: UserWithRoles) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateName = async () => {
    if (!editingUser) return;

    try {
      const validatedName = nameSchema.parse(editName);

      const { error } = await supabase
        .from("profiles")
        .update({ name: validatedName })
        .eq("id", editingUser.user_id);

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Naam succesvol bijgewerkt",
      });

      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validatiefout",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error updating name:", error);
        toast({
          title: "Fout",
          description: error.message || "Kan naam niet bijwerken",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Gebruikers laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gebruikersbeheer</h2>
        <p className="text-muted-foreground mt-2">
          Beheer gebruikersrollen en permissies
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rol Toewijzen aan Gebruiker</CardTitle>
          <CardDescription>Wijs admin of user rollen toe</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <input
            type="text"
            placeholder="User ID (UUID)"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-md"
          />
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecteer rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddRole}>Rol Toevoegen</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gebruikers & Rollen</CardTitle>
          <CardDescription>Huidige gebruikersrol toewijzingen</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Geen gebruikers gevonden
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name || "Geen naam"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === "admin" ? "default" as const : "secondary" as const}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.roles.map((role) => (
                          <Button
                            key={role}
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveRole(user.user_id, role)}
                          >
                            Verwijder {role}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruikersnaam Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de naam van de gebruiker
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Voer naam in"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleUpdateName}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
