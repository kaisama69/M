import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';

const BREATH_MODES = {
  relax: {
    name: '4-7-8 Relaxing Breath',
    desc: 'Deep relaxation and stress reduction. Helps with anxiety and sleep.',
    steps: [
      { action: 'Inhale', duration: 4, color: '#10b981', scale: 1.6, bgGlow: 'rgba(16, 185, 129, 0.25)' },
      { action: 'Hold', duration: 7, color: '#8b5cf6', scale: 1.6, bgGlow: 'rgba(139, 92, 246, 0.25)' },
      { action: 'Exhale', duration: 8, color: '#3b82f6', scale: 1.0, bgGlow: 'rgba(59, 130, 246, 0.15)' }
    ]
  },
  box: {
    name: '4-4-4-4 Box Breathing',
    desc: 'Used by navy seals to reset focus, reduce panic, and maintain calm under pressure.',
    steps: [
      { action: 'Inhale', duration: 4, color: '#10b981', scale: 1.5, bgGlow: 'rgba(16, 185, 129, 0.25)' },
      { action: 'Hold', duration: 4, color: '#8b5cf6', scale: 1.5, bgGlow: 'rgba(139, 92, 246, 0.25)' },
      { action: 'Exhale', duration: 4, color: '#3b82f6', scale: 1.0, bgGlow: 'rgba(59, 130, 246, 0.15)' },
      { action: 'Hold Empty', duration: 4, color: '#64748b', scale: 1.0, bgGlow: 'rgba(100, 116, 139, 0.15)' }
    ]
  },
  equal: {
    name: '5-5 Balanced Breath',
    desc: 'Coherent breathing to balance the autonomic nervous system and synchronize heart rhythm.',
    steps: [
      { action: 'Inhale', duration: 5, color: '#10b981', scale: 1.5, bgGlow: 'rgba(16, 185, 129, 0.25)' },
      { action: 'Exhale', duration: 5, color: '#3b82f6', scale: 1.0, bgGlow: 'rgba(59, 130, 246, 0.15)' }
    ]
  }
};

const BreathingPage = () => {
  const [modeKey, setModeKey] = useState('relax');
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BREATH_MODES['relax'].steps[0].duration);
  const [cycleCount, setCycleCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const currentMode = BREATH_MODES[modeKey];
  const currentStep = currentMode.steps[stepIndex];
  
  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize Audio Context on demand
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Play a soft synthesized sound depending on the breathing state
  const playSound = (type) => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'inhale') {
      // Rising pitch chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.8);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'exhale') {
      // Falling pitch chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 1.0);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
    } else if (type === 'hold') {
      // Soft gentle steady hum
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  };

  // Manage Breathing Timer Loop
  useEffect(() => {
    if (isActive) {
      // Play start sound of step
      if (currentStep.action === 'Inhale') playSound('inhale');
      else if (currentStep.action === 'Exhale') playSound('exhale');
      else playSound('hold');

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Move to next step
            setStepIndex((prevIdx) => {
              const nextIdx = (prevIdx + 1) % currentMode.steps.length;
              // Reset time left to the next step's duration
              setTimeLeft(currentMode.steps[nextIdx].duration);
              
              // Increment cycle count when completing a full cycle
              if (nextIdx === 0) {
                setCycleCount((c) => c + 1);
              }
              return nextIdx;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, stepIndex, modeKey, soundEnabled]);

  // Handle Mode Reset
  const handleModeChange = (key) => {
    setModeKey(key);
    setIsActive(false);
    setStepIndex(0);
    setTimeLeft(BREATH_MODES[key].steps[0].duration);
    setCycleCount(0);
  };

  // Start / Pause
  const toggleActive = () => {
    if (!isActive) {
      initAudio();
    }
    setIsActive(!isActive);
  };

  // Reset
  const resetBreathe = () => {
    setIsActive(false);
    setStepIndex(0);
    setTimeLeft(currentMode.steps[0].duration);
    setCycleCount(0);
  };

  return (
    <>
      <Header 
        title="Breathing Room" 
        subtitle="Slow down, release stress, and bring yourself back to the present moment." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        {/* Left: Interactive Bubble Area */}
        <section className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 md:p-10 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col justify-center items-center relative overflow-hidden min-h-[500px]">
          
          {/* Background Ambient Glow */}
          <div 
            className="absolute rounded-full blur-[100px] opacity-10 transition-all duration-[1000ms] pointer-events-none"
            style={{
              backgroundColor: currentStep.color,
              width: '300px',
              height: '300px',
              transform: `scale(${currentStep.scale})`
            }}
          ></div>

          {/* Interactive Breathing Container */}
          <div className="flex flex-col items-center justify-center relative z-10 gap-10 flex-grow">
            
            {/* The Breathing Bubble */}
            <div className="relative flex items-center justify-center">
              
              {/* Outer pulsing ring */}
              <div 
                className="absolute rounded-full border border-white/10 transition-all duration-[1000ms] ease-in-out"
                style={{
                  width: '280px',
                  height: '280px',
                  transform: `scale(${currentStep.scale * 1.1})`,
                  backgroundColor: currentStep.bgGlow
                }}
              ></div>

              {/* Inner bubble */}
              <div 
                className="w-48 h-48 rounded-full flex flex-col items-center justify-center text-white transition-all duration-[1000ms] ease-in-out shadow-[0_0_50px_rgba(255,255,255,0.05)] border border-white/20"
                style={{
                  transform: `scale(${currentStep.scale})`,
                  backgroundColor: `${currentStep.color}15`,
                  borderColor: currentStep.color
                }}
              >
                {/* Active Action text */}
                <span className="text-[1.4rem] font-bold tracking-wider uppercase drop-shadow-md select-none transition-colors duration-500" style={{ color: currentStep.color }}>
                  {currentStep.action}
                </span>

                {/* Countdown */}
                <span className="text-[2.2rem] font-black mt-1 text-white leading-none select-none">
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Instruction helper */}
            <div className="text-center max-w-[320px]">
              <p className="text-[0.95rem] text-textSecondary leading-relaxed">
                {isActive 
                  ? `Focus on the rhythm. ${currentStep.action} for ${timeLeft} more seconds.` 
                  : "Click 'Begin Session' below to start your guided practice."
                }
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-8 relative z-10">
            <button
              onClick={toggleActive}
              className={`px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-md ${
                isActive 
                  ? 'bg-white/10 border border-white/20 text-white hover:bg-white/15'
                  : 'bg-gradient-to-r from-primary to-violet-600 text-white hover:shadow-[0_8px_25px_rgba(139,92,246,0.3)]'
              }`}
            >
              <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play'}`}></i>
              <span>{isActive ? 'Pause Session' : 'Begin Session'}</span>
            </button>

            <button
              onClick={resetBreathe}
              className="px-6 py-3.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl text-textSecondary hover:text-white font-semibold transition-all"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Right: Settings / Modes Panel */}
        <section className="flex flex-col gap-6">
          
          {/* Sounds and Stats */}
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)]">
            <h3 className="text-[1.1rem] font-bold text-textPrimary mb-4 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-primary"></i>
              Session Controls
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl">
                <span className="text-[0.95rem] text-textSecondary font-semibold">Chime Sounds</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex ${soundEnabled ? 'bg-primary justify-end' : 'bg-white/10 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </button>
              </div>

              <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl">
                <span className="text-[0.95rem] text-textSecondary font-semibold">Completed Cycles</span>
                <span className="text-[1.15rem] font-black text-white">{cycleCount}</span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[20px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col gap-4">
            <h3 className="text-[1.1rem] font-bold text-textPrimary flex items-center gap-2">
              <i className="fa-solid fa-wind text-neutral"></i>
              Breathing Techniques
            </h3>

            <div className="flex flex-col gap-3">
              {Object.entries(BREATH_MODES).map(([key, mode]) => {
                const isSelected = modeKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleModeChange(key)}
                    className={`text-left p-4 rounded-xl border transition-all duration-300 ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'bg-white/[0.01] border-white/[0.06] text-textSecondary hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span className="block font-bold text-[0.95rem] mb-1">{mode.name}</span>
                    <span className="block text-[0.8rem] text-textMuted leading-relaxed">{mode.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </section>

      </div>
    </>
  );
};

export default BreathingPage;
