import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/components/ThemedComponents';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';

const { width, height } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

// ─── Hexagon geometry ────────────────────────────────────────────────────────
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

// FIX: reads EXPO_PUBLIC_BACKEND_URL (set in .env); fallback now matches
// the actual Fly.io app name "bizcorev2" (no hyphen)
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bizcorev2.fly.dev';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

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

  // ─────────────────────────────────────────────────────────────────────────
  // handleDeepLink — useCallback so it can be called from handleGoogleLogin
  // AND from the Linking event listener (covers both Android paths).
  //
  // FIX: Supabase may deliver tokens as a hash fragment OR as query params
  // depending on the PKCE flow / redirect configuration.  We check both.
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('🔗 Deep link received:', url);
    if (hasProcessed.current) return;

    // --- parse tokens: try hash first, then query string ---
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let errorDescription: string | null = null;

    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const p = new URLSearchParams(url.substring(hashIndex + 1));
      accessToken      = p.get('access_token');
      refreshToken     = p.get('refresh_token');
      errorDescription = p.get('error_description');
    }

    // Fallback: tokens in query string (e.g. PKCE code exchange redirect)
    if (!accessToken) {
      const qIndex = url.indexOf('?');
      if (qIndex !== -1) {
        const p = new URLSearchParams(url.substring(qIndex + 1));
        accessToken      = p.get('access_token');
        refreshToken     = p.get('refresh_token');
        errorDescription = p.get('error_description');
      }
    }

    console.log('🔑 access_token present:', !!accessToken);
    console.log('🔄 refresh_token present:', !!refreshToken);
    if (errorDescription) console.warn('❌ OAuth error:', errorDescription);

    if (errorDescription) {
      setError(`Sign-in failed: ${decodeURIComponent(errorDescription)}`);
      setIsLoading(false);
      hasProcessed.current = false;
      return;
    }

    if (!accessToken || !refreshToken) {
      // URL arrived but had no tokens — not the callback we're waiting for
      return;
    }

    hasProcessed.current = true;
    setIsLoading(true);

    try {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;

      if (!data.session) throw new Error('No session returned from Supabase');

      console.log('✅ Supabase session set, verifying with backend...');
      console.log('🌐 Backend URL:', BACKEND_URL);

      const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Backend error ${verifyResponse.status}`);
      }

      const userData = await verifyResponse.json();
      await login(data.session.access_token, userData.user);
      console.log('✅ Login complete — navigating to dashboard');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      hasProcessed.current = false;
    }
  }, [login, router]);

  // Linking listener — covers cold-start and background deep links
  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => subscription.remove();
  }, [handleDeepLink]);

  // Already authenticated → go to dashboard immediately
  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)');
  }, [isAuthenticated, router]);

  // ─── Google OAuth entry point ─────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      console.log('🚀 Starting Google OAuth...');
      console.log('🌐 Using backend:', BACKEND_URL);
      setIsLoading(true);
      setError(null);
      hasProcessed.current = false;

      const redirectUrl = Linking.createURL('auth-callback', { scheme: 'bizcorev2' });
      console.log('📱 Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

      console.log('🌐 Opening browser for OAuth...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log('🌐 Browser result type:', result.type);

      if (result.type === 'success' && result.url) {
        // Primary path: browser closed with our redirect URL
        // On Android, Linking events often do NOT fire after openAuthSessionAsync —
        // result.url is the only reliable delivery mechanism.
        await handleDeepLink(result.url);
      } else if (result.type === 'cancel') {
        setError('Sign-in was cancelled');
        setIsLoading(false);
        hasProcessed.current = false;
      } else {
        // 'dismiss' — browser closed without completing the redirect.
        // Most common cause: bizcorev2://auth-callback is NOT listed in
        // Supabase dashboard → Authentication → URL Configuration → Redirect URLs.
        // Add it there, then rebuild.
        console.warn('⚠️ Browser dismissed without redirect. Check Supabase Redirect URLs.');
        setError('Sign-in did not complete. Ensure bizcorev2://auth-callback is added to your Supabase Redirect URLs.');
        setIsLoading(false);
        hasProcessed.current = false;
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
      hasProcessed.current = false;
    }
  };

  const orb1Y       = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const orb2Y       = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0,  22] });
  const edgeOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#06060E', '#0D0D1C', '#06060E']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Y }] }]}>
        <LinearGradient colors={['#6366F155', '#6366F100']} style={styles.orbFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Y }] }]}>
        <LinearGradient colors={['#06B6D433', '#06B6D400']} style={styles.orbFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.taglineRow}>
            <View style={styles.taglineLine} />
            <Text style={styles.tagline}>Enterprise Resource Planning</Text>
            <View style={styles.taglineLine} />
          </View>

          <View style={styles.hexContainer}>
            {EDGES.map((e, i) => (
              <Animated.View key={`edge-${i}`} style={[styles.hexEdge, { left: e.left, top: e.top, opacity: edgeOpacity, transform: [{ rotate: e.angle }] }]} />
            ))}
            {VERTICES.map((v, i) => {
              const dx    = v.x - HEX_CX;
              const dy    = v.y - HEX_CY;
              const spoke = Math.sqrt(dx * dx + dy * dy) * 0.42;
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const midX  = HEX_CX + dx * 0.21;
              const midY  = HEX_CY + dy * 0.21;
              return (
                <Animated.View key={`spoke-${i}`} style={[styles.spoke, { left: midX - spoke / 2, top: midY - 0.5, width: spoke, opacity: edgeOpacity, transform: [{ rotate: `${angle}deg` }] }]} />
              );
            })}
            {FEATURES.map((f, i) => {
              const v = VERTICES[i];
              return (
                <View key={f.label} style={[styles.chip, { left: v.x - CHIP_W / 2, top: v.y - CHIP_H / 2, borderColor: `${f.color}55`, backgroundColor: `${f.color}15` }]}>
                  <Ionicons name={f.icon as any} size={11} color={f.color} />
                  <Text style={[styles.chipLabel, { color: f.color }]}>{f.label}</Text>
                </View>
              );
            })}
            <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={[styles.glowRing, { opacity: edgeOpacity }]} />
              <Image source={require('../../assets/images/bizcore_logo.png')} style={styles.logoImage} resizeMode="contain" />
            </Animated.View>
          </View>

          <View style={styles.signIn}>
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient colors={isLoading ? ['#1C1C2E', '#1C1C2E'] : ['#1C1C2E', '#141426']} style={styles.googleBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {isLoading ? <ActivityIndicator color={Colors.primary} size="small" /> : (
                  <>
                    <View style={styles.googleIconBox}>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    </View>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <LinearGradient colors={['transparent', '#6366F155', 'transparent']} style={styles.accentLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.disclaimer}>Secure sign-in · Your data is encrypted and protected</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#06060E' },
  safe:           { flex: 1 },
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
  signIn:         { gap: 10 },
  errorBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.danger}15`, borderWidth: 1, borderColor: `${Colors.danger}40`, padding: 12, borderRadius: 12, gap: 8 },
  errorText:      { color: Colors.danger, fontSize: 13, flex: 1 },
  googleBtn:      { borderRadius: 14, borderWidth: 1, borderColor: '#2A2A3E', overflow: 'hidden' },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  googleIconBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF08', borderWidth: 1, borderColor: '#FFFFFF12', justifyContent: 'center', alignItems: 'center' },
  googleBtnText:  { fontSize: 16, fontWeight: '600', color: '#FFFFFF', flex: 1, marginLeft: 12 },
  accentLine:     { height: 1, marginHorizontal: 32 },
  disclaimer:     { fontSize: 12, color: Colors.textMuted, textAlign: 'center', letterSpacing: 0.2, paddingBottom: 4 },
});
