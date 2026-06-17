import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, MapPin, Settings, Wrench, Wallet, BarChart, Users, ArrowLeft, PlusCircle, Trash2, Search, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface Station {
  id: number;
  location: string;
  totalEnergyConsumption: string;
  healthPercentage: number;
  isOccupied: boolean;
  isActive: boolean;
  isFaulty: boolean;
  recentSessions: Session[];
}

interface Session {
  id: number;
  date: string;
  duration: string;
  pointsUsed: string;
  energyConsumption: number;
  user: string;
}

interface OperatorDashboardData {
  stationsOperated: number;
  totalSessions: number;
  totalPoints: string;
  stations: Station[];
}

interface OperatorUser {
  id: number;
  name: string;
  email: string;
  role: string;
  pointsBalance: string;
  pointsConsumed: string;
}

interface OperatorProfile {
  userName: string;
  email: string;
  role: string;
}

interface StationAnalytics {
  stationId: number;
  totalPoints: string;
  totalEnergy: string;
  totalSessions: number;
}

export default function OperatorDashboard() {
  const [dashboardData, setDashboardData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<OperatorUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [expandedStationId, setExpandedStationId] = useState<number | null>(null);
  const [stationEdits, setStationEdits] = useState<Record<number, { isActive: boolean; isFaulty: boolean; healthPercentage: string }>>({});
  const [stationAnalytics, setStationAnalytics] = useState<Record<number, StationAnalytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [stationIdToRemove, setStationIdToRemove] = useState("");
  const [addStationLoading, setAddStationLoading] = useState(false);
  const [removeStationLoading, setRemoveStationLoading] = useState(false);
  const [stationForm, setStationForm] = useState({
    location: "",
    OEMId: "",
    resellerId: "",
    operatorId: "",
    totalEnergyConsumption: "",
    healthPercentage: "100",
    isActive: true,
    isFaulty: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    const loadOperatorDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get("/operator/get/operator-dashboard");
        setDashboardData(response.data.data);
        setError("");
      } catch (err: any) {
        console.error("Error fetching operator dashboard:", err);
        if (err.response?.status === 403) {
          setError("Access denied. Only operators can access this dashboard.");
        } else {
          setError("Failed to load operator dashboard data");
          // If authentication error, redirect to login
          if (err.response?.status === 401) {
            localStorage.removeItem("token");
            navigate("/signin");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadOperatorDashboard();
  }, [navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/get/dashboard");
        setProfile({
          userName: response.data.data.userName,
          email: response.data.data.email,
          role: response.data.data.role
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await api.get("/operator/get/users");
        setUsers(response.data.users || []);
        setUsersError("");
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setUsersError("Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (!dashboardData) return;
    const next: Record<number, { isActive: boolean; isFaulty: boolean; healthPercentage: string }> = {};
    dashboardData.stations.forEach(station => {
      next[station.id] = {
        isActive: station.isActive,
        isFaulty: station.isFaulty,
        healthPercentage: String(station.healthPercentage)
      };
    });
    setStationEdits(next);
  }, [dashboardData]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await api.get("/operator/get/station-analytics");
        const analyticsList: StationAnalytics[] = response.data.analytics || [];
        const mapped: Record<number, StationAnalytics> = {};
        analyticsList.forEach(entry => {
          mapped[entry.stationId] = entry;
        });
        setStationAnalytics(mapped);
      } catch (err) {
        console.error("Error fetching station analytics:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const handleAddStation = async () => {
    try {
      setAddStationLoading(true);
      const payload = {
        location: stationForm.location,
        OEMId: Number(stationForm.OEMId),
        resellerId: Number(stationForm.resellerId),
        operatorId: stationForm.operatorId ? Number(stationForm.operatorId) : undefined,
        totalEnergyConsumption: stationForm.totalEnergyConsumption ? Number(stationForm.totalEnergyConsumption) : undefined,
        healthPercentage: stationForm.healthPercentage ? Number(stationForm.healthPercentage) : undefined,
        isActive: stationForm.isActive,
        isFaulty: stationForm.isFaulty
      };

      const response = await api.post("/operator/post/station/add", payload);
      await api.get("/operator/get/operator-dashboard").then(res => setDashboardData(res.data.data));
      alert(response.data.msg || "Station added successfully");
      setStationForm({
        location: "",
        OEMId: "",
        resellerId: "",
        operatorId: "",
        totalEnergyConsumption: "",
        healthPercentage: "100",
        isActive: true,
        isFaulty: false
      });
    } catch (err: any) {
      console.error("Error adding station:", err);
      alert(err.response?.data?.msg || "Failed to add station");
    } finally {
      setAddStationLoading(false);
    }
  };

  const handleUpdateStation = async (stationId: number) => {
    try {
      const edit = stationEdits[stationId];
      if (!edit) return;

      await api.post("/operator/post/station/update", {
        stationId: stationId,
        isActive: edit.isActive,
        isFaulty: edit.isFaulty,
        healthPercentage: Number(edit.healthPercentage)
      });

      const response = await api.get("/operator/get/operator-dashboard");
      setDashboardData(response.data.data);
      const analyticsResponse = await api.get("/operator/get/station-analytics");
      const analyticsList: StationAnalytics[] = analyticsResponse.data.analytics || [];
      const mapped: Record<number, StationAnalytics> = {};
      analyticsList.forEach(entry => {
        mapped[entry.stationId] = entry;
      });
      setStationAnalytics(mapped);
      alert("Station updated");
    } catch (err: any) {
      console.error("Error updating station:", err);
      alert(err.response?.data?.msg || "Failed to update station");
    }
  };

  const handleRemoveStationById = async (stationId: number) => {
    try {
      setRemoveStationLoading(true);
      const response = await api.post("/operator/post/station/remove", {
        stationId: Number(stationId)
      });
      await api.get("/operator/get/operator-dashboard").then(res => setDashboardData(res.data.data));
      alert(response.data.msg || "Station removed successfully");
    } catch (err: any) {
      console.error("Error removing station:", err);
      alert(err.response?.data?.msg || "Failed to remove station");
    } finally {
      setRemoveStationLoading(false);
    }
  };

  const handleRemoveStation = async () => {
    try {
      if (!stationIdToRemove) {
        alert("Enter a station ID to remove");
        return;
      }
      setRemoveStationLoading(true);
      const response = await api.post("/operator/post/station/remove", {
        stationId: Number(stationIdToRemove)
      });
      await api.get("/operator/get/operator-dashboard").then(res => setDashboardData(res.data.data));
      alert(response.data.msg || "Station removed successfully");
      setStationIdToRemove("");
    } catch (err: any) {
      console.error("Error removing station:", err);
      alert(err.response?.data?.msg || "Failed to remove station");
    } finally {
      setRemoveStationLoading(false);
    }
  };

  const filteredStations = dashboardData?.stations.filter(station => {
    if (!stationSearch) return true;
    const search = stationSearch.toLowerCase();
    return station.location.toLowerCase().includes(search) || station.id.toString().includes(search);
  }) || [];

  const topUsers = [...users]
    .sort((a, b) => Number(b.pointsConsumed) - Number(a.pointsConsumed))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading operator dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <header className="bg-white/90 backdrop-blur-sm border-b border-blue-300 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
                <p className="text-sm text-gray-700">Manage your charging stations</p>
              </div>
              <Button variant="outline" onClick={() => navigate("/home")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <Wrench className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate("/home")}>
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-blue-300 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
                <p className="text-sm text-gray-700">Manage your charging stations</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate("/home")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                User Dashboard
              </Button>
              <Button variant="outline" onClick={handleLogout} className="hover:bg-red-50 hover:border-red-200">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Stations Operated</p>
                  <p className="text-3xl font-bold">{dashboardData?.stationsOperated || 0}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Sessions</p>
                  <p className="text-3xl font-bold">{dashboardData?.totalSessions || 0}</p>
                </div>
                <BarChart className="w-8 h-8 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Revenue (Points)</p>
                  <p className="text-3xl font-bold">{dashboardData?.totalPoints || 0}</p>
                </div>
                <Wallet className="w-8 h-8 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operator Profile + Top Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Operator Profile</h2>
              </div>
              <div className="text-sm text-gray-700">
                <div><span className="font-medium">Name:</span> {profile?.userName || "-"}</div>
                <div><span className="font-medium">Email:</span> {profile?.email || "-"}</div>
                <div><span className="font-medium">Role:</span> {profile?.role || "-"}</div>
                <div><span className="font-medium">Stations Operated:</span> {dashboardData?.stationsOperated || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">Top Users by Points</h2>
              </div>
              {topUsers.length === 0 ? (
                <p className="text-gray-600">No user data available.</p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map(user => (
                    <div key={user.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{user.name}</span>
                      <span className="font-semibold text-gray-900">{user.pointsConsumed}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Station Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Add Station</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="Location"
                  value={stationForm.location}
                  onChange={(e) => setStationForm({ ...stationForm, location: e.target.value })}
                />
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="OEM ID"
                  value={stationForm.OEMId}
                  onChange={(e) => setStationForm({ ...stationForm, OEMId: e.target.value })}
                />
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="Reseller ID"
                  value={stationForm.resellerId}
                  onChange={(e) => setStationForm({ ...stationForm, resellerId: e.target.value })}
                />
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="Operator ID (optional)"
                  value={stationForm.operatorId}
                  onChange={(e) => setStationForm({ ...stationForm, operatorId: e.target.value })}
                />
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="Total Energy (kWh)"
                  value={stationForm.totalEnergyConsumption}
                  onChange={(e) => setStationForm({ ...stationForm, totalEnergyConsumption: e.target.value })}
                />
                <input
                  className="border border-gray-300 rounded-md p-2 text-gray-800"
                  placeholder="Health %"
                  value={stationForm.healthPercentage}
                  onChange={(e) => setStationForm({ ...stationForm, healthPercentage: e.target.value })}
                />
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={stationForm.isActive}
                    onChange={(e) => setStationForm({ ...stationForm, isActive: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={stationForm.isFaulty}
                    onChange={(e) => setStationForm({ ...stationForm, isFaulty: e.target.checked })}
                  />
                  <span>Faulty</span>
                </label>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleAddStation}
                disabled={addStationLoading}
              >
                {addStationLoading ? "Adding..." : "Add Station"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">Remove Station</h2>
              </div>
              <input
                className="border border-gray-300 rounded-md p-2 text-gray-800 w-full"
                placeholder="Station ID"
                value={stationIdToRemove}
                onChange={(e) => setStationIdToRemove(e.target.value)}
              />
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRemoveStation}
                disabled={removeStationLoading}
              >
                {removeStationLoading ? "Removing..." : "Remove Station"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Users and Points Consumption */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Users & Points Consumption</h2>
          </div>
          {usersLoading ? (
            <p className="text-gray-600">Loading users...</p>
          ) : usersError ? (
            <p className="text-red-600">{usersError}</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Points Balance</th>
                    <th>Points Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-800">{user.name}</td>
                      <td className="text-gray-700">{user.email}</td>
                      <td className="text-gray-700">{user.role}</td>
                      <td className="text-gray-700">{user.pointsBalance}</td>
                      <td className="text-gray-700">{user.pointsConsumed}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="py-3 text-gray-600" colSpan={5}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Station List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Your Stations</h2>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              className="w-full border border-gray-300 rounded-md py-2 pl-9 pr-3 text-sm text-gray-800"
              placeholder="Search by ID or location"
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredStations.map((station) => {
            const edit = stationEdits[station.id];
            const analytics = stationAnalytics[station.id];
            const isExpanded = expandedStationId === station.id;

            return (
              <Card key={station.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Station #{station.id}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      station.isFaulty ? 'bg-red-100 text-red-800' : 
                      station.isOccupied ? 'bg-yellow-100 text-yellow-800' : 
                      station.isActive ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {station.isFaulty ? 'Faulty' : 
                       station.isOccupied ? 'Occupied' : 
                       station.isActive ? 'Available' : 'Inactive'}
                    </div>
                  </div>

                  <p className="text-gray-600">{station.location}</p>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Health</span>
                      <span className="font-medium">{station.healthPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Energy</span>
                      <span className="font-medium">{station.totalEnergyConsumption} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sessions</span>
                      <span className="font-medium">{analytics?.totalSessions ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Points</span>
                      <span className="font-medium">{analytics?.totalPoints ?? "-"}</span>
                    </div>
                  </div>

                  {analyticsLoading && !analytics && (
                    <p className="text-xs text-gray-500">Loading analytics...</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={edit?.isActive ?? false}
                        onChange={(e) => setStationEdits(prev => ({
                          ...prev,
                          [station.id]: {
                            ...(prev[station.id] || { isActive: false, isFaulty: false, healthPercentage: "100" }),
                            isActive: e.target.checked
                          }
                        }))}
                      />
                      <span className="text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={edit?.isFaulty ?? false}
                        onChange={(e) => setStationEdits(prev => ({
                          ...prev,
                          [station.id]: {
                            ...(prev[station.id] || { isActive: false, isFaulty: false, healthPercentage: "100" }),
                            isFaulty: e.target.checked
                          }
                        }))}
                      />
                      <span className="text-gray-700">Faulty</span>
                    </label>
                  </div>

                  <input
                    className="border border-gray-300 rounded-md p-2 text-sm text-gray-800 w-full"
                    placeholder="Health %"
                    value={edit?.healthPercentage ?? ""}
                    onChange={(e) => setStationEdits(prev => ({
                      ...prev,
                      [station.id]: {
                        ...(prev[station.id] || { isActive: false, isFaulty: false, healthPercentage: "100" }),
                        healthPercentage: e.target.value
                      }
                    }))}
                  />

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleUpdateStation(station.id)}
                    >
                      Update
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleRemoveStationById(station.id)}
                      disabled={removeStationLoading}
                    >
                      Remove
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                  >
                    {isExpanded ? "Hide Recent Sessions" : "View Recent Sessions"}
                  </Button>

                  {isExpanded && (
                    <div className="border border-gray-200 rounded-md p-3 text-xs">
                      {station.recentSessions.length === 0 ? (
                        <p className="text-gray-600">No recent sessions.</p>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-1">User</th>
                              <th>Duration</th>
                              <th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {station.recentSessions.map(session => (
                              <tr key={session.id} className="border-t">
                                <td className="py-1 text-gray-700">{session.user}</td>
                                <td className="text-gray-700">{session.duration || "-"}</td>
                                <td className="text-gray-700">{session.pointsUsed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
