import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import GoogleCalendar from "@/components/GoogleCalendar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useUserTheme } from "@/hooks/useUserTheme";
import { ShoppingCart, CheckSquare, Plus, Bot } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import WhoIsWhere from "@/components/WhoIsWhere";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accentColor } = useUserTheme();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);

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

        // Fetch quick stats
        fetchQuickStats();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchQuickStats = async () => {
    try {
      // Fetch shopping list count (unchecked items)
      const { count: shoppingTotal } = await supabase
        .from('shopping_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_checked', false);

      setShoppingCount(shoppingTotal || 0);

      // Fetch todo count (open items)
      const { count: todoTotal } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      setTodoCount(todoTotal || 0);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

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

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 max-w-5xl">
            <Link to="/shopping" className="group">
              <div 
                className="relative p-8 bg-card border rounded-lg transition-all cursor-pointer h-full hover:shadow-lg hover:scale-[1.02]"
                style={{ borderColor: accentColor }}
              >
                <button 
                  className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/shopping');
                  }}
                >
                  <Plus className="w-5 h-5" style={{ color: accentColor }} />
                </button>
                <ShoppingCart className="w-12 h-12 mb-4" style={{ color: accentColor }} />
                <h3 className="text-2xl font-semibold mb-2 text-foreground">Boodschappenlijst</h3>
                <p className="text-muted-foreground mb-3">
                  Gezamenlijke boodschappenlijst met real-time sync
                </p>
                {shoppingCount > 0 && (
                  <div 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    {shoppingCount} {shoppingCount === 1 ? 'item' : 'items'}
                  </div>
                )}
              </div>
            </Link>

            <Link to="/todos" className="group">
              <div 
                className="relative p-8 bg-card border rounded-lg transition-all cursor-pointer h-full hover:shadow-lg hover:scale-[1.02]"
                style={{ borderColor: accentColor }}
              >
                <button 
                  className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/todos');
                  }}
                >
                  <Plus className="w-5 h-5" style={{ color: accentColor }} />
                </button>
                <CheckSquare className="w-12 h-12 mb-4" style={{ color: accentColor }} />
                <h3 className="text-2xl font-semibold mb-2 text-foreground">Todo Lijst</h3>
                <p className="text-muted-foreground mb-3">
                  Huishoudelijke taken en klusjes
                </p>
                {todoCount > 0 && (
                  <div 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    {todoCount} {todoCount === 1 ? 'taak' : 'taken'}
                  </div>
                )}
              </div>
            </Link>

            <Link to="/ai-assistant" className="group">
              <div 
                className="relative p-8 bg-card border rounded-lg transition-all cursor-pointer h-full hover:shadow-lg hover:scale-[1.02]"
                style={{ borderColor: accentColor }}
              >
                <button 
                  className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/ai-assistant');
                  }}
                >
                  <Plus className="w-5 h-5" style={{ color: accentColor }} />
                </button>
                <Bot className="w-12 h-12 mb-4" style={{ color: accentColor }} />
                <h3 className="text-2xl font-semibold mb-2 text-foreground">AI Assistent</h3>
                <p className="text-muted-foreground mb-3">
                  Chat met je slimme helper voor tips en hulp
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Wie is waar sectie */}
        <div className="max-w-5xl mb-8">
          <WhoIsWhere />
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
