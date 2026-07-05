import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import JournalPage from './pages/JournalPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BreathingPage from './pages/BreathingPage';
import AdminPage from './pages/AdminPage';
import SoundscapePlayer from './components/SoundscapePlayer';

// Ambient Glowing Background Blobs Component
const GlowingBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    {/* blob-1 */}
    <div className="absolute rounded-full blur-[120px] opacity-15 animate-float-slow top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_#8b5cf6_0%,_transparent_80%)]"></div>
    {/* blob-2 */}
    <div className="absolute rounded-full blur-[120px] opacity-15 animate-float-slow bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,_#3b82f6_0%,_transparent_80%)] [animation-delay:-5s] [animation-duration:30s]"></div>
    {/* blob-3 */}
    <div className="absolute rounded-full blur-[120px] opacity-15 animate-float-slow top-[30%] left-[50%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_#10b981_0%,_transparent_80%)] [animation-delay:-10s] [animation-duration:20s]"></div>
  </div>
);

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mindscale_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('mindscale_user');
    setUser(null);
  };

  // Protected Layout with Sidebar
  const ProtectedLayout = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="flex min-h-screen w-full relative">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 min-h-screen p-6 md:p-10 overflow-y-auto w-full">
          {children}
        </main>
        <SoundscapePlayer />
      </div>
    );
  };

  return (
    <Router>
      <GlowingBackground />
      <Routes>
        {/* Public auth pages */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" replace /> : <SignupPage />} 
        />

        {/* Protected app pages */}
        <Route 
          path="/" 
          element={
            <ProtectedLayout>
              <JournalPage />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/breathing" 
          element={
            <ProtectedLayout>
              <BreathingPage />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedLayout>
              {user?.is_admin === 1 ? <AdminPage /> : <Navigate to="/" replace />}
            </ProtectedLayout>
          } 
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
