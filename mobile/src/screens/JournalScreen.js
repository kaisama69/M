import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Colors, FontFamily, SharedStyles, CLASS_META } from '../theme';
import { api } from '../config';
import Header from '../components/Header';
import Toast from '../components/Toast';

const MOOD_EMOJIS = [
  { rating: 1, emoji: '😞', label: 'Very Low' },
  { rating: 2, emoji: '🙁', label: 'Low' },
  { rating: 3, emoji: '😐', label: 'Okay' },
  { rating: 4, emoji: '😊', label: 'Good' },
  { rating: 5, emoji: '😁', label: 'Great' },
];

const AVAILABLE_TAGS = ['#Work', '#Sleep', '#Exercise', '#Relationships', '#Stress', '#Gratitude'];

const GUIDED_PROMPTS = [
  "What is 1 thing that brought you peace today?",
  "What triggered your stress today, and how did you handle it?",
  "List 3 small things you are grateful for right now.",
  "How did you take care of your physical & mental health today?",
  "What is one win, no matter how small, that you accomplished today?"
];

const JournalScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [moodRating, setMoodRating] = useState(3);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const isFocused = useIsFocused();

  // Re-fetch history when the tab comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchHistory();
    }
  }, [isFocused]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const getUserId = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('mindscale_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user?.id ? user.id.toString() : null;
    } catch (e) {
      console.log('Error getting user id', e);
      return null;
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setHistoryLoading(false);
        return;
      }

      const response = await fetch(api('/api/history'), {
        headers: {
          'X-User-ID': userId,
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('mindscale_user');
        return;
      }

      if (!response.ok) throw new Error('Failed to retrieve history logs.');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      showToast('Could not fetch logs history.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const setRandomPrompt = () => {
    const prompt = GUIDED_PROMPTS[Math.floor(Math.random() * GUIDED_PROMPTS.length)];
    setText(prompt + "\n");
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const response = await fetch(api(`/api/journal/${entryId}`), {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });

      if (response.ok) {
        showToast('Journal entry deleted successfully.', 'success');
        setHistory(prev => prev.filter(item => item.id !== entryId));
      } else {
        const errData = await response.json();
        showToast(errData.error || 'Failed to delete entry.', 'error');
      }
    } catch (e) {
      showToast('Error deleting journal entry.', 'error');
    }
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setLoading(true);
    setResult(null);

    try {
      const userId = await getUserId();
      if (!userId) {
        showToast('Please log in again.', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({ 
          text: trimmedText,
          mood_rating: moodRating,
          tags: selectedTags.join(',')
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed.');
      }

      const data = await response.json();
      setResult(data);
      setText('');
      setSelectedTags([]);
      setMoodRating(3);
      showToast('Reflection logged and analyzed successfully!', 'success');
      fetchHistory();
    } catch (error) {
      showToast(error.message || 'Error occurred during analysis.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dbDateString) => {
    try {
      const formattedStr = dbDateString.replace(' ', 'T');
      const d = new Date(formattedStr);
      if (isNaN(d.getTime())) return dbDateString;
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (e) {
      return dbDateString;
    }
  };

  const getSentimentStyle = (sentiment) => {
    return CLASS_META[sentiment] || CLASS_META['Normal'];
  };

  const resultMeta = result ? getSentimentStyle(result.sentiment) : null;

  return (
    <View style={SharedStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={SharedStyles.screenScroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Header />

        {/* Input Area */}
        <View style={[SharedStyles.card, { marginBottom: 20 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>How are you feeling?</Text>
            <TouchableOpacity style={styles.promptBtn} onPress={setRandomPrompt}>
              <FontAwesome5 name="lightbulb" size={12} color={Colors.primary} />
              <Text style={styles.promptBtnText}>Prompt</Text>
            </TouchableOpacity>
          </View>

          {/* Mood Emoji Rating Selector */}
          <Text style={styles.sectionSubLabel}>1-5 Mood Scale</Text>
          <View style={styles.emojiRow}>
            {MOOD_EMOJIS.map((m) => (
              <TouchableOpacity
                key={m.rating}
                style={[
                  styles.emojiBtn,
                  moodRating === m.rating && styles.emojiBtnSelected
                ]}
                onPress={() => setMoodRating(m.rating)}
              >
                <Text style={styles.emojiIcon}>{m.emoji}</Text>
                <Text style={[styles.emojiLabel, moodRating === m.rating && { color: Colors.primary, fontFamily: FontFamily.bold }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tags Selector */}
          <Text style={styles.sectionSubLabel}>What influenced your mood?</Text>
          <View style={styles.tagsRow}>
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagPillText, isSelected && styles.tagPillTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.textareaContainer}>
            <TextInput
              style={styles.textarea}
              placeholder="Write your thoughts or journal entry..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={2000}
              value={text}
              onChangeText={setText}
            />
            <View style={styles.controlsRow}>
              <Text style={styles.charCount}>{text.length} / 2000</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loading || !text.trim()}>
            <LinearGradient
              colors={[Colors.primary, '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[SharedStyles.gradientBtn, (!text.trim() || loading) && { opacity: 0.5 }]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Log Mood & Analyze</Text>
                  <FontAwesome5 name="arrow-right" size={14} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Results Area */}
        {result && resultMeta && (
          <View style={[SharedStyles.card, { borderColor: resultMeta.color, marginBottom: 24 }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Analysis Result</Text>
              <View style={[SharedStyles.badge, { backgroundColor: `${resultMeta.color}20`, borderColor: resultMeta.color, borderWidth: 1 }]}>
                <FontAwesome5 name={resultMeta.icon} size={12} color={resultMeta.color} />
                <Text style={{ color: resultMeta.color, fontFamily: FontFamily.bold, fontSize: 13 }}>
                  {resultMeta.label}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceText}>Confidence</Text>
              <Text style={[styles.confidenceText, { color: Colors.textPrimary }]}>
                {Math.round(result.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(result.confidence * 100)}%`, backgroundColor: resultMeta.color },
                ]}
              />
            </View>

            <View style={[styles.recommendationCard, { backgroundColor: `${resultMeta.color}10`, borderColor: `${resultMeta.color}25` }]}>
              <Text style={[styles.recommendationLabel, { color: resultMeta.color }]}>
                Recommended Action
              </Text>
              <Text style={styles.recommendationText}>{result.recommendation}</Text>
            </View>

            {result.sentiment !== 'Normal' && (
              <TouchableOpacity
                style={styles.breathingRoomBtn}
                onPress={() => navigation.navigate('Breathing')}
              >
                <FontAwesome5 name="spa" size={14} color={Colors.primary} />
                <Text style={styles.breathingRoomText}>Feel stressed? Try a 1-min Breathing session</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reflections History */}
        <Text style={styles.historyTitle}>
          <FontAwesome5 name="history" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
          Recent Reflections
        </Text>

        {historyLoading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="folder-open" size={32} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No logs yet. Start typing above to log your first mood!</Text>
          </View>
        ) : (
          history.map((item) => {
            const itemStyle = getSentimentStyle(item.sentiment);
            return (
              <View key={item.id.toString()} style={styles.historyItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.historyText} numberOfLines={2}>
                    {item.raw_text}
                  </Text>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historySubtext}>
                      <FontAwesome5 name="calendar-alt" size={11} /> {formatDateTime(item.timestamp)}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[SharedStyles.badge, { backgroundColor: `${itemStyle.color}15` }]}>
                    <FontAwesome5 name={itemStyle.icon} size={11} color={itemStyle.color} />
                    <Text style={[styles.badgeText, { color: itemStyle.color }]}>
                      {itemStyle.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteEntry(item.id)}
                  >
                    <FontAwesome5 name="trash-alt" size={12} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Toast
        visible={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  textareaContainer: {
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    marginBottom: 16,
    padding: 12,
  },
  textarea: {
    height: 140,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    textAlignVertical: 'top',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  btnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidenceText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  progressBg: {
    height: 10,
    backgroundColor: Colors.overlayMedium,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  recommendationCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  recommendationLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  breathingRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 8,
    paddingVertical: 10,
  },
  breathingRoomText: {
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
    fontSize: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  historyItem: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  historySubtext: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(78, 140, 255, 0.1)',
    borderRadius: 12,
  },
  promptBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginLeft: 5,
  },
  sectionSubLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: 6,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emojiBtn: {
    alignItems: 'center',
    justify: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    width: '18%',
  },
  emojiBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(78, 140, 255, 0.15)',
  },
  emojiIcon: {
    fontSize: 22,
  },
  emojiLabel: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagPillText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  tagPillTextSelected: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  historyTagPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  historyTagText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});

export default JournalScreen;
