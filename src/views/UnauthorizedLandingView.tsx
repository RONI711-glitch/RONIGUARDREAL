import React from 'react';

export const UnauthorizedLandingView: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#0b0e17] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Centered pill badge matching user screenshot */}
      <div className="bg-[#0f1524] border border-white/[0.09] rounded-2xl px-8 sm:px-12 py-5 sm:py-6 shadow-[0_4px_35px_rgba(0,0,0,0.6)] flex items-center justify-center gap-3 sm:gap-4 text-white text-base sm:text-xl font-bold tracking-wider uppercase transition-transform hover:scale-[1.01]">
        <span className="text-xl sm:text-2xl leading-none">🚨🚨</span>
        <span className="text-white drop-shadow-md">ACCESS UNAUTHORIZED</span>
        <span className="text-xl sm:text-2xl leading-none">🚨🚨</span>
      </div>

      {/* Subtle bottom indicator matching user screenshot */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-[#55627f] text-xs sm:text-sm font-medium tracking-wide">
        Contents can not be displayed on browser
      </div>
    </div>
  );
};
