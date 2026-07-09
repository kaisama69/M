import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, SharedStyles } from '../theme';

const TRACKS = [
  { id: '1', title: 'Rainforest Ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Placeholder streams
  { id: '2', title: 'Ocean Waves', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Tibetan Bowls', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const SoundscapePlayer = () => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadAndPlaySound = async (index) => {
    try {
      setLoading(true);
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: TRACKS[index].url },
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentTrackIndex(index);
      setLoading(false);
    } catch (error) {
      console.log('Error loading sound', error);
      setLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (!sound) {
      await loadAndPlaySound(currentTrackIndex);
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const nextTrack = async () => {
    const nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    await loadAndPlaySound(nextIndex);
  };

  return (
    <View style={[SharedStyles.card, styles.container]}>
      <View style={styles.trackInfo}>
        <FontAwesome5 name="music" size={16} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trackTitle}>{TRACKS[currentTrackIndex].title}</Text>
          <Text style={styles.trackSubtitle}>Ambient Soundscape Player</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.btn}
          onPress={togglePlayback}
          disabled={loading}
        >
          <FontAwesome5
            name={loading ? 'spinner' : isPlaying ? 'pause' : 'play'}
            size={18}
            color={Colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={nextTrack}
          disabled={loading}
        >
          <FontAwesome5 name="forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
  },
  trackSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SoundscapePlayer;
