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
  const { api, user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Initial Balance State
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  // Form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [section, setSection] = useState('Personal');
  const [activeSection, setActiveSection] = useState('Personal');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const SECTIONS = ['Personal', 'Salary', 'Other'];

  const fetchData = useCallback(async () => {
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        api.get('/budget/transactions'),
        api.get('/budget/summary')
      ]);
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
      refreshUser();
    } catch (error) {
      toast.error('Failed to fetch budget data');
    } finally {
      setLoading(false);
    }
  }, [api, refreshUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('food');
    setSection('Personal');
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
      section,
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

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/balance', { initial_balance: parseFloat(newBalance) });
      toast.success('Initial balance updated');
      setBalanceDialogOpen(false);
      refreshUser();
      fetchData(); // specificallt to re-calculate summary balance if needed, though summary relies on transactions + init balance logic
    } catch (error) {
      toast.error('Failed to update balance');
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
    setSection(transaction.section || 'Personal');
    setDescription(transaction.description || '');
    setDate(transaction.date);
    setDialogOpen(true);
  };



  const TransactionCard = ({ transaction }) => {
    const config = getCategoryConfig(transaction.type, transaction.category);
    const Icon = config.icon;

    return (
      <div className="group flex items-center justify-between p-3 mb-2 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            {transaction.description && <p className="text-xs text-muted-foreground">{transaction.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(transaction.date), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className={`font-bold font-mono text-sm ${transaction.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
            {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(transaction)}><Edit className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(transaction.id)} className="text-destructive"><Trash2 className="w-3 h-3 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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
          <p className="text-muted-foreground mt-1">Track income & expenses</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowOverview(!showOverview)}
            className={showOverview ? "bg-primary/10 text-primary border-primary/20" : ""}
          >
            {showOverview ? 'Hide Overview' : 'Overview'}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20">
                <Plus className="w-4 h-4" /> Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''} onClick={() => { setType('expense'); setCategory('food'); }}>
                    <ArrowDownRight className="w-4 h-4 mr-2" /> Expense
                  </Button>
                  <Button type="button" variant={type === 'income' ? 'default' : 'outline'} className={type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => { setType('income'); setCategory('salary'); }}>
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Income
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2"><cat.icon className="w-4 h-4" style={{ color: cat.color }} />{cat.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AnimatePresence>
        {showOverview && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/20">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{summary?.total_income?.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/20 bg-gradient-to-br from-card to-red-950/20">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold font-mono text-red-500 mt-1">{summary?.total_expenses?.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-violet-500/20 bg-gradient-to-br from-card to-violet-950/20">
                <CardContent className="p-6 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold font-mono text-violet-500 mt-1">{summary?.balance?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Initial: {summary?.initial_balance?.toFixed(2)}</p>
                    </div>
                    {/* Only show edit button if initial balance hasn't been set yet (or user just registered and it's 0/unset) 
                        Note: Backend now enforces one-time set. We check the flag from user object or summary if available 
                    */}
                    {(!summary?.is_initial_balance_set && !user?.is_initial_balance_set) && (
                      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setNewBalance(summary?.initial_balance?.toString())}><Edit className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Set Initial Balance</DialogTitle></DialogHeader>
                          <form onSubmit={handleUpdateBalance} className="space-y-4">
                            <Input type="number" step="0.01" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="0.00" />
                            <Button type="submit" className="w-full">Update (Once Only)</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>


          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Sections */}
      <div className="space-y-6">
        {/* Section Tabs */}
        {/* Active Section Content */}
        <Card className="overflow-hidden border-border/50">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex justify-center gap-2">
              {SECTIONS.map((sec) => (
                <Button
                  key={sec}
                  variant={activeSection === sec ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSection(sec)}
                  className={
                    activeSection === sec
                      ? sec === 'Personal'
                        ? 'bg-violet-600 hover:bg-violet-700'
                        : sec === 'Salary'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      : ''
                  }
                >
                  {sec}
                </Button>
              ))}
            </div>
            <div className={`px-2 py-1 rounded text-s font-mono font-bold ${(transactions.filter(t => (t.section || 'Personal') === activeSection).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)) >= 0
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-red-500/10 text-red-500'
              }`}>
              Balance: {(transactions.filter(t => (t.section || 'Personal') === activeSection).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)).toFixed(2)}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
              {/* Expenses (Left) */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2 bg-red-500/10 w-fit px-3 py-1 rounded-full"><ArrowDownRight className="w-4 h-4" /> Expenses</h4>
                <div className="space-y-2">
                  {transactions.filter(t => (t.section || 'Personal') === activeSection && t.type === 'expense').length > 0 ? (
                    transactions.filter(t => (t.section || 'Personal') === activeSection && t.type === 'expense').map(t => <TransactionCard key={t.id} transaction={t} />)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-xl">
                      <p className="text-sm">No expenses in {activeSection}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Income (Right) */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2 bg-emerald-500/10 w-fit px-3 py-1 rounded-full"><ArrowUpRight className="w-4 h-4" /> Income</h4>
                <div className="space-y-2">
                  {transactions.filter(t => (t.section || 'Personal') === activeSection && t.type === 'income').length > 0 ? (
                    transactions.filter(t => (t.section || 'Personal') === activeSection && t.type === 'income').map(t => <TransactionCard key={t.id} transaction={t} />)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-xl">
                      <p className="text-sm">No income in {activeSection}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
