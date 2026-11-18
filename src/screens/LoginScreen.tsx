import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import {
  authStyles,
  AuthLayout,
  ErrorBanner,
  Field,
  PrimaryButton,
} from '../components/AuthForm';
import { RootStackParamList } from '../navigation/types';
import { authErrorMessage, login, resetPassword } from '../services/authService';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Thành công: AuthContext nhận user mới → navigator tự chuyển sang Tabs.
    } catch (e) {
      setError(authErrorMessage(e));
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Nhập email ở trên để nhận liên kết đặt lại mật khẩu.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Đã gửi email', 'Kiểm tra hộp thư để đặt lại mật khẩu nhé!');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <AuthLayout
      mode="login"
      greeting="Chào mừng bạn quay lại! 💕"
      onSwitch={() => navigation.replace('Register')}>
      {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}

      <Field
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        placeholder="mai.anh@pinkychat.vn"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Field
        label="Mật khẩu"
        icon="lock"
        hint="Tối thiểu 6 ký tự"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secure
        autoCapitalize="none"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <Pressable onPress={handleForgot} style={styles.forgot} hitSlop={8}>
        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
      </Pressable>

      <PrimaryButton label="Đăng nhập ngay" onPress={handleLogin} loading={loading} />

      <Pressable style={authStyles.footerRow} onPress={() => navigation.replace('Register')}>
        <Text style={authStyles.footerText}>Chưa có tài khoản? </Text>
        <Text style={authStyles.footerLink}>Đăng ký</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginBottom: 12 },
  forgotText: { color: colors.primaryDeep, fontSize: 13, fontWeight: '600' },
});
