import { X, MapPin, Phone, Calendar, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

interface LostFoundReport {
  id: string;
  petId?: string;
  petName: string;
  species: string;
  breed: string;
  color: string;
  type: 'Lost' | 'Found';
  reportedBy: string;
  contactNumber: string;
  lastSeenLocation: string;
  barangay: string;
  dateReported: string;
  description: string;
  status: 'Open' | 'Resolved';
  photo?: string;
}

interface LostFoundDetailsModalProps {
  report: LostFoundReport;
  onClose: () => void;
  onMarkResolved?: (reportId: string) => void;
}

export function LostFoundDetailsModal({ report, onClose, onMarkResolved }: LostFoundDetailsModalProps) {
  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleDownloadFlyer = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add border
      doc.setLineWidth(2);
      if (report.type === 'Lost') {
        doc.setDrawColor(231, 76, 60);
      } else {
        doc.setDrawColor(46, 204, 113);
      }
      doc.rect(10, 10, 190, 277);
      
      // Header with large text
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      if (report.type === 'Lost') {
        doc.setTextColor(231, 76, 60);
      } else {
        doc.setTextColor(46, 204, 113);
      }
      doc.text(report.type === 'Lost' ? 'LOST PET' : 'FOUND PET', 105, 30, { align: 'center' });
      
      // Pet photo placeholder
      doc.setFillColor(240, 240, 240);
      doc.rect(55, 45, 100, 100, 'F');
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('Pet Photo', 105, 95, { align: 'center' });
      doc.text('(Attach photo here)', 105, 102, { align: 'center' });
      
      // Pet Details
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(report.petName, 105, 160, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.species} - ${report.breed}`, 105, 168, { align: 'center' });
      doc.text(`Color: ${report.color}`, 105, 176, { align: 'center' });
      
      // Location and Date
      doc.setFontSize(11);
      doc.text(`Last Seen: ${report.lastSeenLocation}, ${report.barangay}`, 105, 190, { align: 'center' });
      doc.text(`Date: ${report.dateReported}`, 105, 198, { align: 'center' });
      
      // Description
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, 215);
      doc.setFont('helvetica', 'normal');
      const splitDescription = doc.splitTextToSize(report.description, 170);
      doc.text(splitDescription, 20, 223);
      
      // Contact Information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('If Found/Identified, Please Contact:', 105, 250, { align: 'center' });
      doc.setFontSize(16);
      doc.text(report.reportedBy, 105, 260, { align: 'center' });
      doc.text(report.contactNumber, 105, 270, { align: 'center' });
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('City Veterinary Office - Calaca, Batangas', 105, 285, { align: 'center' });
      
      doc.save(`${report.type}_Pet_Flyer_${report.id}.pdf`);
      toast.success('Flyer downloaded successfully!');
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.error('Failed to generate flyer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-gray-800 font-medium">
              {report.type} Pet Report - {report.id}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Reported on {report.dateReported}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
              report.type === 'Lost'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {report.type} Pet
            </span>
            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
              report.status === 'Open'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {report.status}
            </span>
          </div>

          {/* Pet Photo */}
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {report.photo ? (
              <img 
                src={report.photo} 
                alt={report.petName}
                className="w-full h-80 object-cover"
              />
            ) : (
              <div className="w-full h-80 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-2" />
                  <p>No photo available</p>
                </div>
              </div>
            )}
          </div>

          {/* Pet Details */}
          <div>
            <h4 className="text-gray-800 font-medium mb-3">Pet Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pet Name</label>
                <p className="font-medium text-gray-800">{report.petName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pet ID</label>
                <p className="font-medium text-gray-800">{report.petId}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Species</label>
                <p className="font-medium text-gray-800">{report.species}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Breed</label>
                <p className="font-medium text-gray-800">{report.breed}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Color</label>
                <p className="font-medium text-gray-800">{report.color}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h4 className="text-gray-800 font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Details
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Last Seen Location</label>
                <p className="font-medium text-gray-800">{report.lastSeenLocation}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Barangay</label>
                <p className="font-medium text-gray-800">{report.barangay}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-gray-800 font-medium mb-3">Description</h4>
            <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{report.description}</p>
          </div>

          {/* Reporter Information */}
          <div>
            <h4 className="text-gray-800 font-medium mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reported By</label>
                <p className="font-medium text-gray-800">{report.reportedBy}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Contact Number</label>
                <p className="font-medium text-gray-800">{report.contactNumber}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleDownloadFlyer}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Flyer
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Print Details
            </button>
            {report.status === 'Open' && onMarkResolved && (
              <button
                onClick={() => {
                  onMarkResolved(report.id);
                  toast.success('Report marked as resolved');
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#F39C3A] text-white rounded-md hover:bg-[#d68732] transition-colors"
              >
                Mark as Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}