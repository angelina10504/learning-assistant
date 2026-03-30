import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (user) {
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-indigo-500 mb-4">404</h1>
        <p className="text-3xl font-bold text-slate-50 mb-2">Page Not Found</p>
        <p className="text-slate-400 mb-8 max-w-md">
          Oops! The page you are looking for does not exist or has been moved.
        </p>
        <button onClick={handleGoHome} className="btn-primary">
          Go Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
