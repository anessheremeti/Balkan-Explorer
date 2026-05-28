import React, { useState } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';

type ProfileFormValues = {
  username: string;
  email: string;
  bio: string;
  location: string;
};

const ChangePasswordForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ProfileFormValues>({
    username: '',
    email: '',
    bio: '',
    location: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (success) setSuccess(false);
  };

  const fakeUpdate = async () => {
    // Dummy API call that always resolves successfully
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const result = await fakeUpdate();
      if (result) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all"
            placeholder="Your username"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all"
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-semibold text-slate-700">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all"
          placeholder="City, Country"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-semibold text-slate-700">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all resize-none"
          placeholder="Tell us a bit about yourself..."
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        {success && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-in fade-in slide-in-from-right-4">
            <CheckCircle size={16} />
            Changes saved successfully
          </span>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
