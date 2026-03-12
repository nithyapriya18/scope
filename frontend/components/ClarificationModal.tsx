'use client';

import { X, MessageSquare, Send, Download, Copy, CheckCircle, AlertCircle, Info, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { useState } from 'react';

interface ClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clarification: any;
  gapAnalysis?: any;
  rfpTitle: string;
  clientName?: string;
  onApprove?: () => void;
  isCompleted?: boolean;
}

export default function ClarificationModal({
  isOpen,
  onClose,
  clarification,
  gapAnalysis,
  rfpTitle,
  clientName,
  onApprove,
  isCompleted = false,
}: ClarificationModalProps) {
  const [copied, setCopied] = useState(false);
  const [approving, setApproving] = useState(false);

  // Parse initial questions
  const parseQuestions = () => {
    if (clarification.questions) {
      if (typeof clarification.questions === 'string') {
        try {
          return JSON.parse(clarification.questions);
        } catch (e) {
          console.error('Failed to parse clarification questions:', e);
          return [];
        }
      } else if (Array.isArray(clarification.questions)) {
        return clarification.questions;
      }
    }
    return [];
  };

  const [questions, setQuestions] = useState(parseQuestions());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    category: 'other',
    priority: 'medium',
    question: '',
    context: '',
    suggestedOptions: ['']
  });

  // Assumptions state
  const [assumptions, setAssumptions] = useState(gapAnalysis?.assumptions_made || []);
  const [editingAssumptionIndex, setEditingAssumptionIndex] = useState<number | null>(null);
  const [editedAssumption, setEditedAssumption] = useState<any>(null);
  const [isAddingNewAssumption, setIsAddingNewAssumption] = useState(false);
  const [newAssumption, setNewAssumption] = useState({
    assumption: '',
    basedOn: '',
    needsValidation: true
  });

  if (!isOpen || !clarification) return null;

  const handleEditQuestion = (index: number) => {
    setEditingIndex(index);
    setEditedQuestion({ ...questions[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editedQuestion) {
      const updated = [...questions];
      updated[editingIndex] = editedQuestion;
      setQuestions(updated);
      setEditingIndex(null);
      setEditedQuestion(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedQuestion(null);
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updated = questions.filter((_: any, i: number) => i !== index);
      setQuestions(updated);
    }
  };

  const handleAddNewQuestion = () => {
    if (newQuestion.question.trim()) {
      setQuestions([...questions, { ...newQuestion }]);
      setNewQuestion({
        category: 'other',
        priority: 'medium',
        question: '',
        context: '',
        suggestedOptions: ['']
      });
      setIsAddingNew(false);
    }
  };

  // Assumption handlers
  const handleEditAssumption = (index: number) => {
    setEditingAssumptionIndex(index);
    setEditedAssumption({ ...assumptions[index] });
  };

  const handleSaveAssumptionEdit = () => {
    if (editingAssumptionIndex !== null && editedAssumption) {
      const updated = [...assumptions];
      updated[editingAssumptionIndex] = editedAssumption;
      setAssumptions(updated);
      setEditingAssumptionIndex(null);
      setEditedAssumption(null);
    }
  };

  const handleCancelAssumptionEdit = () => {
    setEditingAssumptionIndex(null);
    setEditedAssumption(null);
  };

  const handleDeleteAssumption = (index: number) => {
    if (confirm('Are you sure you want to delete this assumption?')) {
      const updated = assumptions.filter((_: any, i: number) => i !== index);
      setAssumptions(updated);
    }
  };

  const handleAddNewAssumption = () => {
    if (newAssumption.assumption.trim()) {
      setAssumptions([...assumptions, { ...newAssumption }]);
      setNewAssumption({
        assumption: '',
        basedOn: '',
        needsValidation: true
      });
      setIsAddingNewAssumption(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!onApprove) return;

    setApproving(true);
    try {
      // Save updated questions and mark as approved
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${clarification.opportunity_id}/clarifications/${clarification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, assumptions, approved: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to save questions and assumptions');
      }

      // Format email text and open mailto
      const emailText = formatEmailText();
      const subject = `Clarification Questions - ${rfpTitle}`;

      // Extract body (everything after the subject line)
      const bodyText = emailText.split('\n\n').slice(1).join('\n\n');

      // Create mailto link
      const mailtoLink = `mailto:nithya@petasight.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

      // Open mailto link
      window.location.href = mailtoLink;

      // Refresh to show upload/skip buttons
      if (onApprove) {
        await onApprove();
      }
      onClose();
    } catch (error) {
      console.error('Error approving clarifications:', error);
      alert('Failed to approve and send. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleCopyEmail = () => {
    const emailText = formatEmailText();
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const emailText = formatEmailText();
    const blob = new Blob([emailText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clarification_Questions_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatEmailText = () => {
    let text = `Subject: Clarification Questions - ${rfpTitle}\n\n`;
    text += `Dear ${clientName || 'Client'},\n\n`;
    text += `Thank you for the opportunity to respond to your RFP for "${rfpTitle}". `;
    text += `To ensure we provide the most accurate and comprehensive proposal, we would appreciate clarification on the following points:\n\n`;

    // Add Clarification Questions section
    text += `═══════════════════════════════════════════════════════\n`;
    text += `CLARIFICATION QUESTIONS\n`;
    text += `═══════════════════════════════════════════════════════\n\n`;

    questions.forEach((q: any, idx: number) => {
      text += `${idx + 1}. ${q.category ? `[${q.category.toUpperCase()}] ` : ''}${q.question}\n`;
      if (q.context) {
        text += `   Context: ${q.context}\n`;
      }
      if (q.suggestedOptions && Array.isArray(q.suggestedOptions)) {
        text += `   Suggested Options:\n`;
        q.suggestedOptions.forEach((option: string) => {
          text += `      • ${option}\n`;
        });
      }
      text += `\n`;
    });

    // Add Assumptions section if available
    const assumptions = gapAnalysis?.assumptions_made || [];
    if (assumptions.length > 0) {
      text += `\n═══════════════════════════════════════════════════════\n`;
      text += `ASSUMPTIONS FOR YOUR REVIEW\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;
      text += `Due to incomplete information in the RFP, we have made the following assumptions for proposal purposes. `;
      text += `Please confirm these assumptions or provide corrections:\n\n`;

      assumptions.forEach((assumption: any, idx: number) => {
        text += `${idx + 1}. ${assumption.assumption}\n`;
        if (assumption.basedOn) {
          text += `   Based on: ${assumption.basedOn}\n`;
        }
        if (assumption.needsValidation) {
          text += `   ⚠️  REQUIRES CLIENT VALIDATION\n`;
        }
        text += `   ☐ Confirmed  ☐ Revise (please comment)\n\n`;
      });
    }

    text += `\n═══════════════════════════════════════════════════════\n\n`;
    text += `We look forward to your response and appreciate your time in addressing these questions and confirming our assumptions.\n\n`;
    text += `Best regards,\n`;
    text += `[Your Name]\n`;
    text += `[Your Company]\n`;

    return text;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      {/* Copy Success Toast */}
      {copied && (
        <div className="fixed top-4 right-4 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Email text copied to clipboard!</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clarification Questions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{rfpTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyEmail}
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Copy className="w-4 h-4" />
              Copy Email
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Questions"
              value={questions.length}
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            />
            <StatCard
              label="Critical"
              value={questions.filter((q: any) => q.priority?.toLowerCase() === 'critical').length}
              color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            />
            <StatCard
              label="High Priority"
              value={questions.filter((q: any) => q.priority?.toLowerCase() === 'high').length}
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
            />
            <StatCard
              label="Medium/Low"
              value={
                questions.filter(
                  (q: any) => !q.priority || ['medium', 'low'].includes(q.priority?.toLowerCase())
                ).length
              }
              color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
            />
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.map((question: any, idx: number) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
              >
                {editingIndex === idx ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={editedQuestion.category}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, category: e.target.value })}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="scope">Scope</option>
                        <option value="deliverables">Deliverables</option>
                        <option value="sample">Sample</option>
                        <option value="methodology">Methodology</option>
                        <option value="timeline">Timeline</option>
                        <option value="budget">Budget</option>
                        <option value="other">Other</option>
                      </select>
                      <select
                        value={editedQuestion.priority}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, priority: e.target.value })}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <textarea
                      value={editedQuestion.question}
                      onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                      placeholder="Question"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={2}
                    />
                    <textarea
                      value={editedQuestion.context || ''}
                      onChange={(e) => setEditedQuestion({ ...editedQuestion, context: e.target.value })}
                      placeholder="Context (why this matters)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={2}
                    />
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                        Suggested Options (one per line)
                      </label>
                      <textarea
                        value={(editedQuestion.suggestedOptions || []).join('\n')}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, suggestedOptions: e.target.value.split('\n').filter(o => o.trim()) })}
                        placeholder="Option 1\nOption 2\nOption 3"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg"
                      >
                        <Save size={14} /> Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {question.category && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {question.category}
                            </span>
                          )}
                          {question.priority && (
                            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${getPriorityColor(question.priority)}`}>
                              {question.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                          {question.question}
                        </p>
                        {question.context && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <strong className="text-gray-700 dark:text-gray-300">Context:</strong> {question.context}
                          </p>
                        )}
                        {question.suggestedOptions && Array.isArray(question.suggestedOptions) && question.suggestedOptions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Suggested Options:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {question.suggestedOptions.map((option: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEditQuestion(idx)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit question"
                      >
                        <Edit2 size={16} className="text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add New Question Form */}
            {isAddingNew && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 mb-3">Add New Question</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                      className="px-3 py-1.5 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="scope">Scope</option>
                      <option value="deliverables">Deliverables</option>
                      <option value="sample">Sample</option>
                      <option value="methodology">Methodology</option>
                      <option value="timeline">Timeline</option>
                      <option value="budget">Budget</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={newQuestion.priority}
                      onChange={(e) => setNewQuestion({ ...newQuestion, priority: e.target.value })}
                      className="px-3 py-1.5 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <textarea
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    placeholder="Enter your question..."
                    className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <textarea
                    value={newQuestion.context}
                    onChange={(e) => setNewQuestion({ ...newQuestion, context: e.target.value })}
                    placeholder="Context (why this matters)..."
                    className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <textarea
                    value={newQuestion.suggestedOptions.join('\n')}
                    onChange={(e) => setNewQuestion({ ...newQuestion, suggestedOptions: e.target.value.split('\n').filter(o => o.trim()) })}
                    placeholder="Suggested options (one per line)..."
                    className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewQuestion}
                      className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg"
                    >
                      <Plus size={14} /> Add Question
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewQuestion({ category: 'other', priority: 'medium', question: '', context: '', suggestedOptions: [''] });
                      }}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add New Question Button */}
            {!isAddingNew && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              >
                <Plus size={20} />
                <span className="font-medium">Add Manual Question</span>
              </button>
            )}
          </div>

          {/* Assumptions Section */}
          {assumptions && assumptions.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assumptions for Client Review</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Due to incomplete information in the RFP, we have made the following assumptions. Please confirm or provide corrections:
              </p>
              <div className="space-y-3">
                {assumptions.map((assumption: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800"
                  >
                    {editingAssumptionIndex === idx ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <textarea
                          value={editedAssumption.assumption}
                          onChange={(e) => setEditedAssumption({ ...editedAssumption, assumption: e.target.value })}
                          placeholder="Assumption statement"
                          className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          rows={2}
                        />
                        <textarea
                          value={editedAssumption.basedOn || ''}
                          onChange={(e) => setEditedAssumption({ ...editedAssumption, basedOn: e.target.value })}
                          placeholder="Based on (reasoning)"
                          className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          rows={2}
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editedAssumption.needsValidation}
                            onChange={(e) => setEditedAssumption({ ...editedAssumption, needsValidation: e.target.checked })}
                            className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Requires client validation</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveAssumptionEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button
                            onClick={handleCancelAssumptionEdit}
                            className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-bold rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              {assumption.assumption}
                            </p>
                            {assumption.basedOn && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <strong>Based on:</strong> {assumption.basedOn}
                              </p>
                            )}
                            {assumption.needsValidation && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase">
                                  Requires Client Validation
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditAssumption(idx)}
                            className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                            title="Edit assumption"
                          >
                            <Edit2 size={16} className="text-orange-600 dark:text-orange-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssumption(idx)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete assumption"
                          >
                            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Assumption Form */}
                {isAddingNewAssumption && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300 mb-3">Add New Assumption</h4>
                    <div className="space-y-3">
                      <textarea
                        value={newAssumption.assumption}
                        onChange={(e) => setNewAssumption({ ...newAssumption, assumption: e.target.value })}
                        placeholder="Enter assumption statement..."
                        className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows={2}
                      />
                      <textarea
                        value={newAssumption.basedOn}
                        onChange={(e) => setNewAssumption({ ...newAssumption, basedOn: e.target.value })}
                        placeholder="Based on (reasoning)..."
                        className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows={2}
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newAssumption.needsValidation}
                          onChange={(e) => setNewAssumption({ ...newAssumption, needsValidation: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Requires client validation</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddNewAssumption}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg"
                        >
                          <Plus size={14} /> Add Assumption
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNewAssumption(false);
                            setNewAssumption({ assumption: '', basedOn: '', needsValidation: true });
                          }}
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add New Assumption Button */}
                {!isAddingNewAssumption && (
                  <button
                    onClick={() => setIsAddingNewAssumption(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-all"
                  >
                    <Plus size={20} />
                    <span className="font-medium">Add Manual Assumption</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Email Preview Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Preview</h3>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 font-mono text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {formatEmailText()}
            </div>
          </div>

          {/* Action Note */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-1">
                Human Review Required
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                Please review all questions before sending to the client. You can copy the email text or download
                it as a file to send through your preferred email client.
              </p>
            </div>
          </div>
        </div>

        {/* Approve & Send Button - Sticky Footer */}
        {onApprove && (
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(clarification.status === 'sent' || isCompleted) ? 'Already sent to client' : 'Ready to send to client?'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {(clarification.status === 'sent' || isCompleted)
                    ? 'Email has been sent. Use the refresh button to resend if needed.'
                    : 'This will mark clarifications as approved and proceed to the next step'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveAndSend}
                  disabled={approving || clarification.status === 'sent' || isCompleted}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg shadow-lg transition-all ${
                    approving || clarification.status === 'sent' || isCompleted
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-100 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white hover:shadow-xl'
                  }`}
                >
                  {approving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (clarification.status === 'sent' || isCompleted) ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Already Sent
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Approve & Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="text-2xl font-black mb-1">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}
