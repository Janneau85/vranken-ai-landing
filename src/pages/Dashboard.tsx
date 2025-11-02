import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import GoogleCalendar from "@/components/GoogleCalendar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useUserTheme } from "@/hooks/useUserTheme";
import { ShoppingCart, UtensilsCrossed, CheckSquare } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accentColor } = useUserTheme();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        
        if (profileData?.name) {
          setUserName(profileData.name);
        }

        // Check if user is admin
        const { data } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        setIsAdmin(data || false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 
            className="text-3xl font-bold"
            style={{
              color: 'hsl(0 0% 15%)',
              textShadow: 'var(--emboss-inset)',
              letterSpacing: '-0.02em',
            }}
          >
            vranken.AI
          </h1>
          <div className="flex items-center gap-3">
            <ThemeSelector />
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="default"
              >
                Admin Panel
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Welkom {userName || user?.email}
          </h2>
          <p className="text-muted-foreground mb-8">
            Je persoonlijke Family Dashboard
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
            <Link to="/shopping">
              <div 
                className="p-6 bg-card border-2 rounded-lg transition-all cursor-pointer h-full hover:shadow-lg"
                style={{ borderColor: accentColor }}
              >
                <ShoppingCart className="w-8 h-8 mb-3" style={{ color: accentColor }} />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Boodschappenlijst</h3>
                <p className="text-muted-foreground">
                  Gezamenlijke boodschappenlijst met real-time sync
                </p>
              </div>
            </Link>

            <Link to="/meals">
              <div 
                className="p-6 bg-card border-2 rounded-lg transition-all cursor-pointer h-full hover:shadow-lg"
                style={{ borderColor: accentColor }}
              >
                <UtensilsCrossed className="w-8 h-8 mb-3" style={{ color: accentColor }} />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Maaltijdplanner</h3>
                <p className="text-muted-foreground">
                  Plan je maaltijden en beheer recepten
                </p>
              </div>
            </Link>

            <Link to="/todos">
              <div 
                className="p-6 bg-card border-2 rounded-lg transition-all cursor-pointer h-full hover:shadow-lg"
                style={{ borderColor: accentColor }}
              >
                <CheckSquare className="w-8 h-8 mb-3" style={{ color: accentColor }} />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Todo Lijst</h3>
                <p className="text-muted-foreground">
                  Huishoudelijke taken en klusjes
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="w-full">
          <GoogleCalendar isAdmin={isAdmin} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
