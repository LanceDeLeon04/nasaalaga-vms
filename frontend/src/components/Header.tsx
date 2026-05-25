import { LogOut, Bell, Server, CheckCircle, UserCircle2, Settings, Menu } from 'lucide-react';
import type { User } from '../App';
const logoImage = '/images/city-seal.png';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-[#2B5EA6] to-[#3d7ac7] text-white shadow-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            
            <img src={logoImage} alt="Calaca City Logo" onError={(e) => { e.currentTarget.style.opacity='0'; }} className="w-14 h-14 drop-shadow-lg" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white drop-shadow-md">NASaAlaga</h1>
              <p className="text-xs text-blue-100 hidden sm:block">Veterinary Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <span className="text-sm text-green-100">System Online</span>
            </div>

            {/* Backup Status */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <Server className="w-4 h-4 text-blue-300" />
              <span className="text-sm text-blue-100">Backup: Today</span>
            </div>

            {/* Notifications */}
            <button className="relative p-3 hover:bg-white/20 rounded-full transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#F39C3A] rounded-full animate-pulse"></span>
            </button>

            {/* User Info */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all">
              <div className="text-right">
                <p className="text-sm flex items-center gap-2 justify-end">
                  <UserCircle2 className="w-4 h-4" />
                  {user.username}
                </p>
                <p className="text-xs text-blue-200 flex items-center gap-1 justify-end">
                  {user.role === 'admin' ? (
                    <>
                      <Settings className="w-3 h-3" />
                      Admin
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="w-3 h-3" />
                      BAHW
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern ISO Compliance Banner */}
      <div className="bg-black/10 backdrop-blur-sm px-6 py-2 text-xs text-blue-50 flex items-center justify-center gap-8 flex-wrap">
        <span className="flex items-center gap-1">✓ ISO 9001:2015</span>
        <span className="flex items-center gap-1">✓ ISO 27001</span>
        <span className="flex items-center gap-1">✓ ISO 22301</span>
        <span className="flex items-center gap-1">✓ ARTA Compliant</span>
      </div>
    </header>
  );
}