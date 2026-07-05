import { useState, useRef, useEffect } from 'react';

const TRACKS = [
  {
    id: 'meditation',
    name: 'Deep Meditation Tones',
    icon: 'fa-om'
  },
  {
    id: 'rain',
    name: 'Heavy Rain (Brown Noise)',
    icon: 'fa-cloud-rain'
  },
  {
    id: 'stream',
    name: 'Forest Stream (Pink Noise)',
    icon: 'fa-water'
  }
];

const SoundscapePlayer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef([]);
  const masterGainRef = useRef(null);

  // Initialize Web Audio API
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
  };

  useEffect(() => {
    if (masterGainRef.current) {
      // Smoothly ramp volume to prevent clicking
      masterGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [volume]);

  // Clean up all active audio nodes
  const stopAllNodes = () => {
    activeNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {
        console.error(e);
      }
    });
    activeNodesRef.current = [];
  };

  const createNoise = (type) => {
    const ctx = audioCtxRef.current;
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate gain
      } else if (type === 'pink') {
        // Simplified pink noise
        output[i] = (lastOut * 0.99) + (white * 0.05);
        lastOut = output[i];
        output[i] *= 2.0; 
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    return noiseSource;
  };

  const playTrack = (trackId) => {
    initAudio();
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopAllNodes();

    if (trackId === 'rain') {
      // Brown Noise with Lowpass Filter (sounds exactly like heavy rain/airplane cabin)
      const noise = createNoise('brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; // Muffled, deep rain
      
      noise.connect(filter);
      filter.connect(masterGainRef.current);
      noise.start();
      
      activeNodesRef.current = [noise, filter];

    } else if (trackId === 'stream') {
      // Pink Noise with Bandpass (sounds like a rushing stream/waterfall)
      const noise = createNoise('pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;
      
      noise.connect(filter);
      filter.connect(masterGainRef.current);
      noise.start();
      
      activeNodesRef.current = [noise, filter];

    } else if (trackId === 'meditation') {
      // Binaural/Meditation tones: two sine waves slightly detuned creating a beat frequency
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc3.type = 'triangle'; // Add a little texture
      
      // Base frequency 200Hz (calming low tone), second oscillator detuned by 4Hz for binaural beat
      osc1.frequency.value = 174; // Solfeggio frequency (pain reduction)
      osc2.frequency.value = 178; 
      osc3.frequency.value = 87; // Sub octave
      
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();
      
      gain1.gain.value = 0.4;
      gain2.gain.value = 0.4;
      gain3.gain.value = 0.2;

      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain3);
      
      gain1.connect(masterGainRef.current);
      gain2.connect(masterGainRef.current);
      gain3.connect(masterGainRef.current);
      
      osc1.start();
      osc2.start();
      osc3.start();
      
      activeNodesRef.current = [osc1, osc2, osc3, gain1, gain2, gain3];
    }
  };

  const toggleTrack = (track) => {
    if (activeTrack?.id === track.id) {
      if (isPlaying) {
        stopAllNodes();
        setIsPlaying(false);
      } else {
        playTrack(track.id);
        setIsPlaying(true);
      }
    } else {
      setActiveTrack(track);
      setIsPlaying(true);
      playTrack(track.id);
    }
  };

  const stopAudio = () => {
    stopAllNodes();
    setIsPlaying(false);
    setActiveTrack(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded Player Panel */}
      <div 
        className={`transition-all duration-300 ease-in-out origin-bottom-right transform ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#151325]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.4)] w-[280px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
            <h4 className="text-[1rem] font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-headphones text-primary"></i>
              Soundscape
            </h4>
            {isPlaying && (
              <div className="flex gap-1 items-end h-3">
                <span className="w-1 bg-primary rounded-full animate-[soundBar_1s_ease-in-out_infinite]"></span>
                <span className="w-1 bg-primary rounded-full animate-[soundBar_1.2s_ease-in-out_infinite_0.2s]"></span>
                <span className="w-1 bg-primary rounded-full animate-[soundBar_0.8s_ease-in-out_infinite_0.4s]"></span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {TRACKS.map(track => {
              const isActive = activeTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => toggleTrack(track)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 border ${
                    isActive 
                      ? 'bg-primary/20 border-primary/30 text-white' 
                      : 'bg-white/[0.02] border-transparent text-textSecondary hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className={`fa-solid ${track.icon} ${isActive ? 'text-primary' : 'text-textMuted'}`}></i>
                    <span className="font-semibold text-[0.9rem]">{track.name}</span>
                  </div>
                  {isActive ? (
                    <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-primary`}></i>
                  ) : (
                    <i className="fa-solid fa-play text-textMuted/50 opacity-0 group-hover:opacity-100"></i>
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 px-1">
            <i className="fa-solid fa-volume-low text-textMuted text-xs"></i>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <i className="fa-solid fa-volume-high text-textMuted text-xs"></i>
          </div>
          
          {/* Stop completely button */}
          {activeTrack && (
            <button 
              onClick={stopAudio}
              className="w-full mt-4 py-2 text-xs font-semibold text-textMuted hover:text-negative transition-colors flex items-center justify-center gap-1"
            >
              <i className="fa-solid fa-stop"></i> Stop Audio
            </button>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-[55px] h-[55px] rounded-full flex items-center justify-center text-xl transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.3)] border ${
          isOpen || isPlaying
            ? 'bg-gradient-to-r from-primary to-violet-600 text-white border-white/20 hover:shadow-[0_10px_30px_rgba(139,92,246,0.5)]'
            : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
        }`}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : isPlaying ? 'fa-music' : 'fa-headphones'}`}></i>
        
        {/* Active badge */}
        {!isOpen && isPlaying && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-positive border-2 border-[#0d0c16] rounded-full"></span>
        )}
      </button>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes soundBar {
          0% { height: 4px; }
          50% { height: 12px; }
          100% { height: 4px; }
        }
      `}} />
    </div>
  );
};

export default SoundscapePlayer;
