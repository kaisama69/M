import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, SharedStyles } from '../theme';
import { API_BASE_URL } from '../config';
import Header from '../components/Header';

const ChatbotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! I am your MindScale AI companion. How are you feeling right now?', sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.text })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm sorry, I couldn't understand that.",
        sender: 'bot'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <FontAwesome5 name="robot" size={12} color={Colors.white} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.botContent]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Header title="AI Companion" subtitle="Always here to listen" />
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.chatArea} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <FontAwesome5 name="paper-plane" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 20,
    paddingBottom: 40,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
    flexShrink: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexShrink: 1,
  },
  userContent: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  botContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  messageText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  botText: {
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textPrimary,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
});

export default ChatbotScreen;
