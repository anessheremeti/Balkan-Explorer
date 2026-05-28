import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../../createClient';
import { usersService } from '../../hooks/usersService';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const AvatarUpload: React.FC = () => {
  const userId = sessionStorage.getItem("user_id");
  const { getAvatarUrl } = usersService();

  const [avatarUrl, setAvatarUrl] = useState<string>('https://picsum.photos/seed/default/200');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    getAvatarUrl(userId).then(url => {
      if (url) setAvatarUrl(url);
    });
  }, [userId, getAvatarUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const base64String = await fileToBase64(file);

      const { error } = await supabase
        .from('profiles')
        .upsert([{ id: userId, avatar_url: base64String }]);

      if (error) throw error;

      // Optimistic update — use the value we already have, no extra fetch needed
      setAvatarUrl(base64String);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      setAvatarUrl('https://picsum.photos/seed/default/200');
    } catch (err) {
      console.error('Remove failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-md bg-slate-100">
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 p-2.5 bg-[#0ea5e9] text-white rounded-full shadow-lg hover:bg-sky-600 transition-all active:scale-90"
          title="Change Avatar"
        >
          <Camera size={18} />
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Profile Picture</h3>
          <p className="text-slate-500 text-sm">PNG, JPG or GIF. Max size of 800K.</p>
        </div>
        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Upload size={16} />
            Upload New
          </button>
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </div>
    </div>
  );
};

export default AvatarUpload;
