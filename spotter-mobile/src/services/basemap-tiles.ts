export const tileHeaders = {
  'User-Agent': 'WaycastDriver/0.1 (https://spotter.kiyoo.online)',
  'X-Requested-With': 'online.kiyoo.spotter.driver',
};
export function tileSource(zoom: number, x: number, y: number) {
  const limit = 2 ** zoom;
  if (!Number.isInteger(zoom) || zoom < 1 || zoom > 17 ||
    !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= limit || y >= limit)
    throw new Error('Invalid basemap tile.');
  return { uri: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, headers: tileHeaders };
}
export function isTileAccessBlocked(error: string): boolean {
  return /(?:\bHTTP|\bstatus(?:\s*code)?|\bresponse(?:\s+code)?)\s*[:=]?\s*403\b|forbidden|access\s+blocked/i.test(error);
}
