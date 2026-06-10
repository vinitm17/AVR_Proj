import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, BatteryCharging, Calendar, Clock, MapPin, Wallet, Zap } from "lucide-react";
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
  const totalEnergy = sessions.reduce((sum, session) => sum + Number(session.energyConsumption || 0), 0);
  const latestSession = sessions[0];

  if (loading) {
    return <div className="rounded-2xl border border-[#90AB8B]/40 bg-[#F4F8ED] p-6 text-sm text-[#5A7863]">Loading charging history...</div>;
  }

  if (error) {
    return (
      <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm text-[#5A7863]">{error}</p>
          <Button onClick={fetchHistory}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-[#5A7863]">Sessions</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[#26343A]">Charging history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5A7863]">
              Review completed and active sessions, points spent, energy usage, and station patterns.
            </p>
          </div>

          <div className="rounded-2xl border border-[#90AB8B]/45 bg-[#EBF4DD] p-4">
            <p className="text-sm font-medium text-[#5A7863]">Latest activity</p>
            {latestSession ? (
              <>
                <p className="mt-2 text-lg font-semibold text-[#26343A]">Station #{latestSession.stationId}</p>
                <p className="mt-1 text-sm text-[#5A7863]">{latestSession.stationLocation || latestSession.location}</p>
                <p className="mt-3 rounded-xl bg-[#90AB8B]/20 px-3 py-2 text-sm text-[#3B4953]">{formatDate(latestSession.createdAt)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#5A7863]">No charging sessions recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Summary icon={<Activity className="size-4" />} label="Total sessions" value={sessions.length} helper="All records" />
        <Summary icon={<BatteryCharging className="size-4" />} label="Active sessions" value={activeSessions} helper="In progress" />
        <Summary icon={<Wallet className="size-4" />} label="Points used" value={totalPoints} helper="Total spent" />
        <Summary icon={<Zap className="size-4" />} label="Energy used" value={`${totalEnergy.toFixed(1)}`} helper="kWh total" />
      </div>

      <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
        <CardHeader>
          <CardTitle className="text-[#26343A]">Session timeline</CardTitle>
          <CardDescription className="text-[#5A7863]">Most recent charging activity appears first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session) => (
            <div key={session.sessionId} className="rounded-2xl border border-[#90AB8B]/35 bg-[#EBF4DD]/70 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#26343A]">Station #{session.stationId}</h2>
                    <Badge className={session.isActive ? "bg-[#3B4953] text-[#EBF4DD]" : "bg-[#90AB8B]/30 text-[#26343A] hover:bg-[#90AB8B]/30"}>
                      {session.isActive ? "Active" : "Completed"}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-[#5A7863]"><MapPin className="size-4 shrink-0" /> <span className="truncate">{session.stationLocation || session.location}</span></p>
                  <p className="flex items-center gap-2 text-sm text-[#5A7863]"><Calendar className="size-4 shrink-0" /> {formatDate(session.createdAt)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center lg:min-w-96">
                  <Metric icon={<Clock className="size-3.5" />} label="Time" value={session.totalTime || "0 min"} />
                  <Metric icon={<Wallet className="size-3.5" />} label="Points" value={session.pointsUsed} />
                  <Metric icon={<Zap className="size-3.5" />} label="Energy" value={`${session.energyConsumption} kWh`} />
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#90AB8B]/55 bg-[#EBF4DD]/70 p-8 text-center">
              <BatteryCharging className="mx-auto mb-3 size-8 text-[#5A7863]" />
              <p className="font-semibold text-[#26343A]">No charging history yet</p>
              <p className="mt-1 text-sm text-[#5A7863]">Start a session from Find stations and it will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string | number; helper: string }) {
  return (
    <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
      <CardContent className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-[#5A7863]">{icon}{label}</p>
        <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#26343A]">{value}</p>
        <p className="mt-1 text-sm text-[#5A7863]">{helper}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#90AB8B]/35 bg-[#F4F8ED] px-3 py-2">
      <p className="flex items-center justify-center gap-1 text-xs text-[#5A7863]">{icon}{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#26343A]">{value}</p>
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
