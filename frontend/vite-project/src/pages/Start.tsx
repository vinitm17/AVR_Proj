import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CreditCard, Battery, MapPin, Star, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Start = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignIn = () => {
    navigate("/signin");
  };

  const features = [
    {
      icon: <MapPin className="w-5 h-5" />,
      text: "Locate EV stations near you in real-time",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      text: "One-click payment and charging process",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: <Battery className="w-5 h-5" />,
      text: "Track charging progress and history",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className={`p-6 text-center relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
          ONE EV
        </h1>
        <p className="mt-2 text-xl text-blue-200 font-light">Find. Pay. Charge. Simplify your EV journey.</p>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 flex-grow relative z-10">
        {/* Hero illustration area */}
        <div className={`relative mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
          <div className="w-80 h-80 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-2xl">
            <div className="w-64 h-64 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-32 h-32 text-white animate-pulse" />
            </div>
          </div>
          {/* Floating elements */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce delay-700"></div>
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-emerald-400 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute top-1/2 -left-8 w-4 h-4 bg-purple-400 rounded-full animate-bounce delay-500"></div>
        </div>

        <div className={`text-center max-w-2xl transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            What is ONE EV?
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8 font-light">
            ONE EV Charging Network is your all-in-one platform for locating nearby electric vehicle charging stations.
            Whether you're on the road or planning a trip, we help you find the nearest chargers, view real-time availability,
            make quick payments, and start charging seamlessly—all from your device.
          </p>

          {/* Enhanced feature list */}
          <div className="space-y-4 mt-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`flex items-center p-4 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg group cursor-pointer ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}
                style={{ transitionDelay: `${700 + index * 100}ms` }}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r ${feature.gradient} shadow-lg mr-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <span className="text-blue-100 font-medium flex-1 text-left">{feature.text}</span>
                <ChevronRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            ))}
          </div>

          {/* Stats section */}
          <div className={`grid grid-cols-3 gap-6 mt-12 transition-all duration-1000 delay-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">10K+</div>
              <div className="text-sm text-blue-200">Stations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">50K+</div>
              <div className="text-sm text-blue-200">Users</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="text-2xl font-bold text-yellow-400">4.8</span>
              </div>
              <div className="text-sm text-blue-200">Rating</div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className={`p-6 text-center relative z-10 transition-all duration-1000 delay-1200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <Button
          onClick={handleSignIn}
          className="group relative px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25 border-0"
        >
          <span className="relative z-10 flex items-center">
            Sign In to Continue
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </Button>
        <p className="mt-4 text-blue-300 text-sm">
          Join thousands of EV drivers powering the future
        </p>
      </footer>
    </div>
  );
};

export default Start;
