import { useState } from 'react';
import { Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onLogin = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', values);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: { username: string; email: string; password: string }) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/register', values);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">TeleChat</h1>
          <p className="text-gray-500 text-sm">Fast. Secure. Powerful.</p>
        </div>

        <Tabs
          centered
          items={[
            {
              key: 'login',
              label: 'Sign In',
              children: (
                <Form layout="vertical" onFinish={onLogin} size="large">
                  <Form.Item
                    name="email"
                    rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}
                  >
                    <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="Email" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Enter password' }]}
                  >
                    <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block className="h-11 rounded-xl">
                      Sign In
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Sign Up',
              children: (
                <Form layout="vertical" onFinish={onRegister} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, min: 3, message: 'Min 3 characters' }]}
                  >
                    <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Username" />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}
                  >
                    <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="Email" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}
                  >
                    <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block className="h-11 rounded-xl">
                      Create Account
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
