/**
 * Forgot Password screen — two-step flow:
 *   Step 1: Enter email  →  request OTP from backend
 *   Step 2: Enter OTP + new password  →  reset password
 *
 * Because BizCore has no SMTP configured by default, the backend returns the
 * OTP in the response body so an admin / support person can relay it to the
 * user via WhatsApp, SMS, etc.  When SMTP_URL is set in Railway env the
 * backend also emails it automatically.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/components/ThemedComponents';
import api from '../../src/utils/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep]               = useState<1 | 2>(1);
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [otpCode, setOtpCode]         = useState<string | null>(null); // returned by backend

  // ── Step 1: request OTP ────────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      // Backend returns OTP in response so admin can relay it
      if (res.data?.otp) {
        setOtpCode(res.data.otp);
      }
      setStep(2);
    } catch (e: any) {
      // Still move to step 2 — backend intentionally 200s even for unknown emails
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the reset code.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPass) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: otp.trim(), new_password: newPassword });
      Alert.alert('Success', 'Password reset successfully! You can now sign in with your new password.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Invalid or expired reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#06060E', '#0D0D1C', '#06060E']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Back button ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => (step === 2 ? setStep(1) : router.back())}>
            <Ionicons name="arrow-back" size={22} color={Colors.textSecondary} />
            <Text style={styles.backText}>{step === 2 ? 'Back' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.content}>

            {/* ── Icon ── */}
            <View style={styles.iconWrapper}>
              <LinearGradient colors={['#6366F133', '#4F46E522']} style={styles.iconGrad}>
                <Ionicons name={step === 1 ? 'mail-outline' : 'key-outline'} size={36} color={Colors.primary} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Enter your account email address. A reset code will be generated for you.'
                : 'Enter the 6-digit code you received and choose a new password.'}
            </Text>

            {/* ── Step 1: Email input ── */}
            {step === 1 && (
              <>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Your account email"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestOtp} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={loading ? ['#1C1C2E', '#1C1C2E'] : ['#6366F1', '#4F46E5']} style={styles.primaryBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Send Reset Code</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 2: OTP + new password ── */}
            {step === 2 && (
              <>
                {/* Show OTP to relay if backend returned it (no SMTP) */}
                {otpCode && (
                  <View style={styles.otpRevealBox}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.otpRevealTitle}>Admin: share this code with the user</Text>
                      <Text style={styles.otpRevealCode}>{otpCode}</Text>
                      <Text style={styles.otpRevealNote}>Expires in 15 minutes · Valid once</Text>
                    </View>
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="keypad-outline" size={18} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit reset code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="New password (min 8 chars)"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPwd}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPwd}
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={loading ? ['#1C1C2E', '#1C1C2E'] : ['#6366F1', '#4F46E5']} style={styles.primaryBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Reset Password</Text>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep(1); setOtp(''); setOtpCode(null); }}>
                  <Text style={styles.resendText}>Didn't receive a code? Try again</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06060E' },
  safe:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 14, color: Colors.textSecondary },

  content: { paddingTop: 20 },

  iconWrapper: { alignSelf: 'center', marginBottom: 24 },
  iconGrad:    { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

  title:    { fontSize: 26, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 32 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131325',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A40',
    marginBottom: 14,
    height: 54,
    paddingHorizontal: 4,
  },
  inputIconBox: { width: 44, alignItems: 'center' },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingRight: 12,
  },
  eyeBtn: { paddingHorizontal: 12 },

  primaryBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  primaryBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54 },
  primaryBtnText:  { color: '#fff', fontSize: 16, fontWeight: '600' },

  otpRevealBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: `${Colors.warning}18`,
    borderWidth: 1,
    borderColor: `${Colors.warning}44`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  otpRevealTitle: { fontSize: 12, color: Colors.warning, fontWeight: '600', marginBottom: 6 },
  otpRevealCode:  { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: 6, marginBottom: 4 },
  otpRevealNote:  { fontSize: 11, color: Colors.textMuted },

  resendBtn:  { alignSelf: 'center', paddingVertical: 14 },
  resendText: { fontSize: 13, color: Colors.primary },
});
