import React from 'react';

export default function DarkVeil() {
  return (
    <div 
      className="absolute inset-0 bg-[var(--theme-bg)]" 
      style={{
        backgroundImage: 'radial-gradient(var(--theme-dot-color) 1.2px, transparent 1.2px)',
        backgroundSize: '24px 24px',
        opacity: 0.8
      }} 
    />
  );
}
