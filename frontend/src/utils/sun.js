/**
 * Sunrise / sunset for a coordinate and instant, using the standard
 * sunrise-equation (NOAA "SunCalc" style). Accurate to about a minute, which
 * is far more than a day/night theme needs. Everything is in UTC internally,
 * so the result is correct whatever the device timezone is.
 */

const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
const HORIZON = -0.833 * RAD; // refraction + solar disc radius

const toJulian = (date) => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (julian) => new Date((julian + 0.5 - J1970) * DAY_MS);
const solarMeanAnomaly = (days) => RAD * (357.5291 + 0.98560028 * days);

function eclipticLongitude(meanAnomaly) {
  const center =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly));
  return meanAnomaly + center + RAD * 102.9372 + Math.PI;
}

const declination = (longitude) => Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude));
const julianCycle = (days, lw) => Math.round(days - 0.0009 - lw / (2 * Math.PI));
const approxTransit = (hourAngle, lw, cycle) => 0.0009 + (hourAngle + lw) / (2 * Math.PI) + cycle;
const solarTransit = (transit, meanAnomaly, longitude) =>
  J2000 + transit + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * longitude);

function hourAngle(phi, dec) {
  const cosH =
    (Math.sin(HORIZON) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH > 1) return null; // sun never rises
  if (cosH < -1) return null; // sun never sets
  return Math.acos(cosH);
}

/** @returns {{sunrise: Date, sunset: Date} | {polar: 'day' | 'night'}} */
export function sunTimes(date, lat, lng) {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const days = toJulian(date) - J2000; // days since J2000, as the series expects

  const cycle = julianCycle(days, lw);
  const transit = approxTransit(0, lw, cycle);
  const meanAnomaly = solarMeanAnomaly(transit);
  const longitude = eclipticLongitude(meanAnomaly);
  const dec = declination(longitude);

  const w = hourAngle(phi, dec);
  if (w == null) {
    const alwaysDay = Math.sin(phi) * Math.sin(dec) > 0;
    return { polar: alwaysDay ? 'day' : 'night' };
  }

  const set = solarTransit(approxTransit(w, lw, cycle), meanAnomaly, longitude);
  const rise = solarTransit(approxTransit(-w, lw, cycle), meanAnomaly, longitude);
  return { sunrise: fromJulian(rise), sunset: fromJulian(set) };
}

/** True when the sun is above the horizon at this place and moment. */
export function isDaylight(date, lat, lng) {
  const times = sunTimes(date, lat, lng);
  if (times.polar) return times.polar === 'day';
  return date >= times.sunrise && date < times.sunset;
}

/**
 * Clock-only fallback when the location is unknown: treat 06:00–18:30 as day.
 * Deliberately outside the theme logic so it stays trivial to reason about.
 */
export function isDaylightByClock(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= 6 && hour < 18.5;
}
