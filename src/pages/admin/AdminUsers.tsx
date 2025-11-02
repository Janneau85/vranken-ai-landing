import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

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
        title: "Error",
        description: "Please select both user and role",
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
        title: "Success",
        description: "Role added successfully",
      });

      setSelectedUserId("");
      setSelectedRole("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add role",
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
        title: "Success",
        description: "Role removed successfully",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">User Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Role to User</CardTitle>
          <CardDescription>Assign admin or user roles</CardDescription>
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
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddRole}>Add Role</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
          <CardDescription>Current user role assignments</CardDescription>
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
                    <TableCell className="font-medium">
                      {user.name || "Geen naam"}
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
    </div>
  );
};

export default AdminUsers;
