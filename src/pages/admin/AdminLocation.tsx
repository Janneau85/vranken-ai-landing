import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

const AdminLocation = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const circle = useRef<any>(null);
  const { toast } = useToast();

  const [latitude, setLatitude] = useState<number>(52.3676);
  const [longitude, setLongitude] = useState<number>(4.9041);
  const [radius, setRadius] = useState<number>(100);
  const [name, setName] = useState<string>("Thuis");
  const [loading, setLoading] = useState(false);

  // Load existing home location
  useEffect(() => {
    loadHomeLocation();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = "pk.eyJ1IjoiamFubmVhdSIsImEiOiJjbWhqaG0xZjQxZGY5MmlxcWo2aHJ3ZndrIn0.wgGyanxM3UOFmK0EXgbE1Q";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude, latitude],
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Wait for style to load before adding markers
    map.current.on("load", () => {
      updateMarkerAndCircle(latitude, longitude, radius);
    });

    // Add click handler to place marker
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      setLatitude(lat);
      setLongitude(lng);
      updateMarkerAndCircle(lat, lng, radius);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update circle when radius changes
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateMarkerAndCircle(latitude, longitude, radius);
    }
  }, [radius]);

  const loadHomeLocation = async () => {
    try {
      const { data, error } = await supabase
        .from("home_location")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        setLatitude(lat);
        setLongitude(lng);
        setRadius(data.radius_meters || 100);
        setName(data.name || "Thuis");

        if (map.current) {
          map.current.setCenter([lng, lat]);
          updateMarkerAndCircle(lat, lng, data.radius_meters || 100);
        }
      }
    } catch (error) {
      console.error("Error loading home location:", error);
      toast({
        title: "Fout bij laden",
        description: "Kon huislocatie niet laden",
        variant: "destructive",
      });
    }
  };

  const updateMarkerAndCircle = (lat: number, lng: number, rad: number) => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Add new marker
    marker.current = new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Remove existing circle
    if (circle.current && map.current.getSource("circle")) {
      map.current.removeLayer("circle-fill");
      map.current.removeLayer("circle-border");
      map.current.removeSource("circle");
    }

    // Create circle (geofence visualization)
    const points = 64;
    const km = rad / 1000;
    const coords = {
      latitude: lat,
      longitude: lng,
    };

    const ret = [];
    const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    map.current.addSource("circle", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [ret],
        },
        properties: {},
      },
    });

    map.current.addLayer({
      id: "circle-fill",
      type: "fill",
      source: "circle",
      paint: {
        "fill-color": "#3b82f6",
        "fill-opacity": 0.2,
      },
    });

    map.current.addLayer({
      id: "circle-border",
      type: "line",
      source: "circle",
      paint: {
        "line-color": "#3b82f6",
        "line-width": 2,
      },
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Niet ondersteund",
        description: "Geolocatie wordt niet ondersteund door je browser",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        if (map.current) {
          map.current.setCenter([lng, lat]);
          updateMarkerAndCircle(lat, lng, radius);
        }

        toast({
          title: "Locatie gevonden",
          description: "Je huidige locatie is ingesteld",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Locatie fout",
          description: "Kon je locatie niet ophalen",
          variant: "destructive",
        });
      }
    );
  };

  const saveLocation = async () => {
    setLoading(true);
    try {
      // Check if location exists
      const { data: existing } = await supabase
        .from("home_location")
        .select("id")
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("home_location")
          .update({
            latitude,
            longitude,
            radius_meters: radius,
            name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("home_location").insert({
          latitude,
          longitude,
          radius_meters: radius,
          name,
        });

        if (error) throw error;
      }

      toast({
        title: "Opgeslagen",
        description: "Huislocatie is succesvol opgeslagen",
      });
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Kon locatie niet opslaan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Locatie Configuratie</h1>
        <p className="text-muted-foreground">
          Stel het huisadres in voor de "Wie is Waar" functionaliteit
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Kaart
            </CardTitle>
            <CardDescription>
              Klik op de kaart om de huislocatie in te stellen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={mapContainer}
              className="w-full h-[500px] rounded-lg border"
            />
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Locatie Instellingen</CardTitle>
            <CardDescription>
              Pas de coördinaten en radius aan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLatitude(val);
                    if (map.current) {
                      map.current.setCenter([longitude, val]);
                      updateMarkerAndCircle(val, longitude, radius);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLongitude(val);
                    if (map.current) {
                      map.current.setCenter([val, latitude]);
                      updateMarkerAndCircle(latitude, val, radius);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Thuis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">
                Radius (meters): {radius}m
              </Label>
              <Input
                id="radius"
                type="range"
                min="50"
                max="500"
                step="10"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={getCurrentLocation} variant="outline">
                <Navigation className="w-4 h-4 mr-2" />
                Huidige Locatie
              </Button>
              <Button onClick={saveLocation} disabled={loading}>
                {loading ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLocation;
