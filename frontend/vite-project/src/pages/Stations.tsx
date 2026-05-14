import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Zap, AlertTriangle, CheckCircle, XCircle, Battery, Clock, Search, Filter, Users, Timer, Bell, Navigation, LocateFixed } from "lucide-react";
import api from "../lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";

interface ActiveSessionInfo {
  startTime: string;
  estimatedDuration: number | null;
  elapsedMinutes: number;
  minutesRemaining: number | null;
  estimatedFreeAt: string | null;
}

interface QueueInfo {
  count: number;
  userPosition: number | null;
  userStatus: string | null;
}

interface Station {
  id: number;
  location: string;
  city: string;
  healthPercentage: number;
  isOccupied: boolean;
  isActive: boolean;
  isFaulty: boolean;
  totalEnergyConsumption: string;
  oem: string;
  reseller: string;
  operator: string;
  connectedUser: string | null;
  activeSession: ActiveSessionInfo | null;
  isCurrentUserCharging: boolean;
  queue: QueueInfo;
  latitude?: number;
  longitude?: number;
  mapIframe?: string;
}

type RawStation = Omit<Station, "city"> & {
  city?: string;
};

interface ApiError {
  response?: {
    data?: {
      msg?: string;
    };
  };
}

interface StationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  userLocation: UserLocation | null;
  userData: UserData | null;
  onStartCharging: (stationId: number, pointsToUse: number) => Promise<void>;
  onStopCharging: (stationId: number) => void;
  onJoinQueue: (stationId: number) => void;
  onLeaveQueue: (stationId: number) => void;
  isCharging: boolean;
  loading: boolean;
  queueLoading: boolean;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  points: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  source?: "browser" | "manual";
}

type StationWithDistance = Station & {
  distanceKm: number | null;
  readinessMinutes: number;
  nearbyScore: number;
};

const AVERAGE_CITY_SPEED_KMPH = 20;
const SOON_FREE_MINUTES = 15;
const TARGET_LOCATION_ACCURACY_METERS = 75;
const MAX_USABLE_LOCATION_ACCURACY_METERS = 1500;
const PRECISE_LOCATION_TIMEOUT_MS = 20000;

const STATION_MAP_OVERRIDES: Record<string, Pick<Station, "latitude" | "longitude" | "mapIframe">> = {
  "Downtown Mall - Parking Level B1": {
    latitude: 16.8472558,
    longitude: 74.5987356,
    mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d432.8030714416994!2d74.59873562066275!3d16.84725578534954!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc123007d046a15%3A0x51abb635d9ba80a0!2sEffotel%20by%20Sayaji%2C%20Sangli!5e0!3m2!1sen!2sin!4v1777801055197!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
  },
  "Airport Terminal 2 - Ground Floor": {
    latitude: 16.865268,
    longitude: 74.5909501,
    mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d238.63842201666768!2d74.5909501303994!3d16.865267967468114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1180acf8cbd2f%3A0x8a37f1372dc62bd3!2sVraj%20Technologies%20Charging%20Station!5e0!3m2!1sen!2sin!4v1777801198980!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
  },
  "Highway Service Station - Exit 15": {
    latitude: 16.8652679,
    longitude: 74.5885361,
    mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3818.214753241584!2d74.58853613886272!3d16.865267919212357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1192fc537db45%3A0xf16ce72abb35dd73!2sKrishna%20godavari%20ev%20charging%20station!5e0!3m2!1sen!2sin!4v1777801255281!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
  },
  "Office Complex - Basement Parking": {
    latitude: 16.8429686,
    longitude: 74.6116278,
    mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3818.6649728327634!2d74.60905287604193!3d16.842968583954345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc119755cbdb9ad%3A0x4e5cf9d3e94caf88!2sJIMIS%20BURGER%20%C2%AE%20-%20Sangli!5e0!3m2!1sen!2sin!4v1777801303378!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
  },
  "Shopping Center - Rooftop Level": {
    latitude: 19.166445,
    longitude: 72.936014,
    mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d60298.52692515201!2d72.936014!3d19.166445!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b913585fc533%3A0x4c5fa5cf22f5bd5d!2sPiramal%20Revanta%20Sales%20Office!5e0!3m2!1sen!2sin!4v1732468527570!5m2!1sen!2sin" width="100%" height="450" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="border: 0px;"></iframe>`,
  },
};

const getDistanceKm = (
  from: Pick<UserLocation, "latitude" | "longitude">,
  to: Pick<UserLocation, "latitude" | "longitude">
) => {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (distanceKm: number | null) => {
  if (distanceKm === null) return "Distance unavailable";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const getReadinessMinutes = (station: Station) => {
  if (!station.isActive || station.isFaulty) return Number.POSITIVE_INFINITY;
  if (!station.isOccupied) return 0;
  return station.activeSession?.minutesRemaining ?? Number.POSITIVE_INFINITY;
};

const getReadinessText = (station: Station) => {
  if (station.isFaulty) return "Faulty";
  if (!station.isActive) return "Inactive";
  if (!station.isOccupied) return "Available now";
  const minutesRemaining = station.activeSession?.minutesRemaining;
  if (minutesRemaining === null || minutesRemaining === undefined) return "Busy, free time unknown";
  if (minutesRemaining <= 0) return "Free any moment";
  return `Busy, free in ~${minutesRemaining} min`;
};

const extractMapIframeSrc = (mapIframe?: string) => {
  if (!mapIframe) return undefined;
  const match = mapIframe.match(/src\s*=\s*"([^"]+)"/i);
  return match ? match[1] : mapIframe;
};

const parseManualLocation = (value: string) => {
  const decodedValue = decodeURIComponent(value.trim());
  const atMatch = decodedValue.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const bangLatLngMatch = decodedValue.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const bangLngLatMatch = decodedValue.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  const pairMatch = decodedValue.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);

  let latitude: number;
  let longitude: number;

  if (atMatch) {
    latitude = Number(atMatch[1]);
    longitude = Number(atMatch[2]);
  } else if (bangLatLngMatch) {
    latitude = Number(bangLatLngMatch[1]);
    longitude = Number(bangLatLngMatch[2]);
  } else if (bangLngLatMatch) {
    latitude = Number(bangLngLatMatch[2]);
    longitude = Number(bangLngLatMatch[1]);
  } else if (pairMatch) {
    latitude = Number(pairMatch[1]);
    longitude = Number(pairMatch[2]);
  } else {
    return null;
  }

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
};

const buildMapSrc = (station: Station, userLocation: UserLocation | null) => {
  if (
    userLocation &&
    typeof station.latitude === "number" &&
    typeof station.longitude === "number"
  ) {
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = `${station.latitude},${station.longitude}`;
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&dirflg=d&output=embed`;
  }

  return extractMapIframeSrc(station.mapIframe);
};

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chargingStations, setChargingStations] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [stationIdSearch, setStationIdSearch] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [nearestMode, setNearestMode] = useState(false);
  const [manualLocationOpen, setManualLocationOpen] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");

  const fetchStations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get<{ stations: RawStation[] }>("/get/stations");
      
      const enhancedStations = response.data.stations.map((station) => {
        const locationParts = station.location.split('-');
        const city = locationParts.length > 1 ? locationParts[1].trim() : station.location;
        const mapOverride = STATION_MAP_OVERRIDES[station.location] ?? {};
        return { ...station, ...mapOverride, city };
      });
      
      setStations(enhancedStations);
      setFilteredStations(enhancedStations);

      // Update selected station if modal is open
      if (selectedStation) {
        const updated = enhancedStations.find((s: Station) => s.id === selectedStation.id);
        if (updated) setSelectedStation(updated);
      }

      setError("");
    } catch (err) {
      console.error("Error fetching stations:", err);
      if (!silent) setError("Failed to load stations. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    fetchStations();
    fetchUserData();
  }, []);

  // Auto-refresh every 30 seconds for live time remaining updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStations(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStations]);

  // Filter stations whenever filter criteria change
  useEffect(() => {
    if (stations.length > 0) {
      let filtered = [...stations];
      
      // Filter by city if selected (and not "all")
      if (cityFilter && cityFilter !== "all") {
        filtered = filtered.filter(station => 
          station.location.toLowerCase().includes(cityFilter.toLowerCase())
        );
      }
      
      // Filter by station ID if provided
      if (stationIdSearch) {
        filtered = filtered.filter(station => 
          station.id.toString().includes(stationIdSearch)
        );
      }
      
      setFilteredStations(filtered);
    }
  }, [stations, cityFilter, stationIdSearch]);

  // Extract unique cities from stations
  useEffect(() => {
    if (stations.length > 0) {
      // Extract city names from locations
      const cityNames = stations.map(station => {
        // Assuming location format is "Name - City" or similar
        const parts = station.location.split('-');
        return parts.length > 1 ? parts[1].trim() : station.location;
      });
      
      // Get unique cities
      const uniqueCities = Array.from(new Set(cityNames));
      setCities(uniqueCities);
    }
  }, [stations]);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/get/dashboard");
      const apiPoints = Number(response.data.data.totalPoints || 0);
      setUserData({
        id: response.data.data.userId,
        firstName: response.data.data.userName.split(' ')[0],
        lastName: response.data.data.userName.split(' ')[1] || '',
        email: response.data.data.email,
        points: apiPoints.toString()
      });
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const handleStartCharging = async (stationId: number, customPoints?: number) => {
    try {
      setActionLoading(stationId);
      const payload = customPoints ? { CID: stationId, points: customPoints } : { CID: stationId };
      await api.post("/post/startCharging", payload);

      // Mark as charging in local set
      setChargingStations(prev => new Set([...prev, stationId]));

      // Update user data with reduced points
      if (userData && customPoints) {
        const currentPoints = parseInt(userData.points);
        setUserData({
          ...userData,
          points: (currentPoints - customPoints).toString()
        });
      }

      // Fresh fetch so modal gets real activeSession + isCurrentUserCharging + estimated time
      await fetchStations(true);

    } catch (err: unknown) {
      console.error("Error starting charging:", err);
      const errorMessage = (err as ApiError)?.response?.data?.msg || "Failed to start charging. Please try again.";
      toast.error(errorMessage);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopCharging = async (stationId: number) => {
    try {
      setActionLoading(stationId);
      const response = await api.post("/post/stopCharging", { CID: stationId });
      console.log("Charging stopped:", response.data);
      
      // Remove station from charging set
      setChargingStations(prev => {
        const newSet = new Set(prev);
        newSet.delete(stationId);
        return newSet;
      });

      // Fresh fetch + user data so modal reflects freed station
      await Promise.all([fetchStations(true), fetchUserData()]);

      // Show success message with session details
      const sessionInfo = response.data;
      toast.success("Charging stopped!", {
        description: `Time: ${sessionInfo.totalTime} · Coins Used: ${sessionInfo.coinsUsed}`,
      });
      
    } catch (err: unknown) {
      console.error("Error stopping charging:", err);
      const errorMessage = (err as ApiError)?.response?.data?.msg || "Failed to stop charging. Please try again.";
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinQueue = async (stationId: number) => {
    try {
      setQueueLoading(true);
      const response = await api.post("/post/joinQueue", { CID: stationId });
      toast.success(response.data.msg || "Joined the queue successfully");
      await fetchStations(true);
    } catch (err: unknown) {
      console.error("Error joining queue:", err);
      const errorMessage = (err as ApiError)?.response?.data?.msg || "Failed to join queue.";
      toast.error(errorMessage);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLeaveQueue = async (stationId: number) => {
    try {
      setQueueLoading(true);
      const response = await api.post("/post/leaveQueue", { CID: stationId });
      toast.success(response.data.msg || "Left the queue successfully");
      await fetchStations(true);
    } catch (err: unknown) {
      console.error("Error leaving queue:", err);
      const errorMessage = (err as ApiError)?.response?.data?.msg || "Failed to leave queue.";
      toast.error(errorMessage);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      const message = "Location is not supported by this browser.";
      setLocationError(message);
      toast.error(message);
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId: number | null = null;

    const finishLocationSearch = (position: GeolocationPosition | null, precise: boolean) => {
      if (finished) return;
      finished = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      if (!position || position.coords.accuracy > MAX_USABLE_LOCATION_ACCURACY_METERS) {
        const accuracyText = position ? ` The browser only gave ~${Math.round(position.coords.accuracy)} m accuracy.` : "";
        const message = `Could not get a precise enough location.${accuracyText} Turn on device location/GPS, disable VPN if active, and try again.`;
        setLocationError(message);
        setLocationLoading(false);
        setManualLocationOpen(true);
        toast.error("Precise location unavailable", {
          description: "Paste a Google Maps pin or lat,lng to set it manually.",
        });
        return;
      }

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: "browser",
      });
      setNearestMode(true);
      setLocationLoading(false);

      if (precise) {
        toast.success("Precise location detected", {
          description: `Accuracy is about ${Math.round(position.coords.accuracy)} m.`,
        });
      } else {
        const message = `Using the best location found, but accuracy is only about ${Math.round(position.coords.accuracy)} m.`;
        setLocationError(message);
        toast.warning("Location is approximate", {
          description: "Move near a window or enable device GPS for a better route.",
        });
      }
    };

    const timeoutId = window.setTimeout(() => {
      finishLocationSearch(bestPosition, false);
    }, PRECISE_LOCATION_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= TARGET_LOCATION_ACCURACY_METERS) {
          window.clearTimeout(timeoutId);
          finishLocationSearch(position, true);
        }
      },
      (geoError) => {
        window.clearTimeout(timeoutId);
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. Please allow location access to find nearby stations."
            : "Could not detect your location. Please try again.";
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        setLocationError(message);
        setLocationLoading(false);
        setManualLocationOpen(true);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: PRECISE_LOCATION_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  };

  const handleManualLocationSubmit = () => {
    const parsedLocation = parseManualLocation(manualLocationInput);

    if (!parsedLocation) {
      const message = "Paste coordinates like 16.8524, 74.5815 or a Google Maps link copied from your pin.";
      setLocationError(message);
      toast.error("Could not read that location", {
        description: message,
      });
      return;
    }

    setUserLocation({
      latitude: parsedLocation.latitude,
      longitude: parsedLocation.longitude,
      accuracy: 0,
      source: "manual",
    });
    setNearestMode(true);
    setLocationError("");
    setManualLocationOpen(false);
    toast.success("Manual location set", {
      description: "Directions now use the coordinates you entered.",
    });
  };

  const stationsWithDistance = useMemo<StationWithDistance[]>(() => {
    return filteredStations.map((station) => {
      const hasCoordinates =
        typeof station.latitude === "number" &&
        typeof station.longitude === "number";
      const distanceKm =
        userLocation && hasCoordinates
          ? getDistanceKm(userLocation, {
              latitude: station.latitude!,
              longitude: station.longitude!,
            })
          : null;
      const readinessMinutes = getReadinessMinutes(station);
      const estimatedTravelMinutes =
        distanceKm === null
          ? Number.POSITIVE_INFINITY
          : (distanceKm / AVERAGE_CITY_SPEED_KMPH) * 60;
      const nearbyScore =
        readinessMinutes === Number.POSITIVE_INFINITY || estimatedTravelMinutes === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : estimatedTravelMinutes + readinessMinutes;

      return {
        ...station,
        distanceKm,
        readinessMinutes,
        nearbyScore,
      };
    });
  }, [filteredStations, userLocation]);

  const displayStations = useMemo(() => {
    if (!nearestMode || !userLocation) return stationsWithDistance;

    return [...stationsWithDistance].sort((a, b) => {
      if (a.nearbyScore !== b.nearbyScore) return a.nearbyScore - b.nearbyScore;
      if (a.distanceKm === null && b.distanceKm === null) return a.id - b.id;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [nearestMode, stationsWithDistance, userLocation]);

  const nearestAvailableStation = useMemo(() => {
    if (!userLocation) return null;
    return stationsWithDistance
      .filter((station) => station.distanceKm !== null && station.isActive && !station.isFaulty && !station.isOccupied)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0] ?? null;
  }, [stationsWithDistance, userLocation]);

  const nearbySoonStation = useMemo(() => {
    if (!userLocation) return null;
    return stationsWithDistance
      .filter((station) =>
        station.distanceKm !== null &&
        station.isActive &&
        !station.isFaulty &&
        station.isOccupied &&
        station.readinessMinutes <= SOON_FREE_MINUTES
      )
      .sort((a, b) => {
        if (a.nearbyScore !== b.nearbyScore) return a.nearbyScore - b.nearbyScore;
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      })[0] ?? null;
  }, [stationsWithDistance, userLocation]);

  const nearbyRecommendationStations = useMemo(() => {
    const recommendations = [nearbySoonStation, nearestAvailableStation].filter(Boolean) as StationWithDistance[];
    return recommendations.filter((station, index, list) =>
      list.findIndex((candidate) => candidate.id === station.id) === index
    );
  }, [nearbySoonStation, nearestAvailableStation]);

  const getStatusColor = (station: Station) => {
    if (station.isFaulty) return "text-red-600 bg-red-100";
    if (station.isOccupied) return "text-yellow-600 bg-yellow-100";
    if (station.isActive) return "text-green-600 bg-green-100";
    return "text-[#5A7863] bg-[#EBF4DD]";
  };

  const getStatusText = (station: Station) => {
    if (station.isFaulty) return "Faulty";
    if (station.isOccupied) return "Occupied";
    if (station.isActive) return "Available";
    return "Inactive";
  };

  const getStatusIcon = (station: Station) => {
    if (station.isFaulty) return <XCircle className="w-4 h-4" />;
    if (station.isOccupied) return <Clock className="w-4 h-4" />;
    if (station.isActive) return <CheckCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading stations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 size-10 text-destructive" />
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => fetchStations()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-[#90AB8B]/45 bg-[#F4F8ED] shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-[#5A7863]">Stations</p>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#3B4953]">Find stations</h1>
                <p className="text-sm text-muted-foreground">Find and connect to available charging points.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-xl bg-[#EBF4DD] px-3 py-2 text-[#3B4953]">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">{displayStations.length} stations</span>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            {/* Station ID Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#5A7863]" />
                <Input
                  placeholder="Search by Station ID"
                  className="pl-10 w-full"
                  value={stationIdSearch}
                  onChange={(e) => setStationIdSearch(e.target.value)}
                />
              </div>
            </div>
            
            {/* City Filter */}
            <div className="flex-1">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full bg-[#F4F8ED] text-[#3B4953] border-[#90AB8B]/60">
                  <SelectValue placeholder="Filter by City" className="text-[#5A7863]" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city, index) => (
                    <SelectItem key={index} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="flex-shrink-0 bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#EBF4DD] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Detecting...
                </>
              ) : (
                <>
                  <LocateFixed className="w-4 h-4 mr-2" />
                  {userLocation ? "Refresh Location" : "Use My Location"}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={() => setManualLocationOpen((open) => !open)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Set Manually
            </Button>

            {nearestMode && (
              <Button
                variant="outline"
                className="flex-shrink-0"
                onClick={() => setNearestMode(false)}
              >
                Default Order
              </Button>
            )}
            
            {/* Clear Filters Button */}
            {(cityFilter !== "all" || stationIdSearch) && (
              <Button 
                className="flex-shrink-0 bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                onClick={() => {
                  setCityFilter("all");
                  setStationIdSearch("");
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          {manualLocationOpen && (
            <div className="mt-3 bg-[#F4F8ED] border border-emerald-200 rounded-lg p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  value={manualLocationInput}
                  onChange={(event) => setManualLocationInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleManualLocationSubmit();
                  }}
                  placeholder="Paste Google Maps link or lat,lng, e.g. 16.8524, 74.5815"
                  className="flex-1"
                />
                <Button
                  className="bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                  onClick={handleManualLocationSubmit}
                >
                  Use This Location
                </Button>
              </div>
              <p className="text-xs text-[#5A7863] mt-2">
                Browser location on laptops can be IP-based. For exact directions, drop a pin in Google Maps, copy the link, and paste it here.
              </p>
            </div>
          )}
          {userLocation && nearestMode && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              Sorted using {userLocation.source === "manual" ? "your manually set location" : "your current location"}, station distance, and wait time.
              {userLocation.source === "manual" ? " Manual coordinates are being used." : ` Accuracy: about ${Math.round(userLocation.accuracy)} m.`}
            </p>
          )}
          {locationError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
              {locationError}
            </p>
          )}
        </div>
      </header>

      <div>
        {nearestMode && userLocation && (
          <div className="mb-8 bg-[#F4F8ED] border border-emerald-200 rounded-lg shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#3B4953]">Nearest charging options</h2>
                <p className="text-sm text-[#5A7863]">
                  Showing both nearby stations that will open soon and available stations that may be worth the extra distance.
                </p>
              </div>
              <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 flex items-center w-fit">
                <Navigation className="w-4 h-4 mr-1.5" />
                Live location active
              </div>
            </div>

            {nearbyRecommendationStations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nearbyRecommendationStations.map((station) => (
                  <button
                    key={station.id}
                    className="text-left border border-[#90AB8B]/40 rounded-lg p-4 bg-[#EBF4DD]/55 hover:bg-[#F4F8ED] hover:border-emerald-300 transition-colors"
                    onClick={() => {
                      setSelectedStation(station);
                      setStationModalOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#5A7863]">
                          {station.isOccupied ? "Nearby, opening soon" : "Nearest available now"}
                        </p>
                        <h3 className="text-base font-semibold text-[#3B4953]">Station #{station.id}</h3>
                        <p className="text-sm text-[#5A7863] mt-1">{station.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(station)}`}>
                        {getStatusText(station)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-[#F4F8ED] border border-[#90AB8B]/40 rounded-md p-3">
                        <p className="text-xs text-[#5A7863]">Distance</p>
                        <p className="text-sm font-semibold text-[#3B4953]">{formatDistance(station.distanceKm)}</p>
                      </div>
                      <div className="bg-[#F4F8ED] border border-[#90AB8B]/40 rounded-md p-3">
                        <p className="text-xs text-[#5A7863]">Readiness</p>
                        <p className="text-sm font-semibold text-[#3B4953]">{getReadinessText(station)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#5A7863] bg-[#EBF4DD]/55 border border-[#90AB8B]/40 rounded-lg p-4">
                No nearby recommendation can be calculated yet. Make sure stations have latitude and longitude saved.
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Available</p>
                  <p className="text-2xl font-semibold text-[#3B4953]">
                    {stations.filter(s => s.isActive && !s.isOccupied && !s.isFaulty).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#EBF4DD] rounded-xl flex items-center justify-center text-[#3B4953]">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Occupied</p>
                  <p className="text-2xl font-semibold text-[#3B4953]">
                    {stations.filter(s => s.isOccupied).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#EBF4DD] rounded-xl flex items-center justify-center text-[#3B4953]">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Queued</p>
                  <p className="text-2xl font-semibold text-[#3B4953]">
                    {stations.filter(s => s.queue && s.queue.count > 0).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#EBF4DD] rounded-xl flex items-center justify-center text-[#3B4953]">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Faulty</p>
                  <p className="text-2xl font-semibold text-[#3B4953]">
                    {stations.filter(s => s.isFaulty).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#EBF4DD] rounded-xl flex items-center justify-center text-[#3B4953]">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Inactive</p>
                  <p className="text-2xl font-semibold text-[#3B4953]">
                    {stations.filter(s => !s.isActive).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#EBF4DD] rounded-xl flex items-center justify-center text-[#3B4953]">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stations List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayStations.map((station) => (
            <Card 
              key={station.id} 
              className={`bg-[#F4F8ED] shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
                chargingStations.has(station.id) ? 'border-2 border-green-500' : 'border border-[#90AB8B]/40'
              }`}
              onClick={() => {
                setSelectedStation(station);
                setStationModalOpen(true);
              }}
            >
              <CardContent className="p-6">
                {/* Map preview on card when available */}
                {buildMapSrc(station, nearestMode ? userLocation : null) && (
                  <div className="rounded-lg overflow-hidden mb-4">
                    <iframe
                      src={buildMapSrc(station, nearestMode ? userLocation : null)}
                      width="100%"
                      height={140}
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={nearestMode && userLocation ? `Directions to station ${station.id}` : `Station ${station.id} map`}
                    />
                  </div>
                )}
                {/* Station Header with colored background based on status */}
                <div className={`-m-6 mb-4 p-6 ${
                  station.isFaulty ? 'bg-red-50 border-b border-red-100' : 
                  station.isOccupied ? 'bg-yellow-50 border-b border-yellow-100' : 
                  station.isActive ? 'bg-green-50 border-b border-green-100' : 
                  'bg-[#EBF4DD]/55 border-b border-[#90AB8B]/25'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        station.isFaulty ? 'bg-red-100 text-red-600' : 
                        station.isOccupied ? 'bg-yellow-100 text-yellow-600' : 
                        station.isActive ? 'bg-green-100 text-green-600' : 
                        'bg-[#EBF4DD] text-[#5A7863]'
                      }`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#3B4953]">Station #{station.id}</h3>
                        <p className="text-sm text-[#5A7863]">{station.location}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(station)}`}>
                      {getStatusIcon(station)}
                      <span>{getStatusText(station)}</span>
                    </div>
                  </div>
                </div>

                {/* Station Details */}
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#5A7863]">Health</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-3 bg-[#90AB8B]/35 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            station.healthPercentage >= 80 ? 'bg-green-500' :
                            station.healthPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${station.healthPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-[#3B4953]">{station.healthPercentage}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#5A7863]">Energy Used</span>
                    <div className="flex items-center space-x-1">
                      <Battery className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-[#3B4953]">{station.totalEnergyConsumption} kWh</span>
                    </div>
                  </div>

                  {nearestMode && userLocation && (
                    <div className="flex items-center justify-between bg-emerald-50 -mx-2 px-2 py-1.5 rounded">
                      <span className="text-sm font-medium text-emerald-800 flex items-center">
                        <Navigation className="w-3.5 h-3.5 mr-1" />
                        Distance
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatDistance(station.distanceKm)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#5A7863]">Operator</span>
                    <span className="text-sm font-semibold text-[#3B4953]">{station.operator}</span>
                  </div>

                  {station.connectedUser && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#5A7863]">Current User</span>
                      <span className="text-sm font-semibold text-blue-700">{station.connectedUser}</span>
                    </div>
                  )}

                  {/* Time Remaining for occupied stations */}
                  {station.isOccupied && station.activeSession && (
                    <div className="flex items-center justify-between bg-amber-50 -mx-2 px-2 py-1.5 rounded">
                      <span className="text-sm font-medium text-amber-800 flex items-center">
                        <Timer className="w-3.5 h-3.5 mr-1" />
                        Free in
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        {station.activeSession.minutesRemaining !== null 
                          ? station.activeSession.minutesRemaining <= 0 
                            ? "Any moment now!" 
                            : `~${station.activeSession.minutesRemaining} min`
                          : "Unknown"}
                      </span>
                    </div>
                  )}

                  {/* Queue count */}
                  {station.queue && station.queue.count > 0 && (
                    <div className="flex items-center justify-between bg-[#EBF4DD] -mx-2 px-2 py-1.5 rounded">
                      <span className="text-sm font-medium text-[#3B4953] flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        In Queue
                      </span>
                      <span className="text-sm font-bold text-[#5A7863]">
                        {station.queue.count} {station.queue.count === 1 ? 'person' : 'people'}
                        {station.queue.userPosition && (
                          <span className="ml-1 text-xs bg-[#90AB8B]/30 px-1.5 py-0.5 rounded-full">
                            You: #{station.queue.userPosition}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* View Details Button - Replaces direct action buttons */}
                <div className="mt-4 pt-4 border-t border-[#90AB8B]/25">
                  <Button 
                    className="w-full bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    View Details & Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayStations.length === 0 && (
          <div className="text-center py-12 bg-[#EBF4DD]/55 rounded-lg border border-[#90AB8B]/40 shadow-sm">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#3B4953] mb-2">No stations found</h3>
            <p className="text-[#5A7863] max-w-md mx-auto mb-4">
              {stations.length > 0 
                ? "Try adjusting your search filters to see more stations."
                : "There are no charging stations available at the moment."}
            </p>
            {stations.length > 0 && (cityFilter !== "all" || stationIdSearch) && (
              <Button 
                className="mt-2 bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                onClick={() => {
                  setCityFilter("all");
                  setStationIdSearch("");
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Station Detail Modal */}
      <StationDetailModal
        isOpen={stationModalOpen}
        onClose={() => setStationModalOpen(false)}
        station={selectedStation}
        userLocation={userLocation}
        userData={userData}
        onStartCharging={handleStartCharging}
        onStopCharging={handleStopCharging}
        onJoinQueue={handleJoinQueue}
        onLeaveQueue={handleLeaveQueue}
        isCharging={selectedStation ? (chargingStations.has(selectedStation.id) || selectedStation.isCurrentUserCharging) : false}
        loading={selectedStation ? actionLoading === selectedStation.id : false}
        queueLoading={queueLoading}
      />
    </div>
  );
}

// Station Detail Modal Component
function StationDetailModal({ 
  isOpen, 
  onClose, 
  station, 
  userLocation,
  userData, 
  onStartCharging,
  onStopCharging,
  onJoinQueue,
  onLeaveQueue,
  isCharging,
  loading,
  queueLoading
}: StationDetailModalProps) {
  const userPoints = userData?.points ? parseInt(userData.points) : 0;
  const [localUserPoints, setLocalUserPoints] = useState(userPoints);
  const [pointsToUse, setPointsToUse] = useState<number>(Math.min(10, Math.max(0, userPoints)));
  const [countdown, setCountdown] = useState<string>("");
  const [localSessionActive, setLocalSessionActive] = useState(false);
  const [localSessionCompleted, setLocalSessionCompleted] = useState(false);
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number | null>(null);
  const [localTotalSeconds, setLocalTotalSeconds] = useState(0);
  const [localSessionStartPoints, setLocalSessionStartPoints] = useState(0);
  const [localSpentPoints, setLocalSpentPoints] = useState(0);

  // Live countdown timer
  useEffect(() => {
    if (!station?.activeSession?.estimatedFreeAt) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const freeAt = new Date(station.activeSession!.estimatedFreeAt!).getTime();
      const now = Date.now();
      const diff = freeAt - now;

      if (diff <= 0) {
        setCountdown("Finishing up...");
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [station?.activeSession?.estimatedFreeAt]);

  // sync pointsToUse when modal opens or userPoints change
  useEffect(() => {
    if (!isOpen) return;
    setLocalUserPoints(userPoints);
    setPointsToUse(Math.min(10, Math.max(0, userPoints)));
  }, [isOpen, userPoints]);

  // local charging countdown
  useEffect(() => {
    if (!localSessionActive || localRemainingSeconds === null) return;
    const interval = setInterval(() => {
      setLocalRemainingSeconds((prev) => (prev !== null ? Math.max(prev - 1, 0) : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [localSessionActive, localRemainingSeconds]);

  // drain points over time and complete session
  useEffect(() => {
    if (!localSessionActive || localRemainingSeconds === null) return;
    const elapsedSeconds = localTotalSeconds - localRemainingSeconds;
    const spentPoints = Math.min(pointsToUse, Math.floor(elapsedSeconds / (5 * 60)));

    if (spentPoints !== localSpentPoints) {
      const updatedPoints = Math.max(0, localSessionStartPoints - spentPoints);
      setLocalUserPoints(updatedPoints);
      setLocalSpentPoints(spentPoints);
    }

    if (localRemainingSeconds === 0) {
      setLocalSessionActive(false);
      setLocalSessionCompleted(true);
      const totalMinutes = Math.max(1, Math.round(localTotalSeconds / 60));
      const historyItem = {
        sessionId: Date.now(),
        stationId: station?.id ?? 0,
        location: station?.location ?? "",
        stationLocation: station?.location ?? "",
        createdAt: new Date().toISOString(),
        totalTime: `${totalMinutes} min`,
        isActive: false,
        pointsUsed: pointsToUse.toString(),
        energyConsumption: Number((pointsToUse * 0.5).toFixed(1)),
        transactionID: null,
        operator: station?.operator ?? "",
        oem: station?.oem ?? "",
        stationHealth: station?.healthPercentage ?? 0,
        stationStatus: {
          isOccupied: false,
          isActive: true,
          isFaulty: false,
        },
      };
      const existing = JSON.parse(localStorage.getItem("localChargingHistory") || "[]");
      existing.unshift(historyItem);
      localStorage.setItem("localChargingHistory", JSON.stringify(existing));
      toast.success("Charging session completed", {
        description: "Saved to history",
      });
    }
  }, [localRemainingSeconds, localSessionActive, localSessionStartPoints, localSpentPoints, localTotalSeconds, pointsToUse, station]);

  // Validate points input
  const handlePointsChange = (value: string) => {
    // allow empty value while typing
    if (value === "") {
      setPointsToUse(0);
      return;
    }
    const numValue = Number(value);
    if (Number.isNaN(numValue)) return;
    // clamp to [0, userPoints]
    const clamped = Math.max(0, Math.min(numValue, localUserPoints || numValue));
    setPointsToUse(clamped);
  };

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null) return "--";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleLocalStartCharging = async () => {
    if (!station) return;
    if (pointsToUse <= 0 || pointsToUse > localUserPoints) {
      toast.error("Enter a valid points amount");
      return;
    }

    try {
      await onStartCharging(station.id, pointsToUse);

      const totalSeconds = pointsToUse * 5 * 60;
      setLocalTotalSeconds(totalSeconds);
      setLocalRemainingSeconds(totalSeconds);
      setLocalSessionStartPoints(localUserPoints);
      setLocalSpentPoints(0);
      setLocalSessionActive(true);
      setLocalSessionCompleted(false);
      toast.success("Charging started", {
        description: "Please follow the safety rules below.",
      });
    } catch {
      // The parent handler already shows the backend error message.
    }
  };

  if (!isOpen || !station) return null;

  const isUserInQueue = station.queue?.userPosition !== null && station.queue?.userPosition > 0;
  const isFirstInQueue = station.queue?.userPosition === 1;
  const isNotified = station.queue?.userStatus === "NOTIFIED";
  const mapSrc = buildMapSrc(station, userLocation);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="h-full overflow-hidden border-l border-border bg-background sm:max-w-xl">
        <DrawerHeader className="border-b border-border px-6 py-5 text-left">
          <DrawerTitle className="text-xl text-[#3B4953]">Station #{station.id} details</DrawerTitle>
          <DrawerDescription>{station.location}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-6 overflow-y-auto px-6 py-5">
        {/* Map Preview */}
        {mapSrc && (
          <div className="rounded-lg overflow-hidden border border-[#90AB8B]/40">
            <iframe
              src={mapSrc}
              width="100%"
              height="260"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={userLocation ? `Directions to station ${station.id}` : `Station ${station.id} map`}
            />
          </div>
        )}

        {/* Station Info */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-lg text-blue-800 mb-3 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Station Information
          </h3>
          <div className="space-y-3 divide-y divide-blue-100">
            <div className="flex justify-between pb-2">
              <span className="text-[#5A7863] font-medium">Location:</span>
              <span className="font-medium text-[#3B4953]">{station.location}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5A7863] font-medium">Status:</span>
              <span className={`font-medium ${
                station.isFaulty ? 'text-red-600' : 
                station.isOccupied ? 'text-yellow-600' : 
                station.isActive ? 'text-green-600' : 'text-[#5A7863]'
              }`}>
                {station.isFaulty ? 'Faulty' : 
                 station.isOccupied ? 'Occupied' : 
                 station.isActive ? 'Available' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5A7863] font-medium">Health:</span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-[#90AB8B]/35 rounded-full overflow-hidden mr-2">
                  <div 
                    className={`h-full rounded-full ${
                      station.healthPercentage >= 80 ? 'bg-green-500' :
                      station.healthPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${station.healthPercentage}%` }}
                  ></div>
                </div>
                <span className="font-medium text-[#3B4953]">{station.healthPercentage}%</span>
              </div>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5A7863] font-medium">Energy Consumption:</span>
              <span className="font-medium text-[#3B4953]">{station.totalEnergyConsumption} kWh</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#5A7863] font-medium">Operator:</span>
              <span className="font-medium text-[#3B4953]">{station.operator}</span>
            </div>
          </div>
        </div>

        {/* Time Remaining Section - shown for occupied stations */}
        {station.isOccupied && station.activeSession && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-lg text-amber-800 mb-3 flex items-center">
              <Timer className="w-5 h-5 mr-2 text-amber-600" />
              Estimated Availability
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5A7863] font-medium">Charging since:</span>
                <span className="font-medium text-[#3B4953]">
                  {station.activeSession.elapsedMinutes} min ago
                </span>
              </div>
              {station.activeSession.estimatedDuration ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#5A7863] font-medium">Est. total duration:</span>
                    <span className="font-medium text-[#3B4953]">
                      {station.activeSession.estimatedDuration} min
                    </span>
                  </div>
                  <div className="text-center py-3 bg-amber-100 rounded-lg">
                    <p className="text-xs text-amber-700 uppercase font-semibold tracking-wide mb-1">
                      Station free in
                    </p>
                    <p className="text-3xl font-bold text-amber-800 font-mono">
                      {countdown || "Calculating..."}
                    </p>
                  </div>
                  {station.activeSession.minutesRemaining !== null && station.activeSession.minutesRemaining <= 5 && (
                    <div className="flex items-center bg-green-100 p-2 rounded text-green-800 text-sm">
                      <Bell className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium">Almost free! Station will be available very soon.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-3 bg-amber-100 rounded-lg">
                  <p className="text-sm text-amber-700">
                    Duration unknown (pay-per-use session). The user can stop at any time.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Queue Section - shown for occupied stations when user is NOT charging */}
        {station.isOccupied && !isCharging && (
          <div className="bg-[#EBF4DD] p-4 rounded-lg border border-[#90AB8B]/40">
            <h3 className="font-semibold text-lg text-[#3B4953] mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#5A7863]" />
              Waiting Queue
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5A7863] font-medium">People in queue:</span>
                <span className="font-bold text-[#3B4953]">{station.queue?.count || 0}</span>
              </div>

              {isUserInQueue ? (
                <div className="space-y-3">
                  <div className={`text-center py-3 rounded-lg ${
                    isNotified ? 'bg-green-100 border border-green-300' : 'bg-[#EBF4DD]'
                  }`}>
                    {isNotified ? (
                      <>
                        <div className="flex items-center justify-center mb-1">
                          <Bell className="w-5 h-5 text-green-600 mr-2 animate-bounce" />
                          <p className="text-sm font-bold text-green-800 uppercase">It's your turn!</p>
                        </div>
                        <p className="text-xs text-green-700">
                          The station is now free. Start charging before someone else does!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#5A7863] uppercase font-semibold tracking-wide mb-1">
                          Your position
                        </p>
                        <p className="text-4xl font-bold text-[#3B4953]">
                          #{station.queue.userPosition}
                        </p>
                        <p className="text-xs text-[#5A7863] mt-1">
                          {station.queue.userPosition === 1 
                            ? "You're next! You'll be notified when the station is free."
                            : `${(station.queue.userPosition || 0) - 1} ${(station.queue.userPosition || 0) - 1 === 1 ? 'person' : 'people'} ahead of you`
                          }
                        </p>
                      </>
                    )}
                  </div>
                  <Button
                    className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                    variant="outline"
                    onClick={() => onLeaveQueue(station.id)}
                    disabled={queueLoading}
                  >
                    {queueLoading ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Leave Queue
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#5A7863] bg-[#EBF4DD] p-2 rounded">
                    Join the queue to reserve your spot. You'll be notified when it's your turn to charge.
                    {station.queue?.count > 0 && ` You'll be position #${station.queue.count + 1}.`}
                  </p>
                  <Button
                    className="w-full bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                    onClick={() => onJoinQueue(station.id)}
                    disabled={queueLoading}
                  >
                    {queueLoading ? (
                      <div className="w-4 h-4 border-2 border-[#EBF4DD] border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    Join Queue
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* User Info */}
        {userData && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="font-semibold text-lg text-green-800 mb-3 flex items-center">
              <Battery className="w-5 h-5 mr-2 text-green-600" />
              Your Account
            </h3>
            <div className="space-y-3 divide-y divide-green-100">
              <div className="flex justify-between pb-2">
                <span className="text-[#5A7863] font-medium">Name:</span>
                <span className="font-medium text-[#3B4953]">{userData.firstName} {userData.lastName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#5A7863] font-medium">Email:</span>
                <span className="font-medium text-[#3B4953]">{userData.email}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#5A7863] font-medium">Available Points:</span>
                <span className="font-medium text-green-700">{localUserPoints} points</span>
              </div>
            </div>
          </div>
        )}

        {/* Charging Controls - only show if station is available (or user is first in queue for a now-free station) */}
        {!isCharging && station.isActive && !station.isOccupied && !station.isFaulty && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <h3 className="font-semibold text-lg text-yellow-800 mb-3 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-600" />
              Start Charging
            </h3>

            {/* Queue conflict warning */}
            {station.queue?.count > 0 && !isFirstInQueue && (
              <div className="flex items-start bg-red-100 p-3 rounded mb-4 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Queue active</p>
                  <p className="text-xs text-red-700">
                    There are {station.queue.count} people waiting in queue. Join the queue to wait for your turn.
                  </p>
                </div>
              </div>
            )}

            {/* Show green priority banner if user is first in queue */}
            {isFirstInQueue && (
              <div className="flex items-start bg-green-100 p-3 rounded mb-4 border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">You have priority!</p>
                  <p className="text-xs text-green-700">
                    You are #1 in the queue. Start charging now before your turn expires!
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3B4953] mb-2">
                  Points to use for charging:
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={localUserPoints}
                    value={pointsToUse}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    className="w-full p-2 border border-yellow-200 bg-[#F4F8ED] rounded-md text-[#3B4953] focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 focus:outline-none"
                  />
                  <span className="ml-2 text-[#3B4953] font-medium">points</span>
                </div>
                <p className="text-sm text-[#3B4953] mt-2 bg-yellow-100 p-2 rounded">
                  This will allow approximately {pointsToUse * 5} minutes of charging time.
                </p>
              </div>

              {(localSessionActive || localSessionCompleted) && (
                <div className="bg-[#F4F8ED] border border-yellow-200 rounded-lg p-3 space-y-3">
                  <div className="text-sm font-semibold text-[#3B4953]">Safety checklist</div>
                  <ul className="text-sm text-[#5A7863] list-disc pl-5 space-y-1">
                    <li>Make sure to stick the charging gun firmly to your vehicle.</li>
                    <li>Do not remove the connector while charging is active.</li>
                    <li>Keep the cable clear of pedestrians and vehicles.</li>
                  </ul>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A7863]">Remaining time</span>
                    <span className="font-semibold text-[#3B4953]">
                      {formatRemaining(localRemainingSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A7863]">Points draining</span>
                    <span className="font-semibold text-[#3B4953]">
                      {Math.max(0, localUserPoints)} points left
                    </span>
                  </div>
                  {localSessionCompleted && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                      Charging completed. Added to history.
                    </div>
                  )}
                </div>
              )}
              
              <Button
                className="w-full bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
                onClick={handleLocalStartCharging}
                disabled={loading || localSessionActive || pointsToUse <= 0 || pointsToUse > localUserPoints}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#EBF4DD] border-t-transparent rounded-full animate-spin mr-2"></div>
                    Starting Charging...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Charging ({pointsToUse} points)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Stop Charging Control */}
        {isCharging && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h3 className="font-semibold text-lg text-red-800 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-red-600" />
              Active Charging
            </h3>
            <p className="text-[#3B4953] mb-4 bg-red-100 p-3 rounded">
              You have an active charging session at this station. You can stop charging at any time.
            </p>
            <Button
              className="w-full bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
              onClick={() => onStopCharging(station.id)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#EBF4DD] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Stopping...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Stop Charging
                </>
              )}
            </Button>
          </div>
        )}

        {/* Not Available Message - only show if station is truly unavailable AND user isn't in queue section */}
        {!isCharging && (station.isFaulty || !station.isActive) && (
          <div className="bg-[#EBF4DD] p-4 rounded-lg border border-[#90AB8B]/40">
            <div className="flex items-center justify-center text-[#5A7863] p-2">
              <AlertTriangle className="w-5 h-5 mr-2 text-[#5A7863]" />
              <span className="font-medium">
                {station.isFaulty 
                  ? "This station is faulty and cannot be used." 
                  : "This station is currently inactive."}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#90AB8B]/60 text-[#5A7863] hover:bg-[#EBF4DD]/55">
            Close
          </Button>
        </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
