import { useState } from 'react';
import { View, Image as NativeImage, Linking } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { Button, Card, Checkbox, Text } from 'react-native-paper';
import type { Route } from '../services/types';
import { fitRoutes, viewport, visibleTiles, ownedSegments, validCoordinate, RISK_COLOURS, MAP_WIDTH, MAP_HEIGHT } from '../lib/geographic-map';
export function MobileRouteMap({ routes, selected, checkpoint, onRoute, onCheckpoint }: {
  routes: readonly Route[]; selected: string; checkpoint: number;
  onRoute: (id: string) => void; onCheckpoint: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [heatmap, setHeatmap] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const fit = fitRoutes(routes);
  if (!fit) return <Text>Geographic route map unavailable for this analysis. Route and checkpoint details remain available.</Text>;
  const view = viewport(fit, zoom, { x: 0, y: 0 });
  const route = routes.find(item => item.id === selected);
  const ordered = [...routes].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));
  const points = (segment: ReturnType<typeof ownedSegments>[number]) => segment.coordinates.map(coordinate => {
    const point = view.point(coordinate); return `${point.x},${point.y}`;
  }).join(' ');
  return <Card><Card.Content style={{ gap: 10 }}>
    <Text variant="titleLarge" accessibilityRole="header">Route map</Text>
    <Checkbox.Item label="Corridor risk heatmap" status={heatmap ? 'checked' : 'unchecked'} onPress={() => setHeatmap(value => !value)} />
    {tilesFailed && <Text>Basemap tiles unavailable. Route lines remain visible.</Text>}
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: MAP_WIDTH / MAP_HEIGHT, overflow: 'hidden', backgroundColor: '#EDF1F4', borderRadius: 12 }}>
      {width > 0 && visibleTiles(view).map(tile => <NativeImage key={`${view.zoom}-${tile.left}-${tile.top}`} source={{ uri: `https://tile.openstreetmap.org/${view.zoom}/${tile.x}/${tile.y}.png`, headers: { 'User-Agent': 'WaycastDriver/0.1 (https://spotter.kiyoo.online)' } }} style={{ position: 'absolute', left: tile.left * width / MAP_WIDTH, top: tile.top * width / MAP_WIDTH, width: 256 * width / MAP_WIDTH, height: 256 * width / MAP_WIDTH }} onError={() => setTilesFailed(true)} />)}
      <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} accessibilityLabel="Geographic routes and checkpoints">
        {heatmap && ordered.flatMap(item => ownedSegments(item).filter(segment => segment.risk !== 'Unknown' && Boolean(RISK_COLOURS[segment.risk])).map(segment =>
          <G key={`heat-${segment.id}`} testID="corridor-risk-heat" pointerEvents="none">
            {[{ width: 44, opacity: 0.12 }, { width: 28, opacity: 0.18 }].map(layer => <Polyline key={layer.width} points={points(segment)} fill="none" stroke={RISK_COLOURS[segment.risk] ?? RISK_COLOURS.Unknown} strokeWidth={layer.width} strokeOpacity={layer.opacity} strokeLinecap="round" strokeLinejoin="round" />)}
          </G>))}
        {ordered.flatMap(item => ownedSegments(item).map(segment => <Polyline key={segment.id} points={points(segment)} fill="none"
          stroke={RISK_COLOURS[segment.risk] ?? RISK_COLOURS.Unknown} strokeWidth={item.id === selected ? 8 : 5}
          strokeDasharray={segment.risk === 'Unknown' ? '8 5' : undefined} strokeLinecap="round"
          accessibilityLabel={`Inspect Route ${routes.indexOf(item) + 1}`} onPress={() => onRoute(item.id)} />))}
        {route?.checkpoints.map((point, index) => {
          if (point.route_id !== route.id || !validCoordinate(point.coordinates)) return null;
          const projected = view.point(point.coordinates);
          return <Circle key={point.id} cx={projected.x} cy={projected.y} r={index === checkpoint ? 10 : 7}
            fill={RISK_COLOURS[point.risk] ?? RISK_COLOURS.Unknown} stroke="white" strokeWidth={3}
            accessibilityLabel={`Inspect checkpoint ${index + 1}`} onPress={() => onCheckpoint(index)} />;
        })}
      </Svg>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <Button accessibilityLabel="Zoom in map" onPress={() => setZoom(value => Math.min(17 - fit.zoom, value + 1))}>Zoom in</Button>
      <Button accessibilityLabel="Zoom out map" onPress={() => setZoom(value => Math.max(1 - fit.zoom, value - 1))}>Zoom out</Button>
      <Button onPress={() => setZoom(0)}>Fit routes</Button>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{Object.entries(RISK_COLOURS).map(([risk, color]) => <Text key={risk} style={{ color }}>● {risk}</Text>)}</View>
    <Button onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {}); }}>© OpenStreetMap contributors</Button>
    <Text> Corridor heatmap uses arrival-time segment risk; its width and smoothing are visual only. Unknown segments have no heat fill. No radar, weather coverage outside the route, or live GPS is implied.</Text>
  </Card.Content></Card>;
}
