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
import { Pencil, Trash2, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const nameSchema = z.string()
  .trim()
  .min(1, { message: "Naam mag niet leeg zijn" })
  .max(100, { message: "Naam mag maximaal 100 tekens zijn" });

const emailSchema = z.string().trim().email({ message: "Ongeldig e-mailadres" });

const passwordSchema = z.string()
  .min(6, { message: "Wachtwoord moet minimaal 6 tekens zijn" });

interface User {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  created_at: string;
  email_confirmed_at: string | null;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create user dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  
  // Edit user dialog
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  
  // Role management dialog
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      setUsers(data.users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan gebruikers niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      emailSchema.parse(newUserEmail);
      passwordSchema.parse(newUserPassword);
      if (newUserName) nameSchema.parse(newUserName);

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create',
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName,
        },
      });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Gebruiker succesvol aangemaakt",
      });

      setIsCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      fetchUsers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validatiefout",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error creating user:", error);
        toast({
          title: "Fout",
          description: error.message || "Kan gebruiker niet aanmaken",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role as "admin" | "user",
        });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Rol succesvol toegevoegd",
      });

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

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.name || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      emailSchema.parse(editEmail);
      if (editName) nameSchema.parse(editName);

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'update',
          userId: editingUser.id,
          email: editEmail,
          name: editName,
        },
      });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Gebruiker succesvol bijgewerkt",
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
        console.error("Error updating user:", error);
        toast({
          title: "Fout",
          description: error.message || "Kan gebruiker niet bijwerken",
          variant: "destructive",
        });
      }
    }
  };

  const openRoleDialog = (user: User) => {
    setRoleUser(user);
    setSelectedRole("");
    setIsRoleDialogOpen(true);
  };

  const handleRoleDialogSubmit = async () => {
    if (!roleUser || !selectedRole) return;
    await handleAddRole(roleUser.id, selectedRole);
    setIsRoleDialogOpen(false);
    setRoleUser(null);
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'delete',
          userId: userToDelete.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Gelukt",
        description: "Gebruiker succesvol verwijderd",
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Fout",
        description: error.message || "Kan gebruiker niet verwijderen",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Gebruikers laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Gebruikersbeheer</h2>
          <p className="text-muted-foreground mt-2">
            Beheer gebruikers, rollen en permissies
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nieuwe Gebruiker
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Gebruikers</CardTitle>
          <CardDescription>Overzicht van alle gebruikers in het systeem</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rollen</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Geen gebruikers gevonden
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "Geen naam"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {user.roles.length > 0 ? (
                          <>
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={role === "admin" ? "default" : "secondary"}
                              >
                                {role}
                              </Badge>
                            ))}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">Geen rollen</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('nl-NL')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRoleDialog(user)}
                        >
                          Rollen
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Gebruiker Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een nieuwe gebruiker aan met email en wachtwoord
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="gebruiker@voorbeeld.nl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Wachtwoord *</Label>
              <Input
                id="new-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Minimaal 6 tekens"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-name">Naam</Label>
              <Input
                id="new-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Voer naam in"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateUser}>
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van de gebruiker
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="gebruiker@voorbeeld.nl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Naam</Label>
              <Input
                id="edit-name"
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
            <Button onClick={handleUpdateUser}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollen Beheren</DialogTitle>
            <DialogDescription>
              Beheer rollen voor {roleUser?.name || roleUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Huidige Rollen</Label>
              <div className="flex gap-2 flex-wrap">
                {roleUser?.roles.length ? (
                  roleUser.roles.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Badge variant={role === "admin" ? "default" : "secondary"}>
                        {role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(roleUser.id, role)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Geen rollen</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-select">Rol Toevoegen</Label>
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleRoleDialogSubmit} disabled={!selectedRole}>
                  Toevoegen
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit verwijdert permanent de gebruiker{" "}
              <span className="font-medium">{userToDelete?.email}</span> en alle bijbehorende gegevens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
