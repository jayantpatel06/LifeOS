import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, TrendingUp, TrendingDown, Wallet, DollarSign, MoreVertical, Trash2, Edit,
  ShoppingCart, Car, Utensils, Home, Heart, GraduationCap, Film, Briefcase, PiggyBank,
  CreditCard, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

const expenseCategories = [
  { value: 'food', label: 'Food & Dining', icon: Utensils, color: '#F97316' },
  { value: 'transport', label: 'Transportation', icon: Car, color: '#3B82F6' },
  { value: 'shopping', label: 'Shopping', icon: ShoppingCart, color: '#EC4899' },
  { value: 'entertainment', label: 'Entertainment', icon: Film, color: '#8B5CF6' },
  { value: 'bills', label: 'Bills & Utilities', icon: Home, color: '#EF4444' },
  { value: 'healthcare', label: 'Healthcare', icon: Heart, color: '#10B981' },
  { value: 'education', label: 'Education', icon: GraduationCap, color: '#06B6D4' },
  { value: 'other', label: 'Other', icon: CreditCard, color: '#6B7280' },
];

const incomeCategories = [
  { value: 'salary', label: 'Salary', icon: Briefcase, color: '#10B981' },
  { value: 'freelance', label: 'Freelance', icon: DollarSign, color: '#3B82F6' },
  { value: 'investment', label: 'Investment', icon: TrendingUp, color: '#8B5CF6' },
  { value: 'gift', label: 'Gift', icon: Heart, color: '#EC4899' },
  { value: 'savings', label: 'Savings Return', icon: PiggyBank, color: '#F97316' },
  { value: 'other', label: 'Other', icon: Wallet, color: '#6B7280' },
];

const getCategoryConfig = (type, categoryValue) => {
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  return categories.find(c => c.value === categoryValue) || categories[categories.length - 1];
};

export const Budget = () => {
  const { api } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchData = useCallback(async () => {
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        api.get('/budget/transactions'),
        api.get('/budget/summary')
      ]);
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to fetch budget data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('food');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingTransaction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const transactionData = {
      type,
      amount: parseFloat(amount),
      category,
      description,
      date,
      is_recurring: false
    };

    try {
      if (editingTransaction) {
        await api.put(`/budget/transactions/${editingTransaction.id}`, transactionData);
        toast.success('Transaction updated!');
      } else {
        await api.post('/budget/transactions', transactionData);
        toast.success('Transaction added!');
      }
      fetchData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save transaction');
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      await api.delete(`/budget/transactions/${transactionId}`);
      toast.success('Transaction deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setDescription(transaction.description || '');
    setDate(transaction.date);
    setDialogOpen(true);
  };

  // Prepare chart data
  const pieChartData = summary?.expense_by_category
    ? Object.entries(summary.expense_by_category).map(([category, amount]) => ({
      name: getCategoryConfig('expense', category).label,
      value: amount,
      color: getCategoryConfig('expense', category).color
    }))
    : [];

  const monthlyChartData = summary?.monthly_data
    ? Object.entries(summary.monthly_data)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: format(new Date(month + '-01'), 'MMM'),
        income: data.income,
        expense: data.expense
      }))
    : [];

  const TransactionCard = ({ transaction }) => {
    const config = getCategoryConfig(transaction.type, transaction.category);
    const Icon = config.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
        data-testid={`transaction-card-${transaction.id}`}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div>
            <p className="font-medium">{config.label}</p>
            {transaction.description && (
              <p className="text-sm text-muted-foreground">{transaction.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(transaction.date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-bold font-mono ${transaction.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`transaction-menu-${transaction.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(transaction.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="budget-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight">Budget</h1>
          <p className="text-muted-foreground mt-1">Track your income and expenses</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="add-transaction-btn">
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => { setType('expense'); setCategory('food'); }}
                  data-testid="transaction-type-expense"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" /> Expense
                </Button>
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  className={type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={() => { setType('income'); setCategory('salary'); }}
                  data-testid="transaction-type-income"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" /> Income
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    required
                    data-testid="transaction-amount-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="transaction-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this for?"
                  data-testid="transaction-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  data-testid="transaction-date-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="transaction-submit-btn">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/20" data-testid="total-income-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-3xl font-bold font-mono text-emerald-500 mt-1">
                  ${summary?.total_income?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-gradient-to-br from-card to-red-950/20" data-testid="total-expenses-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-3xl font-bold font-mono text-red-500 mt-1">
                  ${summary?.total_expenses?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-${(summary?.balance || 0) >= 0 ? 'violet' : 'orange'}-500/20 bg-gradient-to-br from-card to-${(summary?.balance || 0) >= 0 ? 'violet' : 'orange'}-950/20`} data-testid="balance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-3xl font-bold font-mono mt-1 ${(summary?.balance || 0) >= 0 ? 'text-violet-500' : 'text-orange-500'}`}>
                  ${summary?.balance?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${(summary?.balance || 0) >= 0 ? 'bg-violet-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
                <Wallet className={`w-6 h-6 ${(summary?.balance || 0) >= 0 ? 'text-violet-500' : 'text-orange-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="budget-tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="budget-tab-transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense by Category */}
            <Card data-testid="expense-chart-card">
              <CardHeader>
                <CardTitle className="text-lg">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No expense data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card data-testid="monthly-chart-card">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <XAxis dataKey="month" stroke="#A1A1AA" />
                      <YAxis stroke="#A1A1AA" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                        formatter={(value) => [`$${value.toFixed(2)}`]}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No monthly data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>{transactions.length} total transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground/70 mb-4">Add your first transaction to start tracking</p>
                  <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Transaction
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {transactions.map(transaction => (
                        <TransactionCard key={transaction.id} transaction={transaction} />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
