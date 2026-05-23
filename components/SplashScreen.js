import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Text,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Partículas flotantes
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: 2 + Math.random() * 4,
  duration: 3000 + Math.random() * 4000,
  delay: Math.random() * 2000,
  opacity: 0.2 + Math.random() * 0.5,
}));

// Líneas de datos (efecto matrix/tech)
const DATA_LINES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: (i / 8) * width + Math.random() * 30,
  delay: i * 180,
  height: 40 + Math.random() * 80,
  opacity: 0.08 + Math.random() * 0.12,
}));

function Particle({ config }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: config.opacity,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -30,
            duration: config.duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: config.x,
        top: config.y,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: '#63ff15',
        opacity,
        transform: [{ translateY }],
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      }}
    />
  );
}

function GlowRing({ size, delay, duration, opacity: baseOpacity }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: baseOpacity,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.7,
              useNativeDriver: true,
              easing: Easing.in(Easing.ease),
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: '#63ff15',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export default function SplashScreen({ onFinish }) {
  // Master animations
  const masterFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const pulseLogo = useRef(new Animated.Value(1)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const barGlow = useRef(new Animated.Value(0)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const bgGradientAnim = useRef(new Animated.Value(0)).current;
  const neonLine = useRef(new Animated.Value(0)).current;

  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'Entrenamiento con IA';

  useEffect(() => {
    // Typewriter effect
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) clearInterval(typeInterval);
    }, 60);

    // Main animation sequence
    Animated.sequence([
      // Phase 1: Entrada del logo
      Animated.parallel([
        Animated.timing(masterFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 14,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(bgGradientAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),

      // Phase 2: Glow del logo
      Animated.timing(logoGlow, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),

      // Phase 3: Texto aparece deslizándose
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: Subtítulo
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // Phase 5: Pulso del logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseLogo, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(pulseLogo, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
        { iterations: 2 }
      ),

      // Phase 6: Barra de carga
      Animated.parallel([
        Animated.timing(barProgress, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(barGlow, {
              toValue: 1,
              duration: 600,
              useNativeDriver: false,
            }),
            Animated.timing(barGlow, {
              toValue: 0.4,
              duration: 600,
              useNativeDriver: false,
            }),
          ]),
          { iterations: 2 }
        ),
        Animated.timing(neonLine, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
      ]),

      // Phase 7: Salida cinematográfica
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(exitScale, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]),
    ]).start(() => {
      if (onFinish) onFinish();
    });

    return () => clearInterval(typeInterval);
  }, []);

  const barWidth = barProgress.interpolate({
    inputRange: [0, 0.15, 0.5, 0.85, 1],
    outputRange: ['0%', '12%', '55%', '85%', '100%'],
  });

  const barShadowOpacity = barGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const glowCircleOpacity = logoGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
    >
      {/* Deep background radial glow */}
      <Animated.View
        style={[
          styles.backgroundGlow,
          { opacity: masterFade },
        ]}
      />

      {/* Corner accent lines */}
      <View style={[styles.cornerLine, styles.cornerTL]} />
      <View style={[styles.cornerLine, styles.cornerTR, { transform: [{ rotate: '90deg' }] }]} />
      <View style={[styles.cornerLine, styles.cornerBL, { transform: [{ rotate: '-90deg' }] }]} />
      <View style={[styles.cornerLine, styles.cornerBR, { transform: [{ rotate: '180deg' }] }]} />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <Particle key={p.id} config={p} />
      ))}

      {/* Data line effects */}
      {DATA_LINES.map(line => (
        <View
          key={line.id}
          style={{
            position: 'absolute',
            left: line.x,
            bottom: 0,
            width: 1,
            height: line.height,
            backgroundColor: `rgba(99,255,21,${line.opacity})`,
          }}
        />
      ))}

      {/* Central content */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: masterFade,
            transform: [{ scale: exitScale }],
          },
        ]}
      >
        {/* Pulsing glow rings */}
        <GlowRing size={320} delay={0}    duration={2200} opacity={0.25} />
        <GlowRing size={260} delay={700}  duration={2200} opacity={0.35} />
        <GlowRing size={200} delay={1400} duration={2200} opacity={0.45} />

        {/* Glow circle under logo */}
        <Animated.View
          style={[
            styles.glowCircle,
            { opacity: glowCircleOpacity },
          ]}
        />

        {/* Logo wrapper with pulse */}
        <Animated.View
          style={{
            transform: [{ scale: logoScale }, { scale: pulseLogo }],
          }}
        >
          {/* Outer border gradient box */}
          <LinearGradient
            colors={['#63ff15', '#00D1FF', '#63ff15']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradientBorder}
          >
            <LinearGradient
              colors={['#111111', '#0A0A0A']}
              style={styles.logoInnerBox}
            >
              {/* Logo letter */}
              <Text style={styles.logoLetter}>N</Text>
              {/* Inner accent lines */}
              <View style={styles.logoAccentH} />
              <View style={styles.logoAccentV} />
            </LinearGradient>
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Brand text */}
      <Animated.View
        style={[
          styles.brandContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textSlide }],
          },
        ]}
      >
        <Text style={styles.brandName}>NEXUS</Text>
        <View style={styles.brandRow}>
          <View style={styles.brandLine} />
          <Text style={styles.brandSub}>ATHLETICS</Text>
          <View style={styles.brandLine} />
        </View>
      </Animated.View>

      {/* Typewriter subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={styles.subtitle}>
          {displayedText}
          <Text style={styles.cursor}>|</Text>
        </Text>
      </Animated.View>

      {/* Loading section */}
      <View style={styles.loadingSection}>
        {/* Progress label */}
        <View style={styles.loadingHeader}>
          <Text style={styles.loadingLabel}>INICIANDO SISTEMA</Text>
          <Animated.Text
            style={[
              styles.loadingPercent,
              {
                opacity: barProgress.interpolate({
                  inputRange: [0, 0.1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            {/* percent computed from barProgress */}
          </Animated.Text>
        </View>

        {/* Bar track */}
        <View style={styles.barTrack}>
          {/* Glowing fill */}
          <Animated.View style={[styles.barFill, { width: barWidth }]}>
            <LinearGradient
              colors={['#63ff15', '#00ffcc', '#00D1FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Shimmer highlight */}
            <Animated.View
              style={[
                styles.barShimmer,
                { opacity: barShadowOpacity },
              ]}
            />
            {/* Leading dot */}
            <View style={styles.barLeadDot} />
          </Animated.View>
        </View>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {[0, 0.33, 0.66].map((threshold, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: barProgress.interpolate({
                    inputRange: [threshold, threshold + 0.01],
                    outputRange: ['rgba(99,255,21,0.2)', '#63ff15'],
                    extrapolate: 'clamp',
                  }),
                  shadowOpacity: barProgress.interpolate({
                    inputRange: [threshold, threshold + 0.01],
                    outputRange: [0, 0.8],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>NEXUS PERFORMANCE SYSTEM</Text>
        <Text style={styles.footerVersion}>v2.0</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Background effects
  backgroundGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'transparent',
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 120,
    top: height * 0.5 - width * 0.75,
    left: width * 0.5 - width * 0.75,
  },

  // Corner decorative lines
  cornerLine: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(99,255,21,0.3)',
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTL: { top: 48, left: 24 },
  cornerTR: { top: 48, right: 24 },
  cornerBL: { bottom: 48, left: 24 },
  cornerBR: { bottom: 48, right: 24 },

  // Center content (logo area)
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#63ff15',
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
    elevation: 30,
  },

  // Logo
  logoGradientBorder: {
    width: 144,
    height: 144,
    borderRadius: 38,
    padding: 2,
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 20,
  },
  logoInnerBox: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoLetter: {
    fontSize: 68,
    fontWeight: '900',
    color: '#63ff15',
    letterSpacing: 2,
    textShadowColor: 'rgba(99,255,21,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  logoAccentH: {
    position: 'absolute',
    bottom: 22,
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(99,255,21,0.25)',
  },
  logoAccentV: {
    position: 'absolute',
    right: 22,
    height: '60%',
    width: 1,
    backgroundColor: 'rgba(99,255,21,0.25)',
  },

  // Brand text
  brandContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 14,
    textShadowColor: 'rgba(99,255,21,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLine: {
    width: 28,
    height: 1,
    backgroundColor: '#63ff15',
    opacity: 0.6,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#63ff15',
    letterSpacing: 5,
  },

  // Typewriter subtitle
  subtitle: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 60,
    marginTop: 6,
  },
  cursor: {
    color: '#63ff15',
    fontWeight: '300',
  },

  // Loading section
  loadingSection: {
    position: 'absolute',
    bottom: 100,
    width: '70%',
    alignItems: 'center',
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  loadingLabel: {
    fontSize: 9,
    color: '#52525B',
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingPercent: {
    fontSize: 9,
    color: '#63ff15',
    fontWeight: '700',
    letterSpacing: 1,
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(99,255,21,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(99,255,21,0.12)',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  barShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  barLeadDot: {
    position: 'absolute',
    right: -2,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#63ff15',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerText: {
    fontSize: 9,
    color: '#3F3F46',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  footerVersion: {
    fontSize: 9,
    color: 'rgba(99,255,21,0.3)',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
