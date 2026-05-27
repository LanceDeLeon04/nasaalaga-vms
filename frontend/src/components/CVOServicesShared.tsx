import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Upload, Plus, Edit, Trash2, Eye, CheckCircle, MapPin, Phone, Calendar, ChevronDown, ChevronUp, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { UserRole } from '../App';

interface CVOServicesSharedProps {
  userRole?: UserRole;
}

const CATEGORIES = ['Pet Services', 'Vaccination Services', 'Certificate Services', 'Livestock Services', 'Other Services'];

export function CVOServicesShared({ userRole }: CVOServicesSharedProps) {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = ['admin', 'superadmin', 'cvoStaff'].includes(userRole || '');

  const [formData, setFormData] = useState({
    title: '', description: '', category: 'Pet Services',
    requirements: [''], procedureSteps: [''],
    processingFee: 0, sortOrder: 0,
    fileName: '', fileData: '', fileType: '',
  });

  const loadForms = async () => {
    try {
      setLoading(true);
      const res = await api.getCVOForms();
      setForms(res.forms || []);
    } catch {
      // Fallback static forms if API not yet migrated
      setForms(DEFAULT_FORMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadForms(); }, []);

  const filtered = selectedCategory === 'All' ? forms : forms.filter(f => f.category === selectedCategory);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      setFormData(prev => ({ ...prev, fileName: file.name, fileData: base64, fileType: file.type }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (form: any) => {
    if (form.file_data) {
      const link = document.createElement('a');
      link.href = `data:${form.file_type || 'application/pdf'};base64,${form.file_data}`;
      link.download = form.file_name || `${form.title}.pdf`;
      link.click();
      toast.success(`Downloading ${form.file_name || form.title}`);
    } else {
      // Generate placeholder PDF with form info
      const content = generateFormContent(form);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.title.replace(/\s+/g, '_')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Form downloaded. Please visit CVO office for the official PDF version.');
    }
  };

  const generateFormContent = (form: any) => {
    const reqs = Array.isArray(form.requirements) ? form.requirements : JSON.parse(form.requirements || '[]');
    const steps = Array.isArray(form.procedure_steps) ? form.procedure_steps : JSON.parse(form.procedure_steps || '[]');
    return `CITY VETERINARY OFFICE - CALACA CITY
=====================================
${form.title.toUpperCase()}
Category: ${form.category}
Processing Fee: ${form.processing_fee > 0 ? '₱' + form.processing_fee : 'FREE'}

DESCRIPTION:
${form.description}

REQUIREMENTS:
${reqs.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

STEP-BY-STEP PROCEDURE:
${steps.map((s: string, i: number) => `Step ${i + 1}: ${s}`).join('\n')}

CONTACT:
City Veterinary Office, Calaca City Hall, Calaca, Batangas
Tel: (043) 123-4567 | Email: cvo@calaca.gov.ph
Office Hours: Monday-Friday, 8:00 AM - 5:00 PM

NOTE: This is a reference document only. Please visit the CVO office for the official form.
`;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category) { toast.error('Title and category are required'); return; }
    const payload = {
      ...formData,
      requirements: formData.requirements.filter(r => r.trim()),
      procedureSteps: formData.procedureSteps?.filter((s: string) => s.trim()) || formData.requirements,
    };
    try {
      if (editingForm) {
        await (api as any).updateCVOForm(editingForm.id, payload);
        toast.success('Form updated successfully');
      } else {
        await (api as any).createCVOForm(payload);
        toast.success('Form uploaded successfully');
      }
      setShowUploadModal(false);
      setEditingForm(null);
      resetForm();
      loadForms();
    } catch (err: any) { toast.error(err.message || 'Failed to save form'); }
  };

  const handleEdit = (form: any) => {
    const reqs = Array.isArray(form.requirements) ? form.requirements : JSON.parse(form.requirements || '[]');
    const steps = Array.isArray(form.procedure_steps) ? form.procedure_steps : JSON.parse(form.procedure_steps || '[]');
    setFormData({
      title: form.title, description: form.description || '', category: form.category,
      requirements: reqs.length ? reqs : [''],
      procedureSteps: steps.length ? steps : [''],
      processingFee: form.processing_fee || 0, sortOrder: form.sort_order || 0,
      fileName: form.file_name || '', fileData: form.file_data || '', fileType: form.file_type || '',
    });
    setEditingForm(form);
    setShowUploadModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this form?')) return;
    try {
      await (api as any).deleteCVOForm(id);
      toast.success('Form deleted');
      loadForms();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetForm = () => setFormData({ title:'', description:'', category:'Pet Services', requirements:[''], procedureSteps:[''], processingFee:0, sortOrder:0, fileName:'', fileData:'', fileType:'' });

  const addReqItem = () => setFormData(p => ({ ...p, requirements: [...p.requirements, ''] }));
  const removeReqItem = (i: number) => setFormData(p => ({ ...p, requirements: p.requirements.filter((_,idx) => idx!==i) }));
  const updateReqItem = (i: number, val: string) => setFormData(p => ({ ...p, requirements: p.requirements.map((r,idx) => idx===i ? val : r) }));
  const addStep = () => setFormData(p => ({ ...p, procedureSteps: [...p.procedureSteps, ''] }));
  const removeStep = (i: number) => setFormData(p => ({ ...p, procedureSteps: p.procedureSteps.filter((_,idx) => idx!==i) }));
  const updateStep = (i: number, val: string) => setFormData(p => ({ ...p, procedureSteps: p.procedureSteps.map((s,idx) => idx===i ? val : s) }));

  const categoryColors: Record<string, string> = {
    'Pet Services': 'bg-blue-100 text-blue-800',
    'Vaccination Services': 'bg-green-100 text-green-800',
    'Certificate Services': 'bg-yellow-100 text-yellow-800',
    'Livestock Services': 'bg-orange-100 text-orange-800',
    'Other Services': 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Other CVO Services</h2>
          <p className="text-gray-600">Downloadable forms and procedures — No online processing. Visit CVO office to submit.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setEditingForm(null); setShowUploadModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Form
          </button>
        )}
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-900 font-medium">Download Forms Only — No Online Processing</p>
          <p className="text-sm text-amber-700">All forms must be submitted in person at the City Veterinary Office. Downloadable forms are for reference and preparation purposes only.</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedCategory === cat ? 'bg-[#2B5EA6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading forms...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.filter(f => f.is_active !== false).map(form => {
            const reqs = Array.isArray(form.requirements) ? form.requirements : JSON.parse(form.requirements || '[]');
            const steps = Array.isArray(form.procedure_steps) ? form.procedure_steps : JSON.parse(form.procedure_steps || '[]');
            const isExpanded = expandedId === form.id;
            return (
              <div key={form.id} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-[#2B5EA6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#2B5EA6]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-gray-800 font-medium leading-snug">{form.title}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${categoryColors[form.category] || 'bg-gray-100 text-gray-800'}`}>
                          {form.category}
                        </span>
                        {form.processing_fee > 0 && (
                          <span className="ml-2 inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            Fee: ₱{parseFloat(form.processing_fee).toFixed(0)}
                          </span>
                        )}
                        {form.processing_fee == 0 && (
                          <span className="ml-2 inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">FREE</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => handleEdit(form)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(form.id)} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{form.description}</p>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : form.id)}
                    className="flex items-center gap-1 text-sm text-[#2B5EA6] hover:underline mb-3"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Hide' : 'View'} Requirements & Procedures
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 mb-4 border-t pt-3">
                      {reqs.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">📋 Requirements:</p>
                          <ul className="space-y-1">
                            {reqs.map((r: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {steps.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">🔢 Step-by-Step Procedure:</p>
                          <ol className="space-y-2">
                            {steps.map((step: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="w-5 h-5 bg-[#2B5EA6] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(form)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Form
                    </button>
                    {form.file_name && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                        {form.file_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-800 font-medium mb-4">City Veterinary Office — Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#2B5EA6]" /><span>Calaca City Hall, Calaca, Batangas 4212</span></div>
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#2B5EA6]" /><span>(043) 123-4567 / 0917-123-4567</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#2B5EA6]" /><span>Monday – Friday: 8:00 AM – 5:00 PM</span></div>
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#2B5EA6]" /><span>cvo@calaca.gov.ph</span></div>
        </div>
      </div>

      {/* Upload / Edit Modal */}
      {showUploadModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-gray-800 font-semibold">{editingForm ? 'Edit Form' : 'Upload New Form'}</h3>
              <button onClick={() => { setShowUploadModal(false); setEditingForm(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Form Title *</label>
                  <input value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6]" placeholder="e.g. Pet Registration Form" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Category *</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6]">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Processing Fee (₱)</label>
                  <input type="number" value={formData.processingFee} onChange={e => setFormData(p => ({...p, processingFee: parseFloat(e.target.value)||0}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6]" min={0} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                    rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700">Requirements</label>
                  <button onClick={addReqItem} className="text-xs text-[#2B5EA6] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>
                </div>
                {formData.requirements.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={r} onChange={e => updateReqItem(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#2B5EA6]" placeholder={`Requirement ${i+1}`} />
                    {formData.requirements.length > 1 && <button onClick={() => removeReqItem(i)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-red-500" /></button>}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700">Step-by-Step Procedure</label>
                  <button onClick={addStep} className="text-xs text-[#2B5EA6] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add Step</button>
                </div>
                {formData.procedureSteps.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <span className="w-6 h-6 bg-[#2B5EA6] text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1.5">{i+1}</span>
                    <input value={s} onChange={e => updateStep(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#2B5EA6]" placeholder={`Step ${i+1}`} />
                    {formData.procedureSteps.length > 1 && <button onClick={() => removeStep(i)} className="p-1 hover:bg-gray-100 rounded mt-0.5"><X className="w-4 h-4 text-red-500" /></button>}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Upload Form File (PDF, DOC, DOCX)</label>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Choose File
                  </button>
                  {formData.fileName && <span className="text-sm text-gray-600 flex items-center">{formData.fileName}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1">Max 10MB. Users will be able to download this file.</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => { setShowUploadModal(false); setEditingForm(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85]">
                <Save className="w-4 h-4" /> {editingForm ? 'Save Changes' : 'Upload Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback default forms in case DB not yet migrated
const DEFAULT_FORMS = [
  {
    id: 'df-1', title: 'Pet Registration Form', category: 'Pet Services', is_active: true, processing_fee: 0,
    description: 'Official registration form for companion animals. Required for all pet owners in Calaca City.',
    requirements: JSON.stringify(['Valid ID of owner','Recent photo of pet (3x3)','Proof of residence','Vaccination records (if available)']),
    procedure_steps: JSON.stringify(['Download and print the form','Fill out all required information','Attach a recent photo of your pet','Visit CVO office with completed form and documents','Pay registration fee if applicable','Receive your Pet Registration Certificate']),
    file_name: null, file_data: null,
  },
  {
    id: 'df-2', title: 'Anti-Rabies Vaccination Appointment Form', category: 'Vaccination Services', is_active: true, processing_fee: 0,
    description: 'Schedule your pet for free anti-rabies vaccination as part of the Rabies Prevention Program.',
    requirements: JSON.stringify(['Pet registration number (if registered)','Valid ID of owner','Vaccination booklet (if available)']),
    procedure_steps: JSON.stringify(['Download and fill out the appointment form','Choose preferred schedule and venue','Bring completed form to the vaccination site','Present form and valid ID upon arrival','Wait for pet assessment','Vaccine will be administered','Receive vaccination certificate']),
    file_name: null, file_data: null,
  },
  {
    id: 'df-3', title: 'Veterinary Health Certificate Application', category: 'Certificate Services', is_active: true, processing_fee: 200,
    description: 'Official health certificate for travel, sale, or transport of animals. Valid for 30 days.',
    requirements: JSON.stringify(['Pet/livestock registration certificate','Updated vaccination records','Valid ID of owner','Processing fee: ₱200']),
    procedure_steps: JSON.stringify(['Download and complete the VHC Application Form','Gather all required documents','Submit application to CVO office','Schedule physical examination','Bring animal for examination','Pay processing fee','Receive VHC within 1-3 working days']),
    file_name: null, file_data: null,
  },
  {
    id: 'df-4', title: 'Livestock Registration Form', category: 'Livestock Services', is_active: true, processing_fee: 0,
    description: 'Mandatory registration for all livestock owners. Enables disease monitoring and outbreak prevention.',
    requirements: JSON.stringify(['Valid ID of farm owner','Proof of land ownership or lease','Recent photos of animals','Barangay clearance']),
    procedure_steps: JSON.stringify(['Download the Livestock Registration Form','Fill out animal details','Attach required documents','Submit to CVO office or your BAHW','CVO/BAHW will schedule farm visit','Animals will be tagged upon verification','Receive Livestock Registration Certificate']),
    file_name: null, file_data: null,
  },
];
