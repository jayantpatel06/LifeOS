import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.username} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Your dashboard is ready to be customised.</p>
      </div>
    </div>
  );
};
