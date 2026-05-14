import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BatteryCharging, Clock, History, MapPin, Plus, Route, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "../lib/api";

interface DashboardData {
  userName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
  role: string;
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [addPointsValue, setAddPointsValue] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get/dashboard");
      setDashboardData(response.data.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleConfirmAddPoints = async () => {
    const parsed = Number(addPointsValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast.error("Enter a valid points amount");
      return;
    }

    try {
      setAddingPoints(true);
      const response = await api.post("/post/addPoints", { points: parsed });
      setDashboardData((current) => current ? { ...current, totalPoints: response.data.points } : current);
      setShowAddPoints(false);
      setAddPointsValue("");
      toast.success("Points added", { description: `Added ${parsed} points` });
    } catch (err) {
      console.error("Error adding points:", err);
      toast.error("Failed to add points. Please try again.");
    } finally {
      setAddingPoints(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  const availablePoints = Number(dashboardData?.totalPoints ?? 0);
  const estimatedMinutes = availablePoints * 5;
  const hasChargingHistory = Boolean(dashboardData?.totalSessions);
  const hasUsedStations = Boolean(dashboardData?.stationsUsed);

  return (
    <div className="space-y-5">
      <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]/90">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
          <p className="text-sm font-medium text-[#5A7863]">Welcome back</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#3B4953]">{dashboardData?.userName ?? "Your dashboard"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage your charging points, find stations, and review previous sessions from one clean workspace.
          </p>
          </div>
          <div className="rounded-2xl border border-[#90AB8B]/45 bg-[#EBF4DD] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#5A7863]">Charging balance</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-[#3B4953]">{availablePoints}</p>
                <p className="mt-1 text-sm text-[#5A7863]">points available</p>
              </div>
              <Button onClick={() => setShowAddPoints(true)} className="shrink-0">
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            <div className="mt-4 rounded-xl bg-[#90AB8B]/20 px-3 py-2 text-sm text-[#3B4953]">
              Enough for approximately <span className="font-semibold">{estimatedMinutes}</span> minutes of charging.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#F4F8ED]/90">
          <CardHeader className="pb-2">
            <CardDescription>Available points</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{dashboardData?.totalPoints ?? "0"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Use points to reserve charging time.</CardContent>
        </Card>
        <Card className="bg-[#F4F8ED]/90">
          <CardHeader className="pb-2">
            <CardDescription>Total sessions</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{dashboardData?.totalSessions ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Completed and active charging records.</CardContent>
        </Card>
        <Card className="bg-[#F4F8ED]/90">
          <CardHeader className="pb-2">
            <CardDescription>Stations used</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{dashboardData?.stationsUsed ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Unique stations connected to your account.</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[#F4F8ED]/90 transition-colors hover:border-[#90AB8B]">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#EBF4DD] text-[#3B4953]">
              <MapPin className="size-5" />
            </div>
            <CardTitle>Find stations</CardTitle>
            <CardDescription>Check station status, queues, distance, and start charging.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/stations">Open station finder</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#F4F8ED]/90">
          <CardHeader>
            <CardTitle>Today’s charging readiness</CardTitle>
            <CardDescription>Useful next actions based on your current account state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadinessRow
              icon={<Wallet className="size-4" />}
              label={availablePoints > 0 ? "You can start a charging session" : "Add points before charging"}
              detail={availablePoints > 0 ? `${availablePoints} points available for use.` : "Your balance is empty right now."}
            />
            <ReadinessRow
              icon={<Clock className="size-4" />}
              label={hasChargingHistory ? "History is being tracked" : "No sessions recorded yet"}
              detail={hasChargingHistory ? `${dashboardData?.totalSessions} charging sessions saved.` : "Start a session to create your first record."}
            />
            <ReadinessRow
              icon={<Route className="size-4" />}
              label={hasUsedStations ? "You have used stations before" : "Find your first station"}
              detail={hasUsedStations ? `${dashboardData?.stationsUsed} unique stations connected.` : "Open station finder to choose charger #2 for testing."}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-[#F4F8ED]/90 transition-colors hover:border-[#90AB8B]">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#EBF4DD] text-[#3B4953]">
              <History className="size-5" />
            </div>
            <CardTitle>Charging history</CardTitle>
            <CardDescription>Review previous sessions, points used, and station details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/history">View history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Sheet open={showAddPoints} onOpenChange={setShowAddPoints}>
        <SheetContent className="border-l border-border sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add points</SheetTitle>
            <SheetDescription>Points are saved to your account and used when starting a charging session.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <Label htmlFor="points">Points amount</Label>
            <Input
              id="points"
              type="number"
              min={1}
              value={addPointsValue}
              onChange={(event) => setAddPointsValue(event.target.value)}
              placeholder="e.g. 500"
            />
            <div className="rounded-xl border bg-[#EBF4DD]/55 p-3 text-sm text-[#3B4953]">
              <div className="flex items-center gap-2 font-medium">
                <Wallet className="size-4" />
                Current balance: {dashboardData?.totalPoints ?? "0"} points
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleConfirmAddPoints} disabled={addingPoints}>
              <BatteryCharging className="size-4" />
              {addingPoints ? "Adding..." : "Add points"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ReadinessRow({ icon, label, detail }: { icon: ReactNode; label: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#90AB8B]/35 bg-[#EBF4DD]/70 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#90AB8B]/25 text-[#3B4953]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#3B4953]">{label}</p>
        <p className="text-sm leading-6 text-[#5A7863]">{detail}</p>
      </div>
    </div>
  );
}
