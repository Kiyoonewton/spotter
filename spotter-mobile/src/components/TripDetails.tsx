import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';
import type { TripAnalysis } from '../services/types';
const measure = (value: number | null | undefined, unit: string) =>
  value == null ? 'Unavailable' : `${value.toFixed(2)} ${unit}`;
export function TripDetails({ trip }: { trip: TripAnalysis }) {
  const [selected, setSelected] = useState(trip.recommendation.recommended_route_id ?? trip.routes[0].id);
  const [index, setIndex] = useState(0);
  const route = trip.routes.find(r => r.id === selected) ?? trip.routes[0];
  const checkpoint = route.checkpoints[index] ?? route.checkpoints[0];
  const timezone = trip.applied_request.departure_timezone;
  const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
  return <View style={{ gap: 16 }}>
    <Card><Card.Content style={{ gap: 8 }}>
      <Text variant="headlineSmall">{trip.applied_request.origin} → {trip.applied_request.destination}</Text>
      <Chip>{trip.data_source === 'demo' ? 'Demo · illustrative data' : (trip.snapshot ? 'Saved live analysis' : 'Live analysis')}</Chip>
      <Text>Departure: {formatTime(trip.applied_request.departure_at)} ({timezone})</Text>
      <Text>Cargo: {trip.applied_request.load_weight_lb.toLocaleString()} lb</Text>
      {trip.snapshot && <Text>Saved: {formatTime(trip.snapshot.created_at)}</Text>}
      {trip.snapshot && <Text>Link expires: {formatTime(trip.snapshot.expires_at)}</Text>}
      <Text>Weather reflects the analysis time. Recheck conditions before departure.</Text>
    </Card.Content></Card>
    <Card><Card.Content style={{ gap: 8 }}>
      <Text variant="titleLarge">{trip.recommendation.recommended_route_id === null ?
        'No recommended route' : 'Backend recommendation'}</Text>
      <Text>{trip.recommendation.explanation}</Text>
      {trip.routing_profile_notice && <Text>{trip.routing_profile_notice}</Text>}
    </Card.Content></Card>
    <Text variant="titleLarge" accessibilityRole="header">Routes</Text>
    {trip.routes.map((item, ordinal) => <Card key={item.id}>
      <Card.Content style={{ gap: 8 }}>
        <Text variant="titleMedium">Route {ordinal + 1}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip>{item.eligibility}</Chip>
          {trip.recommendation.recommended_route_id === item.id && <Chip>Recommended</Chip>}
        </View>
        <Text>{item.distance_miles.toFixed(1)} mi · {Math.round(item.duration_minutes)} min</Text>
        <Text>Average risk: {item.average_risk === null ? 'Unavailable' : item.average_risk.toFixed(2)}</Text>
        {item.routing_notice && <Text>{item.routing_notice}</Text>}
        {item.timing_notice && <Text>{item.timing_notice}</Text>}
      </Card.Content>
      <Card.Actions><Button mode={selected === item.id ? 'contained' : 'outlined'}
        accessibilityLabel={`Inspect Route ${ordinal + 1}`} onPress={() => { setSelected(item.id); setIndex(0); }}>
        {selected === item.id ? 'Selected' : 'Inspect checkpoints'}
      </Button></Card.Actions>
    </Card>)}
    <Card><Card.Content style={{ gap: 10 }}>
      <Text variant="titleLarge" accessibilityRole="header">Route {trip.routes.indexOf(route) + 1} · Checkpoint {index + 1}</Text>
      <Text>{checkpoint.distance_from_origin_miles.toFixed(1)} mi from origin</Text>
      <Text>Estimated arrival: {formatTime(checkpoint.arrival_at)} ({timezone})</Text>
      <Chip>{checkpoint.risk}</Chip><Divider />
      <Text>Wind: {measure(checkpoint.weather?.wind_mph, 'mph')}</Text>
      <Text>Rain: {measure(checkpoint.weather?.rain_in_hr, 'in/hr')}</Text>
      <Text>Snow: {measure(checkpoint.weather?.snow_in_hr, 'in/hr')}</Text>
      {checkpoint.reasons.map((reason, i) => <Text key={i}>{reason.explanation}</Text>)}
    </Card.Content><Card.Actions>
      <Button disabled={index === 0} accessibilityLabel="Previous checkpoint" onPress={() => setIndex(i => i - 1)}>Previous</Button>
      <Button disabled={index >= route.checkpoints.length - 1} accessibilityLabel="Next checkpoint" onPress={() => setIndex(i => i + 1)}>Next</Button>
    </Card.Actions></Card>
    <Text>This companion is a saved itinerary viewer. It provides no GPS, navigation, offline access, or hours-of-service calculation.</Text>
  </View>;
}
