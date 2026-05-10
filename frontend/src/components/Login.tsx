import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, PawPrint } from "lucide-react";
import { toast } from 'sonner';
import type { UserRole } from "../App";
import api from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      sessionStorage.setItem('nasaalaga_user', JSON.stringify(data.user));
      sessionStorage.setItem('nasaalaga_token', data.token);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = { username: 'Guest', role: 'guest' as UserRole };
    sessionStorage.setItem('nasaalaga_user', JSON.stringify(guestUser));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-4 md:py-0">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a6e] via-[#2B5EA6] to-[#60A85C]">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
      </div>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 mx-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="bg-gradient-to-br from-[#F39C3A] to-[#E85D3B] p-6 md:p-8 flex flex-col items-center justify-center text-white">
            <div className="text-center">
              <div className="w-[140px] h-[140px] mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center shadow-xl">
                <PawPrint className="w-20 h-20 text-white drop-shadow-lg" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">NASaAlaga</h1>
              <p className="text-white/90 text-sm md:text-base mb-6">Veterinary Management System</p>
              <p className="text-white/90 text-xs md:text-sm flex items-center justify-center gap-2 mb-4">
                <Building2 className="w-4 h-4" />City of Calaca, Batangas
              </p>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-left">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm text-white/90">Official Calaca City Government Veterinary System</p>
                </div>
              </div>
              <div className="mt-6 text-xs text-white/80 space-y-1">
                <p className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />ISO 9001:2015 | ISO/IEC 27001 Certified
                </p>
                <p className="text-white/70">Protected by the Data Privacy Act of 2012</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-600 text-sm mb-6">Login with your verified account</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="your@email.com" type="email" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="••••••••" required />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Demo Accounts:</p>
                <p>Admin: amie.vergara@nexgov.ph / Vergara$2026</p>
                <p>BAHW: miguel.sanchez@nexgov.ph / Sanchez$2026</p>
                <p>Owner: cyrus.cruz@gmail.com / Cruz$2026</p>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors">
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <div className="flex items-center justify-between mt-4">
              <button onClick={handleGuestLogin} className="text-blue-600 hover:text-blue-800 text-sm transition-colors">Continue as Guest</button>
              <button onClick={() => navigate('/signup')} className="text-[#2B5EA6] hover:text-[#234a85] text-sm font-medium transition-colors">Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
