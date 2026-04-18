import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFound from './pages/NotFound';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassDetail from './pages/teacher/ClassDetail';
import StudentClassDetail from './pages/student/ClassDetail';
import StudentDashboard from './pages/student/StudentDashboard';
import StudySession from './pages/student/StudySession';
import StudyPlanView from './pages/student/StudyPlanView';
import LandingPage from './pages/LandingPage';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

const PageWrap = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse mx-auto" />
            <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse mx-auto" />
            <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15,23,42,0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'rgba(15,23,42,0.95)' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'rgba(15,23,42,0.95)' } },
        }}
      />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/login" element={<PageWrap><LoginPage /></PageWrap>} />
          <Route path="/register" element={<PageWrap><RegisterPage /></PageWrap>} />

          {/* Home — Landing for guests, dashboard redirect for logged-in users */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
                  replace
                />
              ) : (
                <PageWrap><LandingPage /></PageWrap>
              )
            }
          />

          {/* Teacher routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute requiredRole="teacher">
                <PageWrap><TeacherDashboard /></PageWrap>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/class/:id"
            element={
              <ProtectedRoute requiredRole="teacher">
                <PageWrap><ClassDetail /></PageWrap>
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <PageWrap><StudentDashboard /></PageWrap>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/class/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <PageWrap><StudentClassDetail /></PageWrap>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/plan/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <PageWrap><StudyPlanView /></PageWrap>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/session/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <PageWrap><StudySession /></PageWrap>
              </ProtectedRoute>
            }
          />

          {/* 404 route */}
          <Route path="*" element={<PageWrap><NotFound /></PageWrap>} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
