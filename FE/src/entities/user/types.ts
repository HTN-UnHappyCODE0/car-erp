export interface User {
  id: string;
  employee_id: string;
  username: string;
  role: string;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  branch_id: string;
  department_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  hire_date?: string | null;
  status: string;
  created_at: string;
}
