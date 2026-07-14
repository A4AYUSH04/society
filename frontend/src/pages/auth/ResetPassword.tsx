import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../services/api";
import { ShieldCheck, Eye, EyeOff, ShieldAlert, ArrowRight } from "lucide-react";

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get("token");

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordSchemaType) => {
    if (!token) {
      setErrorMsg("Password reset token is missing. Please request a new link.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token: token,
        new_password: data.new_password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to reset password. The link may have expired or already been used."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      {/* Grid background */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* LOGO */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-2xl text-white shadow-lg mb-4">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400 text-center">
            Set your new security credentials.
          </p>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-xl backdrop-blur-sm">
          {!token ? (
            <div className="text-center py-6 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold mb-4 text-sm">Reset Token Missing or Invalid</p>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <ShieldCheck className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password Updated</h2>
              <p className="text-slate-600 dark:text-slate-300 text-xs mb-4">
                Redirecting to the login screen...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...formRegister("new_password")}
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                        errors.new_password ? "border-red-500" : "border-slate-200 dark:border-gray-750"
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
                  {errors.new_password && (
                    <p className="mt-1 text-xs text-red-500">{String(errors.new_password.message)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...formRegister("confirm_password")}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                      errors.confirm_password ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                    }`}
                  />
                  {errors.confirm_password && (
                    <p className="mt-1 text-xs text-red-500">{String(errors.confirm_password.message)}</p>
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
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
