import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import fdesLogo from "@assets/image_1758110732910.png";
import sideimage from "@assets/pexels-fauxels-3183153-1.jpg.webp";

export default function AuthPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect after login based on role
  useEffect(() => {
    if (user) {
      if (user.role === "manager") navigate("/manager");
      else if (user.role === "hr") navigate("/hr");
      else navigate("/");
    }
  }, [user, navigate]);

  // If already logged in, prevent showing auth page
  if (user) return null;
  const handleMicrosoftLogin = () => {
  window.location.assign("/api/auth/azure");
};


  return (
    <div className="flex h-screen w-screen">
      {/* Left side image */}
      <div className="w-2/3 relative">
        <img
          src={sideimage}
          alt="Side Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Microsoft Sign In */}
      <div className="w-1/3 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo */}
          <img src={fdesLogo} alt="FDES Logo" className="h-20 w-auto object-contain" />

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-800">Office Time Logger</h2>

          <div className="w-full max-w-xs text-left">
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Sign in to continue
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Use your company Microsoft account to access the platform
            </p>

            {/* Microsoft Login Button */}
            <Button
              onClick={handleMicrosoftLogin}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 py-3 px-2 text-base font-medium rounded-lg flex items-center justify-start gap-3 shadow-sm transition-transform transform hover:scale-[1.02]"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <div className="bg-red-500 w-2 h-2"></div>
                  <div className="bg-green-500 w-2 h-2"></div>
                  <div className="bg-blue-500 w-2 h-2"></div>
                  <div className="bg-yellow-500 w-2 h-2"></div>
                </div>
              </div>
              <span>Sign in with Microsoft</span>
            </Button>
          </div>

          {/* Footer */}
          <p className="text-gray-400 text-xs font-medium mt-10">
            V1.0 • {new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
