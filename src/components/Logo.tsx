'use client';

import { useState } from 'react';

const PX = { sm: 32, md: 40, lg: 56 };

export function Logo({ size = 'md', showText = true }: { size?: 'sm' | 'md' | 'lg'; showText?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const px = PX[size];
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };

  return (
    <div className="flex items-center gap-2" style={{ height: px }}>
      {!imgError ? (
        // Exact brand asset: drop the PNG at /public/logo.png to use it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Warehouse Now"
          height={px}
          style={{ height: px, width: 'auto' }}
          onError={() => setImgError(true)}
        />
      ) : (
        // Fallback: inline "wh now" mark that mirrors the brand logo.
        <svg viewBox="0 0 100 92" style={{ height: px, width: 'auto' }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="2" width="34" height="9" rx="4.5" fill="#FFD100" />
          <rect x="5" y="14" width="90" height="74" rx="9" fill="#1B1464" stroke="#1B1464" strokeWidth="2" />
          <rect x="11" y="50" width="78" height="32" rx="5" fill="#FFFFFF" />
          <text x="50" y="46" textAnchor="middle" fill="#FFFFFF" fontWeight="800" fontSize="34" fontFamily="Arial, sans-serif">wh</text>
          <text x="50" y="76" textAnchor="middle" fill="#FFD100" fontWeight="800" fontSize="26" fontFamily="Arial, sans-serif">now</text>
        </svg>
      )}
      {showText && (
        <div className={`font-bold ${textSizes[size]} leading-tight`}>
          <span className="text-navy">Warehouse Now</span>
        </div>
      )}
    </div>
  );
}
