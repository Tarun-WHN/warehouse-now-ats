'use client';

interface TimeInStageBadgeProps {
  statusChangedAt?: string;
  dateAdded: string;
}

export function TimeInStageBadge({ statusChangedAt, dateAdded }: TimeInStageBadgeProps) {
  const refDate = statusChangedAt || dateAdded;
  if (!refDate) return null;

  const days = Math.floor(
    (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  let bgColor: string;
  let textColor: string;
  let label: string;

  if (days < 3) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
    label = `${days}d`;
  } else if (days <= 7) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
    label = `${days}d`;
  } else if (days <= 14) {
    bgColor = 'bg-orange-100';
    textColor = 'text-orange-700';
    label = `${days}d`;
  } else {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    label = `${days}d`;
  }

  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${bgColor} ${textColor}`}
    >
      {label}
    </span>
  );
}
