import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

const AdminData = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Data Management</h2>
        <p className="text-muted-foreground mt-2">
          View and manage database tables
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables
          </CardTitle>
          <CardDescription>Access your backend data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">user_roles</h3>
            <p className="text-sm text-muted-foreground">
              Manage user role assignments (admin, user)
            </p>
          </div>
          
          <div className="mt-4 p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              For full database management capabilities, you can access the backend interface:
            </p>
            <div className="mt-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // This will be handled by Lovable's backend access
                }}
                className="text-accent hover:underline text-sm font-medium"
              >
                Open Backend Management →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminData;
