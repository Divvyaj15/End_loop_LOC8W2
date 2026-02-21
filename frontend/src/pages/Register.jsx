import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    aadhaarNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [collegeIdPreview, setCollegeIdPreview] = useState('');
  const [collegeIdBase64, setCollegeIdBase64] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  const [selfieBase64, setSelfieBase64] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleBasicRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.registerBasic({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        phone: formData.phone,
        aadhaarNumber: formData.aadhaarNumber,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        // backend returns tempToken tied to pending_registrations
        setTempToken(response.data.data.tempToken);
        setSuccess('OTP sent to your email!');
        setStep(2);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.verifyOTP(formData.email, otp);

      if (response.data.success) {
        // backend returns a new tempToken tied to docs step
        setTempToken(response.data.data.tempToken);
        setSuccess('OTP verified! Please complete your profile.');
        setStep(3);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!formData.email || resendLoading) return;
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authAPI.resendOTP(formData.email);
      if (response.data.success) {
        setSuccess(response.data.message || 'OTP resent to your email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCompleteRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!collegeIdBase64) {
      setError('Please upload your college ID');
      return;
    }

    if (!selfieBase64) {
      setError('Please capture a live selfie');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.registerComplete({
        tempToken,
        collegeIdBase64,
        selfieBase64,
      });

      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Registration completion failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeIdFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setCollegeIdPreview(result);
        setCollegeIdBase64(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCaptureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setSelfiePreview(dataUrl);
    setSelfieBase64(dataUrl);
  };

  useEffect(() => {
    if (step === 3) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] bg-fixed relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[50%] left-[50%] w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold text-[#e0e7ff] mb-8 text-center relative z-10 tracking-wider drop-shadow-[0_0_20px_rgba(0,217,255,0.5)]">
        HACK-X's WorkSpace
      </h1>

      <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-10 w-full max-w-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-white text-3xl font-semibold text-center mb-8 drop-shadow-[0_0_20px_rgba(0,217,255,0.3)]">
          Sign Up
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6 text-center text-sm">
            {success}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleBasicRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="firstName" className="text-white/90 text-sm font-medium">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="lastName" className="text-white/90 text-sm font-medium">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-white/90 text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="dob" className="text-white/90 text-sm font-medium">
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-white/90 text-sm font-medium">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="aadhaarNumber" className="text-white/90 text-sm font-medium">
                Aadhaar Number
              </label>
              <input
                id="aadhaarNumber"
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleChange}
                maxLength="12"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-white/90 text-sm font-medium">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-base transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-4 text-white text-lg font-semibold cursor-pointer transition-all duration-300 mt-2 shadow-[0_4px_20px_rgba(0,217,255,0.4)] uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,217,255,0.6)] hover:from-cyan-300 hover:to-cyan-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4 text-center">
              <p className="text-white/90 text-sm m-0">
                We've sent a 6-digit OTP to <strong className="text-cyan-400">{formData.email}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="otp" className="text-white/90 text-sm font-medium">
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                name="otp"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                maxLength="6"
                placeholder="000000"
                className="bg-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-white text-xl text-center tracking-[0.5rem] font-semibold transition-all duration-300 outline-none placeholder:text-white/40 focus:bg-white/8 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-4 text-white text-lg font-semibold cursor-pointer transition-all duration-300 mt-2 shadow-[0_4px_20px_rgba(0,217,255,0.4)] uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,217,255,0.6)] hover:from-cyan-300 hover:to-cyan-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading}
              className="w-full bg-transparent border border-cyan-500/50 rounded-xl py-3 text-cyan-300 text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-cyan-500/10 disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-transparent border border-white/30 rounded-xl py-3 text-white/80 text-base font-medium cursor-pointer transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:text-white"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: Document Upload + Live Selfie */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegister} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* College ID Upload */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-lg font-semibold">Document Upload</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-200">
                    Step 3 · Documents
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-white/70 text-sm mb-3">Upload your College ID card</p>
                  <label
                    htmlFor="collegeIdFile"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl py-6 px-4 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white/80 text-sm">Drag & Drop or Click to Upload</span>
                    <span className="text-xs text-white/60">JPG, PNG up to 5MB</span>
                    <input
                      id="collegeIdFile"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCollegeIdFile}
                    />
                  </label>
                </div>

                {collegeIdPreview && (
                  <div className="mt-4">
                    <p className="text-emerald-300 text-xs mb-2">College ID uploaded</p>
                    <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-black/40">
                      <img
                        src={collegeIdPreview}
                        alt="College ID preview"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Selfie */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-lg font-semibold">Live Selfie</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-200">
                    Face Verification
                  </span>
                </div>

                <p className="text-white/70 text-xs">
                  Look straight ahead and ensure proper lighting. Your selfie will be matched against your College ID.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 h-40 flex items-center justify-center">
                    {selfiePreview ? (
                      <img
                        src={selfiePreview}
                        alt="Captured selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/50 text-xs">Captured Selfie</span>
                    )}
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 bg-black/80 h-40 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-white/60 text-xs">Camera off</span>
                      </div>
                    )}
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex flex-wrap gap-3 mt-2">
                  <button
                    type="button"
                    onClick={cameraActive ? handleCaptureSelfie : startCamera}
                    className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-2.5 px-4 text-white text-sm font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,217,255,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,217,255,0.6)]"
                  >
                    {cameraActive ? 'Capture Selfie' : 'Start Camera'}
                  </button>
                  {cameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 rounded-xl border border-white/30 text-white/80 text-sm font-medium hover:bg-white/5 hover:border-white/50 transition-all"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 border-none rounded-xl py-4 text-white text-lg font-semibold cursor-pointer transition-all duration-300 mt-2 shadow-[0_4px_20px_rgba(0,217,255,0.4)] uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,217,255,0.6)] hover:from-cyan-300 hover:to-cyan-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing...' : 'Complete Registration'}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-transparent border border-white/30 rounded-xl py-3 text-white/80 text-base font-medium cursor-pointer transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:text-white"
            >
              Back
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <div className="text-white/70 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 font-semibold no-underline transition-all duration-300 hover:text-cyan-300 hover:drop-shadow-[0_0_10px_rgba(0,217,255,0.5)]"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
