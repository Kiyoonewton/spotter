import { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
export default function WelcomeScreen() {
  // Start static until the OS motion preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; listener.remove(); };
  }, []);
  const animate = !reduceMotion && !paused;
  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleLarge" style={styles.light}>WAYCAST / DRIVER</Text>
      <View style={styles.visual}>
        <Image key={animate ? 'motion' : 'still'} testID="welcome-image"
          source={animate ? require('../../assets/truck-intro.gif') : require('../../assets/truck-intro-static.svg')}
          autoplay={animate} contentFit="cover" style={StyleSheet.absoluteFill}
          accessibilityLabel="Illustration of a truck journey" />
      </View>
      <Text variant="displaySmall" accessibilityRole="header" style={styles.light}>A clearer road ahead.</Text>
      <Text variant="bodyLarge" style={styles.description}>Take your saved route and weather briefing with you. Know the checkpoints before you set off.</Text>
      <Button mode="contained" buttonColor="#B8F0DD" textColor="#073C33"
        contentStyle={{ minHeight: 52 }} onPress={() => router.replace('/trip')}>Open saved trip</Button>
      {!reduceMotion && <Button textColor="#E1F1E9" onPress={() => setPaused(value => !value)}>
        {paused ? 'Play illustration' : 'Pause illustration'}
      </Button>}
      <Text style={styles.caption}>Illustration only. Saved forecasts are not live navigation.</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#073C33' },
  content: { flexGrow: 1, padding: 24, gap: 24, justifyContent: 'center' },
  visual: { width: '100%', aspectRatio: 1.2, borderRadius: 28, overflow: 'hidden', backgroundColor: '#164E43' },
  light: { color: '#FFFEFA' },
  description: { color: '#E1F1E9', lineHeight: 26 },
  caption: { color: '#C3D9CD' },
});
