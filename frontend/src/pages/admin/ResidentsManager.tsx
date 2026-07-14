import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Resident } from "../../types";
import { Users, Search, CheckCircle, ShieldAlert, CheckSquare, Square, Mail, Phone, Home } from "lucide-react";

export const ResidentsManager: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchResidents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/residents");
      setResidents(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleToggleVerification = async (id: number, currentStatus: boolean) => {
    const confirmation = window.confirm(
      currentStatus 
        ? "Revoke verification? This resident will lose access to raising complaints." 
        : "Verify this resident? This allows them to register maintenance complaints."
    );
    if (!confirmation) return;

    try {
      await api.put(`/admin/residents/${id}/verify?is_verified=${!currentStatus}`);
      alert("Verification status updated!");
      fetchResidents();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to update verification status.");
    }
  };

  const filteredResidents = residents.filter(res => {
    const term = search.toLowerCase();
    return (
      res.user.full_name.toLowerCase().includes(term) ||
      res.user.email.toLowerCase().includes(term) ||
      res.flat_number.toLowerCase().includes(term) ||
      res.building_wing.toLowerCase().includes(term) ||
      res.contact_number.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Resident Directory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage residents, flat details, and verify registration access.
            </p>
          </div>
        </div>
      </div>

      {/* Search box */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, wing, flat or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading directory...</span>
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-3xl border border-gray-100 dark:border-gray-700/50 text-gray-500">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-base">No residents registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResidents.map((res) => (
            <div
              key={res.id}
              className={`bg-white dark:bg-gray-800 p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                res.is_verified 
                  ? "border-gray-100 dark:border-gray-700/50" 
                  : "border-amber-200 dark:border-amber-900/50 bg-amber-50/5 dark:bg-amber-950/5"
              }`}
            >
              <div className="space-y-4">
                {/* Header card: Name and status */}
                <div className="flex items-start justify-between">
                  <div className="overflow-hidden pr-2">
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white truncate">{res.user.full_name}</h3>
                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">RESIDENT ID #{res.id}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    res.is_verified 
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" 
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 animate-pulse"
                  }`}>
                    {res.is_verified ? "Verified" : "Pending Verification"}
                  </span>
                </div>

                {/* Flat & contact info */}
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                    <span>
                      {res.building_wing}, Apartment {res.flat_number}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                    <span className="truncate" title={res.user.email}>{res.user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                    <span>{res.contact_number}</span>
                  </div>
                  {res.alternate_contact && (
                    <div className="flex items-center text-gray-400 pl-6">
                      <span>Alt: {res.alternate_contact}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Verify/Unverify */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  Registered: {new Date(res.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleToggleVerification(res.id, res.is_verified)}
                  className={`inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-xl border transition-all ${
                    res.is_verified 
                      ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow"
                  }`}
                >
                  {res.is_verified ? "Revoke Verification" : "Verify Resident"}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
