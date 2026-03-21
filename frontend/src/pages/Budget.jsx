import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataCache, useCachedFetch } from '../contexts/DataCacheContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import {
  Plus, Upload, Download, Trash2, Check, X, FileSpreadsheet,
  MoreHorizontal, Pencil, ChevronUp, ChevronDown, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Budget = () => {
  const { api } = useAuth();
  const { invalidate: invalidateCache } = useDataCache();
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [editValue, setEditValue] = useState('');
  const [newRow, setNewRow] = useState(null);
  const [newSheetDialog, setNewSheetDialog] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [renameDialog, setRenameDialog] = useState(null); // sheet obj
  const [renameName, setRenameName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // sheet obj
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const csvInputRef = useRef(null);

  // Fetch sheets (cached)
  const [cachedSheets, cacheLoading] = useCachedFetch('budget_sheets', async (signal) => {
    const res = await api.get('/budget/sheets', { signal });
    return res.data;
  }, [api]);

  useEffect(() => {
    if (cachedSheets) {
      setSheets(cachedSheets);
      if (cachedSheets.length > 0 && !activeSheetId) {
        setActiveSheetId(cachedSheets[0].id);
      }
      setLoading(false);
    } else if (!cacheLoading) {
      setLoading(false);
    }
  }, [cachedSheets, cacheLoading, activeSheetId]);

  // Fetch rows for active sheet (not cached — sheet-specific)
  const fetchRows = useCallback(async (signal) => {
    if (!activeSheetId) { setRows([]); return; }
    try {
      const res = await api.get(`/budget/sheets/${activeSheetId}/rows`, { signal });
      setRows(res.data);
    } catch (error) {
      if (!signal?.aborted) toast.error('Failed to load rows');
    }
  }, [api, activeSheetId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRows(controller.signal);
    return () => controller.abort();
  }, [activeSheetId, fetchRows]);

  // --- Sheet actions ---
  const createSheet = async () => {
    if (!newSheetName.trim()) return;
    try {
      const res = await api.post('/budget/sheets', { name: newSheetName.trim() });
      setSheets(prev => [...prev, res.data]);
      setActiveSheetId(res.data.id);
      setNewSheetName('');
      setNewSheetDialog(false);
      toast.success(`Sheet "${res.data.name}" created`);
    } catch (error) {
      toast.error('Failed to create sheet');
    }
  };

  const renameSheet = async () => {
    if (!renameName.trim() || !renameDialog) return;
    try {
      await api.put(`/budget/sheets/${renameDialog.id}`, { name: renameName.trim() });
      setSheets(prev => prev.map(s => s.id === renameDialog.id ? { ...s, name: renameName.trim() } : s));
      setRenameDialog(null);
      toast.success('Sheet renamed');
    } catch (error) {
      toast.error('Failed to rename sheet');
    }
  };

  const deleteSheet = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/budget/sheets/${deleteConfirm.id}`);
      const remaining = sheets.filter(s => s.id !== deleteConfirm.id);
      setSheets(remaining);
      if (activeSheetId === deleteConfirm.id) {
        setActiveSheetId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeleteConfirm(null);
      toast.success('Sheet deleted');
    } catch (error) {
      toast.error('Failed to delete sheet');
    }
  };

  // --- Row actions ---
  const startNewRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewRow({ date: today, description: '', credit: '', debit: '' });
  };

  const saveNewRow = async () => {
    if (!activeSheetId) return;
    try {
      const res = await api.post(`/budget/sheets/${activeSheetId}/rows`, {
        date: newRow.date,
        description: newRow.description,
        credit: parseFloat(newRow.credit) || 0,
        debit: parseFloat(newRow.debit) || 0,
      });
      setRows(prev => [res.data, ...prev]);
      setNewRow(null);
    } catch (error) {
      toast.error('Failed to add row');
    }
  };

  const deleteRow = async (rowId) => {
    try {
      await api.delete(`/budget/rows/${rowId}`);
      setRows(prev => prev.filter(r => r.id !== rowId));
    } catch (error) {
      toast.error('Failed to delete row');
    }
  };

  // --- Inline editing ---
  const startEdit = (rowId, field, currentValue) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;
    let value = editValue;
    if (field === 'credit' || field === 'debit') {
      value = parseFloat(editValue) || 0;
    }
    try {
      await api.put(`/budget/rows/${rowId}`, { [field]: value });
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
      cancelEdit();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleNewRowKeyDown = (e) => {
    if (e.key === 'Enter') saveNewRow();
    if (e.key === 'Escape') setNewRow(null);
  };

  // --- CSV Import / Export ---
  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSheetId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/budget/sheets/${activeSheetId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      fetchRows();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    }
    e.target.value = '';
  };

  const handleCsvExport = async () => {
    if (!activeSheetId) return;
    try {
      const res = await api.get(`/budget/sheets/${activeSheetId}/export`, { responseType: 'blob' });
      const activeSheet = sheets.find(s => s.id === activeSheetId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeSheet?.name || 'sheet'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // --- Filtering & Sorting ---
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const processedRows = useMemo(() => {
    let result = [...rows];

    // 1. Filter
    if (filterStartDate) {
      result = result.filter(r => r.date >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter(r => r.date <= filterEndDate);
    }

    // 2. Sort (default: date descending — newest first)
    const effectiveField = sortField || 'date';
    const effectiveDir = sortField ? sortDir : 'desc';
    result.sort((a, b) => {
      let cmp = 0;
      if (effectiveField === 'date' || effectiveField === 'description') {
        cmp = (a[effectiveField] || '').localeCompare(b[effectiveField] || '');
      } else {
        cmp = (a[effectiveField] || 0) - (b[effectiveField] || 0);
      }
      return effectiveDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [rows, sortField, sortDir, filterStartDate, filterEndDate]);

  // --- Totals ---
  const totalCredit = processedRows.reduce((s, r) => s + (r.credit || 0), 0);
  const totalDebit = processedRows.reduce((s, r) => s + (r.debit || 0), 0);

  const formatNum = (n) => {
    if (!n && n !== 0) return '';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] animate-in fade-in duration-300">
        {/* Tab Bar Skeleton */}
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-9 rounded-2xl bg-primary/10 animate-pulse" style={{ width: `${70 + i * 15}px` }} />
            ))}
            <div className="w-8 h-8 rounded-full bg-primary/10 animate-pulse ml-1" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-xl bg-primary/10 animate-pulse" />
            <div className="h-8 w-20 rounded-xl bg-primary/10 animate-pulse" />
          </div>
        </div>
        {/* Table Skeleton */}
        <div className="flex-1 rounded-2xl bg-card shadow-neu-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/20">
            {[60, 100, 80, 80, 80, 80].map((w, i) => (
              <div key={i} className="h-4 rounded-md bg-primary/10 animate-pulse" style={{ width: `${w}px` }} />
            ))}
          </div>
          {/* Rows */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-2 p-3 border-b border-border/20" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-4 w-14 rounded-md bg-primary/5 animate-pulse" />
              <div className="h-4 flex-1 rounded-md bg-primary/10 animate-pulse" style={{ maxWidth: `${120 + i * 30}px` }} />
              <div className="h-4 w-16 rounded-md bg-primary/5 animate-pulse" />
              <div className="h-4 w-16 rounded-md bg-primary/5 animate-pulse" />
              <div className="h-4 w-16 rounded-md bg-primary/5 animate-pulse" />
              <div className="h-4 w-16 rounded-md bg-primary/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]" data-testid="budget-page">
      {/* Header: Sheet Tabs (left) + Import/Export (right) */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map(sheet => (
            <div key={sheet.id} className="flex items-center group">
              <button
                onClick={() => setActiveSheetId(sheet.id)}
                className={`px-4 py-2 text-sm font-medium rounded-2xl transition-all whitespace-nowrap ${activeSheetId === sheet.id
                  ? 'bg-card text-foreground shadow-neu-sm'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                {sheet.name}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`p-1 rounded transition-opacity ${activeSheetId === sheet.id ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                    }`}>
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px]">
                  <DropdownMenuItem onClick={() => { setRenameDialog(sheet); setRenameName(sheet.name); }}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirm(sheet)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          <button
            onClick={() => setNewSheetDialog(true)}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
            title="Add sheet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {activeSheetId && (
          <div className="flex gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm" onClick={startNewRow} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Row</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span>
            </Button>
            <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleCsvImport} className="hidden" />
            <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        )}
      </div>

      {/* Spreadsheet Area */}
      <div className="flex-1 rounded-t-md overflow-hidden flex flex-col bg-card/30 shadow-neu">
        {activeSheetId ? (
          <>
            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full budget-table">
                <thead>
                  <tr className="bg-muted sticky top-0 z-10">
                    <th className="budget-th w-10 text-center">#</th>
                    <th className="budget-th w-[180px] select-none">
                      <div className="flex items-center justify-between">
                        <span className="cursor-pointer flex-1" onClick={() => handleSort('date')}>
                          Date <SortIcon field="date" />
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-6 w-6 ml-1 ${(filterStartDate || filterEndDate) ? 'text-primary' : 'text-muted-foreground'} hover:bg-muted-foreground/10`} title="Filter by date">
                              <Filter className="w-3.5 h-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">Filter by Date</h4>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">From</label>
                                <input type="date" className="budget-cell-input w-full rounded-xl shadow-neu-inset-sm px-2 py-1" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">To</label>
                                <input type="date" className="budget-cell-input w-full rounded-xl shadow-neu-inset-sm px-2 py-1" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                              </div>
                              <div className="pt-2 flex justify-end">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}>Clear</Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="budget-th cursor-pointer select-none" onClick={() => handleSort('description')}>
                      Description <SortIcon field="description" />
                    </th>
                    <th className="budget-th w-[130px] text-right cursor-pointer select-none" onClick={() => handleSort('credit')}>
                      Credit <SortIcon field="credit" />
                    </th>
                    <th className="budget-th w-[130px] text-right cursor-pointer select-none" onClick={() => handleSort('debit')}>
                      Debit <SortIcon field="debit" />
                    </th>
                    <th className="budget-th w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {processedRows.length === 0 && !newRow && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground/40">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Empty sheet</p>
                        <p className="text-xs mt-1">Import a CSV or add rows manually</p>
                        <div className="flex gap-2 justify-center mt-4">
                          <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="gap-1.5">
                            <Upload className="w-3.5 h-3.5" /> Import CSV
                          </Button>
                          <Button size="sm" onClick={startNewRow} className="gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                            <Plus className="w-3.5 h-3.5" /> Add Row
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* New Row — always on top */}
                  {newRow && (
                    <tr className="budget-row bg-primary/5">
                      <td className="budget-td text-center text-muted-foreground/40 text-xs font-mono">+</td>
                      <td className="budget-td">
                        <input type="date" value={newRow.date} onChange={e => setNewRow({ ...newRow, date: e.target.value })}
                          className="budget-cell-input" autoFocus onKeyDown={handleNewRowKeyDown} />
                      </td>
                      <td className="budget-td">
                        <input type="text" value={newRow.description} onChange={e => setNewRow({ ...newRow, description: e.target.value })}
                          placeholder="Description..." className="budget-cell-input" onKeyDown={handleNewRowKeyDown} />
                      </td>
                      <td className="budget-td">
                        <input type="number" step="1" value={newRow.credit} onChange={e => setNewRow({ ...newRow, credit: e.target.value })}
                          placeholder="0" className="budget-cell-input text-right" onKeyDown={handleNewRowKeyDown} />
                      </td>
                      <td className="budget-td">
                        <input type="number" step="1" value={newRow.debit} onChange={e => setNewRow({ ...newRow, debit: e.target.value })}
                          placeholder="0" className="budget-cell-input text-right" onKeyDown={handleNewRowKeyDown} />
                      </td>
                      <td className="budget-td">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10" onClick={saveNewRow}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted" onClick={() => setNewRow(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {processedRows.map((r, idx) => (
                    <tr key={r.id} className={`budget-row group ${idx % 2 === 0 ? 'bg-card/20' : ''}`}>
                      <td className="budget-td text-center text-muted-foreground/40 text-xs font-mono">{idx + 1}</td>
                      {/* Date */}
                      <td className="budget-td">
                        {editingCell?.rowId === r.id && editingCell?.field === 'date' ? (
                          <input type="date" value={editValue} onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown} onBlur={saveEdit} className="budget-cell-input" autoFocus />
                        ) : (
                          <span className="cursor-pointer hover:text-primary text-sm" onClick={() => startEdit(r.id, 'date', r.date)}>
                            {r.date || <span className="text-muted-foreground/30">—</span>}
                          </span>
                        )}
                      </td>
                      {/* Description */}
                      <td className="budget-td">
                        {editingCell?.rowId === r.id && editingCell?.field === 'description' ? (
                          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown} onBlur={saveEdit} className="budget-cell-input" autoFocus />
                        ) : (
                          <span className="cursor-pointer hover:text-primary text-sm" onClick={() => startEdit(r.id, 'description', r.description)}>
                            {r.description || <span className="text-muted-foreground/30">—</span>}
                          </span>
                        )}
                      </td>
                      {/* Credit */}
                      <td className="budget-td text-right">
                        {editingCell?.rowId === r.id && editingCell?.field === 'credit' ? (
                          <input type="number" step="1" value={editValue} onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown} onBlur={saveEdit} className="budget-cell-input text-right" autoFocus />
                        ) : (
                          <span className={`cursor-pointer font-mono text-sm ${r.credit > 0 ? 'text-emerald-500' : 'text-muted-foreground/30'}`}
                            onClick={() => startEdit(r.id, 'credit', r.credit)}>
                            {r.credit > 0 ? formatNum(r.credit) : '—'}
                          </span>
                        )}
                      </td>
                      {/* Debit */}
                      <td className="budget-td text-right">
                        {editingCell?.rowId === r.id && editingCell?.field === 'debit' ? (
                          <input type="number" step="1" value={editValue} onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown} onBlur={saveEdit} className="budget-cell-input text-right" autoFocus />
                        ) : (
                          <span className={`cursor-pointer font-mono text-sm ${r.debit > 0 ? 'text-red-500' : 'text-muted-foreground/30'}`}
                            onClick={() => startEdit(r.id, 'debit', r.debit)}>
                            {r.debit > 0 ? formatNum(r.debit) : '—'}
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="budget-td text-center">
                        <Button variant="ghost" size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteRow(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Footer Bar */}
            <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-start gap-8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total:</span>
                <span className="font-mono font-bold text-sm text-blue-500">{formatNum(totalCredit - totalDebit)}</span>

              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase">Credit:</span>
                <span className="font-mono font-bold text-sm text-emerald-500">{formatNum(totalCredit)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase">Debit:</span>
                <span className="font-mono font-bold text-sm text-red-500">{formatNum(totalDebit)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
            <div className="text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No sheets yet</p>
              <p className="text-sm mt-1">Create your first sheet to start tracking</p>
              <Button className="mt-4 gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white" onClick={() => setNewSheetDialog(true)}>
                <Plus className="w-4 h-4" /> Create Sheet
              </Button>
            </div>
          </div>
        )}
      </div>



      {/* New Sheet Dialog */}
      <Dialog open={newSheetDialog} onOpenChange={setNewSheetDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Sheet</DialogTitle>
            <DialogDescription>
              Create a new budget sheet to track a separate account, month, or category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={newSheetName} onChange={e => setNewSheetName(e.target.value)}
              placeholder="Sheet name..." autoFocus onKeyDown={e => e.key === 'Enter' && createSheet()} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewSheetDialog(false)}>Cancel</Button>
              <Button onClick={createSheet} disabled={!newSheetName.trim()}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={open => !open && setRenameDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Sheet</DialogTitle>
            <DialogDescription>
              Change the sheet name without affecting any existing rows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={renameName} onChange={e => setRenameName(e.target.value)}
              autoFocus onKeyDown={e => e.key === 'Enter' && renameSheet()} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
              <Button onClick={renameSheet} disabled={!renameName.trim()}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Sheet Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Sheet</DialogTitle>
            <DialogDescription>
              Delete <strong>"{deleteConfirm?.name}"</strong> and all its rows? This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteSheet} className="bg-red-600 hover:bg-red-700">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
