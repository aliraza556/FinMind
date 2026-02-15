import { api } from './client';

export type ConfidenceScore = {
  score: number;
  label: 'no_data' | 'low' | 'medium' | 'high' | 'very_high';
  months_analyzed: number;
};

export type CategorySuggestion = {
  category_id: number | null;
  category_name: string;
  suggested_limit: number;
  average_spending: number;
  trend_pct: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  months_with_data: number;
  monthly_history: Record<string, number>;
};

export type SpendingTrend = {
  direction: 'increasing' | 'decreasing' | 'stable';
  change_pct: number;
};

export type DataRange = {
  months_requested: number;
  months_with_data: number;
  oldest_month?: string;
  newest_month?: string;
};

export type BudgetSuggestion = {
  month: string;
  suggested_total: number;
  breakdown: {
    needs: number;
    wants: number;
    savings: number;
  };
  confidence: ConfidenceScore;
  spending_trend?: SpendingTrend;
  category_suggestions: CategorySuggestion[];
  data_range: DataRange;
  monthly_totals?: Record<string, number>;
  method: 'heuristic' | 'heuristic_default' | 'openai';
  tips?: string[];
};

export async function getBudgetSuggestion(
  month?: string,
  months?: number,
): Promise<BudgetSuggestion> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (months) params.set('months', String(months));
  const query = params.toString();
  return api<BudgetSuggestion>(
    `/insights/budget-suggestion${query ? `?${query}` : ''}`,
  );
}
