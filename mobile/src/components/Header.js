import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily } from '../theme';

const Header = ({ title = 'Welcome to MindScale', subtitle }) => {
  const [greeting, setGreeting] = useState(title);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    if (!subtitle) {
      const now = new Date();
      const hours = now.getHours();
      let newGreeting = 'Welcome to MindScale';

      if (hours < 12) newGreeting = 'Good Morning, Friend';
      else if (hours < 17) newGreeting = 'Good Afternoon, Friend';
      else if (hours < 22) newGreeting = 'Good Evening, Friend';
      else newGreeting = 'Rest Well, Friend';

      setGreeting(newGreeting);

      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setCurrentDate(`Today is ${now.toLocaleDateString('en-US', options)}`);
    } else {
      setGreeting(title);
      setCurrentDate(subtitle);
    }
  }, [title, subtitle]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{greeting}</Text>
      <Text style={styles.subtitle}>{currentDate}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
});

export default Header;
