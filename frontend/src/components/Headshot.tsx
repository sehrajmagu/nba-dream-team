import React, { useState } from 'react';
import './Headshot.css';

interface HeadshotProps {
  id: number;
  name: string;
  className?: string;
}

export const Headshot: React.FC<HeadshotProps> = ({ id, name, className }) => {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const classes = ['headshot', className].filter(Boolean).join(' ');

  if (error) {
    return <div className={`${classes} headshot-fallback`}>{initials}</div>;
  }

  return (
    <img
      className={classes}
      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`}
      alt={name}
      onError={() => setError(true)}
    />
  );
};
