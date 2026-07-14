export interface Role {
  id: number;
  name: "Resident" | "Admin" | "Superadmin";
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Resident {
  id: number;
  user_id: number;
  flat_number: string;
  building_wing: string;
  contact_number: string;
  alternate_contact: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ComplaintPhoto {
  id: number;
  file_path: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface ComplaintHistory {
  id: number;
  old_status: string | null;
  new_status: string;
  timestamp: string;
  actor_id: number | null;
  actor_role: string;
  note: string | null;
  ip_address: string | null;
}

export interface Complaint {
  id: number;
  title: string;
  description: string;
  category: Category;
  status: "Open" | "Assigned" | "In Progress" | "Waiting for Resident" | "Resolved" | "Closed" | "Rejected" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Emergency";
  location: string;
  is_overdue: boolean;
  ai_suggestion: string | null;
  created_at: string;
  updated_at: string;
  resident: Resident;
  photos: ComplaintPhoto[];
  histories: ComplaintHistory[];
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  publish_date: string;
  expiry_date: string | null;
  is_scheduled: boolean;
  attachments_json: any[] | null;
  created_at: string;
  updated_at: string;
  author_id: number;
  author: User;
  is_read: boolean;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  type: "complaint" | "notice" | "system";
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  description: string;
  ip_address: string | null;
  created_at: string;
  user_email: string | null;
}
