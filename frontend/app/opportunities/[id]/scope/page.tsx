'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Users, DollarSign, Clock, Target } from 'lucide-react';

interface SampleSizeOption {
  label: string;
  n: number;
  segments?: { segment: string; n: number }[];
  confidenceInterval: string;
  estimatedCost: number;
  fieldDurationWeeks: number;
  feasibilityScore: number;
  rationale: string;
}

interface ScopeAssumption {
  assumptionId: string;
  category: string;
  assumption: string;
  isStandard: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  requiresClientConfirmation: boolean;
}

interface ScopeData {
  id: string;
  detectedStudyType: {
    typeCode: string;
    displayName: string;
    familyName: string;
    confidence: number;
  };
  sampleSizeOptions: SampleSizeOption[];
  hcpShortlist?: any[];
  scopeAssumptions: ScopeAssumption[];
  estimatedTotalCost: {
    conservative: number;
    recommended: number;
    aggressive: number;
  };
  status: string;
  selectedOption?: string;
}

export default function ScopePlanningPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [scope, setScope] = useState<ScopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string>('recommended');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sample', 'timeline']));
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchScope();
  }, [opportunityId]);

  const fetchScope = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/scope`);
      if (res.ok) {
        const data = await res.json();
        setScope(data.scope);
        if (data.scope.selectedOption) {
          setSelectedOption(data.scope.selectedOption);
        }
      }
    } catch (error) {
      console.error('Failed to fetch scope:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/scope/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('userId'),
          selectedOption,
        }),
      });

      if (res.ok) {
        router.push(`/opportunities/${opportunityId}`);
      } else {
        alert('Failed to approve scope');
      }
    } catch (error) {
      console.error('Failed to approve scope:', error);
      alert('Failed to approve scope');
    } finally {
      setApproving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!scope) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No scope plan found</h2>
          <p className="text-muted-foreground mb-4">The scope planning step may not have been completed yet.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const groupedAssumptions = scope.scopeAssumptions.reduce((acc, assumption) => {
    if (!acc[assumption.category]) {
      acc[assumption.category] = [];
    }
    acc[assumption.category].push(assumption);
    return acc;
  }, {} as Record<string, ScopeAssumption[]>);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            ← Back to Opportunity
          </button>
          <h1 className="text-2xl font-bold text-foreground">Scope Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve the recommended scope, sample size, and assumptions
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Study Type Detection */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Detected Study Type</h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI-detected from RFP requirements and objectives
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <span className="text-sm font-semibold text-foreground">
                {(scope.detectedStudyType.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xl font-bold text-primary">{scope.detectedStudyType.displayName}</div>
              <div className="text-sm text-muted-foreground mt-1">{scope.detectedStudyType.familyName}</div>
            </div>
          </div>
        </div>

        {/* Sample Size Options */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sample Size Options</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select the sample size approach that best fits your project goals and budget
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {scope.sampleSizeOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => setSelectedOption(option.label)}
                className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                  selectedOption === option.label
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selectedOption === option.label && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground capitalize">{option.label}</h3>
                  <div className="text-3xl font-bold text-primary mt-2">n = {option.n}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{option.confidenceInterval}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">
                      ${option.estimatedCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{option.fieldDurationWeeks} weeks</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Feasibility</div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${option.feasibilityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {option.segments && option.segments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Segments:</div>
                    {option.segments.map((seg, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">{seg.segment}</span>
                        <span className="text-muted-foreground">n = {seg.n}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs text-muted-foreground">{option.rationale}</div>
              </button>
            ))}
          </div>
        </div>

        {/* HCP Shortlist */}
        {scope.hcpShortlist && scope.hcpShortlist.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">HCP Shortlist</h2>
              <span className="text-sm text-muted-foreground">({scope.hcpShortlist.length} profiles)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Specialty</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Geography</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Practice</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {scope.hcpShortlist.slice(0, 10).map((hcp, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 px-3 text-foreground">{hcp.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{hcp.specialty}</td>
                      <td className="py-2 px-3 text-muted-foreground">{hcp.geography}</td>
                      <td className="py-2 px-3 text-muted-foreground">{hcp.practiceType}</td>
                      <td className="py-2 px-3 text-center">
                        {hcp.internalSignal ? (
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        ) : (
                          <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {scope.hcpShortlist.length > 10 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Showing 10 of {scope.hcpShortlist.length} profiles
              </div>
            )}
          </div>
        )}

        {/* Scope Assumptions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Scope Assumptions</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Review key assumptions for this project. High-risk assumptions may require client confirmation.
          </p>

          <div className="space-y-2">
            {Object.entries(groupedAssumptions).map(([category, assumptions]) => (
              <div key={category} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground capitalize">{category}</span>
                    <span className="text-xs text-muted-foreground">({assumptions.length})</span>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {expandedCategories.has(category) && (
                  <div className="p-4 pt-0 space-y-3">
                    {assumptions.map((assumption) => (
                      <div key={assumption.assumptionId} className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {assumption.riskLevel === 'high' ? (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          ) : assumption.riskLevel === 'medium' ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-foreground">{assumption.assumption}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(assumption.riskLevel)}`}>
                              {assumption.riskLevel}
                            </span>
                            {assumption.isStandard && (
                              <span className="text-xs text-muted-foreground">Standard</span>
                            )}
                            {assumption.requiresClientConfirmation && (
                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                ⚠ Requires confirmation
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Approve Button */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6 -mx-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Selected option: <span className="font-semibold text-foreground capitalize">{selectedOption}</span>
              {' '}({scope.sampleSizeOptions.find((o) => o.label === selectedOption)?.n} completes)
            </div>
            <button
              onClick={handleApprove}
              disabled={approving || scope.status === 'approved'}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {approving ? 'Approving...' : scope.status === 'approved' ? 'Already Approved' : 'Approve & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
