import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../services/api";
import { useAuth } from "../../store/authContext";
import { ShieldAlert, CheckCircle2, UserCheck } from "lucide-react";
import { User } from "../../types";

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  flat_number: z.string().min(1, "Flat number is required"),
  building_wing: z.string().min(1, "Building/Wing is required"),
  contact_number: z.string().min(10, "Contact number must be at least 10 digits"),
  alternate_contact: z.string().optional(),
});

type ProfileSchemaType = z.infer<typeof profileSchema>;

export const EditProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileSchemaType>({
    resolver: zodResolver(profileSchema),
  });

  // Load current profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/resident/profile");
        const data = response.data;
        
        setValue("full_name", data.user.full_name);
        setValue("flat_number", data.flat_number);
        setValue("building_wing", data.building_wing);
        setValue("contact_number", data.contact_number);
        setValue("alternate_contact", data.alternate_contact || "");
        setIsVerified(data.is_verified);
      } catch (e) {
        console.error("Failed to load profile details", e);
      }
    };
    fetchProfile();
  }, [setValue]);

  const onSubmit = async (data: ProfileSchemaType) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const response = await api.put("/resident/profile", data);
      
      // Update global user state
      if (user) {
        const updatedUser: User = {
          ...user,
          full_name: data.full_name,
        };
        updateUser(updatedUser);
      }
      
      setSuccessMsg("Your profile details have been updated successfully.");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to update profile information."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 p-8 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-5 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white">Profile Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your personal and apartment contact information.
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
            isVerified 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
              : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
          }`}>
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {isVerified ? "Verified Account" : "Pending Verification"}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-800 dark:text-red-300 text-sm">
            <ShieldAlert className="h-5 w-5 mr-3 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 flex items-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="h-5 w-5 mr-3 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                {...formRegister("full_name")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.full_name ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Email Address (Registered)
              </label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">To change email, contact admin support.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Building / Wing */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Building / Wing
              </label>
              <input
                type="text"
                {...formRegister("building_wing")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.building_wing ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.building_wing && (
                <p className="mt-1 text-xs text-red-500">{errors.building_wing.message}</p>
              )}
            </div>

            {/* Flat Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Flat Number
              </label>
              <input
                type="text"
                {...formRegister("flat_number")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.flat_number ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.flat_number && (
                <p className="mt-1 text-xs text-red-500">{errors.flat_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Contact Number
              </label>
              <input
                type="text"
                {...formRegister("contact_number")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.contact_number ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.contact_number && (
                <p className="mt-1 text-xs text-red-500">{errors.contact_number.message}</p>
              )}
            </div>

            {/* Alternate Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Alternate Number (Optional)
              </label>
              <input
                type="text"
                {...formRegister("alternate_contact")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors disabled:opacity-50 inline-flex items-center"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Save Profile Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
