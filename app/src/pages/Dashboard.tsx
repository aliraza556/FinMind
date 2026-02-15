import { FinancialCard, FinancialCardContent, FinancialCardDescription, FinancialCardFooter, FinancialCardHeader, FinancialCardTitle } from '@/components/ui/financial-card';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, CreditCard, PieChart, TrendingDown, TrendingUp, Wallet, AlertTriangle, Calendar, Plus } from 'lucide-react';

const summaryCards = [
  {
    title: 'Total Balance',
    amount: '$24,847.92',
    change: '+12.5%',
    trend: 'up',
    icon: Wallet,
    description: 'Across all accounts'
  },
  {
    title: 'Monthly Income',
    amount: '$8,450.00',
    change: '+3.2%',
    trend: 'up',
    icon: TrendingUp,
    description: 'This month'
  },
  {
    title: 'Monthly Expenses',
    amount: '$5,234.12',
    change: '-8.1%',
    trend: 'down',
    icon: TrendingDown,
    description: 'This month'
  },
  {
    title: 'Available Budget',
    amount: '$3,215.88',
    change: '+15.7%',
    trend: 'up',
    icon: PieChart,
    description: 'Remaining this month'
  }
];

const recentTransactions = [
  { id: 1, description: 'Grocery Store', amount: -87.32, category: 'Food', date: '2 hours ago', type: 'expense' },
  { id: 2, description: 'Salary Deposit', amount: 4225.00, category: 'Income', date: '1 day ago', type: 'income' },
  { id: 3, description: 'Netflix Subscription', amount: -15.99, category: 'Entertainment', date: '2 days ago', type: 'expense' },
  { id: 4, description: 'Gas Station', amount: -45.20, category: 'Transportation', date: '3 days ago', type: 'expense' },
  { id: 5, description: 'Coffee Shop', amount: -12.50, category: 'Food', date: '3 days ago', type: 'expense' }
];

const upcomingBills = [
  { id: 1, name: 'Rent', amount: 1200.00, dueDate: 'Jan 1, 2025', status: 'upcoming' },
  { id: 2, name: 'Internet', amount: 79.99, dueDate: 'Jan 3, 2025', status: 'upcoming' },
  { id: 3, name: 'Phone', amount: 65.00, dueDate: 'Jan 5, 2025', status: 'overdue' },
  { id: 4, name: 'Insurance', amount: 125.50, dueDate: 'Jan 8, 2025', status: 'upcoming' }
];

export function Dashboard() {
  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="page-title">Financial Dashboard</h1>
            <p className="page-subtitle">
              Welcome back! Here's your financial overview for today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4" />
              This Month
            </Button>
            <Button variant="financial" size="sm">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </div>
        </div>
      </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {summaryCards.map((card, index) => (
            <FinancialCard key={index} variant="financial" className="group card-interactive fade-in-up">
              <FinancialCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FinancialCardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </FinancialCardTitle>
                  <card.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </FinancialCardHeader>
              <FinancialCardContent>
                <div className="metric-value text-foreground mb-1">
                  {card.amount}
                </div>
                <div className="flex items-center text-sm">
                  {card.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-success mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-success mr-1" />
                  )}
                  <span className="text-success font-medium mr-2">{card.change}</span>
                  <span className="text-muted-foreground">{card.description}</span>
                </div>
              </FinancialCardContent>
            </FinancialCard>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <FinancialCard variant="financial" className="fade-in-up">
              <FinancialCardHeader>
                <div className="flex items-center justify-between">
                  <FinancialCardTitle className="section-title">Recent Transactions</FinancialCardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
                <FinancialCardDescription>
                  Your latest financial activity
                </FinancialCardDescription>
              </FinancialCardHeader>
              <FinancialCardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="interactive-row flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-success-light text-success' 
                            : 'bg-destructive-light text-destructive'
                        }`}>
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.category} • {transaction.date}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${
                        transaction.type === 'income' ? 'text-success' : 'text-foreground'
                      }`}>
                        {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </FinancialCardContent>
            </FinancialCard>
          </div>

          {/* Upcoming Bills */}
          <div>
            <FinancialCard variant="financial" className="fade-in-up">
              <FinancialCardHeader>
                <div className="flex items-center justify-between">
                  <FinancialCardTitle className="section-title">Upcoming Bills</FinancialCardTitle>
                  <Button variant="ghost" size="sm">Manage</Button>
                </div>
                <FinancialCardDescription>
                  Bills due this month
                </FinancialCardDescription>
              </FinancialCardHeader>
              <FinancialCardContent>
                <div className="space-y-3">
                  {upcomingBills.map((bill) => (
                    <div key={bill.id} className="interactive-row flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          bill.status === 'overdue' 
                            ? 'bg-destructive-light text-destructive' 
                            : 'bg-warning-light text-warning'
                        }`}>
                          {bill.status === 'overdue' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">
                            {bill.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due {bill.dueDate}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        ${bill.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </FinancialCardContent>
              <FinancialCardFooter>
                <Button variant="financial" size="sm" className="w-full">
                  <Plus className="w-4 h-4" />
                  Add New Bill
                </Button>
              </FinancialCardFooter>
            </FinancialCard>
          </div>
        </div>
    </div>
  );
}
