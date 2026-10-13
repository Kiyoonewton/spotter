import { useMapGestures } from '../hooks/useMapGestures';
import { mapHit, anchoredPan } from '../lib/map-interaction';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BasemapTile } from './BasemapTile';
import { useMemo, useState } from 'react';
import { View, Linking, Modal, StyleSheet, Keyboard } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { Button, Card, Checkbox, Text } from 'react-native-paper';
import type { Route } from '../services/types';
import { fitRoutes, viewport, visibleTiles, ownedSegments, validCoordinate, RISK_COLOURS, MAP_WIDTH, MAP_HEIGHT } from '../lib/geographic-map';
export function MobileRouteMap({ routes, selected, checkpoint, onRoute, onCheckpoint, fullscreen = false, accessBlocked = false, initialHeatmap = false, onHeatmapChange }: {
  initialHeatmap?: boolean; onHeatmapChange?: (value: boolean) => void; fullscreen?: boolean; accessBlocked?: boolean; routes: readonly Route[]; selected: string; checkpoint: number;
  onRoute: (id: string) => void; onCheckpoint: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [heatmap, setHeatmap] = useState(initialHeatmap);
  const [blocked, setBlocked] = useState(accessBlocked);
  const [retry, setRetry] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(accessBlocked);
  const fit = useMemo(() => fitRoutes(routes), [routes]);
  const view = fit ? viewport(fit, zoom, pan) : null;
  const gesture = useMapGestures({ zoom, pan, fitZoom: fit?.zoom ?? 1, width, onZoom: setZoom, onPan: next => setPan(previous => previous.x === next.x && previous.y === next.y ? previous : next),
    onTap: (x, y) => {
      if (!view || width <= 0) return;
      const hit = mapHit(routes, selected, view, width, x, y);
      if (hit && typeof hit.checkpoint === 'number') onCheckpoint(hit.checkpoint);
      else if (hit && typeof hit.route === 'string') onRoute(hit.route);
    } });
  if (!fit || !view) return <Text>Geographic route map unavailable for this analysis. Route and checkpoint details remain available.</Text>;
  const route = routes.find(item => item.id === selected);
  const changeZoom = (delta: number) => {
    const next = Math.max(1 - fit.zoom, Math.min(17 - fit.zoom, zoom + delta));
    if (next === zoom) return;
    setPan(value => anchoredPan(value, next - zoom, { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 })); setZoom(next);
  };
  const ordered = [...routes].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));
  const points = (segment: ReturnType<typeof ownedSegments>[number]) => segment.coordinates.map(coordinate => {
    const point = view.point(coordinate); return `${point.x},${point.y}`;
  }).join(' ');
  return <><Card><Card.Content style={{ gap: 10 }}>
    <Text variant="titleLarge" accessibilityRole="header">Route map</Text>
    <Text>Viewing Route {routes.findIndex(item => item.id === selected) + 1} · checkpoint {checkpoint + 1}</Text>
    {!fullscreen && <Button mode="outlined" onPress={() => { Keyboard.dismiss(); setExpanded(true); }}>Expand interactive map</Button>}
    {fullscreen && <Text>Drag to pan. Pinch to zoom. Tap a route or checkpoint.</Text>}
    <Checkbox.Item label="Corridor risk heatmap" status={heatmap ? 'checked' : 'unchecked'} onPress={() => { const value = !heatmap; setHeatmap(value); onHeatmapChange?.(value); }} />
    {tilesFailed && <Text accessibilityRole="alert">{blocked
      ? 'OpenStreetMap access is blocked (403). Route lines remain visible. Check the tile service or network before retrying.'
      : 'Basemap tiles unavailable. Route lines remain visible.'}</Text>}
    {tilesFailed && <Button onPress={() => { setBlocked(false); setTilesFailed(false); setRetry(value => value + 1); }}>Retry basemap</Button>}
    <View testID="map-viewport" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: MAP_WIDTH / MAP_HEIGHT, overflow: 'hidden', backgroundColor: '#EDF1F4', borderRadius: 12 }}>
      {width > 0 && !blocked && visibleTiles(view).map(tile => <BasemapTile key={`${retry}-${tile.key}`}
        zoom={view.zoom} x={tile.x} y={tile.y} left={tile.left * width / MAP_WIDTH} top={tile.top * width / MAP_WIDTH}
        size={256 * width / MAP_WIDTH} onFailure={accessBlocked => { setTilesFailed(true); if (accessBlocked) setBlocked(true); }} />)}
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
      {fullscreen && <View testID="map-gestures" {...gesture.panHandlers} style={StyleSheet.absoluteFill} importantForAccessibility="no" />}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <Button accessibilityLabel="Zoom in map" onPress={() => changeZoom(1)}>Zoom in</Button>
      <Button accessibilityLabel="Zoom out map" onPress={() => changeZoom(-1)}>Zoom out</Button>
      <Button onPress={() => { setZoom(0); setPan({ x: 0, y: 0 }); }}>Fit routes</Button>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{Object.entries(RISK_COLOURS).map(([risk, color]) => <Text key={risk} style={{ color }}>● {risk}</Text>)}</View>
    <Button onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {}); }}>© OpenStreetMap contributors</Button>
    <Text>{fullscreen ? 'Arrival-time risk · Unknown unfilled · Not live GPS.' : 'Corridor heatmap uses arrival-time segment risk; its width and smoothing are visual only. Unknown segments have no heat fill. No radar, weather coverage outside the route, or live GPS is implied.'}</Text>
  </Card.Content></Card>
  {!fullscreen && expanded && <Modal visible animationType="none" onRequestClose={() => setExpanded(false)}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F4EE', padding: 12 }}>
      <Button onPress={() => setExpanded(false)}>Close map</Button>
      <MobileRouteMap fullscreen initialHeatmap={heatmap} onHeatmapChange={setHeatmap} accessBlocked={blocked} routes={routes} selected={selected} checkpoint={checkpoint} onRoute={onRoute} onCheckpoint={onCheckpoint} />
    </SafeAreaView>
  </Modal>}
  </>;
}
