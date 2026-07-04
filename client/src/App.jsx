import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import JournalPage from './pages/JournalPage';
import DashboardPage from './pages/DashboardPage';

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
  return (
    <Router>
      <GlowingBackground />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen p-6 md:p-10 overflow-y-auto w-full">
          <Routes>
            <Route path="/" element={<JournalPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
