import { useEffect, useState } from "react";
import { Mail, MapPin, User, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "../lib/api";

interface ProfileData {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
  vehicle?: string;
}

export default function Profile() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/get/dashboard");
        const nameParts = response.data.data.userName.split(" ");
        setProfileData({
          ...response.data.data,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
        });
      } catch (err) {
        console.error("Error fetching profile data:", err);
        toast.error("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No profile data found.</div>;
  }

  const initials = `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#5A7863]">Account</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#3B4953]">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account information and charging summary.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-[#EBF4DD] text-2xl font-semibold text-[#3B4953]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-[#3B4953]">{profileData.firstName} {profileData.lastName}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {profileData.email}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Wallet className="size-4" /> Available points</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{profileData.totalPoints}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Clock className="size-4" /> Charging sessions</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{profileData.totalSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><MapPin className="size-4" /> Stations used</CardDescription>
            <CardTitle className="text-3xl text-[#3B4953]">{profileData.stationsUsed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="size-5" /> Personal information</CardTitle>
          <CardDescription>Read-only details from your current account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="First name" value={profileData.firstName} />
          <Info label="Last name" value={profileData.lastName} />
          <Info label="Email" value={profileData.email} />
          <Info label="Vehicle" value={profileData.vehicle || "Not added"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#3B4953]">{value}</p>
    </div>
  );
}
