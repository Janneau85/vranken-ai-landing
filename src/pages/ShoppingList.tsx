import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { SwipeableItem } from "@/components/SwipeableItem";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  notes: string | null;
  is_checked: boolean;
  created_at: string;
}

const categories = ["Groente", "Fruit", "Zuivel", "Vlees", "Vis", "Brood", "Dranken", "Snacks", "Overig"];

const ShoppingList = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [keepDialogOpen, setKeepDialogOpen] = useState(false);
  const [itemCounter, setItemCounter] = useState(0);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    category: "",
    notes: ""
  });

  useEffect(() => {
    checkAuth();
    fetchItems();
    setupRealtimeSubscription();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .select("*")
        .order("is_checked", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      toast.error("Fout bij ophalen van boodschappenlijst");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('shopping-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items'
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddItem = async (keepOpen: boolean = false) => {
    if (!newItem.name.trim()) {
      toast.error("Voeg een naam toe");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("shopping_list_items")
        .insert({
          name: newItem.name,
          quantity: newItem.quantity || null,
          category: newItem.category || null,
          notes: newItem.notes || null,
          added_by: user?.id
        });

      if (error) throw error;
      
      const newCounter = itemCounter + 1;
      setItemCounter(newCounter);
      toast.success(`Item ${newCounter} toegevoegd!`);
      
      if (keepOpen) {
        // Reset form but keep dialog open
        setNewItem({ name: "", quantity: "", category: "", notes: "" });
        // Focus back on name field
        setTimeout(() => {
          document.getElementById('name')?.focus();
        }, 100);
      } else {
        // Close dialog and reset
        setIsAddDialogOpen(false);
        setNewItem({ name: "", quantity: "", category: "", notes: "" });
        setItemCounter(0);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Fout bij toevoegen van item");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Enter = Save & New
        e.preventDefault();
        handleAddItem(true);
      } else {
        // Just Enter = Save & Close
        e.preventDefault();
        handleAddItem(false);
      }
    }
  };

  const handleToggleCheck = async (item: ShoppingItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("shopping_list_items")
        .update({
          is_checked: !item.is_checked,
          checked_by: !item.is_checked ? user?.id : null,
          checked_at: !item.is_checked ? new Date().toISOString() : null
        })
        .eq("id", item.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Fout bij aanvinken");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item verwijderd");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Fout bij verwijderen");
    }
  };

  const handleClearChecked = async () => {
    try {
      const checkedIds = items.filter(item => item.is_checked).map(item => item.id);
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .in("id", checkedIds);

      if (error) throw error;
      toast.success("Afgevinkte items verwijderd");
    } catch (error) {
      console.error("Error clearing checked items:", error);
      toast.error("Fout bij verwijderen");
    }
  };

  const filteredItems = filterCategory === "all" 
    ? items 
    : items.filter(item => item.category === filterCategory);

  const getCategoryEmoji = (category: string | null) => {
    const emojiMap: { [key: string]: string } = {
      "Groente": "🥬",
      "Fruit": "🍎",
      "Zuivel": "🥛",
      "Vlees": "🥩",
      "Vis": "🐟",
      "Brood": "🍞",
      "Dranken": "🥤",
      "Snacks": "🍿",
      "Overig": "📦"
    };
    return emojiMap[category || "Overig"] || "📦";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-8 w-8" />
                Boodschappenlijst
              </h1>
              <p className="text-muted-foreground mt-1">
                Gezamenlijke boodschappenlijst met real-time sync
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-6 flex-wrap">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryEmoji(cat)} {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Item Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuw Item</DialogTitle>
                  <DialogDescription>
                    Voeg items toe aan de boodschappenlijst
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Naam *</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="Bijv. Melk"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Hoeveelheid</Label>
                    <Input
                      id="quantity"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="Bijv. 2 liter"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categorie</Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {getCategoryEmoji(cat)} {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notities</Label>
                    <Textarea
                      id="notes"
                      value={newItem.notes}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      placeholder="Extra notities..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> om toe te voegen & sluiten, 
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Ctrl+Enter</kbd> om door te gaan met toevoegen
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    setItemCounter(0);
                  }}>
                    Annuleren
                  </Button>
                  <Button onClick={() => handleAddItem(false)}>
                    Toevoegen & Sluiten
                  </Button>
                  <Button onClick={() => handleAddItem(true)} variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    Toevoegen & Nieuwe
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {items.some(item => item.is_checked) && (
              <Button variant="outline" onClick={handleClearChecked}>
                <Trash2 className="mr-2 h-4 w-4" />
                Wis Afgevinkte
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Items ({filteredItems.length})</CardTitle>
              <CardDescription>
                Vink items af tijdens het winkelen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Laden...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Geen items gevonden. Voeg je eerste item toe!
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const itemContent = (
                      <div
                        className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                          item.is_checked 
                            ? "bg-muted/50 border-border" 
                            : "bg-card border-border hover:border-primary"
                        }`}
                      >
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={() => handleToggleCheck(item)}
                          className={`mt-1 ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`font-medium ${isMobile ? 'text-base' : ''} ${item.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {getCategoryEmoji(item.category)} {item.name}
                              </p>
                              {item.quantity && (
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                            {!isMobile && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    return isMobile ? (
                      <SwipeableItem
                        key={item.id}
                        onDelete={() => handleDeleteItem(item.id)}
                        onCheck={() => handleToggleCheck(item)}
                        isChecked={item.is_checked}
                      >
                        {itemContent}
                      </SwipeableItem>
                    ) : (
                      <div key={item.id}>{itemContent}</div>
                    );
                  })}
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

export default ShoppingList;
