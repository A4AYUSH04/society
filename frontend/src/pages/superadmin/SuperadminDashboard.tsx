import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Category } from "../../types";
import { ShieldCheck, Plus, ToggleLeft, ToggleRight, UserCog, Library, AlertCircle, ShieldAlert } from "lucide-react";

interface SuperadminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  role_name: string;
  created_at: string;
}

export const SuperadminDashboard: React.FC = () => {
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  // Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await api.get("/superadmin/users");
      setUsers(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await api.get("/complaints/categories");
      setCategories(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    const confirmation = window.confirm(`Are you sure you want to change this user's role to ${newRole}?`);
    if (!confirmation) return;

    try {
      await api.put(`/superadmin/users/${userId}/role?role_name=${newRole}`);
      alert("User role updated successfully!");
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update role.");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await api.post(`/superadmin/categories?name=${encodeURIComponent(newCatName)}&description=${encodeURIComponent(newCatDesc)}`);
      alert("Category created successfully!");
      setNewCatName("");
      setNewCatDesc("");
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add category.");
    }
  };

  const handleToggleCategoryStatus = async (cat: Category) => {
    try {
      await api.put(`/superadmin/categories/${cat.id}?name=${encodeURIComponent(cat.name)}&description=${encodeURIComponent(cat.description || "")}&is_active=${!cat.is_active}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to toggle status.");
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center space-x-3.5">
        <div className="bg-indigo-100 dark:bg-slate-800 p-3 rounded-2xl text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Super Admin Console</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage administrative credentials, promotion roles, and global complaint categories.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Roles Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCog className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Role Promotors</h2>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 focus:outline-none w-48"
              />
            </div>

            {isLoadingUsers ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading user directory...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Name / Email</th>
                      <th className="pb-3">Current Role</th>
                      <th className="pb-3 text-right">Assign Authority Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                        <td className="py-3.5 pr-4">
                          <p className="font-extrabold text-gray-900 dark:text-white">{u.full_name}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">{u.email}</p>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.role_name === "Superadmin"
                              ? "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                              : u.role_name === "Admin"
                              ? "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}>
                            {u.role_name}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <select
                            value={u.role_name}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2.5 py-1 rounded-lg border border-gray-250 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white focus:outline-none"
                          >
                            <option value="Resident">Resident</option>
                            <option value="Admin">Admin</option>
                            <option value="Superadmin">Superadmin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Category Management */}
        <div className="space-y-6">
          {/* Add Category Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Category</h2>
            </div>
            
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Carpentry"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Details for this complaint category..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-slate-800 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
              >
                Create Category
              </button>
            </form>
          </div>

          {/* List Categories Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Library className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Categories</h2>
            </div>

            {isLoadingCategories ? (
              <div className="py-6 text-center text-gray-500 text-xs">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                No categories configured.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/10">
                    <div className="overflow-hidden">
                      <p className={`text-xs font-extrabold ${cat.is_active ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>{cat.name}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{cat.description || "No description"}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCategoryStatus(cat)}
                      className={`text-xs ${cat.is_active ? "text-primary" : "text-gray-400"}`}
                      title={cat.is_active ? "Deactivate" : "Activate"}
                    >
                      {cat.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
