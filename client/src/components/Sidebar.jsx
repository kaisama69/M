import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
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
          </ul>
        </nav>
      </div>

      <div className="text-textMuted text-[0.85rem] border-t border-cardBorder pt-6">
        <p>MindScale v1.0.0</p>
        <p className="text-[0.75rem] mt-1">Mid Defense Prototype</p>
      </div>
    </aside>
  );
};

export default Sidebar;
