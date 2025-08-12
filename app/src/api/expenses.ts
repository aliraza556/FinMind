import { api } from './client';

export type Expense = {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  date: string; // ISO date
};

export type ExpenseCreate = {
  amount: number;
  description: string;
  category_id?: number | null;
  date: string; // ISO date
};

export type ExpenseUpdate = Partial<ExpenseCreate>;

export async function listExpenses(params?: {
  from?: string;
  to?: string;
  category_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<Expense[]> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
  }
  const path = '/expenses' + (qs.toString() ? `?${qs.toString()}` : '');
  return api<Expense[]>(path);
}

export async function createExpense(payload: ExpenseCreate): Promise<Expense> {
  return api<Expense>('/expenses', { method: 'POST', body: payload });
}

export async function updateExpense(id: number, payload: ExpenseUpdate): Promise<Expense> {
  return api<Expense>(`/expenses/${id}`, { method: 'PATCH', body: payload });
}

export async function deleteExpense(id: number): Promise<{ message: string }> {
  return api<{ message: string }>(`/expenses/${id}`, { method: 'DELETE' });
}
