import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
  >
    {/* Globe Circle */}
    <circle cx="60" cy="60" r="38" stroke="#00C4D8" strokeWidth="5" />
    
    {/* Central Cross */}
    <path d="M60 22 V98" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />
    <path d="M22 60 H98" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />

    {/* Curved Latitudes (Horizontal) */}
    <path d="M25 44 C 40 38, 80 38, 95 44" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />
    <path d="M25 76 C 40 82, 80 82, 95 76" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />

    {/* Curved Longitudes (Vertical) for 3D realism */}
    <path d="M44 25 C 38 40, 38 80, 44 95" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />
    <path d="M76 25 C 82 40, 82 80, 76 95" stroke="#00C4D8" strokeWidth="5" strokeLinecap="round" />

    {/* Symmetric Orbital Ring - Upper side mirrors Lower side */}
    <path
      d="M 20 80 C 0 110, 120 10, 100 40"
      stroke="#00C4D8"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);