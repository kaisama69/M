import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Toast from '../components/Toast';

const JournalPage = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch('/api/history');
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server is not responding correctly. Please ensure the Flask backend is running.');
      }
      
      if (!response.ok) throw new Error('Could not retrieve logs.');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Failed to retrieve logs history.', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: trimmedText })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server is not responding correctly. Please ensure the Flask backend is running.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze journal entry.');
      }

      setResult(data);
      showToast('Entry analyzed and logged successfully!', 'success');
      setText('');
      fetchHistory();
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message || 'An error occurred during analysis.', 'error');
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

  return (
    <>
      <Header />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        {/* Left: Journal Input Form */}
        <section className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.2)]">
          <form className="flex flex-col gap-5 h-full" onSubmit={handleSubmit}>
            <label htmlFor="journal-text" className="text-[1.15rem] font-semibold text-textPrimary flex items-center">
              <i className="fa-regular fa-message mr-2 text-primary"></i>
              How was your day? Write down your thoughts:
            </label>
            <div className="relative flex-grow">
              <textarea
                id="journal-text"
                className="w-full h-[260px] p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white text-[1.05rem] leading-relaxed resize-none outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04]"
                placeholder="Type your thoughts here... How are you feeling? What did you do today?"
                maxLength="2000"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
              ></textarea>
              <span className="absolute bottom-4 right-5 text-[0.85rem] text-textMuted">{text.length} / 2000</span>
            </div>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-primary to-violet-600 text-white py-3.5 px-8 text-[1.05rem] font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_8px_25px_rgba(139,92,246,0.25)] hover:shadow-[0_12px_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze Mood</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right: Sentiment Analysis Output */}
        <section className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col justify-center items-center min-h-[350px]">
          {!result ? (
            <div className="text-center text-textMuted flex flex-col items-center gap-4 p-8">
              <i className="fa-solid fa-seedling text-[3.5rem] bg-gradient-to-br from-textMuted to-textMuted/30 bg-clip-text text-transparent"></i>
              <h3 className="text-[1.35rem] font-semibold text-textPrimary">Awaiting Analysis</h3>
              <p className="text-[0.95rem] max-w-[320px] leading-relaxed">
                Write a journal entry and click 'Analyze Mood' to see sentiment results and tailored recommendations here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 w-full h-full justify-between">
              <div className="flex justify-between items-center">
                <h3 className="text-[1.35rem] font-semibold text-textPrimary">Sentiment Result</h3>
                <span className={`text-[1rem] font-bold py-2 px-4 rounded-full flex items-center gap-2 ${
                  result.sentiment === 'Positive' ? 'bg-positive/10 text-positive border border-positive/20' :
                  result.sentiment === 'Negative' ? 'bg-negative/10 text-negative border border-negative/20' :
                  'bg-neutral/10 text-neutral border border-neutral/20'
                }`}>
                  {result.sentiment === 'Positive' && <i className="fa-solid fa-face-smile-beam"></i>}
                  {result.sentiment === 'Negative' && <i className="fa-solid fa-face-frown"></i>}
                  {result.sentiment === 'Neutral' && <i className="fa-solid fa-face-meh"></i>}
                  <span>{result.sentiment}</span>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-[0.95rem] font-medium text-textSecondary">
                  <span>Prediction Confidence</span>
                  <span>{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-[1000ms] ease-in-out ${
                      result.sentiment === 'Positive' ? 'bg-gradient-to-r from-positive to-emerald-400' :
                      result.sentiment === 'Negative' ? 'bg-gradient-to-r from-negative to-red-400' :
                      'bg-gradient-to-r from-neutral to-blue-400'
                    }`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className={`p-5 rounded-[14px] flex flex-col gap-2 ${
                result.sentiment === 'Positive' ? 'bg-positive/5 border border-positive/15' :
                result.sentiment === 'Negative' ? 'bg-negative/5 border border-negative/15' :
                'bg-neutral/5 border border-neutral/15'
              }`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider ${
                  result.sentiment === 'Positive' ? 'text-positive' :
                  result.sentiment === 'Negative' ? 'text-negative' :
                  'text-neutral'
                }`}>
                  Recommended Action
                </h4>
                <p className="text-[0.95rem] leading-relaxed text-textSecondary">{result.recommendation}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom: History logs list */}
      <section className="mt-16">
        <div className="text-[1.35rem] font-bold mb-6 text-textPrimary flex items-center">
          <i className="fa-solid fa-clock-rotate-left mr-2 text-primary"></i>
          Recent Reflections
        </div>

        <div className="flex flex-col gap-4">
          {isHistoryLoading ? (
            <div className="text-center text-textMuted py-8">
              <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2"></i>
              <p>Loading past reflections...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-textMuted py-12">
              <i className="fa-solid fa-folder-open text-3xl mb-2 opacity-50"></i>
              <p>Your history folder is empty. Start writing your daily journals to track your mood trends!</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 md:p-6 flex justify-between items-center gap-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-primary/20 hover:scale-[1.002]">
                <div className="flex flex-col gap-2 max-w-[75%]">
                  <p className="text-[1.05rem] text-textPrimary truncate" title={item.raw_text}>{item.raw_text}</p>
                  <div className="flex flex-wrap gap-4 text-[0.85rem] text-textMuted">
                    <span><i className="fa-regular fa-calendar mr-1"></i> {formatDateTime(item.timestamp)}</span>
                    <span><i className="fa-solid fa-gauge-high mr-1"></i> Confidence: {Math.round(item.confidence * 100)}%</span>
                  </div>
                </div>
                <div>
                  <span className={`text-[0.85rem] font-bold py-1.5 px-4 rounded-full ${
                    item.sentiment === 'Positive' ? 'bg-positive/10 text-positive' :
                    item.sentiment === 'Negative' ? 'bg-negative/10 text-negative' :
                    'bg-neutral/10 text-neutral'
                  }`}>{item.sentiment}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </>
  );
};

export default JournalPage;
