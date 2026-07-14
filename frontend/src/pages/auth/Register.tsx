import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../services/api";
import { Eye, EyeOff, ShieldAlert, ArrowRight, ShieldCheck, CheckCircle, Home, UserCheck, Phone } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  flat_number: z.string().min(1, "Flat number is required"),
  building_wing: z.string().min(1, "Building/Wing is required"),
  contact_number: z.string().min(10, "Contact number must be at least 10 digits"),
  alternate_contact: z.string().optional(),
});

type RegisterSchemaType = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchemaType) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/register", data);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 5000);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Registration failed. Email may already be in use."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gray-950">
      
      {/* LEFT VISUAL PANEL (Desktop Only) */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-10" />
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-2.5">
          <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/20">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">SocietyCare</span>
        </div>

        {/* Info list */}
        <div className="relative z-10 my-auto space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
            Register Your Apartment Profile
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Onboard as a verified resident to submit building queries, review dynamic dashboards, download report PDFs, and get instant updates.
          </p>

          <div className="space-y-4 pt-6 border-t border-slate-800 text-xs">
            {[
              { icon: Home, title: "Specify Flat & Wing Details", text: "Accurate address maps your complaints directly to building wings." },
              { icon: Phone, title: "On-demand Contact Sync", text: "Allows technicians to coordinate with you for inspection times." },
              { icon: UserCheck, title: "Admin Account Verification", desc: "For security, administrators verify your occupancy first." }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start space-x-3">
                  <div className="bg-slate-800 p-2 rounded-lg text-indigo-400 shrink-0">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{item.title}</h4>
                    <p className="text-slate-400 mt-0.5">{item.text || item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          &copy; 2026 SocietyCare Inc.
        </div>
      </div>

      {/* RIGHT REGISTER CARD PANEL */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        <div className="max-w-xl w-full space-y-8 animate-fade-in relative z-10">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
              Onboard in seconds. Enter your flat credentials below.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/85 p-8 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-xl backdrop-blur-sm">
            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Almost There!</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                  Your profile has been created. An administrator needs to verify your flat ownership before you can raise complaints. You will be redirected to Login now.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Sign In Now <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="mb-6 flex items-start bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl text-red-800 dark:text-red-300 text-xs">
                    <ShieldAlert className="h-4.5 w-4.5 mr-2 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        {...formRegister("full_name")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.full_name ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-xs text-red-500">{String(errors.full_name.message)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        {...formRegister("email")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.email ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Building / Wing
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Block B"
                        {...formRegister("building_wing")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.building_wing ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      {errors.building_wing && (
                        <p className="mt-1 text-xs text-red-500">{String(errors.building_wing.message)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Flat Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 301"
                        {...formRegister("flat_number")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.flat_number ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      {errors.flat_number && (
                        <p className="mt-1 text-xs text-red-500">{String(errors.flat_number.message)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        placeholder="9876543210"
                        {...formRegister("contact_number")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.contact_number ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      {errors.contact_number && (
                        <p className="mt-1 text-xs text-red-500">{String(errors.contact_number.message)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Alternate Number
                      </label>
                      <input
                        type="text"
                        placeholder="Optional alternate"
                        {...formRegister("alternate_contact")}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-750 bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...formRegister("password")}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                          errors.password ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650"
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
                        Register Profile
                        <ArrowRight className="ml-2 h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs">
                  <span className="text-slate-400">Already registered? </span>
                  <Link
                    to="/login"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
