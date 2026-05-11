import { Phone, Mail, MapPin, Shield } from "lucide-react";
const logoImage = "/logo.svg";

export function Footer() {
  return (
    <footer className="bg-[#2B5EA6] text-white mt-auto">
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* City Seal & Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoImage} onError={(e) => { e.currentTarget.style.opacity="0"; }}
                alt="Calaca City Seal"
                className="w-16 h-16"
              />
              <div>
                <p className="text-white">City of Calaca</p>
                <p className="text-sm text-blue-200">
                  Province of Batangas
                </p>
              </div>
            </div>
            <p className="text-sm text-blue-100">
              Official ISO-aligned Veterinary Management System
              for quality service delivery
            </p>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-white mb-3">
              City Veterinary Office
            </h3>
            <div className="space-y-2 text-sm text-blue-100">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>City Hall, Calaca City, Batangas</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>(043) 123-4567 / 0917-123-4567</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>cvo@calaca.gov.ph</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  Calaca City Official Website
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  Department of Agriculture
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  Bureau of Animal Industry
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  DICT e-Government
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  ARTA
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-white mb-3">
              Legal & Compliance
            </h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>ISO 9001:2015 Certified</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>ISO/IEC 27001 Compliant</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>ISO 22301 Compliant</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>ARTA-Compliant (RA 11032)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-400 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
            <div>
              <p>
                &copy; 2024 City Government of Calaca, Batangas.
                All rights reserved.
              </p>
            </div>
            <div className="flex gap-4">
              <a
                href="#"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </a>
              <span>|</span>
              <a
                href="#"
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </a>
              <span>|</span>
              <a
                href="#"
                className="hover:text-white transition-colors"
              >
                Data Privacy Act Notice
              </a>
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-200 text-center">
            <p>
              This system complies with Republic Act No. 10173
              (Data Privacy Act of 2012)
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}