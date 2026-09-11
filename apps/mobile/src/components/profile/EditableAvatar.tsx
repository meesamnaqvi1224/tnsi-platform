import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/clerk-expo';
import { Avatar } from './Avatar';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/theme';

interface EditableAvatarProps {
  imageUrl: string | null;
  hasImage: boolean;
  initials: string;
  size?: number;
}

/** Wraps the read-only Avatar with a tap-to-change affordance - picks an
 * image from the library and uploads it straight to Clerk (the single
 * source of truth for profile identity; no separate native copy of the
 * photo is stored). */
export function EditableAvatar({ imageUrl, hasImage, initials, size = 72 }: EditableAvatarProps) {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);

  async function handlePick() {
    if (uploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow TNSI to access your photos in Settings to set a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      await user?.setProfileImage({ file: blob });
    } catch {
      Alert.alert('Couldn’t update photo', 'Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Pressable
      onPress={handlePick}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      disabled={uploading}
    >
      <View>
        <Avatar imageUrl={imageUrl} hasImage={hasImage} initials={initials} size={size} />
        <View style={styles.badge}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.cream} />
          ) : (
            <ThemedText variant="caption" color={colors.cream}>
              Edit
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.cream,
  },
});
