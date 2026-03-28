import React, { CSSProperties } from 'react';

import { FlipName } from './FlipName';

type FullNameProps = {
  style?: CSSProperties;
  className?: string;
  interval?: number;
};

export const FullName: React.FC<FullNameProps> = ({ style, className, interval }) => (
  <span
    style={{ display: 'inline-flex', alignItems: 'baseline', ...style }}
    className={className}
  >
    <FlipName names={['Triet', 'Tristan']} interval={interval} />
    Cao
  </span>
);
