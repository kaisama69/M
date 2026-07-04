import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import Header from '../components/Header';
import Toast from '../components/Toast';

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler);

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
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/history')
      ]);

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
  let dominantSentimentClass = '';
  let avgConf = 0;
  
  if (stats && allLogs.length > 0) {
    let maxCount = -1;
    Object.keys(stats.counts).forEach(key => {
      if (stats.counts[key] > maxCount) {
        maxCount = stats.counts[key];
        dominantSentiment = key;
      }
    });

    if (dominantSentiment === 'Positive') dominantSentimentClass = 'positive';
    else if (dominantSentiment === 'Negative') dominantSentimentClass = 'negative';
    else dominantSentimentClass = 'neutral';

    const totalConf = allLogs.reduce((sum, item) => sum + item.confidence, 0);
    avgConf = Math.round((totalConf / allLogs.length) * 100);
  }

  // Chart Data
  const hasData = stats && stats.total > 0;
  const distData = hasData ? [stats.counts.Positive || 0, stats.counts.Neutral || 0, stats.counts.Negative || 0] : [1, 1, 1];
  const distColors = hasData 
    ? ['#10b981', '#3b82f6', '#ef4444'] 
    : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'];

  const doughnutData = {
    labels: hasData ? ['Positive', 'Neutral', 'Negative'] : ['No Data'],
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

  let lineData = { labels: [], datasets: [] };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: -1.2, max: 1.2,
        ticks: {
          stepSize: 1, color: '#64748b', font: { family: 'Outfit' },
          callback: function(value) {
            if (value === 1) return 'Positive  😊';
            if (value === 0) return 'Neutral  😐';
            if (value === -1) return 'Negative  😔';
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
    const sentimentMap = { 'Positive': 1, 'Neutral': 0, 'Negative': -1 };
    const displayTimeline = stats.timeline.slice(-15);
    
    lineData = {
      labels: displayTimeline.map(item => {
        const date = new Date(item.timestamp.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }),
      datasets: [{
        label: 'Mood Flow',
        data: displayTimeline.map(item => sentimentMap[item.sentiment]),
        borderColor: '#8b5cf6',
        borderWidth: 3,
        pointBackgroundColor: displayTimeline.map(item => {
          if (item.sentiment === 'Positive') return '#10b981';
          if (item.sentiment === 'Negative') return '#ef4444';
          return '#3b82f6';
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
          <div className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[1.5rem] ${
            dominantSentimentClass === 'positive' ? 'bg-positive/10 text-positive border border-positive/20' :
            dominantSentimentClass === 'negative' ? 'bg-negative/10 text-negative border border-negative/20' :
            'bg-neutral/10 text-neutral border border-neutral/20'
          }`}>
            {dominantSentiment === 'Positive' && <i className="fa-solid fa-face-smile-beam"></i>}
            {dominantSentiment === 'Negative' && <i className="fa-solid fa-face-frown"></i>}
            {(dominantSentiment === 'Neutral' || dominantSentiment === 'None') && <i className="fa-solid fa-face-meh"></i>}
          </div>
          <div className="flex flex-col gap-1">
            <span className={`text-[1.85rem] font-black leading-none ${
              dominantSentiment === 'Positive' ? 'text-positive' : 
              dominantSentiment === 'Negative' ? 'text-negative' : 
              'text-neutral'
            }`}>
              {dominantSentiment}
            </span>
            <span className="text-[0.9rem] text-textSecondary font-medium">Dominant Sentiment</span>
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
            Sentiment Trends Over Time
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
            Sentiment Breakdown
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
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[50%]">Journal Entry text</th>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[15%]">Sentiment</th>
                <th className="py-4 px-6 text-[0.9rem] font-semibold text-textSecondary border-b border-white/[0.08] w-[15%]">Prediction Confidence</th>
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
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="py-5 px-6 text-[0.95rem] text-textSecondary border-b border-white/[0.03] font-medium">{formatDateTime(log.timestamp)}</td>
                    <td className="py-5 px-6 text-[0.95rem] text-textPrimary border-b border-white/[0.03] max-w-[400px] truncate" title={log.raw_text}>{log.raw_text}</td>
                    <td className="py-5 px-6 text-[0.95rem] border-b border-white/[0.03]">
                      <span className={`text-[0.8rem] font-bold py-1.5 px-3.5 rounded-full inline-block ${
                        log.sentiment === 'Positive' ? 'bg-positive/10 text-positive' :
                        log.sentiment === 'Negative' ? 'bg-negative/10 text-negative' :
                        'bg-neutral/10 text-neutral'
                      }`}>{log.sentiment}</span>
                    </td>
                    <td className="py-5 px-6 text-[0.95rem] text-textPrimary border-b border-white/[0.03]">{Math.round(log.confidence * 100)}%</td>
                  </tr>
                ))
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
