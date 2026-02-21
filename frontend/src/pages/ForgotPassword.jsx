import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Password reset functionality coming soon!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] bg-fixed relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[50%] left-[50%] w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold text-[#e0e7ff] mb-12 text-center relative z-10 tracking-wider drop-shadow-[0_0_20px_rgba(0,217,255,0.5)]">
        HACK-X's WorkSpace
      </h1>

      <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-white text-3xl font-semibold text-center mb-8 drop-shadow-[0_0_20px_rgba(0,217,255,0.3)]">
          Forgot Password
        </h2>

        {message && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6 text-center text-sm">
            {message}
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
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-4 text-white text-lg font-semibold cursor-pointer transition-all duration-300 mt-2 shadow-[0_4px_20px_rgba(0,217,255,0.4)] uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,217,255,0.6)] hover:from-cyan-300 hover:to-cyan-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-white/70 text-sm">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-cyan-400 font-semibold no-underline transition-all duration-300 hover:text-cyan-300 hover:drop-shadow-[0_0_10px_rgba(0,217,255,0.5)]"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
