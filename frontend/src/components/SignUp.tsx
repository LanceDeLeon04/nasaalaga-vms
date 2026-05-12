import api from '../lib/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, Home, CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
const cityHallBg = '/images/city-hall-bg.jpg';
import { fetchCalacaBarangays, CALACA_BARANGAYS_FALLBACK } from '../utils/barangays';


export function SignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [barangays, setBarangays] = useState<string[]>(CALACA_BARANGAYS_FALLBACK);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    barangay: '',
    address: '',
    temporaryId: '',
    verificationMethod: 'email' as 'email'
  });

  const [otp, setOtp] = useState('');
  const [sentOTP, setSentOTP] = useState('');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [displayedOTP, setDisplayedOTP] = useState('');

  useEffect(() => {
    const loadBarangays = async () => {
      setLoadingBarangays(true);
      try {
        const response = await fetch(
          `/api/barangays`,
          {
            headers: {
              
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setBarangays(data.barangays);
        }
      } catch (error) {
        const realBarangays = await fetchCalacaBarangays();
        setBarangays(realBarangays);
      } finally {
        setLoadingBarangays(false);
      }
    };
    loadBarangays();
  }, []);

  useEffect(() => {
    if (step === 'success' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'success' && redirectCountdown === 0) {
      navigate('/');
    }
  }, [step, redirectCountdown, navigate]);

  const handleSendOTP = async () => {
    if (!formData.firstName.trim()) {
      toast.error('Please enter your first name');
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error('Please enter your last name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    if (false) { // phone removed — email only
      return;
    }
    if (!formData.password) {
      toast.error('Please enter a password');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!formData.barangay) {
      toast.error('Please select your barangay');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Please enter your complete address');
      return;
    }

    try {
      setIsLoading(true);
      const payload = formData.verificationMethod === 'email' 
        ? { email: formData.email }
        : { email: formData.email };

      console.log('📤 Sending OTP request:', payload);

      const response = await fetch(
        `/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      console.log('📥 OTP Response:', data);
      
      if (!response.ok) {
        const errorMsg = data.error || 'Failed to send OTP';
        console.error('❌ Server error:', data);
        throw new Error(errorMsg);
      }

      // Check if fallback mode (testing restrictions)
      if (data.fallbackMode && data.otp) {
        setFallbackMode(true);
        setDisplayedOTP(data.otp);
        toast.warning(data.message, { duration: 8000 });
        if (data.testingNote) {
          toast.info(data.testingNote, { duration: 10000 });
        }
      } else {
        setFallbackMode(false);
        setDisplayedOTP('');
        toast.success('Verification code sent! Check your email inbox (including spam folder).');
      }

      setStep('otp');
    } catch (error: any) {
      console.error('❌ Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      const payload = formData.verificationMethod === 'email'
        ? { email: formData.email, otp: otp }
        : { email: formData.email, otp };

      console.log('📤 Verifying OTP:', payload);

      const response = await fetch(
        `/api/auth/verify-otp`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      console.log('📥 Verify Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      toast.success('OTP verified successfully!');
      await handleSignUp();
    } catch (error: any) {
      console.error('❌ Error verifying OTP:', error);
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      const username = `${formData.firstName.trim()} ${formData.middleName.trim()} ${formData.lastName.trim()}`.replace(/\s+/g, ' ');

      const response = await fetch(
        `/api/auth/signup`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,

            password: formData.password,
            username,
            barangay: formData.barangay,
            address: formData.address,
            temporaryId: formData.temporaryId || undefined
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      setStep('success');
      toast.success('Account created successfully!');
      setRedirectCountdown(5);
    } catch (error: any) {
      console.error('Error during sign up:', error);
      toast.error(error.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cityHallBg}), linear-gradient(135deg, #1a3a6e, #2B5EA6)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2B5EA6]/90 via-[#3d7ac7]/85 to-[#60A85C]/80" />
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 mx-4 p-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Account Created Successfully!</h2>
            <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
              Your NASaAlaga account has been created. You can now log in to access veterinary services.
            </p>
            <div className="bg-blue-50 border-2 border-[#2B5EA6] rounded-lg p-6 mb-8">
              <p className="text-[#2B5EA6] font-bold text-2xl mb-2">
                Redirecting to login in {redirectCountdown} seconds...
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-[#2B5EA6] text-white text-lg rounded-lg hover:bg-[#234a85] transition-colors font-semibold"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OTP VERIFICATION SCREEN
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cityHallBg}), linear-gradient(135deg, #1a3a6e, #2B5EA6)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2B5EA6]/90 via-[#3d7ac7]/85 to-[#60A85C]/80" />
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 mx-4 p-12">
          <button
            onClick={() => {
              setStep('form');
              setOtp('');
              setSentOTP('');
            }}
            className="flex items-center gap-2 text-[#2B5EA6] hover:text-[#234a85] transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Form</span>
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Verify Your Email
            </h2>
            <p className="text-gray-600 text-lg mb-4">
              We've sent a 6-digit verification code to:
            </p>
            <p className="text-xl font-bold text-[#2B5EA6] mb-6">
              {formData.email}
            </p>
            
            {fallbackMode && displayedOTP ? (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-4">
                <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ TESTING MODE</p>
                <p className="text-xs text-yellow-700 mb-3">
                  Email has testing restrictions. Use this code:
                </p>
                <div className="bg-white border-2 border-yellow-500 rounded-lg p-4">
                  <p className="text-4xl font-bold text-[#2B5EA6] tracking-[0.5em] font-mono">
                    {displayedOTP}
                  </p>
                </div>
                <p className="text-xs text-yellow-700 mt-3">
                  To send real emails, verify a domain at resend.com/domains
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-[#2B5EA6] rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  📧 Check your email inbox (and spam folder) for the OTP code
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">
                Enter OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent text-center text-3xl tracking-[1em] font-bold"
                placeholder="000000"
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-[#60A85C] hover:bg-[#4a8a47] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP & Create Account'}
            </button>

            <button
              onClick={() => {
                setOtp('');
                handleSendOTP();
              }}
              disabled={isLoading}
              className="w-full text-[#2B5EA6] hover:text-[#234a85] py-3 text-base font-medium transition-colors"
            >
              Resend OTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN SIGN-UP FORM
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${cityHallBg}), linear-gradient(135deg, #1a3a6e, #2B5EA6)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B5EA6]/90 via-[#3d7ac7]/85 to-[#60A85C]/80" />
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 mx-4 p-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#2B5EA6] hover:text-[#234a85] transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Login</span>
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Sign Up</h1>
          <p className="text-gray-600 text-lg">Create your NASaAlaga account</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* NAME FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                  placeholder="Juan"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Middle Name <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                placeholder="Santos"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
              placeholder="Dela Cruz"
            />
          </div>

          {/* VERIFICATION METHOD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Verification Method (Email only) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, verificationMethod: 'email' })}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.verificationMethod === 'email'
                    ? 'border-[#2B5EA6] bg-blue-50 text-[#2B5EA6]'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Mail className="w-5 h-5 inline mr-2" />
                Email
              </button>
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                placeholder="juan.delacruz@email.com"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* BARANGAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Barangay <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <select
                value={formData.barangay}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent appearance-none bg-white"
              >
                <option value="">-- Select Barangay --</option>
                {loadingBarangays ? (
                  <option value="" disabled>Loading...</option>
                ) : (
                  barangays.map(barangay => (
                    <option key={barangay} value={barangay}>{barangay}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* ADDRESS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Complete Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent resize-none"
                placeholder="House No., Street, Subdivision"
                rows={3}
              />
            </div>
          </div>

          {/* TEMPORARY ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Temporary ID <span className="text-gray-500 text-sm">(Optional)</span>
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.temporaryId}
                onChange={(e) => setFormData({ ...formData, temporaryId: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                placeholder="Leave blank if you don't have one"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={isLoading}
            className="w-full bg-[#60A85C] hover:bg-[#4a8a47] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
          >
            {isLoading ? 'Generating OTP...' : 'Continue to Verification'}
          </button>
        </div>
      </div>
    </div>
  );
}