import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BatteryCharging, Clock, History, MapPin, Route, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "../lib/api";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface DashboardData {
  userName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
  role: string;
}

const PLANS = [
  { points: 100, price: 99, label: "Starter", minutes: 500 },
  { points: 500, price: 399, label: "Popular", minutes: 2500, badge: true },
  { points: 1000, price: 749, label: "Best Value", minutes: 5000 },
] as const;

type Plan = typeof PLANS[number];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customPoints, setCustomPoints] = useState("");
  const [paying, setPaying] = useState(false);
  const rzpRef = useRef<RazorpayInstance | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get/dashboard");
      setDashboardData(response.data.data);
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  const effectivePoints = selectedPlan
    ? selectedPlan.points
    : Math.max(0, Math.floor(Number(customPoints)));

  const effectivePrice = selectedPlan
    ? selectedPlan.price
    : Math.ceil(effectivePoints * 0.99);

  const handleProceedToPay = async () => {
    if (effectivePoints <= 0) {
      toast.error("Select a plan or enter a valid amount");
      return;
    }

    setPaying(true);
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      toast.error("Could not load payment gateway. Check your connection.");
      setPaying(false);
      return;
    }

    const options: RazorpayOptions = {
      key: RAZORPAY_KEY,
      amount: effectivePrice * 100, // paise
      currency: "INR",
      name: "AVR Technologies",
      description: `${effectivePoints} Charging Points`,
      handler: async (response) => {
        try {
          const res = await api.post("/post/addPoints", { points: effectivePoints });
          setDashboardData(current =>
            current ? { ...current, totalPoints: res.data.points } : current
          );
          setShowSheet(false);
          setSelectedPlan(null);
          setCustomPoints("");
          toast.success(`${effectivePoints} points added!`, {
            description: `Payment ID: ${response.razorpay_payment_id}`,
          });
        } catch {
          toast.error("Payment received but failed to credit points. Contact support.");
        }
      },
      prefill: {
        name: dashboardData?.userName,
        email: dashboardData?.email,
      },
      theme: { color: "#3B4953" },
      modal: {
        ondismiss: () => setPaying(false),
        escape: true,
      },
    };

    const rzp = new window.Razorpay(options);
    rzpRef.current = rzp;
    rzp.on("payment.failed", () => {
      toast.error("Payment failed. Please try again.");
      setPaying(false);
    });
    rzp.open();
    setPaying(false);
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setSelectedPlan(null);
    setCustomPoints("");
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
              <Button
                onClick={() => setShowSheet(true)}
                className="shrink-0 bg-[#3B4953] hover:bg-[#5A7863]"
              >
                <Zap className="size-4" />
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
            <CardTitle>Today's charging readiness</CardTitle>
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
              detail={hasUsedStations ? `${dashboardData?.stationsUsed} unique stations connected.` : "Open station finder to choose a charger."}
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

      {/* Plan selection sheet */}
      <Sheet open={showSheet} onOpenChange={open => { if (!open) handleCloseSheet(); }}>
        <SheetContent className="border-l border-border sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Add charging points</SheetTitle>
            <SheetDescription>
              Select a plan or enter a custom amount. Payment powered by Razorpay.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-8">
            {/* Plan cards */}
            <div className="space-y-3">
              {PLANS.map(plan => (
                <button
                  key={plan.points}
                  onClick={() => { setSelectedPlan(plan); setCustomPoints(""); }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    selectedPlan?.points === plan.points
                      ? "border-[#3B4953] bg-[#EBF4DD]"
                      : "border-[#90AB8B]/40 bg-[#F4F8ED] hover:border-[#5A7863]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#3B4953]">{plan.points} points</span>
                        {'badge' in plan && plan.badge && (
                          <span className="rounded-full bg-[#3B4953] px-2 py-0.5 text-xs font-medium text-[#EBF4DD]">Popular</span>
                        )}
                      </div>
                      <p className="text-sm text-[#5A7863] mt-0.5">~{plan.minutes} min of charging</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#3B4953]">₹{plan.price}</p>
                      <p className="text-xs text-[#5A7863]">₹{(plan.price / plan.points).toFixed(2)}/pt</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-sm font-medium text-[#3B4953] mb-2">Or enter custom points</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 250"
                  value={customPoints}
                  onChange={e => { setCustomPoints(e.target.value); setSelectedPlan(null); }}
                  className="flex-1"
                />
                <div className="flex items-center justify-center rounded-lg border border-[#90AB8B]/40 bg-[#EBF4DD] px-3 text-sm font-semibold text-[#3B4953] min-w-[72px]">
                  {effectivePoints > 0 ? `₹${effectivePrice}` : "₹—"}
                </div>
              </div>
            </div>

            {/* Summary */}
            {effectivePoints > 0 && (
              <div className="rounded-xl border border-[#90AB8B]/40 bg-[#EBF4DD]/70 p-3 text-sm space-y-1">
                <div className="flex justify-between text-[#3B4953]">
                  <span>Points</span>
                  <span className="font-semibold">{effectivePoints}</span>
                </div>
                <div className="flex justify-between text-[#3B4953]">
                  <span>Charging time</span>
                  <span className="font-semibold">~{effectivePoints * 5} min</span>
                </div>
                <div className="flex justify-between text-[#3B4953] pt-1 border-t border-[#90AB8B]/40">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">₹{effectivePrice}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-[#3B4953] hover:bg-[#5A7863] text-[#EBF4DD]"
              onClick={handleProceedToPay}
              disabled={effectivePoints <= 0 || paying}
            >
              {paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#EBF4DD] border-t-transparent rounded-full animate-spin mr-2" />
                  Opening Razorpay...
                </>
              ) : (
                <>
                  <BatteryCharging className="size-4 mr-2" />
                  Pay ₹{effectivePoints > 0 ? effectivePrice : "—"} via Razorpay
                </>
              )}
            </Button>

            <p className="text-xs text-center text-[#5A7863]">
              Secured by Razorpay · Test mode active
            </p>
          </div>
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
