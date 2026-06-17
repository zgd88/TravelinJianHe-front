// 距离计算 & 计价工具
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcFare(distKm: number, baseFare = 8, baseKm = 3, perKm = 2): number {
  if (distKm <= baseKm) return baseFare;
  return Math.round((baseFare + (distKm - baseKm) * perKm) * 100) / 100;
}

export function now(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
