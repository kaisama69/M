const Toast = ({ message, type = 'success', show }) => {
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';

  return (
    <div className={`fixed bottom-10 right-10 bg-[#0d0c16]/95 backdrop-blur-md text-white py-4 px-6 rounded-2xl flex items-center gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)] z-50 transition-all duration-500 ease-out transform ${
      show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
    } ${
      type === 'success' ? 'border-l-4 border-positive' : 'border-l-4 border-negative'
    }`}>
      <i className={`fa-solid ${icon} text-[1.2rem] ${type === 'success' ? 'text-positive' : 'text-negative'}`}></i>
      <span className="font-medium text-slate-100">{message}</span>
    </div>
  );
};

export default Toast;
