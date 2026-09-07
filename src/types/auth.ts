export interface JwtUserPayload {
  id?: string;
  account_id?: string;
  accountId?: string;
  name?: string;
  email?: string;
  employee_number?: string;
  employeeNumber?: string;
  employee_no?: string;
  roles?: string[];
  department?: string[];
  subdepartments?: string[];
  positions?: string[];
  exp?: number;
}

export interface AuthState {
  token: string;
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
