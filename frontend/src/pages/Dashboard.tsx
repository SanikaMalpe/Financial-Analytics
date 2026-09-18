import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { LogOut, Download, Search, Filter, AlertCircle, CheckCircle, X, Calendar, DollarSign, User, RotateCcw, Wallet, TrendingUp, TrendingDown, Clock3 } from 'lucide-react';

const Dashboard = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpense: 0, pendingCount: 0, paidCount: 0, balance: 0, savings: 0 });

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(['id', 'date', 'amount', 'category', 'status', 'user_id']);

  const availableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'user_id', label: 'User ID' },
  ];

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const [alerts, setAlerts] = useState<Array<{ id: number; message: string; type: 'error' | 'success' }>>([]);
  const isMounted = useRef(true);

  const showAlert = (message: string, type: 'error' | 'success' = 'error') => {
    const alreadyExists = alerts.some(alert => alert.message === message && alert.type === type);
    if (alreadyExists) return;
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts((prev) => prev.filter((alert) => alert.id !== id)), 5000);
  };

  const dismissAlert = (id: number) => setAlerts((prev) => prev.filter((alert) => alert.id !== id));

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', {
        params: { page, limit: 10, search, category, status, user: userFilter, dateFrom, dateTo, amountMin, amountMax },
      });
      if (!isMounted.current) return;
      setTransactions(res.data.transactions);
      setTotalPages(res.data.totalPages);

      const allRes = await api.get('/transactions', {
        params: { limit: 1000, search, category, status, user: userFilter, dateFrom, dateTo, amountMin, amountMax },
      });
      if (!isMounted.current) return;

      const allTransactions = allRes.data.transactions;
      const revenue = allTransactions.filter((t: any) => t.category === 'Revenue').reduce((sum: number, t: any) => sum + t.amount, 0);
      const expense = allTransactions.filter((t: any) => t.category === 'Expense').reduce((sum: number, t: any) => sum + t.amount, 0);
      const pending = allTransactions.filter((t: any) => t.status === 'Pending').length;
      const paid = allTransactions.filter((t: any) => t.status === 'Paid').length;
      
      // Calculate Balance (Paid Revenue - Paid Expenses)
      const paidRevenue = allTransactions.filter((t: any) => t.category === 'Revenue' && t.status === 'Paid').reduce((sum: number, t: any) => sum + t.amount, 0);
      const paidExpenses = allTransactions.filter((t: any) => t.category === 'Expense' && t.status === 'Paid').reduce((sum: number, t: any) => sum + t.amount, 0);
      const balance = paidRevenue - paidExpenses;
      const savings = revenue - expense;

      setStats({ totalRevenue: revenue, totalExpense: expense, pendingCount: pending, paidCount: paid, balance, savings });
    } catch (err: any) {
      console.error('Failed to fetch transactions', err);
      if (isMounted.current) showAlert(err.response?.data?.message || 'Failed to load transactions', 'error');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchTransactions();
    return () => { isMounted.current = false; };
  }, [page, search, userFilter, category, status, dateFrom, dateTo, amountMin, amountMax]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      showAlert('Please select at least one column to export.', 'error');
      return;
    }
    try {
      const res = await api.get('/transactions/export', {
        params: {
          search, category, status, user: userFilter, dateFrom, dateTo, amountMin, amountMax,
          columns: selectedColumns.join(',') // Send selected columns to backend
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions_export.csv');
      document.body.appendChild(link);
      link.click(); // Auto-download
      link.remove();

      setShowExportModal(false); // Close modal
      showAlert('CSV exported successfully!', 'success');
    } catch (err: any) {
      console.error('Export failed', err);
      showAlert(err.response?.data?.message || 'Failed to export CSV', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleClearFilters = () => {
    setSearch('');
    setUserFilter('');
    setCategory('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setPage(1);
  };

  const chartData = [
    { name: 'Revenue', value: stats.totalRevenue, fill: '#10b981' },
    { name: 'Expense', value: stats.totalExpense, fill: '#f43f5e' },
  ];

  const statusData = [
    { name: 'Paid', value: stats.paidCount, fill: '#3b82f6' },
    { name: 'Pending', value: stats.pendingCount, fill: '#f59e0b' },
  ];

    // Prepare monthly data for the trend chart
    const monthlyData = (() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthMap: Record<string, { name: string; income: number; expenses: number }> = {};
        
        months.forEach((m, i) => {
          monthMap[String(i + 1).padStart(2, '0')] = { name: m, income: 0, expenses: 0 };
        });
    
        transactions.forEach((t: any) => {
          const date = new Date(t.date);
          const monthKey = String(date.getMonth() + 1).padStart(2, '0');
          if (monthMap[monthKey]) {
            if (t.category === 'Revenue') {
              monthMap[monthKey].income += t.amount;
            } else {
              monthMap[monthKey].expenses += t.amount;
            }
          }
        });
    
        return Object.values(monthMap);
      })();
    
      const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
            <p className="text-xs text-slate-400 mb-1">{payload[0].payload.name}</p>
            {payload.map((p: any, i: number) => (
              <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
                {p.name}: ${Number(p.value).toLocaleString()}
              </p>
            ))}
          </div>
        );
      };

  // Deterministic avatar color from a user id — purely presentational
  const avatarPalette = ['bg-violet-500/20 text-violet-300', 'bg-blue-500/20 text-blue-300', 'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300', 'bg-rose-500/20 text-rose-300', 'bg-cyan-500/20 text-cyan-300'];
  const avatarColor = (seed: string) => {
    const hash = String(seed).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return avatarPalette[hash % avatarPalette.length];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative">
      {/* Alert Chips */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-xl min-w-[300px] backdrop-blur-md ${
              alert.type === 'error'
                ? 'bg-rose-950/80 border-rose-800/60 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-800/60 text-emerald-200'
            }`}
          >
            {alert.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
            <span className="text-sm font-medium flex-1">{alert.message}</span>
            <button onClick={() => dismissAlert(alert.id)} className="text-slate-500 hover:text-slate-300 transition">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Financial Analytics</h1>
            <p className="text-xs text-slate-500">Dashboard</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:border-slate-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
          </button>

                    {/* Profile Dropdown */}
                    <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-3 border-l border-slate-800 hover:bg-slate-800/50 rounded-xl p-1 pr-3 transition"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-200">Test Analyst</p>
                <p className="text-xs text-slate-500">test@loopr.ai</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-violet-950/50">
                TA
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-200">Test Analyst</p>
                  <p className="text-xs text-slate-500 truncate">test@loopr.ai</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-950/30 transition"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium">Total Revenue</p>
            <p className="text-2xl font-semibold text-emerald-400 mt-1 truncate">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
            <TrendingDown size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium">Total Expenses</p>
            <p className="text-2xl font-semibold text-rose-400 mt-1 truncate">${stats.totalExpense.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium">Balance</p>
            <p className={`text-2xl font-semibold mt-1 truncate ${stats.balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              ${stats.balance.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium">Savings</p>
            <p className={`text-2xl font-semibold mt-1 truncate ${stats.savings >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
              ${stats.savings.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Clock3 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium">Pending Transactions</p>
            <p className="text-2xl font-semibold text-amber-400 mt-1 truncate">{stats.pendingCount}</p>
          </div>
        </div>
      </div>
      {/* Chart & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={17} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-200">Financial Overview</h3>
          </div>
          <div className="flex-1 min-h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  tickLine={false} 
                  axisLine={{ stroke: '#1e293b' }} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <YAxis 
                  stroke="#475569" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Income"
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="url(#colorIncome)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Expenses"
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  fill="url(#colorExpenses)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Field Filters */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-200">Multi-Field Filters</h3>
          </div>

          {/* Pie Chart */}
          <div className="mb-5 border-b border-slate-800 pb-5">
            <p className="text-xs font-medium text-slate-500 mb-2 text-center">Paid vs Pending</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={5} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                  <span className="text-slate-400 font-medium">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Inputs */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search category / status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Filter by user ID..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
              >
                <option value="">All Categories</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition [color-scheme:dark]"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="number"
                  placeholder="Min Amount"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                />
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="number"
                  placeholder="Max Amount"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                />
              </div>
            </div>

            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700 text-slate-300 py-2 rounded-lg hover:bg-slate-800 transition text-sm font-medium mb-1"
            >
              <RotateCcw size={15} /> Clear All Filters
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-500 transition text-sm font-medium shadow-lg shadow-emerald-950/50"
            >
              <Download size={16} /> Export Filtered CSV
            </button>
          </div>
        </div>
      </div>


            {/* Data Table */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
        
                {/* Table Heading with Dates */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-2xl font-semibold text-slate-100">Transactions</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Calendar size={14} className="text-slate-500" />
            {dateFrom || dateTo ? (
              <span className="font-medium text-slate-300">
                {dateFrom ? new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'}
                {' - '}
                {dateTo ? new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'End'}
              </span>
            ) : (
              <span className="font-medium text-slate-300">All Time</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">ID</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">Date</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">Category</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">Amount</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">No transactions found.</td></tr>
              ) : (
                transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(t.user_id)}`}>
                          {String(t.user_id).slice(-2).toUpperCase()}
                        </div>
                        <span className="text-slate-300">#{t.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.category === 'Revenue' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.category === 'Revenue' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${t.category === 'Revenue' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.category === 'Revenue' ? '+' : '-'}${t.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.status === 'Paid' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Paid' ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{t.user_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Export Column Configuration Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-semibold text-white">Select Columns to Export</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-500 hover:text-slate-300 transition">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-5">Choose which fields to include in your CSV file.</p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {availableColumns.map((col) => {
                const checked = selectedColumns.includes(col.key);
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer transition ${
                      checked ? 'bg-emerald-500/10 border-emerald-600/50 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="text-sm font-medium">{col.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800/60 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                <Download size={16} /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;