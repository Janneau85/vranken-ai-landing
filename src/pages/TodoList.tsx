import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, CheckSquare, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  notes?: string | null;
}

interface Profile {
  id: string;
  name: string | null;
}

const categories = ["Huishouden", "Tuin", "Koken", "Kinderen", "Overig"];
const priorities = [
  { value: "low", label: "Laag", color: "bg-green-500" },
  { value: "medium", label: "Gemiddeld", color: "bg-yellow-500" },
  { value: "high", label: "Hoog", color: "bg-red-500" }
];

const TodoList = () => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [hasTodoCalendar, setHasTodoCalendar] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    due_date: "",
    assigned_to: ""
  });

  useEffect(() => {
    checkAuth();
    fetchTodos();
    fetchProfiles();
    checkTodoCalendarConfig();
    setupRealtimeSubscription();
  }, []);

  const checkTodoCalendarConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("todo_calendar_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setHasTodoCalendar(!!data);
    } catch (error) {
      console.error("Error checking todo calendar config:", error);
      setHasTodoCalendar(false);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("priority", { ascending: false })
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error("Error fetching todos:", error);
      toast.error("Fout bij ophalen van taken");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos'
        },
        () => {
          fetchTodos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      toast.error("Voeg een titel toe");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: insertedTodo, error } = await supabase
        .from("todos")
        .insert({
          title: newTodo.title,
          description: newTodo.description || null,
          category: newTodo.category || null,
          priority: newTodo.priority,
          due_date: newTodo.due_date || null,
          assigned_to: newTodo.assigned_to || null,
          created_by: user?.id,
          status: "open"
        })
        .select()
        .single();

      if (error) throw error;
      
      // Sync to calendar if enabled and configured
      if (syncToCalendar && hasTodoCalendar && insertedTodo) {
        try {
          const { error: syncError } = await supabase.functions.invoke('sync-todos-to-calendar', {
            body: { 
              action: 'create_event',
              todoId: insertedTodo.id
            }
          });

          if (syncError) {
            console.error('Calendar sync error:', syncError);
            toast.warning("Todo toegevoegd, maar niet gesynchroniseerd naar kalender");
          } else {
            toast.success("Todo toegevoegd en gesynchroniseerd naar kalender!");
          }
        } catch (syncError) {
          console.error('Calendar sync error:', syncError);
          toast.warning("Todo toegevoegd, maar niet gesynchroniseerd naar kalender");
        }
      } else {
        toast.success("Taak toegevoegd!");
      }
      
      setIsAddDialogOpen(false);
      setNewTodo({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        due_date: "",
        assigned_to: ""
      });
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Fout bij toevoegen van taak");
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    try {
      const newStatus = todo.status === "open" ? "completed" : "open";
      const { data: { user } } = await supabase.auth.getUser();
      
      // Extract event ID BEFORE updating (if deleting)
      let eventId: string | null = null;
      if (newStatus === "completed" && hasTodoCalendar) {
        const eventIdMatch = todo.notes?.match(/Google Calendar Event ID: (.+)/);
        if (eventIdMatch) {
          eventId = eventIdMatch[1];
        }
      }
      
      const { error } = await supabase
        .from("todos")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
          completed_by: newStatus === "completed" ? user?.id : null
        })
        .eq("id", todo.id);

      if (error) throw error;

      // Delete from calendar when completed - pass eventId directly
      if (newStatus === "completed" && hasTodoCalendar && eventId) {
        try {
          await supabase.functions.invoke('sync-todos-to-calendar', {
            body: { 
              action: 'delete_event',
              todoId: todo.id,
              eventId: eventId
            }
          });
          toast.success("Taak voltooid en verwijderd van kalender");
        } catch (syncError) {
          console.error('Calendar delete error:', syncError);
          toast.warning("Taak voltooid, maar niet verwijderd van kalender");
        }
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
      toast.error("Fout bij aanpassen status");
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filterStatus !== "all" && todo.status !== filterStatus) return false;
    if (filterCategory !== "all" && todo.category !== filterCategory) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || "bg-gray-500";
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Niet toegewezen";
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || "Onbekend";
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

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
                <CheckSquare className="h-8 w-8" />
                Todo Lijst
              </h1>
              <p className="text-muted-foreground mt-1">
                Huishoudelijke taken en klusjes
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-6 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Voltooid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Taak Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Taak</DialogTitle>
                  <DialogDescription>
                    Voeg een nieuwe taak toe aan de lijst
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Titel *</Label>
                    <Input
                      id="title"
                      value={newTodo.title}
                      onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                      placeholder="Bijv. Stofzuigen woonkamer"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Beschrijving</Label>
                    <Textarea
                      id="description"
                      value={newTodo.description}
                      onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                      placeholder="Extra details..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categorie</Label>
                      <Select value={newTodo.category} onValueChange={(value) => setNewTodo({ ...newTodo, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Prioriteit</Label>
                      <Select value={newTodo.priority} onValueChange={(value) => setNewTodo({ ...newTodo, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Deadline</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newTodo.due_date}
                        onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="assigned_to">Toegewezen aan</Label>
                      <Select value={newTodo.assigned_to} onValueChange={(value) => setNewTodo({ ...newTodo, assigned_to: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer persoon" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name || "Naamloos"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {hasTodoCalendar && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted">
                      <Switch
                        id="sync-calendar"
                        checked={syncToCalendar}
                        onCheckedChange={setSyncToCalendar}
                      />
                      <Label htmlFor="sync-calendar" className="flex items-center gap-2 cursor-pointer">
                        <Calendar className="h-4 w-4" />
                        Synchroniseer naar Google Calendar
                      </Label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleAddTodo}>Toevoegen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Taken ({filteredTodos.length})</CardTitle>
              <CardDescription>
                Vink taken af wanneer ze voltooid zijn
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Laden...</p>
              ) : filteredTodos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Geen taken gevonden
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                        todo.status === "completed"
                          ? "bg-muted/50 border-border"
                          : "bg-card border-border hover:border-primary"
                      }`}
                    >
                      <Checkbox
                        checked={todo.status === "completed"}
                        onCheckedChange={() => handleToggleStatus(todo)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                              <h3 className={`font-semibold ${todo.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {todo.title}
                              </h3>
                            </div>
                            {todo.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {todo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {todo.category && (
                                <Badge variant="outline">{todo.category}</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                👤 {getProfileName(todo.assigned_to)}
                              </span>
                              {todo.due_date && (
                                <span className={`text-xs flex items-center gap-1 ${isOverdue(todo.due_date) && todo.status !== "completed" ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                  {isOverdue(todo.due_date) && todo.status !== "completed" && <AlertCircle className="h-3 w-3" />}
                                  📅 {format(new Date(todo.due_date), "d MMM yyyy", { locale: nl })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TodoList;
