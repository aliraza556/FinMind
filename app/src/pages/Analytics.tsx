import { FinancialCard, FinancialCardContent, FinancialCardDescription, FinancialCardHeader, FinancialCardTitle } from '@/components/ui/financial-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Download, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const monthlyData = [
  { month: 'Jul', income: 8200, expenses: 5800, savings: 2400 },
  { month: 'Aug', income: 8450, expenses: 6100, savings: 2350 },
  { month: 'Sep', income: 8200, expenses: 5950, savings: 2250 },
  { month: 'Oct', income: 8650, expenses: 6200, savings: 2450 },
  { month: 'Nov', income: 8450, expenses: 5700, savings: 2750 },
  { month: 'Dec', income: 8450, expenses: 5234, savings: 3216 }
];

const expenseCategories = [
  { name: 'Housing', amount: 1850, percentage: 35.3, color: 'bg-primary', change: '+2.1%', trend: 'up' },
  { name: 'Food', amount: 720, percentage: 13.8, color: 'bg-success', change: '-5.2%', trend: 'down' },
  { name: 'Transportation', amount: 445, percentage: 8.5, color: 'bg-destructive', change: '+12.3%', trend: 'up' },
  { name: 'Entertainment', amount: 385, percentage: 7.4, color: 'bg-accent', change: '-8.1%', trend: 'down' },
  { name: 'Healthcare', amount: 280, percentage: 5.3, color: 'bg-warning', change: '+3.2%', trend: 'up' },
  { name: 'Shopping', amount: 420, percentage: 8.0, color: 'bg-secondary', change: '-15.4%', trend: 'down' },
  { name: 'Other', amount: 1134, percentage: 21.7, color: 'bg-muted', change: '+1.8%', trend: 'up' }
];

const savingsInsights = [
  {
    title: 'Monthly Savings Rate',
    value: '38.1%',
    change: '+4.2%',
    trend: 'up',
    description: 'Above recommended 20%'
  },
  {
    title: 'Expense Efficiency',
    value: '92.4%',
    change: '+2.1%',
    trend: 'up',
    description: 'Staying within budget'
  },
  {
    title: 'Investment Allocation',
    value: '68.5%',
    change: '+5.8%',
    trend: 'up',
    description: 'Of savings invested'
  }
];

const financialGoals = [
  {
    title: 'Emergency Fund Goal',
    current: 7250,
    target: 10000,
    status: 'on-track',
    timeframe: '8 months'
  },
  {
    title: 'Retirement Savings',
    current: 45600,
    target: 50000,
    status: 'ahead',
    timeframe: '3 months'
  },
  {
    title: 'Debt Reduction',
    current: 2100,
    target: 0,
    status: 'on-track',
    timeframe: '12 months'
  }
];

export function Analytics() {
  // const [selectedPeriod, setSelectedPeriod] = useState('6months');
  
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const incomeChange = ((currentMonth.income - previousMonth.income) / previousMonth.income * 100);
  const expenseChange = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100);
  const savingsChange = ((currentMonth.savings - previousMonth.savings) / previousMonth.savings * 100);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="page-title">Financial Analytics</h1>
            <p className="page-subtitle">
              Deep insights into your financial patterns and performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="financial" size="sm">
              <Calendar className="w-4 h-4" />
              6 Months
            </Button>
          </div>
        </div>
      </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <FinancialCard variant="financial">
            <FinancialCardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FinancialCardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Income
                </FinancialCardTitle>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
            </FinancialCardHeader>
            <FinancialCardContent>
              <div className="metric-value text-foreground mb-1">
                ${currentMonth.income.toLocaleString()}
              </div>
              <div className="flex items-center text-sm">
                {incomeChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive mr-1" />
                )}
                <span className={incomeChange >= 0 ? 'text-success' : 'text-destructive'}>
                  {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </FinancialCardContent>
          </FinancialCard>

          <FinancialCard variant="financial">
            <FinancialCardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FinancialCardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Expenses
                </FinancialCardTitle>
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
            </FinancialCardHeader>
            <FinancialCardContent>
              <div className="metric-value text-foreground mb-1">
                ${currentMonth.expenses.toLocaleString()}
              </div>
              <div className="flex items-center text-sm">
                {expenseChange <= 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-success mr-1" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-destructive mr-1" />
                )}
                <span className={expenseChange <= 0 ? 'text-success' : 'text-destructive'}>
                  {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </FinancialCardContent>
          </FinancialCard>

          <FinancialCard variant="success">
            <FinancialCardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FinancialCardTitle className="text-sm font-medium">
                  Monthly Savings
                </FinancialCardTitle>
                <PieChart className="w-5 h-5" />
              </div>
            </FinancialCardHeader>
            <FinancialCardContent>
              <div className="metric-value mb-1">
                ${currentMonth.savings.toLocaleString()}
              </div>
              <div className="flex items-center text-sm opacity-80">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span>+{savingsChange.toFixed(1)}%</span>
                <span className="ml-1">vs last month</span>
              </div>
            </FinancialCardContent>
          </FinancialCard>

          <FinancialCard variant="financial">
            <FinancialCardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FinancialCardTitle className="text-sm font-medium text-muted-foreground">
                  Savings Rate
                </FinancialCardTitle>
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
            </FinancialCardHeader>
            <FinancialCardContent>
              <div className="metric-value text-foreground mb-1">
                {((currentMonth.savings / currentMonth.income) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Above recommended 20%
              </div>
            </FinancialCardContent>
          </FinancialCard>
        </div>

        {/* Main Analytics */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Expense Breakdown */}
          <div className="lg:col-span-2">
            <FinancialCard variant="financial" className="fade-in-up">
              <FinancialCardHeader>
                <FinancialCardTitle className="section-title">Expense Breakdown</FinancialCardTitle>
                <FinancialCardDescription>
                  Where your money goes each month
                </FinancialCardDescription>
              </FinancialCardHeader>
              <FinancialCardContent>
                <div className="space-y-4">
                  {expenseCategories.map((category, index) => (
                    <div key={index} className="space-y-2 interactive-row">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={
                            category.name === 'Housing' ? 'chart-dot-primary' :
                            category.name === 'Food' ? 'chart-dot-success' :
                            category.name === 'Transportation' ? 'chart-dot-danger' :
                            category.name === 'Entertainment' ? 'chart-dot-accent' :
                            category.name === 'Healthcare' ? 'chart-dot-warning' :
                            category.name === 'Shopping' ? 'chart-dot-secondary' :
                            'chart-dot'
                          }></div>
                          <span className="font-medium text-foreground">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">
                              ${category.amount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {category.percentage}%
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            {category.trend === 'up' ? (
                              <TrendingUp className="w-3 h-3 text-destructive mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-success mr-1" />
                            )}
                            <span className={
                              category.trend === 'up' ? 'text-destructive' : 'text-success'
                            }>
                              {category.change}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="chart-track">
                        <div 
                          className={
                            category.name === 'Housing' ? 'chart-fill-primary' :
                            category.name === 'Food' ? 'chart-fill-success' :
                            category.name === 'Transportation' ? 'chart-fill-danger' :
                            category.name === 'Entertainment' ? 'chart-fill-accent' :
                            category.name === 'Healthcare' ? 'chart-fill-warning' :
                            category.name === 'Shopping' ? 'chart-fill-primary' :
                            'chart-fill-primary'
                          }
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </FinancialCardContent>
            </FinancialCard>
          </div>

          {/* Insights */}
          <div>
            <FinancialCard variant="financial" className="fade-in-up">
              <FinancialCardHeader>
                <FinancialCardTitle className="section-title">Financial Insights</FinancialCardTitle>
                <FinancialCardDescription>
                  AI-powered recommendations
                </FinancialCardDescription>
              </FinancialCardHeader>
              <FinancialCardContent>
                <div className="space-y-4">
                  {savingsInsights.map((insight, index) => (
                    <div key={index} className="interactive-row p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-foreground text-sm">
                          {insight.title}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {insight.trend === 'up' ? 'Improving' : 'Stable'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-1">
                        {insight.value}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {insight.description}
                        </span>
                        <div className="flex items-center text-xs">
                          {insight.trend === 'up' ? (
                            <TrendingUp className="w-3 h-3 text-success mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive mr-1" />
                          )}
                          <span className={insight.trend === 'up' ? 'text-success' : 'text-destructive'}>
                            {insight.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </FinancialCardContent>
            </FinancialCard>
          </div>
        </div>

        {/* Financial Goals Progress */}
        <FinancialCard variant="financial" className="fade-in-up">
          <FinancialCardHeader>
            <FinancialCardTitle className="section-title">Financial Goals Progress</FinancialCardTitle>
            <FinancialCardDescription>
              Track your progress towards financial milestones
            </FinancialCardDescription>
          </FinancialCardHeader>
          <FinancialCardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {financialGoals.map((goal, index) => (
                <div key={index} className="interactive-row p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-foreground">{goal.title}</div>
                    <Badge 
                      variant={
                        goal.status === 'ahead' ? 'secondary' :
                        goal.status === 'on-track' ? 'default' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {goal.status === 'ahead' ? 'Ahead' : 
                       goal.status === 'on-track' ? 'On Track' : 'Behind'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                      </span>
                      <span className="text-foreground font-medium">
                        {((goal.current / goal.target) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="chart-track">
                      <div 
                        className="chart-fill-primary"
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Est. completion: {goal.timeframe}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FinancialCardContent>
        </FinancialCard>
    </div>
  );
}
