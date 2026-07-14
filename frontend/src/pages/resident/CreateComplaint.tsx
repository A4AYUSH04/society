import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../services/api";
import { Category } from "../../types";
import { ArrowLeft, Upload, X, ShieldAlert, Sparkles, Image as ImageIcon } from "lucide-react";

const complaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(15, "Please provide a more detailed description (min 15 chars)"),
  category_id: z.coerce.number().min(1, "Please select a category"),
  location: z.string().min(3, "Please specify building location (e.g., Block B, Flat 402)"),
  priority: z.string().default("Medium"),
});

type ComplaintSchemaType = z.infer<typeof complaintSchema>;

export const CreateComplaint: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiPriority, setAiPriority] = useState<string>("Low");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      priority: "Medium"
    }
  });

  const watchTitle = watch("title", "");
  const watchDescription = watch("description", "");

  // Load active categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories?active_only=true");
        setCategories(response.data);
      } catch (e) {
        console.error("Failed to load categories", e);
      }
    };
    fetchCategories();
  }, []);

  // AI Recommendation Trigger client-side
  useEffect(() => {
    const text = (watchTitle + " " + watchDescription).toLowerCase();
    const emergencyKeywords = ["fire", "spark", "shock", "gas leak", "blast", "stuck in lift", "elevator trap", "emergency", "theft", "robbery", "break-in"];
    const highKeywords = ["water leakage", "flooding", "pipe burst", "no water", "power outage", "short circuit", "security alarm", "lift not working", "main gate blocked"];
    const mediumKeywords = ["plumbing", "drainage block", "garbage pile", "street light out", "internet down", "cleaning needed", "parking dispute", "broken lock"];

    let recommended = "Low";
    for (const kw of emergencyKeywords) {
      if (text.includes(kw)) {
        recommended = "Emergency";
        break;
      }
    }
    if (recommended === "Low") {
      for (const kw of highKeywords) {
        if (text.includes(kw)) {
          recommended = "High";
          break;
        }
      }
    }
    if (recommended === "Low") {
      for (const kw of mediumKeywords) {
        if (text.includes(kw)) {
          recommended = "Medium";
          break;
        }
      }
    }

    setAiPriority(recommended);
  }, [watchTitle, watchDescription]);

  // Apply AI priority suggestion
  const applyAiPriority = () => {
    setValue("priority", aiPriority);
  };

  // Image compression client-side (HTML5 Canvas)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file); // Fallback to raw file if canvas fails
            return;
          }
          
          // Downscale high-resolution images to max width of 1200px
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.75 // 75% quality compression
          );
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation
    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Invalid file type. Only PNG, JPG, JPEG, and WEBP images are supported.");
      return;
    }

    // Size validation (5MB raw)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5MB limit.");
      return;
    }

    setErrorMsg(null);
    setSelectedPhoto(file);
    
    // Create local URL for preview
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ComplaintSchemaType) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      // 1. Create complaint details
      const compRes = await api.post("/complaints", data);
      const complaintId = compRes.data.id;

      // 2. If photo is selected, compress & upload
      if (selectedPhoto) {
        const compressedBlob = await compressImage(selectedPhoto);
        const formData = new FormData();
        formData.append("file", compressedBlob, selectedPhoto.name);

        await api.post(`/complaints/${complaintId}/photos`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate(`/resident/complaints/${complaintId}`);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to submit complaint. Please check fields."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link to="/resident/dashboard" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 p-8 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-5 mb-6">
          <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white">Raise Maintenance Complaint</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Provide details about the maintenance issue. Our support team will address it.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-800 dark:text-red-300 text-sm">
            <ShieldAlert className="h-5 w-5 mr-3 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Complaint Title
              </label>
              <input
                type="text"
                placeholder="e.g. Water dripping from bathroom ceiling"
                {...formRegister("title")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.title ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{String(errors.title.message)}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                {...formRegister("category_id")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.category_id ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-xs text-red-500">{String(errors.category_id.message)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Location (Building/Wing/Flat)
              </label>
              <input
                type="text"
                placeholder="e.g. Block C, Flat 104"
                {...formRegister("location")}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.location ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.location && (
                <p className="mt-1 text-xs text-red-500">{String(errors.location.message)}</p>
              )}
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Priority Level
              </label>
              <select
                {...formRegister("priority")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* AI suggestion helper banner */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-indigo-700 dark:text-indigo-300 text-sm">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span>
                AI Recommended Priority: <strong>{aiPriority}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={applyAiPriority}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1.5 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
            >
              Apply Suggested
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Detailed Description
            </label>
            <textarea
              rows={4}
              placeholder="Please describe the maintenance issue in detail. Add any notes that might help our technician..."
              {...formRegister("description")}
              className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                errors.description ? "border-red-500" : "border-gray-200 dark:border-gray-700"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{String(errors.description.message)}</p>
            )}
          </div>

          {/* Photo upload dropzone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Complaint Photo (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/20 hover:border-indigo-400 cursor-pointer transition-all flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-bold text-gray-800 dark:text-white">Choose Image File</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, JPEG, WEBP up to 5MB</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
              <div>
                {photoPreview ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800 h-32 w-full flex items-center justify-center shadow-inner">
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 h-32 w-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-xs font-semibold mt-1">No file preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-4 border-t border-gray-100 dark:border-gray-700 pt-6">
            <button
              type="button"
              onClick={() => navigate("/resident/dashboard")}
              className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors disabled:opacity-50 inline-flex items-center"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
