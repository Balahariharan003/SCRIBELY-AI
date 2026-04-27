
import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[
            styles.logo,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
          resizeMode="contain"
        />
      </View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerLabel}>from</Text>
        <Text style={styles.footerBrand}>TECH CHUNKERS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Sleek dark background
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60, // Pushes logo up slightly
  },
  logo: {
    width: 180,
    height: 180,
  },
  footer: {
    position: 'absolute',
    bottom: 80, // Moved up from 50
    alignItems: 'center',
  },
  footerLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 1,
  },
  footerBrand: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
});
