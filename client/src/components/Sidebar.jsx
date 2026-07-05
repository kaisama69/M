import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();

  return (
    <aside className="w-[280px] bg-[#0d0c16]/45 backdrop-blur-[20px] border-r border-cardBorder p-10 flex flex-col justify-between shrink-0 self-stretch">
      <div>
        <div className="mb-14 flex items-center gap-4">
          <div className="w-[45px] h-[45px] bg-gradient-to-br from-primary to-primary/50 rounded-xl flex items-center justify-center text-[1.35rem] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <i className="fa-solid fa-brain"></i>
          </div>
          <span className="text-2xl font-extrabold bg-gradient-to-br from-white via-white to-violet-400 bg-clip-text text-transparent tracking-tight">MindScale</span>
        </div>
        <nav>
          <ul className="list-none flex flex-col gap-3">
            <li>
              <Link 
                to="/" 
                className={`flex items-center gap-4 py-3.5 px-5 rounded-xl font-medium transition-all duration-300 ease-in-out ${
                  location.pathname === '/' 
                    ? 'bg-primary/15 text-white border border-primary/25 shadow-[inset_0_0_12px_rgba(139,92,246,0.05)]' 
                    : 'text-textSecondary border border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-pen-nib text-[1.2rem]"></i>
                <span>Journal Entry</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-4 py-3.5 px-5 rounded-xl font-medium transition-all duration-300 ease-in-out ${
                  location.pathname === '/dashboard' 
                    ? 'bg-primary/15 text-white border border-primary/25 shadow-[inset_0_0_12px_rgba(139,92,246,0.05)]' 
                    : 'text-textSecondary border border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-chart-line text-[1.2rem]"></i>
                <span>Analytics View</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/breathing" 
                className={`flex items-center gap-4 py-3.5 px-5 rounded-xl font-medium transition-all duration-300 ease-in-out ${
                  location.pathname === '/breathing' 
                    ? 'bg-primary/15 text-white border border-primary/25 shadow-[inset_0_0_12px_rgba(139,92,246,0.05)]' 
                    : 'text-textSecondary border border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-spa text-[1.2rem]"></i>
                <span>Breathing Room</span>
              </Link>
            </li>
            
            {/* Admin Panel Link */}
            {user?.is_admin === 1 && (
              <li className="mt-2 pt-2 border-t border-white/5">
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-4 py-3.5 px-5 rounded-xl font-medium transition-all duration-300 ease-in-out ${
                    location.pathname === '/admin' 
                      ? 'bg-negative/15 text-negative border border-negative/25 shadow-[inset_0_0_12px_rgba(239,68,68,0.05)]' 
                      : 'text-textSecondary border border-transparent hover:bg-negative/5 hover:text-negative'
                  }`}
                >
                  <i className="fa-solid fa-shield-halved text-[1.2rem]"></i>
                  <span>Admin Panel</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className="flex flex-col gap-6 border-t border-cardBorder pt-6">
        {user && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] bg-white/5 rounded-full flex items-center justify-center text-textSecondary border border-white/10">
                <i className="fa-solid fa-user text-[0.9rem]"></i>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[0.75rem] text-textMuted font-semibold tracking-wider uppercase">Logged In As</span>
                <span className="text-[0.9rem] text-textPrimary font-medium truncate" title={user.email}>
                  {user.email}
                </span>
              </div>
            </div>
            
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-textSecondary font-semibold transition-all hover:bg-negative/15 hover:text-negative hover:border-negative/20 active:scale-[0.98]"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[1.1rem]"></i>
              <span>Logout</span>
            </button>
          </div>
        )}

        <div className="text-textMuted text-[0.8rem]">
          <p>MindScale v1.0.0</p>
          <p className="text-[0.7rem] mt-0.5">Mid Defense Prototype</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
