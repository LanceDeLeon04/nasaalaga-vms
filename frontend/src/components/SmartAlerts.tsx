import { AlertTriangle, TrendingUp, Syringe, Skull, ArrowUpRight, Activity } from 'lucide-react';

interface Alert {
  id: string;
  type: 'medicine' | 'mortality' | 'vaccination' | 'outbreak';
  severity: 'low' | 'medium' | 'high';
  barangay: string;
  message: string;
  metric?: string;
  trend?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export function SmartAlerts() {
  const alerts: Alert[] = [
    {
      id: 'alert-1',
      type: 'medicine',
      severity: 'high',
      barangay: 'Bagong Tubig',
      message: 'ASF vaccine consumption increased by 340% in last 7 days',
      metric: '340% increase',
      trend: 'up',
      riskLevel: 'High'
    },
    {
      id: 'alert-2',
      type: 'mortality',
      severity: 'high',
      barangay: 'Poblacion 2',
      message: 'Sudden spike in swine mortality: 12 deaths reported in 48 hours',
      metric: '12 deaths',
      trend: 'up',
      riskLevel: 'High'
    },
    {
      id: 'alert-3',
      type: 'vaccination',
      severity: 'medium',
      barangay: 'Cahil',
      message: 'Low rabies vaccination coverage (62%) with 2 recent disease cases',
      metric: '62% coverage',
      trend: 'down',
      riskLevel: 'Medium'
    },
    {
      id: 'alert-4',
      type: 'medicine',
      severity: 'medium',
      barangay: 'Bambang',
      message: 'Antibiotics usage up 180% - possible infection outbreak',
      metric: '180% increase',
      trend: 'up',
      riskLevel: 'Medium'
    },
    {
      id: 'alert-5',
      type: 'vaccination',
      severity: 'high',
      barangay: 'Balimbing',
      message: 'Critical: Only 45% poultry vaccination with avian flu in nearby area',
      metric: '45% coverage',
      trend: 'down',
      riskLevel: 'High'
    }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'medicine':
        return Activity;
      case 'mortality':
        return Skull;
      case 'vaccination':
        return Syringe;
      case 'outbreak':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-900',
          subtext: 'text-red-700',
          badge: 'bg-red-200 text-red-900',
          icon: 'text-red-600'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-900',
          subtext: 'text-yellow-700',
          badge: 'bg-yellow-200 text-yellow-900',
          icon: 'text-yellow-600'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-900',
          subtext: 'text-blue-700',
          badge: 'bg-blue-200 text-blue-900',
          icon: 'text-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          text: 'text-gray-900',
          subtext: 'text-gray-700',
          badge: 'bg-gray-200 text-gray-900',
          icon: 'text-gray-600'
        };
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'bg-red-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#E85D3B]" />
            Smart Alerts & Risk Flags
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered detection of anomalies and emerging risks
          </p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-[#2B5EA6] to-[#1e4275] text-white text-sm rounded-xl hover:shadow-lg transition-all">
          View All Alerts
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          const colors = getAlertColor(alert.severity);

          return (
            <div
              key={alert.id}
              className={`border-l-4 ${colors.border} ${colors.bg} p-4 rounded-lg hover:shadow-md transition-all cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${colors.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className={`${colors.text} text-sm font-medium`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 ${colors.badge} text-xs rounded-full font-medium`}>
                          {alert.barangay}
                        </span>
                        {alert.metric && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            {alert.trend === 'up' && (
                              <ArrowUpRight className="w-3 h-3 text-red-600" />
                            )}
                            {alert.metric}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 ${getRiskBadgeColor(alert.riskLevel)} text-xs rounded-full font-medium whitespace-nowrap`}
                    >
                      {alert.riskLevel} Risk
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barangay Risk Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Barangay Risk Level Summary
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">3</p>
            <p className="text-xs text-red-600 mt-1">High Risk</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">5</p>
            <p className="text-xs text-yellow-600 mt-1">Medium Risk</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">4</p>
            <p className="text-xs text-green-600 mt-1">Low Risk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
