import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Sparkles, Music, ChevronDown, ChevronUp } from 'lucide-react';

// Single curated celestial atmospheric soundtrack as requested by user
const SINGLE_SOUNDTRACK = {
  name: 'Cosmic Nebula',
  desc: 'Warm smothered celestial ambient soundtrack',
  filterCutoff: 260,
  voices: [
    { freq: 73.42, gain: 0.32, type: 'sine' as OscillatorType }, // D2
    { freq: 110.0, gain: 0.22, type: 'sine' as OscillatorType }, // A2
    { freq: 174.61, gain: 0.18, type: 'sine' as OscillatorType }, // F3
    { freq: 220.0, gain: 0.14, type: 'sine' as OscillatorType }, // A3
    { freq: 261.63, gain: 0.12, type: 'sine' as OscillatorType }, // C4
    { freq: 329.63, gain: 0.08, type: 'sine' as OscillatorType }, // E4
  ],
};

export const CosmicAudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<any[]>([]);

  // Stop currently synthesized sound voices
  const clearNodes = () => {
    activeNodesRef.current.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {}
    });
    activeNodesRef.current = [];
  };

  // Start the single soundtrack
  const startCosmicSynth = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      clearNodes();

      // Master Gain with smooth fade-in
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : volume, ctx.currentTime + 2.5);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Smothered warm low-pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(SINGLE_SOUNDTRACK.filterCutoff, ctx.currentTime);
      filter.Q.setValueAtTime(1.6, ctx.currentTime);
      filter.connect(masterGain);

      // Slow filter breathing LFO (0.035 Hz)
      const filterLfo = ctx.createOscillator();
      const filterLfoGain = ctx.createGain();
      filterLfo.frequency.setValueAtTime(0.035, ctx.currentTime);
      filterLfoGain.gain.setValueAtTime(55, ctx.currentTime);
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start();

      // Launch voices for the single celestial soundtrack
      SINGLE_SOUNDTRACK.voices.forEach((voice, idx) => {
        const osc = ctx.createOscillator();
        osc.type = voice.type || 'sine';
        osc.frequency.setValueAtTime(voice.freq, ctx.currentTime);

        // Slow celestial detune chorus
        const chorusLfo = ctx.createOscillator();
        const chorusLfoGain = ctx.createGain();
        chorusLfo.frequency.setValueAtTime(0.05 + idx * 0.02, ctx.currentTime);
        chorusLfoGain.gain.setValueAtTime(voice.freq * 0.003, ctx.currentTime);
        chorusLfo.connect(chorusLfoGain);
        chorusLfoGain.connect(osc.frequency);
        chorusLfo.start();

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(voice.gain, ctx.currentTime);

        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          const panVal = ((idx % 3) - 1) * 0.35;
          panner.pan.setValueAtTime(panVal, ctx.currentTime);
          osc.connect(voiceGain);
          voiceGain.connect(panner);
          panner.connect(filter);
          activeNodesRef.current.push(panner);
        } else {
          osc.connect(voiceGain);
          voiceGain.connect(filter);
        }

        osc.start();
        activeNodesRef.current.push(osc, chorusLfo, chorusLfoGain, voiceGain);
      });

      activeNodesRef.current.push(filter, filterLfo, filterLfoGain, masterGain);
      setIsPlaying(true);
    } catch (err) {
      console.warn('[COSMIC-AUDIO] Web Audio synthesis notice:', err);
    }
  };

  const stopCosmicSynth = () => {
    try {
      if (masterGainRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        masterGainRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
        setTimeout(() => {
          clearNodes();
          masterGainRef.current = null;
        }, 1100);
      }
    } catch {}
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopCosmicSynth();
    } else {
      startCosmicSynth();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (isMuted && val > 0) setIsMuted(false);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(val, audioCtxRef.current.currentTime, 0.08);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (masterGainRef.current && audioCtxRef.current) {
      const target = nextMuted ? 0 : volume;
      masterGainRef.current.gain.setTargetAtTime(target, audioCtxRef.current.currentTime, 0.08);
    }
  };

  useEffect(() => {
    return () => {
      stopCosmicSynth();
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      {/* Minimized Floating Widget */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#140a2a]/95 hover:bg-[#1e0f3d] border border-white/20 text-white text-xs shadow-2xl shadow-purple-950/80 backdrop-blur-xl transition-all group hover:scale-105 cursor-pointer"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-purple-400 animate-pulse shadow-[0_0_8px_#c084fc]' : 'bg-neutral-600'}`} />
          <Music className="w-3.5 h-3.5 text-purple-200" />
          <span className="font-semibold tracking-wide text-white">{SINGLE_SOUNDTRACK.name}</span>
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
        </button>
      ) : (
        /* Full Luminous White & Smothered Purple Floating Synthesizer (Single Track) */
        <div className="rounded-2xl bg-gradient-to-br from-[#1b0e35]/95 via-[#110724]/95 to-[#090314]/98 border border-white/15 p-4 shadow-[0_12px_45px_rgba(168,85,247,0.35)] backdrop-blur-2xl w-76 transition-all">
          {/* Luminous pearl white top accent line */}
          <div className="h-[1px] -mt-4 -mx-4 mb-3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 border border-white/30 flex items-center justify-center shrink-0 shadow-md shadow-purple-900/40">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-white tracking-tight block truncate drop-shadow-sm">
                  RONIGUARD SOUNDTRACK
                </span>
                <span className="text-[10px] text-purple-300 font-mono block">
                  {isPlaying ? 'Playing • Cosmic Nebula' : 'Cosmic Nebula • Ready'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Minimize player"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Visualizer Waves */}
          <div className="h-7 w-full rounded-xl bg-black/60 border border-white/10 flex items-end justify-center gap-1.5 px-3 py-1.5 mb-3">
            {[0.4, 0.75, 0.95, 0.55, 0.85, 0.65, 1.0, 0.45, 0.8, 0.6].map((factor, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-purple-500 via-fuchsia-300 to-white shadow-[0_0_6px_rgba(255,255,255,0.6)] animate-pulse'
                    : 'bg-white/10 h-1.5'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(25, factor * 90)}%` : '20%',
                  animationDelay: `${i * 110}ms`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>

          {/* Play/Pause & Volume */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={togglePlayback}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border border-white/25 shadow-purple-600/40'
                  : 'bg-gradient-to-r from-white via-purple-100 to-purple-200 text-purple-950 hover:bg-white hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.4)]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play Music'}</span>
            </button>

            <div className="flex items-center gap-2 flex-1 max-w-[125px]">
              <button
                onClick={toggleMute}
                className="p-1 text-neutral-300 hover:text-white rounded-md transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-neutral-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-white h-1.5 bg-purple-950/80 rounded-lg cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
