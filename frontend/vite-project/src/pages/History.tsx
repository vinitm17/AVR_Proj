
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Zap, 
  AlertTriangle, 
  ArrowLeft, 
  Clock, 
  Battery, 
  Calendar,
  Coins,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get/history");
      const localSessions = JSON.parse(localStorage.getItem("localChargingHistory") || "[]");
      const mergedSessions = [...localSessions, ...response.data.sessions];
      setSessions(mergedSessions);
      setStats({
        totalSessions: mergedSessions.length,
        activeSessions: mergedSessions.filter((session: Session) => session.isActive).length
      });
      setError("");
    } catch (err) {
      console.error("Error fetching history:", err);
      const localSessions = JSON.parse(localStorage.getItem("localChargingHistory") || "[]");
      if (localSessions.length > 0) {
        setSessions(localSessions);
        setStats({
          totalSessions: localSessions.length,
          activeSessions: localSessions.filter((session: Session) => session.isActive).length,
        });
        setError("");
      } else {
        setError("Failed to load charging history. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatusColor = (session: Session) => {
    if (session.isActive) return "text-green-600 bg-green-100";
    return "text-gray-600 bg-gray-100";
  };

  const getSessionStatusText = (session: Session) => {
    return session.isActive ? "Active" : "Completed";
  };

  const getStationStatusColor = (status: Session['stationStatus']) => {
    if (status.isFaulty) return "text-red-600";
    if (status.isOccupied) return "text-yellow-600";
    if (status.isActive) return "text-green-600";
    return "text-gray-600";
  };

  const getStationStatusText = (status: Session['stationStatus']) => {
    if (status.isFaulty) return "Faulty";
    if (status.isOccupied) return "Occupied";
    if (status.isActive) return "Available";
    return "Inactive";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate("/home")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <h1 className="text-2xl font-bold text-gray-800">Charging History</h1>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate("/home")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <h1 className="text-2xl font-bold text-gray-800">Charging History</h1>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchHistory}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate("/home")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Charging History</h1>
                <p className="text-sm text-gray-600">Your previous charging sessions and stations</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-full">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {stats.totalSessions} Sessions
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Sessions</p>
                  <p className="text-3xl font-bold">{stats.totalSessions}</p>
                </div>
                <Activity className="w-8 h-8 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Active Sessions</p>
                  <p className="text-3xl font-bold">{stats.activeSessions}</p>
                </div>
                <Zap className="w-8 h-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Points Used</p>
                  <p className="text-3xl font-bold">
                    {sessions.reduce((sum, session) => sum + parseInt(session.pointsUsed), 0)}
                  </p>
                </div>
                <Coins className="w-8 h-8 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
          {sessions.map((session) => (
            <Card key={session.sessionId} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Session Info */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Zap className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">Session #{session.sessionId}</h3>
                          <p className="text-sm text-gray-600">{session.location}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSessionStatusColor(session)}`}>
                        {getSessionStatusText(session)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Started</p>
                          <p className="text-sm font-medium">{formatDate(session.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-sm font-medium">{session.totalTime}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Battery className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Energy Used</p>
                          <p className="text-sm font-medium">{session.energyConsumption} kWh</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Points Used</p>
                          <p className="text-sm font-medium">{session.pointsUsed}</p>
                        </div>
                      </div>
                    </div>

                    {session.transactionID && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600">Transaction ID</p>
                        <p className="text-sm font-mono text-blue-800">{session.transactionID}</p>
                      </div>
                    )}
                  </div>

                  {/* Station Info */}
                  <div className="space-y-4 border-l border-gray-100 pl-6 lg:pl-6 lg:border-l lg:border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">Station #{session.stationId}</h4>
                          <p className="text-sm text-gray-600">{session.stationLocation}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${getStationStatusColor(session.stationStatus)}`}>
                        {getStationStatusText(session.stationStatus)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Health</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                session.stationHealth >= 80 ? 'bg-green-500' :
                                session.stationHealth >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${session.stationHealth}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{session.stationHealth}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Operator</span>
                        <span className="text-sm font-medium">{session.operator}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">OEM</span>
                        <span className="text-sm font-medium">{session.oem}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No charging history</h3>
            <p className="text-gray-600 mb-4">You haven't used any charging stations yet.</p>
            <Button onClick={() => navigate("/stations")} className="bg-green-500 hover:bg-green-600">
              <MapPin className="w-4 h-4 mr-2" />
              Find Stations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
