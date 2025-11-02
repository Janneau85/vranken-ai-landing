import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, UtensilsCrossed, Calendar, BookOpen } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";

interface MealPlan {
  id: string;
  meal_date: string;
  meal_type: string;
  custom_meal_name: string | null;
  notes: string | null;
  recipe_id: string | null;
}

const MealPlanner = () => {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [newMeal, setNewMeal] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    type: "diner",
    name: "",
    notes: ""
  });

  const mealTypes = [
    { value: "ontbijt", label: "Ontbijt", emoji: "🍳" },
    { value: "lunch", label: "Lunch", emoji: "🥗" },
    { value: "diner", label: "Diner", emoji: "🍽️" },
    { value: "snack", label: "Snack", emoji: "🍪" }
  ];

  useEffect(() => {
    checkAuth();
    fetchMealPlans();
    setupRealtimeSubscription();
  }, [currentWeekStart]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchMealPlans = async () => {
    try {
      const weekEnd = addDays(currentWeekStart, 7);
      const { data, error } = await supabase
        .from("meal_plan")
        .select("*")
        .gte("meal_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lt("meal_date", format(weekEnd, "yyyy-MM-dd"))
        .order("meal_date", { ascending: true })
        .order("meal_type", { ascending: true });

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      toast.error("Fout bij ophalen van maaltijdplanning");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('meal-plan-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plan'
        },
        () => {
          fetchMealPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddMeal = async () => {
    if (!newMeal.name.trim()) {
      toast.error("Voeg een maaltijd naam toe");
      return;
    }

    try {
      const { error } = await supabase
        .from("meal_plan")
        .insert({
          meal_date: newMeal.date,
          meal_type: newMeal.type,
          custom_meal_name: newMeal.name,
          notes: newMeal.notes || null
        });

      if (error) throw error;
      
      toast.success("Maaltijd toegevoegd!");
      setIsAddMealOpen(false);
      setNewMeal({ date: format(new Date(), "yyyy-MM-dd"), type: "diner", name: "", notes: "" });
    } catch (error) {
      console.error("Error adding meal:", error);
      toast.error("Fout bij toevoegen van maaltijd");
    }
  };

  const getMealsForDay = (date: Date, type: string) => {
    return mealPlans.filter(
      meal => meal.meal_date === format(date, "yyyy-MM-dd") && meal.meal_type === type
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <UtensilsCrossed className="h-8 w-8" />
                Maaltijdplanner
              </h1>
              <p className="text-muted-foreground mt-1">
                Plan je maaltijden en beheer recepten
              </p>
            </div>
          </div>

          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Weekplanning
              </TabsTrigger>
              <TabsTrigger value="recipes">
                <BookOpen className="mr-2 h-4 w-4" />
                Recepten
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                  >
                    ← Vorige week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  >
                    Deze week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                  >
                    Volgende week →
                  </Button>
                </div>
                
                <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Maaltijd Toevoegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Maaltijd</DialogTitle>
                      <DialogDescription>
                        Voeg een maaltijd toe aan de planning
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="date">Datum *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newMeal.date}
                          onChange={(e) => setNewMeal({ ...newMeal, date: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type Maaltijd *</Label>
                        <Select value={newMeal.type} onValueChange={(value) => setNewMeal({ ...newMeal, type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mealTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.emoji} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="name">Maaltijd Naam *</Label>
                        <Input
                          id="name"
                          value={newMeal.name}
                          onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                          placeholder="Bijv. Spaghetti Bolognese"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notities</Label>
                        <Textarea
                          id="notes"
                          value={newMeal.notes}
                          onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                          placeholder="Extra notities..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMealOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleAddMeal}>Toevoegen</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="p-8">
                    <p className="text-center text-muted-foreground">Laden...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {weekDays.map((day) => (
                    <Card key={day.toISOString()}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {format(day, "EEEE d MMMM", { locale: nl })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {mealTypes.map(type => {
                          const meals = getMealsForDay(day, type.value);
                          return (
                            <div key={type.value} className="p-3 rounded-lg border border-border bg-card">
                              <p className="font-semibold text-sm mb-2">
                                {type.emoji} {type.label}
                              </p>
                              {meals.length > 0 ? (
                                meals.map(meal => (
                                  <div key={meal.id} className="text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">{meal.custom_meal_name}</p>
                                    {meal.notes && <p className="text-xs mt-1">{meal.notes}</p>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Nog niet gepland</p>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recipes">
              <Card>
                <CardHeader>
                  <CardTitle>Recepten</CardTitle>
                  <CardDescription>
                    Beheer je favoriete recepten (komt binnenkort!)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Recepten functionaliteit wordt binnenkort toegevoegd
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MealPlanner;
