import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      Alert.alert('Sign out failed', error.message);
      return;
    }

    router.replace('/login');
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
      onPress={handleLogout}
      disabled={loading}
    >
      <Text style={styles.text}>{loading ? 'Signing out…' : 'Logout'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(4,4,20,0.2)',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
