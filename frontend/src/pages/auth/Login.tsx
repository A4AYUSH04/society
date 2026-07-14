import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../store/authContext";
import { Eye, EyeOff, ShieldAlert, ArrowRight, Shield, CheckCircle2, Wrench } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpired = searchParams.get("session_expired") === "true";

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role.name === "Admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/resident/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to log in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gray-950">
      
      {/* LEFT VISUAL SIDE PANEL (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Subtle grid decor */}
        <div className="absolute inset-0 dot-grid opacity-10" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />

        {/* Top logo */}
        <div className="relative z-10 flex items-center space-x-2.5">
          <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/20">
            <Shield className="h-6 w-6 text-indigo-400" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            SocietyCare
          </span>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 max-w-lg my-auto space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Streamlined Society Maintenance & Bulletin Tracking.
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            Report maintenance issues directly, trace technician progress timeline updates, download reports, and stay updated with pinned society notices in real-time.
          </p>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            {[
              { title: "Immutable Progress Timeline", desc: "Track complaint updates transparently from creation to resolution." },
              { title: "Admin Board Announcements", desc: "Get real-time alerts when notices are scheduled or pinned." },
              { title: "Secure Account Verification", desc: "Dedicated spaces protecting resident details and credentials." }
            ].map((f, i) => (
              <div key={i} className="flex items-start space-x-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-white">{f.title}</h4>
                  <p className="text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer copyright */}
        <div className="relative z-10 text-xs text-slate-500">
          &copy; 2026 SocietyCare Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT LOGIN CARD SIDE PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Background blobs for mobile */}
        <div className="absolute lg:hidden -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute lg:hidden -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="max-w-md w-full space-y-8 animate-fade-in relative z-10">
          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="lg:hidden bg-indigo-600 dark:bg-indigo-500 p-3 rounded-2xl text-white shadow-md mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
              Enter your credentials to access your apartment portal.
            </p>
          </div>

          {/* Core Login Card */}
          <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-xl shadow-slate-100/50 dark:shadow-none backdrop-blur-sm">
            {sessionExpired && (
              <div className="mb-6 flex items-start bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                <ShieldAlert className="h-4.5 w-4.5 mr-2 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 flex items-start bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl text-red-800 dark:text-red-300 text-xs leading-relaxed">
                <ShieldAlert className="h-4.5 w-4.5 mr-2 shrink-0 text-red-600 dark:text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@society.com"
                  {...formRegister("email")}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    errors.email ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...formRegister("password")}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                      errors.password ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{String(errors.password.message)}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-lg"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs">
              <span className="text-slate-400">New resident? </span>
              <Link
                to="/register"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
