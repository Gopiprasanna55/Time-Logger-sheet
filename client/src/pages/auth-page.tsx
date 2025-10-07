// import { useState, useEffect } from "react";
// import { useAuth } from "@/hooks/use-auth";
// import { useLocation } from "wouter";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Clock, Users, TrendingUp, AlertCircle, DollarSign, BarChart } from "lucide-react";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import fdesLogo from "@assets/image_1758110732910.png";
// import sideimage from "@assets/pexels-fauxels-3183153-1.jpg.webp";

// export default function AuthPage() {
//   const { user, loginMutation, registerMutation } = useAuth();
//   const [, navigate] = useLocation();
//   const [loginForm, setLoginForm] = useState({ username: "", password: "" });
//   const [registerForm, setRegisterForm] = useState({
//     username: "",
//     password: "",
//     firstName: "",
//     lastName: "",
//     email: "",
//     employeeId: "",
//     designation: "",
//     department: ""
//   });

//   // Redirect if already logged in (using useEffect to avoid React warning)
//   useEffect(() => {
//     if (user) {
//       // Redirect based on user role
//       if (user.role === "manager") {
//         navigate("/manager");
//       } else if (user.role === "hr") {
//         navigate("/hr");
//       } else {
//         navigate("/");
//       }
//     }
//   }, [user, navigate]);

//   if (user) {
//     return null; // Show nothing while redirecting
//   }

 

 


//   return (
//     // <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
//     //   <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
//     //     {/* Hero Section */}
//     //     <div className="space-y-6 text-center lg:text-left">
//     //       <div className="space-y-4">
//     //         <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white">
//     //           Work Hours
//     //           <span className="block text-blue-600 dark:text-blue-400">Tracker</span>
//     //         </h1>
//     //         <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mx-auto lg:mx-0">
//     //           Track your daily work hours efficiently and let HR & managers monitor team productivity.
//     //         </p>
//     //       </div>

//     //       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//     //         <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
//     //           <div className="flex items-center space-x-3">
//     //             <Clock className="w-8 h-8 text-blue-600" />
//     //             <div>
//     //               <p className="font-semibold text-gray-900 dark:text-white">Time Tracking</p>
//     //               <p className="text-sm text-gray-600 dark:text-gray-400">Log daily hours</p>
//     //             </div>
//     //           </div>
//     //         </div>

//     //         <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
//     //           <div className="flex items-center space-x-3">
//     //             <Users className="w-8 h-8 text-green-600" />
//     //             <div>
//     //               <p className="font-semibold text-gray-900 dark:text-white">Team Management</p>
//     //               <p className="text-sm text-gray-600 dark:text-gray-400">HR & Manager tools</p>
//     //             </div>
//     //           </div>
//     //         </div>

//     //         <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
//     //           <div className="flex items-center space-x-3">
//     //             <TrendingUp className="w-8 h-8 text-purple-600" />
//     //             <div>
//     //               <p className="font-semibold text-gray-900 dark:text-white">Analytics</p>
//     //               <p className="text-sm text-gray-600 dark:text-gray-400">Insights & reports</p>
//     //             </div>
//     //           </div>
//     //         </div>
//     //       </div>

//     //       {/* Microsoft 365 Login Section */}
//     //       <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
//     //         <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Microsoft 365 Login</h3>
//     //         <Button
//     //           onClick={() => window.location.href = "/api/auth/azure"}
//     //           className="w-full mb-4 bg-blue-600 hover:bg-blue-700"
//     //           data-testid="microsoft-365-login"
//     //         >
//     //           Sign in with Microsoft 365
//     //         </Button>
//     //       </div>


//     //     </div>
//     //   </div>
//     // </div>

//     <div style={{ height: "100vh", width: "100vw", display: "flex", border: "none" }}>
//       {/* Left Side - Hero/Info */}
//        <div style={{ width: "70%", padding: 0, height: "100%", position: "relative" }}>
//           <img style={{ width: "100%", height: "100%", objectFit: "cover" }} src={sideimage} alt="" />
//           {/* <h2
//             className="text-4xl font-bold text-center"
//             style={{
//               position: "absolute",
//               top: "150px",
//               left: "50%",
//               transform: "translate(-50%, -50%)",
//               color: "white",
//               textShadow: "2px 2px 8px rgba(0,0,0,0.7)",
//               padding: "0 10px"
//             }}
//           >
//             Simplify Your Expense <br />Management
//           </h2> */}
       
//         </div>

//       {/* Right Side - Login */}
//       {/* <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 py-16 space-y-6 bg-white">
//         <img src={fdesLogo} alt="FDES Logo" className="w-36 h-auto" />
//         <h2 className="text-2xl font-bold mt-4">Office Expense Tracker</h2>
//         <p className="text-sm text-gray-500">
//           Sign in to continue using your company Microsoft account
//         </p>

//         <Button
//           onClick={() => (window.location.href = "/api/auth/azure")}
//           className="w-full max-w-xs bg-blue-600 hover:bg-blue-700"
//         >
//           Sign in with Microsoft
//         </Button>

//         <p className="text-xs text-gray-400 mt-6">V1.0 • Sep 2025</p>
//       </div> */}
//         <div className="flex items-center justify-center" style={{ width: "30%", height: "100%", backgroundColor: "white" }}>
//           <div className="  flex flex-col items-center">

//             {/* Logo + Title */}
//             <div className="flex flex-col gap-6 items-center">
              
//               <img
//                 src={fdesLogo}
//                 alt="FDES Logo"
//                 className="h-20 w-auto object-contain"
//               />
              
//               <h2 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">
//               Office Time Logger
//             </h2>
//               <div className="w-full">
//                 <p className="text-sm text-gray-600 mb-3 font-medium">Sign in to continue</p>
//                 <p className="text-xs text-gray-400 mb-4">
//                   Use your company Microsoft account to access the platform
//                 </p>

//                 <Button
//                   onClick={() => (window.location.href = "/api/auth/azure")}
//                   className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 py-3 px-2 text-base font-medium rounded-lg flex items-center justify-start gap-3 shadow-sm transition-transform transform hover:scale-[1.02]"
//                   data-testid="button-login-required"
//                 >
//                   {/* Microsoft squares */}
//                   <div className="w-5 h-5 flex items-center justify-center">
//                     <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
//                       <div className="bg-red-500 w-2 h-2"></div>
//                       <div className="bg-green-500 w-2 h-2"></div>
//                       <div className="bg-blue-500 w-2 h-2"></div>
//                       <div className="bg-yellow-500 w-2 h-2"></div>
//                     </div>
//                   </div>
//                   <span>Sign in with Microsoft</span>
//                 </Button>
//               </div>
//             </div>

//             {/* Welcome Back */}


//             {/* Microsoft Sign In */}


//             {/* Footer */}
//             <p className="text-gray-400 text-xs font-medium mt-10">
//               {/* © 2025 Floot Inc. All rights reserved. */}
//               V1.0 • {new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}
//             </p>
//           </div>
//         </div>
//     </div>
//   );
// }

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
