import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BatteryCharging, Clock, History, LogOut, MapPin, Menu, PanelLeftIcon, User, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import api from "@/lib/api";

interface DashboardData {
  userName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
  role: string;
}

const navItems = [
  { label: "Dashboard", href: "/home", icon: Wallet },
  { label: "Find stations", href: "/stations", icon: MapPin },
  { label: "Charging history", href: "/history", icon: History },
];

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#90AB8B]/50 bg-[#EBF4DD] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#3B4953]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span className="shrink-0 rounded-lg bg-[#90AB8B]/25 px-2 py-1 text-sm font-semibold text-[#3B4953]">{value}</span>
    </div>
  );
}

export function DashboardShell() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = sidebarPinned || sidebarHovered;

  useEffect(() => {
    let mounted = true;

    api.get("/get/dashboard")
      .then((response) => {
        if (mounted) setDashboardData(response.data.data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/signin", { replace: true });
      });

    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin", { replace: true });
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarPinned}>
      {/* Mobile full-screen nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#EBF4DD] lg:hidden">
          <div className="flex items-center justify-between border-b border-[#90AB8B]/40 px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#3B4953] text-[#EBF4DD]">
                <BatteryCharging className="size-4" />
              </div>
              <span className="font-semibold text-[#3B4953]">ONE EV</span>
            </div>
            <button onClick={() => setMobileNavOpen(false)} className="rounded-xl p-2 text-[#3B4953] hover:bg-[#90AB8B]/25" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${location.pathname === item.href ? "bg-[#3B4953] text-[#EBF4DD]" : "text-[#3B4953] hover:bg-[#90AB8B]/25"}`}
              >
                <item.icon className="size-5" />{item.label}
              </Link>
            ))}
            <Link
              to="/profile"
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${location.pathname === "/profile" ? "bg-[#3B4953] text-[#EBF4DD]" : "text-[#3B4953] hover:bg-[#90AB8B]/25"}`}
            >
              <User className="size-5" />Profile
            </Link>
          </nav>
          <div className="border-t border-[#90AB8B]/40 p-4 space-y-1">
            <div className="px-4 py-2">
              <p className="text-sm font-medium text-[#3B4953]">{dashboardData?.userName ?? "Account"}</p>
              <p className="text-xs text-[#5A7863]">{dashboardData?.email ?? "Signed in"}</p>
            </div>
            <button onClick={() => { setMobileNavOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#3B4953] hover:bg-[#90AB8B]/25 transition-colors">
              <LogOut className="size-5" />Logout
            </button>
          </div>
        </div>
      )}

      <Sidebar
        collapsible="icon"
        className="hidden lg:flex border-r border-[#90AB8B]/40"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <SidebarHeader className="p-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
          <div className="flex items-center gap-3 rounded-2xl bg-[#EBF4DD] p-3 text-[#3B4953] ring-1 ring-[#90AB8B]/40 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#3B4953] text-[#EBF4DD]">
              <BatteryCharging className="size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">ONE EV</p>
              <p className="truncate text-xs text-[#5A7863]">Charging network</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={sidebarPinned ? "Collapse sidebar" : "Keep sidebar expanded"}
            onClick={() => setSidebarPinned((current) => !current)}
            className="mt-2 size-9 rounded-xl border border-[#90AB8B]/45 bg-[#EBF4DD] text-[#3B4953] hover:bg-[#90AB8B]/25 group-data-[collapsible=icon]:mt-1"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.href} tooltip={item.label}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Quick info</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              <StatRow icon={<Wallet className="size-3.5" />} label="Points" value={dashboardData?.totalPoints ?? "-"} />
              <StatRow icon={<Clock className="size-3.5" />} label="Sessions" value={dashboardData?.totalSessions ?? "-"} />
              <StatRow icon={<MapPin className="size-3.5" />} label="Stations" value={dashboardData?.stationsUsed ?? "-"} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-[#3B4953]">{dashboardData?.userName ?? "Account"}</p>
            <p className="truncate text-xs text-[#5A7863]">{dashboardData?.email ?? "Signed in"}</p>
          </div>
          <Separator className="my-1 group-data-[collapsible=icon]:hidden" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/profile"} tooltip="Profile">
                <Link to="/profile">
                  <User />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-svh bg-[#EBF4DD]">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[#90AB8B]/40 bg-[#F4F8ED] px-4 py-3 lg:hidden">
          <button onClick={() => setMobileNavOpen(true)} className="rounded-xl p-1.5 text-[#3B4953] hover:bg-[#90AB8B]/25" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <BatteryCharging className="size-4 text-[#3B4953]" />
            <span className="text-sm font-semibold text-[#3B4953]">ONE EV</span>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="mb-4 rounded-2xl border border-[#90AB8B]/45 bg-[#F4F8ED]/75 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#3B4953]">ONE EV Dashboard</p>
              <p className="text-xs text-[#5A7863]">Monitor charging, stations, and account activity.</p>
            </div>
          </div>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
