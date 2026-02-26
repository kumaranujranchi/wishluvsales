import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C62828]/10 rounded-full mb-6">
          <ShieldAlert size={40} className="text-[#C62828]" />
        </div>
        <h1 className="text-3xl font-bold text-[#0A1C37] mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          {user 
            ? `Your account (${user.primaryEmailAddress?.emailAddress}) is not authorized to access this system. Please contact your administrator.`
            : "You don't have permission to access this page. Please contact your administrator if you believe this is an error."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="neutral">
            Back to Home
          </Button>
          {user && (
            <Button onClick={handleSignOut} variant="danger" className="gap-2">
              <LogOut size={18} />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
