import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../services/api";
import { KeyRound, ShieldAlert, ArrowLeft, CheckCircle } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchemaType) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", data);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      {/* Subtle grid decor */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* LOGO */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-2xl text-white shadow-lg mb-4">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400 text-center">
            Recover access. Enter your registered email address.
          </p>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-xl backdrop-blur-sm">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Check Your Inbox</h2>
              <p className="text-slate-600 dark:text-slate-300 text-xs mb-6 leading-relaxed">
                If the email exists in our records, a secure password reset link has been dispatched.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    {...formRegister("email")}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-gray-700/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-505 transition-all ${
                      errors.email ? "border-red-500" : "border-slate-200 dark:border-gray-750"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>
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
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline hover:text-slate-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
