export type Role = "tenant" | "maintenance" | "manager";
export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  created_at: string;
  has_password?: boolean;
};
export type Apartment = {
  id: number;
  unit_number: string;
  building: string;
  floor: string;
  tenant_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
};
export type WorkRequest = {
  id: number;
  title: string;
  description: string;
  category: string;
  category_id: number;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assigned_to: number | null;
  tenant_id: number;
  unit_number: string;
  building: string;
  tenant_first_name: string;
  tenant_last_name: string;
  worker_first_name: string | null;
  worker_last_name: string | null;
};
export type Comment = {
  id: number;
  message: string;
  created_at: string;
  first_name: string;
  last_name: string;
  role: Role;
};
export type History = {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  first_name: string;
  last_name: string;
};
export type RequestDetail = WorkRequest & {
  comments: Comment[];
  history: History[];
};
