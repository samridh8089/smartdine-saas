// Production Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-smartdine.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getActiveUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id);
    
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0];
};

export const IS_MOCK_MODE = false;

export const storage = {
  async uploadImage(file: File, restaurantId: string, path: string): Promise<string> {
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      throw new Error('Unsupported file format. Please upload jpg, jpeg, png, or webp.');
    }

    const fileName = `${path}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${restaurantId}/${fileName}`;

    // Upload file
    const { error } = await supabase.storage
      .from('smartdine-images')
      .upload(filePath, file, {
        upsert: true
      });

    if (error) {
      throw new Error('Image upload failed: ' + error.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('smartdine-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async uploadAudio(file: File, restaurantId: string, path: string): Promise<string> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['mp3', 'wav', 'm4a'].includes(fileExt)) {
      throw new Error('Unsupported file format. Please upload mp3, wav, or m4a.');
    }

    const fileName = `${path}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${restaurantId}/${fileName}`;

    const { error } = await supabase.storage
      .from('smartdine-images')
      .upload(filePath, file, {
        upsert: true
      });

    if (error) {
      throw new Error('Audio upload failed: ' + error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('smartdine-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteImage(publicUrl: string): Promise<void> {
    try {
      const parts = publicUrl.split('/smartdine-images/');
      if (parts.length < 2) return;
      const filePath = decodeURIComponent(parts[1]);
      
      const { error } = await supabase.storage
        .from('smartdine-images')
        .remove([filePath]);
        
      if (error) {
        console.error('Failed to delete image from storage:', error.message);
      }
    } catch (e) {
      console.error('Failed to parse public URL for deletion:', e);
    }
  }
};

