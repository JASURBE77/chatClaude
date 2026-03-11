import { useState, useEffect } from 'react';
import { Form, Input, Avatar, message } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      username: user?.username,
      bio: user?.bio,
      avatar: user?.avatar,
    });
  }, [user]);

  const onSave = async (values: any) => {
    try {
      setLoading(true);
      const res = await api.put('/users/me', values);
      setAuth(res.data, token!);
      message.success('Profile updated!');
    } catch {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800'];
  function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  const color = avatarColor(user?.username || 'U');

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center gap-3 shadow-md"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeftOutlined />
        </button>
        <h1 className="font-bold text-white text-lg">Edit Profile</h1>
      </div>

      {/* Cover + Avatar */}
      <div
        className="h-32 relative"
        style={{ background: 'linear-gradient(135deg, #2AABEE22, #229ED944)' }}
      >
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="relative">
            <Avatar
              src={user?.avatar || undefined}
              size={96}
              style={{ background: color, fontSize: 36, fontWeight: 700, border: '4px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <div
              className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }}
            >
              <UserOutlined style={{ fontSize: 11, color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-16 pb-8">
        {/* Username display */}
        <div className="text-center mb-6">
          <h2 className="font-bold text-xl text-gray-800">{user?.username}</h2>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className="px-1 pt-1">
            <div style={{ background: 'linear-gradient(135deg, #2AABEE15, #229ED905)' }} className="rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile Info</p>
              <Form form={form} layout="vertical" onFinish={onSave} size="large">
                <Form.Item
                  label={<span className="text-sm font-medium text-gray-600">Username</span>}
                  name="username"
                  rules={[{ required: true, min: 3 }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#2AABEE' }} />}
                    placeholder="Username"
                    style={{ borderRadius: 12, border: '1.5px solid #e5e7eb', height: 46 }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-sm font-medium text-gray-600">Avatar URL</span>}
                  name="avatar"
                >
                  <Input
                    placeholder="https://example.com/avatar.jpg"
                    style={{ borderRadius: 12, border: '1.5px solid #e5e7eb', height: 46 }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-sm font-medium text-gray-600">Bio</span>}
                  name="bio"
                  className="mb-4"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Tell something about yourself..."
                    maxLength={200}
                    showCount
                    style={{ borderRadius: 12, border: '1.5px solid #e5e7eb' }}
                  />
                </Form.Item>

                <Form.Item className="mb-0">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full h-12 rounded-2xl text-white font-bold text-base"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </Form.Item>
              </Form>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#e8f4fd' }}>
                <svg className="w-3.5 h-3.5" style={{ color: '#2AABEE' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
