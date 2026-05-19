import { useState, useEffect } from "react";
import { DARK, LIGHT } from "../theme";

// DST européen : dernier dimanche de mars → dernier dimanche d'octobre
function getParisUTCOffset() {
  const now  = new Date();
  const year = now.getUTCFullYear();

  const lastSunday = (month) => {
    const d = new Date(Date.UTC(year, month, 31));
    while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCHours(1, 0, 0, 0); // changement à 01:00 UTC
    return d;
  };

  return now >= lastSunday(2) && now < lastSunday(9) ? 2 : 1;
}

// Formule NOAA — lever/coucher du soleil à Paris (48.8566°N, 2.3522°E)
function isDayInParis() {
  const now    = new Date();
  const offset = getParisUTCOffset();

  // Date parisienne (décalage UTC → heure locale)
  const parisShifted = new Date(now.getTime() + offset * 3_600_000);
  const year         = parisShifted.getUTCFullYear();
  const dayOfYear    = Math.floor(
    (Date.UTC(year, parisShifted.getUTCMonth(), parisShifted.getUTCDate())
     - Date.UTC(year, 0, 0)) / 86_400_000
  );

  const parisHour = (now.getUTCHours() + offset + now.getUTCMinutes() / 60 + 24) % 24;

  const rad = Math.PI / 180;
  const lat = 48.8566;
  const lng = 2.3522;

  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  const eqtime = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)      - 0.040890 * Math.sin(2 * gamma)
  );

  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)     + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.001480 * Math.sin(3 * gamma);

  const cosHA = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl))
    / (Math.cos(lat * rad) * Math.cos(decl));

  // Ces cas ne peuvent pas arriver à Paris mais on les gère par sécurité
  if (cosHA <= -1) return true;
  if (cosHA >=  1) return false;

  const HA           = Math.acos(cosHA) / rad;
  const solarNoonUTC = (720 - 4 * lng - eqtime) / 60;
  const sunriseParis = solarNoonUTC - HA / 15 + offset;
  const sunsetParis  = solarNoonUTC + HA / 15 + offset;

  return parisHour >= sunriseParis && parisHour < sunsetParis;
}

export function useParisTheme() {
  const [isDaytime, setIsDaytime] = useState(isDayInParis);

  useEffect(() => {
    const id = setInterval(() => setIsDaytime(isDayInParis()), 60_000);
    return () => clearInterval(id);
  }, []);

  return { C: isDaytime ? LIGHT : DARK, isDaytime };
}
