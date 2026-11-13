import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const RONIGUARD_LOGO_SRC = '/roniguard-logo.jpg';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'sm', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap: Record<NonNullable<BrandLogoProps['size']>, string> = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
    hero: 'w-full h-full rounded-2xl',
  };

  if (imgError) {
    return (
      <div
        className={`${sizeMap[size]} bg-gradient-to-br from-purple-700 to-indigo-950 border border-white/15 flex items-center justify-center shrink-0 ${className}`}
      >
        <ShieldCheck className="w-1/2 h-1/2 text-purple-200" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeMap[size]} overflow-hidden bg-[#06030c] border border-white/15 shadow-lg shadow-purple-950/50 shrink-0 ${className}`}
    >
      <img
        src={RONIGUARD_LOGO_SRC}
        alt="RONIGUARD Crest"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-center select-none"
      />
    </div>
  );
};
