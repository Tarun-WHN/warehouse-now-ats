'use client';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8', md: 'h-10', lg: 'h-14' };
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };

  return (
    <div className={`flex items-center gap-2 ${sizes[size]}`}>
      <svg viewBox="0 0 48 48" className={sizes[size]} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="44" height="36" rx="3" fill="#1B1464" stroke="#1B1464" strokeWidth="2"/>
        <rect x="2" y="2" width="18" height="4" rx="2" fill="#FFD100"/>
        <text x="6" y="26" fill="white" fontWeight="bold" fontSize="16" fontFamily="Arial">wh</text>
        <rect x="4" y="30" width="40" height="10" rx="2" fill="white"/>
        <text x="6" y="39" fill="#FFD100" fontWeight="bold" fontSize="13" fontFamily="Arial">now</text>
      </svg>
      <div className={`font-bold ${textSizes[size]} leading-tight`}>
        <span className="text-navy">Warehouse</span>{' '}
        <span className="text-navy">Now</span>
      </div>
    </div>
  );
}
