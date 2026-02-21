import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  /* Hide body scrollbar on login page only */
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(email, password);

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Navigate based on role
        const userRole = response.data.data.user.role;
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else if (userRole === 'judge') {
          navigate('/judge/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] bg-fixed relative">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[50%] left-[50%] w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[#e0e7ff] tracking-[0.35em] drop-shadow-[0_0_22px_rgba(0,217,255,0.7)]">
          HACK-X
        </h1>
        <p className="mt-4 text-sm md:text-base text-white/70">
          End_Loop&apos;s unified workspace for{' '}
          <span className="text-cyan-400 font-semibold">students</span>,{' '}
          <span className="text-purple-400 font-semibold">admins</span> and{' '}
          <span className="text-pink-400 font-semibold">judges</span>.
        </p>
      </div>

      {/* Login Form */}
      <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-white text-3xl font-semibold text-center mb-8 drop-shadow-[0_0_20px_rgba(0,217,255,0.3)]">
          Login
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-white/90 text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-white/90 text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-4 text-white text-lg font-semibold cursor-pointer transition-all duration-300 mt-2 shadow-[0_4px_20px_rgba(0,217,255,0.4)] uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,217,255,0.6)] hover:from-cyan-300 hover:to-cyan-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4 items-center">
          <Link
            to="/forgot-password"
            className="text-white/70 text-sm transition-colors duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_10px_rgba(0,217,255,0.5)]"
          >
            Forgot Password?
          </Link>
          <div className="text-white/70 text-sm">
            Not registered?{' '}
            <Link
              to="/register"
              className="text-cyan-400 font-semibold no-underline transition-all duration-300 hover:text-cyan-300 hover:drop-shadow-[0_0_10px_rgba(0,217,255,0.5)]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
