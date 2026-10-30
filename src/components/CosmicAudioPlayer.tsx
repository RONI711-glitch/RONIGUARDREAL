import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Sparkles, Music, ChevronDown, ChevronUp } from 'lucide-react';

export const CosmicAudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<any[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize and start audio synthesis
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

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : volume, ctx.currentTime + 2.5);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Filter: warm atmospheric low-pass
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, ctx.currentTime);
      filter.Q.setValueAtTime(2.5, ctx.currentTime);
      filter.connect(masterGain);

      // Filter LFO: gentle cosmic sweep
      const filterLfo = ctx.createOscillator();
      const filterLfoGain = ctx.createGain();
      filterLfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 0.08 Hz slow breathing sweep
      filterLfoGain.gain.setValueAtTime(180, ctx.currentTime);
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start();

      // Cosmic Chords frequencies (Eb Minor / F# Ethereal floating chord)
      // Eb2 (77.78), Bb2 (116.54), Eb3 (155.56), Gb3 (185.00), Bb3 (233.08), Db4 (277.18), F4 (349.23)
      const notes = [77.78, 116.54, 155.56, 185.0, 233.08, 277.18, 349.23];
      const oscillators: OscillatorNode[] = [];

      notes.forEach((freq, idx) => {
        // Main oscillator (Sine / Triangle)
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Subtle slow vibrato for spatial drift
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(0.15 + idx * 0.03, ctx.currentTime);
        vibratoGain.gain.setValueAtTime(freq * 0.006, ctx.currentTime);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();

        // Individual voice gain
        const voiceGain = ctx.createGain();
        const baseAmp = idx === 0 ? 0.35 : 0.12 / Math.sqrt(idx + 1);
        voiceGain.gain.setValueAtTime(baseAmp, ctx.currentTime);

        osc.connect(voiceGain);
        voiceGain.connect(filter);
        osc.start();

        oscillators.push(osc);
        activeNodesRef.current.push(osc, vibrato, vibratoGain, voiceGain);
      });

      activeNodesRef.current.push(filter, filterLfo, filterLfoGain, masterGain);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch (err) {
      console.warn('[COSMIC-AUDIO] Web Audio API initialization notice:', err);
    }
  };

  const stopCosmicSynth = () => {
    try {
      if (masterGainRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        masterGainRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        setTimeout(() => {
          activeNodesRef.current.forEach((node) => {
            try {
              if (typeof node.stop === 'function') node.stop();
              if (typeof node.disconnect === 'function') node.disconnect();
            } catch {}
          });
          activeNodesRef.current = [];
          masterGainRef.current = null;
        }, 1300);
      }
    } catch {}
    setIsPlaying(false);
    isPlayingRef.current = false;
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
      {/* Minimized Pill Mode */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0e071e]/90 hover:bg-[#150a2b] border border-purple-500/30 text-purple-200 text-xs shadow-xl shadow-purple-950/60 backdrop-blur-md transition-all group hover:scale-105 cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <Music className="w-3.5 h-3.5 text-purple-300" />
          <span className="font-mono font-medium">Cosmic Audio</span>
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
        </button>
      ) : (
        /* Full Floating Cosmic Glass Player */
        <div className="rounded-2xl bg-[#0c061a]/95 border border-purple-500/30 p-3.5 shadow-2xl shadow-purple-950/80 backdrop-blur-xl w-72 transition-all">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-purple-900/60 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block truncate">
                  RONIGUARD Cosmic Drift
                </span>
                <span className="text-[9px] text-purple-300/80 font-mono block">
                  {isPlaying ? 'Smooth Generative Synth Playing' : 'Procedural Ambient Pad · Ready'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
              title="Minimize player"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Equalizer Visualizer Bars */}
          <div className="h-6 w-full rounded-lg bg-black/50 border border-purple-900/30 flex items-end justify-center gap-1.5 px-3 py-1 mb-3">
            {[0.4, 0.7, 0.9, 0.5, 0.8, 0.6, 1.0, 0.45, 0.75].map((factor, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-purple-600 via-indigo-400 to-cyan-300 animate-pulse'
                    : 'bg-purple-950/60 h-1.5'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(20, factor * 90)}%` : '20%',
                  animationDelay: `${i * 120}ms`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={togglePlayback}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Cosmic Music'}</span>
            </button>

            <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
              <button
                onClick={toggleMute}
                className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-purple-500 h-1 bg-purple-950/80 rounded-lg cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
