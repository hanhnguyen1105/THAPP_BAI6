import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  authStyles,
  AuthLayout,
  ErrorBanner,
  Field,
  PrimaryButton,
} from '../components/AuthForm';
import { RootStackParamList } from '../navigation/types';
import { authErrorMessage, register } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) {
      return 'Vui lòng nhập họ tên.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Email không hợp lệ.';
    }
    if (password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (password !== confirm) {
      return 'Mật khẩu nhập lại không khớp.';
    }
    return '';
  };

  const handleRegister = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      // Đăng ký xong Firebase tự đăng nhập → navigator chuyển sang Tabs.
    } catch (e) {
      setError(authErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      mode="register"
      greeting="Tạo tài khoản để bắt đầu trò chuyện 🌸"
      onSwitch={() => navigation.replace('Login')}>
      {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}

      <Field
        label="Họ và tên"
        icon="user"
        value={name}
        onChangeText={setName}
        placeholder="Phương Mai"
        autoCapitalize="words"
        textContentType="name"
      />
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
        textContentType="newPassword"
      />
      <Field
        label="Nhập lại mật khẩu"
        icon="lock"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="••••••••"
        secure
        autoCapitalize="none"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />

      <PrimaryButton
        label="Tạo tài khoản"
        icon="userPlus"
        onPress={handleRegister}
        loading={loading}
      />

      <Pressable style={authStyles.footerRow} onPress={() => navigation.replace('Login')}>
        <Text style={authStyles.footerText}>Đã có tài khoản? </Text>
        <Text style={authStyles.footerLink}>Đăng nhập</Text>
      </Pressable>
    </AuthLayout>
  );
}
