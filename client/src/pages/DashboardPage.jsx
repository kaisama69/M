import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import Header from '../components/Header';
import Toast from '../components/Toast';

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler);

// Shared class metadata — consistent across the app
const CLASS_META = {
  'Normal':               { color: '#10b981', icon: 'fa-face-smile',      label: 'Normal' },
  'Depression':            { color: '#6366f1', icon: 'fa-cloud-rain',      label: 'Depression' },
  'Anxiety':               { color: '#f59e0b', icon: 'fa-heart-pulse',     label: 'Anxiety' },
  'Suicidal':              { color: '#ef4444', icon: 'fa-phone',           label: 'Suicidal' },
  'Stress':                { color: '#f97316', icon: 'fa-fire',            label: 'Stress' },
  'Bipolar':               { color: '#8b5cf6', icon: 'fa-arrows-up-down',  label: 'Bipolar' },
  'Personality disorder':  { color: '#ec4899', icon: 'fa-puzzle-piece',    label: 'Personality Disorder' },
};

const ALL_CLASSES = Object.keys(CLASS_META);

// Map sentiment to a numeric score for the line chart
const sentimentScore = (s) => {
  const scores = { 'Normal': 3, 'Anxiety': 1, 'Stress': 0, 'Bipolar': -1, 'Depression': -2, 'Personality disorder': -2, 'Suicidal': -3 };
  return scores[s] ?? 0;
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadDashboard();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const loadDashboard = async () => {
    try {
      const savedUser = localStorage.getItem('mindscale_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      if (!user) {
        window.location.reload();
        return;
      }

      const headers = {
        'X-User-ID': user.id.toString()
      };

      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/history', { headers })
      ]);

      if (statsRes.status === 401 || historyRes.status === 401) {
        localStorage.removeItem('mindscale_user');
        window.location.reload();
        return;
      }

      const statsContentType = statsRes.headers.get('content-type');
      const historyContentType = historyRes.headers.get('content-type');
      
      if (!statsContentType?.includes('application/json') || !historyContentType?.includes('application/json')) {
        throw new Error('Backend server is not responding correctly. Please ensure the Flask backend is running.');
      }

      if (!statsRes.ok || !historyRes.ok) {
        throw new Error('Failed to retrieve stats or history data.');
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      setAllLogs(historyData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showToast(error.message || 'An error occurred while loading dashboard statistics.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dbDateString) => {
    try {
      const formattedStr = dbDateString.replace(' ', 'T');
      const d = new Date(formattedStr);
      if (isNaN(d.getTime())) return dbDateString;
      
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      return `${d.toLocaleDateString('en-US', options)} at ${d.toLocaleTimeString('en-US', timeOptions)}`;
    } catch (e) {
      return dbDateString;
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return allLogs;
    const query = searchQuery.toLowerCase();
    return allLogs.filter(log => 
      log.raw_text.toLowerCase().includes(query) ||
      log.sentiment.toLowerCase().includes(query) ||
      log.timestamp.toLowerCase().includes(query)
    );
  }, [allLogs, searchQuery]);

  // Derived KPI data
  let dominantSentiment = 'None';
  let avgConf = 0;
  
  if (stats && allLogs.length > 0) {
    let maxCount = -1;
    Object.keys(stats.counts).forEach(key => {
      if (stats.counts[key] > maxCount) {
        maxCount = stats.counts[key];
        dominantSentiment = key;
      }
    });

    const totalConf = allLogs.reduce((sum, item) => sum + item.confidence, 0);
    avgConf = Math.round((totalConf / allLogs.length) * 100);
  }

  const dominantMeta = CLASS_META[dominantSentiment] || { color: '#3b82f6', icon: 'fa-face-meh', label: dominantSentiment };

  // ── Doughnut Chart Data ──────────────────────────────────────
  const hasData = stats && stats.total > 0;
  
  // Build doughnut data dynamically from whatever classes exist in the counts
  const presentClasses = hasData ? ALL_CLASSES.filter(c => (stats.counts[c] || 0) > 0) : [];
  const distData = hasData ? presentClasses.map(c => stats.counts[c] || 0) : [1];
  const distColors = hasData ? presentClasses.map(c => CLASS_META[c].color) : ['rgba(255,255,255,0.05)'];

  const doughnutData = {
    labels: hasData ? presentClasses.map(c => CLASS_META[c].label) : ['No Data'],
    datasets: [{
      data: distData,
      backgroundColor: distColors,
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 }, padding: 15 }
      },
      tooltip: {
        enabled: hasData,
        callbacks: {
          label: function(context) {
            const val = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = Math.round((val / total) * 100);
            return ` ${context.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };

  // ── Line Chart Data ──────────────────────────────────────────
  let lineData = { labels: [], datasets: [] };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: -3.5, max: 3.5,
        ticks: {
          stepSize: 1, color: '#64748b', font: { family: 'Outfit' },
          callback: function(value) {
            if (value === 3) return 'Normal  😊';
            if (value === 1) return 'Anxiety  😰';
            if (value === 0) return 'Stress  😤';
            if (value === -1) return 'Bipolar  🔄';
            if (value === -2) return 'Depression  😔';
            if (value === -3) return 'Suicidal  🆘';
            return '';
          }
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }
      },
      x: {
        ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 }, maxRotation: 45, minRotation: 0 },
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(13, 12, 22, 0.95)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return `Reflecting Date: ${context[0].label}`;
          },
          label: function(context) {
            const idx = context.dataIndex;
            const timeline = stats.timeline.slice(-15);
            return [
              `Mood: ${timeline[idx].sentiment}`,
              `Journal: "${timeline[idx].preview}"`
            ];
          }
        }
      }
    }
  };

  if (stats && stats.timeline && stats.timeline.length > 0) {
    const displayTimeline = stats.timeline.slice(-15);
    
    lineData = {
      labels: displayTimeline.map(item => {
        const date = new Date(item.timestamp.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }),
      datasets: [{
        label: 'Mood Flow',
        data: displayTimeline.map(item => sentimentScore(item.sentiment)),
        borderColor: '#8b5cf6',
        borderWidth: 3,
        pointBackgroundColor: displayTimeline.map(item => {
          const meta = CLASS_META[item.sentiment];
          return meta ? meta.color : '#3b82f6';
        }),
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(139, 92, 246, 0.15)'
      }]
    };
  }

  // Helper for badge styling
  const getBadgeClasses = (sentiment) => {
    const meta = CLASS_META[sentiment];
    if (!meta) return 'bg-neutral/10 text-neutral';
    // Use inline style for color since Tailwind can't handle dynamic colors
    return '';
  };

  return (
    <>
      <Header title="Mental Health Analytics" subtitle="Track your emotional trajectories and cognitive insights over time." />
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex items-center gap-6">
          <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[1.5rem] bg-primary/10 text-primary border border-primary/20">
            <i className="fa-solid fa-book"></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[1.85rem] font-black text-textPrimary leading-none">{stats?.total || 0}</span>
            <span className="text-[0.9rem] text-textSecondary font-medium">Total Reflections</span>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex items-center gap-6">
          <div 
            className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[1.5rem] border"
            style={{ backgroundColor: `${dominantMeta.color}15`, color: dominantMeta.color, borderColor: `${dominantMeta.color}33` }}
          >
            <i className={`fa-solid ${dominantMeta.icon}`}></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[1.85rem] font-black leading-none" style={{ color: dominantMeta.color }}>
              {dominantMeta.label}
            </span>
            <span className="text-[0.9rem] text-textSecondary font-medium">Dominant State</span>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex items-center gap-6">
          <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[1.5rem] bg-neutral/10 text-neutral border border-neutral/20">
            <i className="fa-solid fa-percent"></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[1.85rem] font-black text-textPrimary leading-none">{avgConf}%</span>
            <span className="text-[0.9rem] text-textSecondary font-medium">Average Confidence</span>
          </div>
        </div>
      </div>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8 mb-10">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col gap-6">
          <h3 className="text-[1.15rem] font-bold flex items-center gap-2">
            <i className="fa-solid fa-chart-area text-primary"></i>
            Mood Trends Over Time
          </h3>
          <div className="h-[320px] chart-container">
            {stats && stats.timeline && stats.timeline.length > 0 ? (
              <Line data={lineData} options={lineOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-textMuted">
                No timeline data recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col gap-6">
          <h3 className="text-[1.15rem] font-bold flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-neutral"></i>
            Mental State Breakdown
          </h3>
          <div className="h-[320px] chart-container">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Historical Table View */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h3 className="text-[1.25rem] font-bold flex items-center">
            <i className="fa-solid fa-list text-primary mr-2"></i>
            Reflection Log History
          </h3>
          <input 
            type="text" 
            className="w-full sm:w-[280px] py-2.5 px-5 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white text-[0.95rem] outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04]" 
            placeholder="Search logs by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[20%]">Date & Time</th>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[45%]">Journal Entry text</th>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[20%]">Mental State</th>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[15%]">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center text-textMuted py-12">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p>Loading historical data...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-textMuted py-12">
                    <i className="fa-solid fa-folder-open text-3xl mb-2 opacity-50"></i>
                    <p>No journal reflections logged yet.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const meta = CLASS_META[log.sentiment] || { color: '#3b82f6', icon: 'fa-face-meh' };
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.01]">
                      <td className="py-5 px-6 text-[0.95rem] text-textSecondary border-b border-white/[0.03] font-medium">{formatDateTime(log.timestamp)}</td>
                      <td className="py-5 px-6 text-[0.95rem] text-textPrimary border-b border-white/[0.03] max-w-[400px] truncate" title={log.raw_text}>{log.raw_text}</td>
                      <td className="py-5 px-6 text-[0.95rem] border-b border-white/[0.03]">
                        <span 
                          className="text-[0.8rem] font-bold py-1.5 px-3.5 rounded-full inline-flex items-center gap-1.5"
                          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                        >
                          <i className={`fa-solid ${meta.icon} text-[0.7rem]`}></i>
                          {log.sentiment}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-[0.95rem] text-textPrimary border-b border-white/[0.03]">{Math.round(log.confidence * 100)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </>
  );
};

export default DashboardPage;
