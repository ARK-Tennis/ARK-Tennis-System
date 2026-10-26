import React from 'react';

export function SunIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Sun" style={{ flexShrink: 0 }}>
      <circle cx="16" cy="16" r="6" fill="#F2B632" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="16" y1="3.5" x2="16" y2="7.5"
          stroke="#F2B632" strokeWidth="2.2" strokeLinecap="round"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
    </svg>
  );
}

export function RainCloudIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Rain cloud" style={{ flexShrink: 0 }}>
      <path d="M9 19a5 5 0 0 1 .6-9.96A7 7 0 0 1 23 10.5 4.5 4.5 0 0 1 22.5 19z" fill="#8FA3B5" />
      <g stroke="#3B7DBF" strokeWidth="2.2" strokeLinecap="round">
        <line x1="11" y1="22" x2="9.5" y2="27.5" />
        <line x1="16" y1="22" x2="14.5" y2="27.5" />
        <line x1="21" y1="22" x2="19.5" y2="27.5" />
      </g>
    </svg>
  );
}
