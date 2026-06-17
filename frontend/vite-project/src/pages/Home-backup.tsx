import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, MapPin, History, Wrench, Wallet, Zap, Car, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import api from "../lib/api";

interface DashboardData {
  userName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/get/dashboard");
        setDashboardData(response.data.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        // If there's an error, redirect to signin (token might be invalid)
        localStorage.removeItem("token");
        navigate("/signin");
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const handlePayment = () => {
    // Payment functionality to be implemented
    console.log("Payment functionality to be implemented");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-cyan-50">
      {/* Header with enhanced design */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent">
                  ONE EV Charging Network
                </h1>
                <p className="text-sm text-gray-600">Powering your electric journey</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {dashboardData.userName}</span>
              <Button variant="outline" onClick={handleLogout} className="hover:bg-red-50 hover:border-red-200">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Your EV Dashboard</h2>
          <p className="text-gray-600">Track your charging, earn points, and explore stations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Points with Pay Button */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-green-100 text-sm">Total Points</p>
                  <p className="text-3xl font-bold">{dashboardData.totalPoints}</p>
                </div>
                <Wallet className="w-8 h-8 text-green-100" />
              </div>
              <Button 
                onClick={handlePayment}
                variant="outline"
                className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Add Points
              </Button>
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Sessions</p>
                  <p className="text-3xl font-bold">{dashboardData.totalSessions}</p>
                </div>
                <Car className="w-8 h-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          {/* Stations Used */}
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Stations Used</p>
                  <p className="text-3xl font-bold">{dashboardData.stationsUsed}</p>
                </div>
                <MapPin className="w-8 h-8 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Find Stations */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleNavigation('/stations')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Find Stations</h3>
                  <p className="text-gray-600">Locate nearby charging points</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">Explore now</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Charging History */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleNavigation('/history')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <History className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Charging History</h3>
                  <p className="text-gray-600">View your past sessions</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-green-600 group-hover:text-green-700">
                <span className="text-sm font-medium">View history</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </CardContent>
          </Card>

          {/* Offers & Rewards - Commented out for future use */}
          {/* 
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleNavigation('/offers')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <Gift className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Offers & Rewards</h3>
                  <p className="text-gray-600">Claim exciting EV offers</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-pink-600 group-hover:text-pink-700">
                <span className="text-sm font-medium">View offers</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </CardContent>
          </Card>
          */}
        </div>

        {/* Support Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Report Malfunction */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Report Issue</h3>
                  <p className="text-gray-600">Report station malfunctions</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowReportModal(true)}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Report Malfunction
              </Button>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Get Help</h3>
                  <p className="text-gray-600">Contact our support team</p>
                </div>
              </div>
              <Button 
                onClick={() => handleNavigation('/support')}
                variant="outline"
                className="w-full border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                <Users className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Modal */}
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Report a Malfunction"
        >
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={4}
            className="w-full text-black border border-gray-300 rounded-md p-2 mb-4"
            placeholder="Describe the issue you faced..."
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (reportText.trim() === "") {
                  alert("Please enter a message before submitting.");
                  return;
                }
                console.log("Reported issue:", reportText);
                setShowReportModal(false);
                setReportText(""); // clear form
              }}
            >
              Submit
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
