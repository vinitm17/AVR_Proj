import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, BatteryCharging, Calendar, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "../lib/api";

interface Session {
  sessionId: number;
  stationId: number;
  location: string;
  stationLocation: string;
  createdAt: string;
  totalTime: string;
  isActive: boolean;
  pointsUsed: string;
  energyConsumption: number;
  transactionID: string | null;
  operator: string;
  oem: string;
  stationHealth: number;
  stationStatus: {
    isOccupied: boolean;
    isActive: boolean;
    isFaulty: boolean;
  };
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get/history");
      setSessions(response.data.sessions || []);
      setError("");
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Failed to load charging history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const totalPoints = sessions.reduce((sum, session) => sum + Number(session.pointsUsed || 0), 0);
  const activeSessions = sessions.filter((session) => session.isActive).length;

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading charging history...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchHistory}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#5A7863]">Sessions</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#3B4953]">Charging history</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your previous charging sessions and station usage.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary icon={<Activity className="size-4" />} label="Total sessions" value={sessions.length} />
        <Summary icon={<BatteryCharging className="size-4" />} label="Active sessions" value={activeSessions} />
        <Summary icon={<Wallet className="size-4" />} label="Points used" value={totalPoints} />
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.sessionId}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#3B4953]">Station #{session.stationId}</h2>
                    <Badge variant={session.isActive ? "default" : "secondary"}>{session.isActive ? "Active" : "Completed"}</Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> {session.stationLocation || session.location}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="size-4" /> {formatDate(session.createdAt)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center md:min-w-80">
                  <Metric label="Time" value={session.totalTime || "0 min"} />
                  <Metric label="Points" value={session.pointsUsed} />
                  <Metric label="Energy" value={`${session.energyConsumption} kWh`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">No charging history yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">{icon}{label}</CardDescription>
        <CardTitle className="text-3xl text-[#3B4953]">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-[#3B4953]">{value}</p>
    </div>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
