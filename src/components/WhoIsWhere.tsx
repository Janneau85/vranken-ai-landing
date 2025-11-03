import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface LocationData {
  user_id: string;
  status: "home" | "away" | "unknown";
  last_updated: string;
  profiles?: {
    name: string;
  };
}

const WhoIsWhere = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const { toast } = useToast();

  // Haal alle locaties op
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("user_locations")
        .select(`
          *,
          profiles:user_id (name)
        `)
        .order("last_updated", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update eigen locatie
  const updateMyLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Locatie niet ondersteund",
        description: "Je browser ondersteunt geen geolocatie",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { data, error } = await supabase.functions.invoke("update-location", {
            body: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          });

          if (error) throw error;

          toast({
            title: "Locatie bijgewerkt",
            description: `Status: ${data.status === "home" ? "🏠 Thuis" : "🚗 Onderweg"}`,
          });

          fetchLocations();
        } catch (error) {
          console.error("Error updating location:", error);
          toast({
            title: "Fout",
            description: "Kon locatie niet bijwerken",
            variant: "destructive",
          });
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Locatie toegang geweigerd",
          description: "Sta locatie toegang toe in je browser instellingen",
          variant: "destructive",
        });
      }
    );
  };

  // Realtime updates
  useEffect(() => {
    fetchLocations();

    const channel = supabase
      .channel("location_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_locations",
        },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-update locatie elk 5 minuten als tracking enabled
  useEffect(() => {
    if (!trackingEnabled) return;

    updateMyLocation(); // Direct updaten
    const interval = setInterval(updateMyLocation, 5 * 60 * 1000); // 5 minuten

    return () => clearInterval(interval);
  }, [trackingEnabled]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "home":
        return { icon: Home, text: "Thuis", color: "text-green-500", bg: "bg-green-500/10" };
      case "away":
        return { icon: MapPin, text: "Onderweg", color: "text-orange-500", bg: "bg-orange-500/10" };
      default:
        return { icon: User, text: "Onbekend", color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Zojuist";
    if (diffMins < 60) return `${diffMins} min geleden`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} uur geleden`;
    return date.toLocaleDateString("nl-NL");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Wie is waar?
            </CardTitle>
            <CardDescription>Locatie van familie leden</CardDescription>
          </div>
          <Button
            onClick={() => {
              if (trackingEnabled) {
                setTrackingEnabled(false);
                toast({ title: "Tracking uitgeschakeld" });
              } else {
                updateMyLocation();
                setTrackingEnabled(true);
                toast({ title: "Tracking ingeschakeld" });
              }
            }}
            variant={trackingEnabled ? "default" : "outline"}
            size="sm"
          >
            {trackingEnabled ? "Tracking aan" : "Start tracking"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nog geen locatie gegevens beschikbaar
          </p>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => {
              const statusInfo = getStatusInfo(location.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={location.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {location.profiles?.name || "Onbekend"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {statusInfo.text}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatLastUpdate(location.last_updated)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoIsWhere;