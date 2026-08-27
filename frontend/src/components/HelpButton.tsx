import { HelpCircle } from 'lucide-react';

const TRAINING_HUB_URL = 'https://naasa-alaga-training-hub.vercel.app/';

/**
 * Floating help button, visible on every page.
 * Opens the NASaAlaga Training Hub in a new tab.
 */
export default function HelpButton() {
  const handleClick = () => {
    window.open(TRAINING_HUB_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Help & Training Hub"
      title="Help & Training Hub"
      className="fixed bottom-5 right-5 z-[9999] flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
    >
      <HelpCircle className="w-7 h-7" strokeWidth={2} />
    </button>
  );
}
