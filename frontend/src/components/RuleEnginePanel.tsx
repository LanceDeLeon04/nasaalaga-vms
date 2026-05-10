import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, AlertTriangle, Activity, TrendingUp, Shield } from 'lucide-react';


interface Rule {
  id: string;
  name: string;
  description: string;
  category: 'alert' | 'intervention' | 'analytics' | 'effectiveness';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'inactive' | 'testing';
  conditions: RuleCondition[];
  actions: RuleAction[];
  zones?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RuleCondition {
  id: string;
  dataSource: 'livestock' | 'pets' | 'zoning' | 'survey_gap' | 'trend' | 'medicine' | 'custom';
  field: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between' | 'rapid_change' | 'gap_threshold';
  value: number | string | [number, number];
  barangay?: string;
  zone?: string;
}

interface RuleAction {
  id: string;
  type: 'create_alert' | 'trigger_intervention' | 'send_notification' | 'update_analytics' | 'escalate';
  config: {
    alertLevel?: 'critical' | 'warning' | 'info';
    message?: string;
    interventionType?: string;
    notificationRecipients?: string[];
    analyticsMetric?: string;
  };
}

interface RuleEnginePanelProps {
  currentUser: {
    username: string;
    role: string;
  };
}

export function RuleEnginePanel({ currentUser }: RuleEnginePanelProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await fetch(
        `/api/rules`,
        {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }
      );
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateRules = async () => {
    setEvaluating(true);
    try {
      const response = await fetch(
        `/api/rules/evaluate`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      setEvaluationResults(data);
    } catch (error) {
      console.error('Error evaluating rules:', error);
    } finally {
      setEvaluating(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await fetch(
        `/api/rules/${ruleId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }
      );
      await loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const toggleRuleStatus = async (rule: Rule) => {
    try {
      const newStatus = rule.status === 'active' ? 'inactive' : 'active';
      await fetch(
        `/api/rules/${rule.id}`,
        {
          method: 'PUT',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
      await loadRules();
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      case 'intervention': return <Shield className="w-5 h-5" />;
      case 'analytics': return <TrendingUp className="w-5 h-5" />;
      case 'effectiveness': return <Activity className="w-5 h-5" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rule Engine</h2>
          <p className="text-gray-600 mt-1">Create and manage dynamic alert & intervention rules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={evaluateRules}
            disabled={evaluating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {evaluating ? 'Evaluating...' : 'Evaluate All Rules'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a7f] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </div>

      {/* Evaluation Results */}
      {evaluationResults && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Latest Evaluation Results</h3>
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
              {evaluationResults.triggeredCount} Rules Triggered
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{evaluationResults.results?.length || 0}</div>
              <div className="text-sm text-gray-600">Rules Evaluated</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{evaluationResults.triggeredCount}</div>
              <div className="text-sm text-gray-600">Alerts Generated</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {evaluationResults.results?.filter((r: any) => r.triggered).length || 0}
              </div>
              <div className="text-sm text-gray-600">Actions Executed</div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No rules created yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first rule to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a7f]"
            >
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    rule.category === 'alert' ? 'bg-red-100 text-red-600' :
                    rule.category === 'intervention' ? 'bg-blue-100 text-blue-600' :
                    rule.category === 'analytics' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <p className="text-gray-600 text-sm">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(rule.priority)}`}>
                    {rule.priority.toUpperCase()}
                  </span>
                  <button
                    onClick={() => toggleRuleStatus(rule)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rule.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}
                  >
                    {rule.status.toUpperCase()}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">CONDITIONS ({rule.conditions.length})</div>
                  <div className="space-y-1">
                    {rule.conditions.slice(0, 2).map((condition) => (
                      <div key={condition.id} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">{condition.field}</span> {condition.operator.replace(/_/g, ' ')} {' '}
                        <span className="text-[#2B5EA6] font-medium">
                          {Array.isArray(condition.value) ? condition.value.join('-') : condition.value}
                        </span>
                      </div>
                    ))}
                    {rule.conditions.length > 2 && (
                      <div className="text-xs text-gray-500 px-3">
                        +{rule.conditions.length - 2} more condition(s)
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">ACTIONS ({rule.actions.length})</div>
                  <div className="space-y-1">
                    {rule.actions.map((action) => (
                      <div key={action.id} className="text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">{action.type.replace(/_/g, ' ')}</span>
                        {action.config.alertLevel && (
                          <span className="ml-2 text-xs text-gray-600">({action.config.alertLevel})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Created by {rule.createdBy} • {new Date(rule.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRule) && (
        <RuleFormModal
          rule={editingRule}
          currentUser={currentUser}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingRule(null);
            loadRules();
          }}
        />
      )}
    </div>
  );
}

interface RuleFormModalProps {
  rule: Rule | null;
  currentUser: { username: string };
  onClose: () => void;
  onSave: () => void;
}

function RuleFormModal({ rule, currentUser, onClose, onSave }: RuleFormModalProps) {
  const [formData, setFormData] = useState<Partial<Rule>>(
    rule || {
      name: '',
      description: '',
      category: 'alert',
      priority: 'medium',
      status: 'testing',
      conditions: [],
      actions: [],
      zones: [],
      createdBy: currentUser.username
    }
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = rule
        ? `/api/rules/${rule.id}`
        : `/api/rules`;

      await fetch(url, {
        method: rule ? 'PUT' : 'POST',
        headers: {
          
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      onSave();
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...(formData.conditions || []),
        {
          id: `cond_${Date.now()}`,
          dataSource: 'livestock',
          field: 'swine_count',
          operator: 'greater_than',
          value: 0
        }
      ]
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...(formData.actions || []),
        {
          id: `act_${Date.now()}`,
          type: 'create_alert',
          config: {
            alertLevel: 'warning',
            message: 'Alert triggered'
          }
        }
      ]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              {rule ? 'Edit Rule' : 'Create New Rule'}
            </h3>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                >
                  <option value="alert">Alert</option>
                  <option value="intervention">Intervention</option>
                  <option value="analytics">Analytics</option>
                  <option value="effectiveness">Effectiveness</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
                >
                  <option value="testing">Testing</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Conditions</label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="text-sm text-[#2B5EA6] hover:underline"
                >
                  + Add Condition
                </button>
              </div>
              <div className="space-y-2">
                {formData.conditions && formData.conditions.length > 0 ? (
                  formData.conditions.map((cond, idx) => (
                    <div key={cond.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-700">
                        Condition {idx + 1}: {cond.field} {cond.operator} {String(cond.value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">No conditions added yet</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Actions</label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-sm text-[#2B5EA6] hover:underline"
                >
                  + Add Action
                </button>
              </div>
              <div className="space-y-2">
                {formData.actions && formData.actions.length > 0 ? (
                  formData.actions.map((action, idx) => (
                    <div key={action.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-gray-700">
                        Action {idx + 1}: {action.type}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">No actions added yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a7f] disabled:opacity-50"
            >
              {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
