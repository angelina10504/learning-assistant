import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, GraduationCap, BookOpen, LogOut, Menu, X, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role) => {
    return role === 'teacher' ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600';
  };

  const avatarGradient = getRoleColor(user?.role);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 border-b border-white/[0.06]"
      style={{
        background: 'rgba(5,8,22,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Brain size={28} className="text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-50">StudyAgent</h1>
              <p className="text-xs text-slate-400">AI Study Planner</p>
            </div>
          </div>

          {/* Right side - Desktop menu */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <>
                {/* User info pill */}
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-xl border border-white/[0.08]"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="text-sm text-slate-300">{user.name}</span>
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}
                  >
                    {user.role === 'teacher' ? <GraduationCap size={14} /> : <BookOpen size={14} />}
                    {user.role}
                  </span>
                </div>

                {/* Avatar */}
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}
                >
                  {user.name ? getInitials(user.name) : <User size={20} />}
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-slate-50" />
              ) : (
                <Menu size={24} className="text-slate-50" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/[0.06]">
            <div className="flex flex-col gap-3">
              <div
                className="px-3 py-2 rounded-xl border border-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <p className="text-sm font-medium text-slate-50">{user.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  {user.role === 'teacher' ? <GraduationCap size={14} /> : <BookOpen size={14} />}
                  {user.role}
                </p>
              </div>
              <button onClick={handleLogout} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
