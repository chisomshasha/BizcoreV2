import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/components/ThemedComponents';
import { useAuthStore } from '../../src/store/authStore';

const { width, height } = Dimensions.get('window');

const HEX_R    = 110;
const HEX_CX   = 150;
const HEX_CY   = 150;
const HEX_SIZE = 300;
const CHIP_W   = 88;
const CHIP_H   = 28;

const toRad = (d: number) => (d * Math.PI) / 180;

const ANGLES = [90, 30, 330, 270, 210, 150];
const VERTICES = ANGLES.map(deg => ({
  x: HEX_CX + HEX_R * Math.cos(toRad(deg)),
  y: HEX_CY - HEX_R * Math.sin(toRad(deg)),
}));

const FEATURES = [
  { label: 'Inventory',   color: '#6366F1', icon: 'cube-outline' },
  { label: 'Orders',      color: '#22C55E', icon: 'cart-outline' },
  { label: 'Partners',    color: '#F59E0B', icon: 'people-outline' },
  { label: 'Finance',     color: '#EC4899', icon: 'wallet-outline' },
  { label: 'Reports',     color: '#06B6D4', icon: 'stats-chart-outline' },
  { label: 'Procurement', color: '#8B5CF6', icon: 'receipt-outline' },
];

const EDGES = [
  { left: 142.65, top: 66.5,  angle: '30deg' },
  { left: 190.3,  top: 149.0, angle: '90deg' },
  { left: 142.65, top: 231.5, angle: '150deg' },
  { left: 47.35,  top: 231.5, angle: '210deg' },
  { left: -0.3,   top: 149.0, angle: '-90deg' },
  { left: 47.35,  top: 66.5,  angle: '-30deg' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orb1Anim  = useRef(new Animated.Value(0)).current;
  const orb2Anim  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(orb1Anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.timing(orb1Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(orb2Anim, { toValue: 1, duration: 5500, useNativeDriver: true }),
      Animated.timing(orb2Anim, { toValue: 0, duration: 5500, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)');
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) { setError('Please enter your username or email.'); return; }
    if (!password)         { setError('Please enter your password.');         return; }
    setError(null);
    setIsLoading(true);
    try {
      await login(trimmedUsername, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const orb1Y       = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const orb2Y       = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0,  22] });
  const edgeOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#06060E', '#0D0D1C', '#06060E']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Y }] }]}>
        <LinearGradient colors={['#6366F155', '#6366F100']} style={styles.orbFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Y }] }]}>
        <LinearGradient colors={['#06B6D433', '#06B6D400']} style={styles.orbFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── Tagline ── */}
            <View style={styles.taglineRow}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Enterprise Resource Planning</Text>
              <View style={styles.taglineLine} />
            </View>

            {/* ── Hex diagram ── */}
            <View style={styles.hexContainer}>
              {EDGES.map((e, i) => (
                <Animated.View
                  key={`edge-${i}`}
                  style={[styles.hexEdge, { left: e.left, top: e.top, opacity: edgeOpacity, transform: [{ rotate: e.angle }] }]}
                />
              ))}
              {VERTICES.map((v, i) => {
                const dx    = v.x - HEX_CX;
                const dy    = v.y - HEX_CY;
                const spoke = Math.sqrt(dx * dx + dy * dy) * 0.42;
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const midX  = HEX_CX + dx * 0.21;
                const midY  = HEX_CY + dy * 0.21;
                return (
                  <Animated.View
                    key={`spoke-${i}`}
                    style={[styles.spoke, { left: midX - spoke / 2, top: midY - 0.5, width: spoke, opacity: edgeOpacity, transform: [{ rotate: `${angle}deg` }] }]}
                  />
                );
              })}
              {FEATURES.map((f, i) => {
                const v = VERTICES[i];
                return (
                  <View
                    key={f.label}
                    style={[styles.chip, { left: v.x - CHIP_W / 2, top: v.y - CHIP_H / 2, borderColor: `${f.color}55`, backgroundColor: `${f.color}15` }]}
                  >
                    <Ionicons name={f.icon as any} size={11} color={f.color} />
                    <Text style={[styles.chipLabel, { color: f.color }]}>{f.label}</Text>
                  </View>
                );
              })}
              <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <Animated.View style={[styles.glowRing, { opacity: edgeOpacity }]} />
                <Image
                  source={require('../../assets/images/bizcore_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            {/* ── Login form ── */}
            <View style={styles.formSection}>

              {/* Error banner */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Username field */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBox}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Username or email"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  value={username}
                  onChangeText={setUsername}
                  editable={!isLoading}
                />
              </View>

              {/* Password field */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign-in button */}
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isLoading ? ['#1C1C2E', '#1C1C2E'] : ['#6366F1', '#4F46E5']}
                  style={styles.loginBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <LinearGradient
                colors={['transparent', '#6366F155', 'transparent']}
                style={styles.accentLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.disclaimer}>
                Secure sign-in · Your data is encrypted and protected
              </Text>
            </View>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#06060E' },
  safe:           { flex: 1 },
  scroll:         { flexGrow: 1 },
  content:        { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingVertical: 20 },
  orb1:           { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, overflow: 'hidden' },
  orb2:           { position: 'absolute', bottom: 60, left: -100, width: 260, height: 260, borderRadius: 130, overflow: 'hidden' },
  orbFill:        { flex: 1 },

  taglineRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  taglineLine:    { flex: 1, height: 1, backgroundColor: '#2A2A3E' },
  tagline:        { fontSize: 12, color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },

  hexContainer:   { width: HEX_SIZE, height: HEX_SIZE, alignSelf: 'center', position: 'relative' },
  hexEdge:        { position: 'absolute', width: HEX_R, height: 1.5, backgroundColor: '#6366F1', borderRadius: 1 },
  spoke:          { position: 'absolute', height: 1, backgroundColor: '#6366F144', borderRadius: 1 },
  chip:           { position: 'absolute', width: CHIP_W, height: CHIP_H, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  chipLabel:      { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  logoWrapper:    { position: 'absolute', left: HEX_CX - 58, top: HEX_CY - 58, width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  glowRing:       { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1, borderColor: '#6366F166', backgroundColor: '#6366F108' },
  logoImage:      { width: 90, height: 90 },

  formSection:    { gap: 12, paddingBottom: 8 },

  errorBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.danger}15`, borderWidth: 1, borderColor: `${Colors.danger}40`, padding: 12, borderRadius: 12, gap: 8 },
  errorText:      { color: Colors.danger, fontSize: 13, flex: 1 },

  inputWrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C2E', borderRadius: 14, borderWidth: 1, borderColor: '#2A2A3E', overflow: 'hidden' },
  inputIconBox:   { width: 46, alignItems: 'center', justifyContent: 'center' },
  input:          { flex: 1, height: 52, color: '#FFFFFF', fontSize: 15, paddingRight: 12 },
  eyeBtn:         { paddingHorizontal: 14 },

  loginBtn:       { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  loginBtnInner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  loginBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  accentLine:     { height: 1, marginHorizontal: 32, marginTop: 4 },
  disclaimer:     { fontSize: 12, color: Colors.textMuted, textAlign: 'center', letterSpacing: 0.2, paddingBottom: 4 },
});
