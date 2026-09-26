import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const sizeMap = {
    sm: { img: 'h-6 w-6', text: 'text-lg', gap: 'gap-2' },
    md: { img: 'h-9 w-9', text: 'text-2xl', gap: 'gap-2.5' },
    lg: { img: 'h-12 w-12', text: 'text-3xl', gap: 'gap-3' },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${currentSize.gap} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Logo Image */}
      <img
        src="/logo.png"
        alt="KEYSTAY Emblem"
        className={`${currentSize.img} object-contain transition-transform duration-200 hover:scale-105`}
        loading="eager"
      />

      {/* Brand Text: KEYSTAY */}
      {showText && (
        <span
          className={`font-bold font-sans tracking-wider text-color-text-primary ${currentSize.text} leading-none`}
        >
          KEY<span className="text-accent">STAY</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
