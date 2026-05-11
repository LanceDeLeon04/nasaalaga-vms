import { useState, useEffect } from "react";
import { Settings, Save, Plus, Trash2, Edit2, Database, Shield, AlertTriangle, Bell, Zap } from "lucide-react";

import { RuleEnginePanel } from './RuleEnginePanel';

export function SuperAdminSettings() {
  const [activeSection, setActiveSection] = useState<'thresholds' | 'recommendations' | 'database' | 'rules'>('rules');
  const [settings, setSettings] = useState<any>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRec, setEditingRec] = useState<any>(null);
  const [currentUser] = useState({ username: 'SuperAdmin', role: 'admin' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, thresholdsRes, recommendationsRes] = await Promise.all([
        fetch(`/api/admin/settings`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }),
        fetch(`/api/admin/thresholds`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }),
        fetch(`/api/admin/recommendations`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        })
      ]);

      const [settingsData, thresholdsData, recommendationsData] = await Promise.all([
        settingsRes.json(),
        thresholdsRes.json(),
        recommendationsRes.json()
      ]);

      setSettings(settingsData.settings);
      setThresholds(thresholdsData.thresholds);
      setRecommendations(recommendationsData.recommendations);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveThresholds = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/thresholds`,
        {
          method: 'PUT',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(thresholds)
        }
      );
      
      if (response.ok) {
        alert('✅ Thresholds saved successfully!');
      }
    } catch (error) {
      console.error('Error saving thresholds:', error);
      alert('❌ Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const saveRecommendation = async (rec: any) => {
    try {
      const response = await fetch(
        `/api/admin/recommendations`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rec)
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
        setEditingRec(null);
        alert('✅ Recommendation saved!');
      }
    } catch (error) {
      console.error('Error saving recommendation:', error);
      alert('❌ Failed to save recommendation');
    }
  };

  const deleteRecommendation = async (id: string) => {
    if (!confirm('Delete this recommendation?')) return;
    
    try {
      const response = await fetch(
        `/api/admin/recommendations/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }
      );
      
      if (response.ok) {
        setRecommendations(recommendations.filter(r => r.id !== id));
        alert('✅ Recommendation deleted!');
      }
    } catch (error) {
      console.error('Error deleting recommendation:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/4"></div>
          <div className="h-64 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  // Safety guards – render placeholder if API data hasn't loaded yet
  const safeThresholds = thresholds ?? {
    livestock: { criticalPopulationDrop: 30, warningPopulationDrop: 15, highDensityThreshold: 500, lowVaccinationRate: 60 },
    pets: { unvaccinatedThreshold: 40, registrationTarget: 85, missingSpikeThreshold: 10 },
    outbreak: { casesForWarning: 3, casesForCritical: 10 },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-[#2B5EA6]" />
        <div>
          <h2 className="text-2xl font-bold text-white">SuperAdmin Settings</h2>
          <p className="text-slate-400 text-sm">Configure system thresholds, recommendations, and database</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveSection('thresholds')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'thresholds'
              ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Alert Thresholds
        </button>
        <button
          onClick={() => setActiveSection('recommendations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'recommendations'
              ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Recommendations
        </button>
        <button
          onClick={() => setActiveSection('database')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'database'
              ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 inline mr-2" />
          Database Viewer
        </button>
        <button
          onClick={() => setActiveSection('rules')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'rules'
              ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Rule Engine
        </button>
      </div>

      {/* Content */}
      {activeSection === 'thresholds' && thresholds && (
        <div className="space-y-6">
          {/* Livestock Thresholds */}
          <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🐄 Livestock Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Critical Population Drop (%)
                </label>
                <input
                  type="number"
                  value={safeThresholds.livestock.criticalPopulationDrop}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    livestock: { ...safeThresholds.livestock, criticalPopulationDrop: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Warning Population Drop (%)
                </label>
                <input
                  type="number"
                  value={safeThresholds.livestock.warningPopulationDrop}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    livestock: { ...safeThresholds.livestock, warningPopulationDrop: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  High Density Threshold (animals/barangay)
                </label>
                <input
                  type="number"
                  value={safeThresholds.livestock.highDensityThreshold}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    livestock: { ...safeThresholds.livestock, highDensityThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Low Vaccination Rate (%)
                </label>
                <input
                  type="number"
                  value={safeThresholds.livestock.lowVaccinationRate}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    livestock: { ...safeThresholds.livestock, lowVaccinationRate: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Pets Thresholds */}
          <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🐾 Pets Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Unvaccinated Threshold (count)
                </label>
                <input
                  type="number"
                  value={safeThresholds.pets.unvaccinatedThreshold}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    pets: { ...safeThresholds.pets, unvaccinatedThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Registration Target (%)
                </label>
                <input
                  type="number"
                  value={safeThresholds.pets.registrationTarget}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    pets: { ...safeThresholds.pets, registrationTarget: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Missing Spike Threshold (reports/30days)
                </label>
                <input
                  type="number"
                  value={safeThresholds.pets.missingSpikeThreshold}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    pets: { ...safeThresholds.pets, missingSpikeThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Outbreak Thresholds */}
          <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Outbreak Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Cases for Warning (30 days)
                </label>
                <input
                  type="number"
                  value={safeThresholds.outbreak.casesForWarning}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    outbreak: { ...safeThresholds.outbreak, casesForWarning: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Cases for Critical (30 days)
                </label>
                <input
                  type="number"
                  value={safeThresholds.outbreak.casesForCritical}
                  onChange={(e) => setThresholds({
                    ...thresholds,
                    outbreak: { ...safeThresholds.outbreak, casesForCritical: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveThresholds}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 inline mr-2" />
            {saving ? 'Saving...' : 'Save All Thresholds'}
          </button>
        </div>
      )}

      {activeSection === 'recommendations' && (
        <div className="space-y-4">
          <button
            onClick={() => setEditingRec({ category: '', condition: '', recommendation: '', priority: 'Medium' })}
            className="bg-[#2B5EA6] text-white px-4 py-2 rounded-lg hover:bg-[#2B5EA6]/80 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Recommendation
          </button>

          {/* Recommendations List */}
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-xl border border-white/10 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                        rec.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-sm text-slate-400">{rec.category}</span>
                    </div>
                    <p className="text-white font-medium mb-1">{rec.condition}</p>
                    <p className="text-sm text-slate-400">{rec.recommendation}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingRec(rec)}
                      className="text-blue-400 hover:text-blue-300 p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecommendation(rec.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Modal */}
          {editingRec && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#0f1b2d] border border-white/10 rounded-2xl p-6 max-w-lg w-full">
                <h3 className="text-xl font-bold text-white mb-4">
                  {editingRec.id ? 'Edit' : 'Add'} Recommendation
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Category</label>
                    <input
                      type="text"
                      value={editingRec.category}
                      onChange={(e) => setEditingRec({ ...editingRec, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Condition</label>
                    <input
                      type="text"
                      value={editingRec.condition}
                      onChange={(e) => setEditingRec({ ...editingRec, condition: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Recommendation</label>
                    <textarea
                      value={editingRec.recommendation}
                      onChange={(e) => setEditingRec({ ...editingRec, recommendation: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Priority</label>
                    <select
                      value={editingRec.priority}
                      onChange={(e) => setEditingRec({ ...editingRec, priority: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditingRec(null)}
                    className="flex-1 bg-white/5 text-white py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveRecommendation(editingRec)}
                    className="flex-1 bg-[#2B5EA6] text-white py-2 rounded-lg hover:bg-[#2B5EA6]/80 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'database' && (
        <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
          <p className="text-slate-400 text-center py-12">
            🔧 Database Viewer coming soon...
            <br />
            <span className="text-sm">Access to view/edit all database tables</span>
          </p>
        </div>
      )}

      {activeSection === 'rules' && (
        <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
          <RuleEnginePanel currentUser={currentUser} />
        </div>
      )}
    </div>
  );
}