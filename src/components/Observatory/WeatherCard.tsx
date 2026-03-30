import React, { FC } from 'react';

import type { Location } from './LocationSelector';
import { useT } from '../../hooks/useT';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
};

export const WeatherCard: FC<Props> = ({ location }) => {
  const t = useT();

  const lat = location.lat.toFixed(2);
  const lon = location.lon.toFixed(2);
  const forecastUrl = `https://clearoutside.com/forecast/${lat}/${lon}`;
  const imageUrl = `https://clearoutside.com/forecast_image_medium/${lat}/${lon}/forecast.png`;

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle} style={{ marginBottom: '0.5rem' }}>☁️ {t('observatory.weatherTitle')}</div>
      <a href={forecastUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
        <img
          src={imageUrl}
          alt="ClearOutside astronomical forecast"
          style={{ width: '100%', borderRadius: 8, display: 'block' }}
        />
      </a>
    </div>
  );
};
