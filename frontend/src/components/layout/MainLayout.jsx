import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Toaster } from '../ui/sonner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, MoreVertical, CheckSquare, FileText, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export const MainLayout = () => {
  const { isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Swipe tracking
  const touchStartX = useRef(null);
  const touchCurrentX = useRef(null);

  // Load collapse state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setIsSidebarCollapsed(JSON.parse(saved));
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  // Swipe-to-close: track touch on the main content area
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - touchCurrentX.current;
    // Swipe left (diff > 80px) closes sidebar
    if (mobileOpen && diff > 80) {
      setMobileOpen(false);
    }
    // Swipe right (diff < -80px) opens sidebar
    if (!mobileOpen && diff < -80) {
      setMobileOpen(true);
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="min-h-screen bg-background flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebar}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile overlay — tap to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <button
            onClick={toggleMobile}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            data-testid="mobile-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <img src="/logo192-v2.png" alt="LifeOS" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-bold font-['Outfit'] tracking-tight">LifeOS</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem onClick={() => { navigate('/tasks'); setMobileOpen(false); }}>
                <CheckSquare className="w-4 h-4 mr-2" /> Add Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/notes'); setMobileOpen(false); }}>
                <FileText className="w-4 h-4 mr-2" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { logout(); navigate('/'); }}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="p-3 md:p-4 md:pt-4">
          <Outlet context={{ isSidebarCollapsed }} />
        </div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
};
