'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Palette, Zap, DollarSign, Users, Save, Settings2, Shield, Database } from 'lucide-react';
import { getCurrentUser, setWorkflowMode, getWorkflowMode } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [workflowMode, setWorkflowModeState] = useState<'automated' | 'manual'>(getWorkflowMode());
  const [notifications, setNotifications] = useState({
    email: true,
    bidUpdates: true,
    agentAlerts: false,
    weeklyDigest: true
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
  }, [router]);

  const user = getCurrentUser();

  const handleWorkflowModeChange = (mode: 'automated' | 'manual') => {
    setWorkflowMode(mode);
    setWorkflowModeState(mode);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'workflow', label: 'Workflow', icon: Zap },
    { id: 'pricing', label: 'Rate Cards', icon: DollarSign },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Database }
  ];

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => alert('Settings saved successfully!')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </header>

      {/* Content with Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Settings Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 overflow-auto p-8 bg-background-light dark:bg-background-dark">
          {activeTab === 'profile' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Profile Settings</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Manage your account information and preferences
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center">
                    <User className="text-white" size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
                    <p className="text-xs text-slate-500 mt-1">{user?.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.name}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.role}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Notification Preferences</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Choose how you want to receive updates and alerts
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                {[
                  { key: 'email', label: 'Email Notifications', description: 'Receive email updates for important events' },
                  { key: 'bidUpdates', label: 'Bid Status Updates', description: 'Get notified when bid status changes' },
                  { key: 'agentAlerts', label: 'Agent Alerts', description: 'Receive alerts when agents require human intervention' },
                  { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Get a weekly summary of your pipeline activity' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800 last:border-0">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-primary'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-6'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Appearance</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Customize how Lumina Scope looks
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => setTheme(themeOption)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === themeOption
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br from-primary to-cyan-600" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                            {themeOption}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Brand Colors</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-2">Primary Color</p>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary border border-slate-200 dark:border-slate-700" />
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">#0e7490</span>
                      </div>
                    </div>
                    <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-2">Sidebar Color</p>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-navy-sidebar border border-slate-200 dark:border-slate-700" />
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">#0F172A</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Workflow Settings</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Configure how the AI workflow processes bids
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Workflow Mode</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleWorkflowModeChange('automated')}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        workflowMode === 'automated'
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Zap className={`mb-3 ${workflowMode === 'automated' ? 'text-primary' : 'text-slate-400'}`} size={24} />
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Automated</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Agents automatically process each step with minimal human intervention
                      </p>
                    </button>

                    <button
                      onClick={() => handleWorkflowModeChange('manual')}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        workflowMode === 'manual'
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Settings2 className={`mb-3 ${workflowMode === 'manual' ? 'text-primary' : 'text-slate-400'}`} size={24} />
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Manual</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Require approval at each step before proceeding to the next
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Zap className="text-primary mt-0.5" size={20} />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Current Mode: {workflowMode === 'automated' ? 'Automated' : 'Manual'}
                      </h4>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        {workflowMode === 'automated'
                          ? 'Steps 1-3 will auto-advance. Step 4 (Clarifications) requires approval.'
                          : 'All steps require manual approval before proceeding to the next.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Rate Card Configuration</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Manage hourly rates and pricing models
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="space-y-4">
                  {[
                    { role: 'Senior Director', rate: 350, utilization: 20 },
                    { role: 'Project Director', rate: 275, utilization: 40 },
                    { role: 'Senior Manager', rate: 200, utilization: 60 },
                    { role: 'Project Manager', rate: 150, utilization: 80 },
                    { role: 'Research Analyst', rate: 100, utilization: 100 },
                    { role: 'Data Analyst', rate: 90, utilization: 100 }
                  ].map((item) => (
                    <div key={item.role} className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800 last:border-0">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{item.role}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Utilization: {item.utilization}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">${item.rate}</span>
                        <span className="text-xs text-slate-500">/hour</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Team Management</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Manage team members and permissions
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Team Management</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Invite team members and manage their access levels
                  </p>
                  <button className="px-4 py-2 bg-primary hover:bg-cyan-800 text-white rounded-lg text-sm font-semibold transition-colors">
                    Invite Team Member
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Security Settings</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Manage your account security and authentication
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Security Features</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Two-factor authentication and advanced security options coming soon
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Integrations</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Connect external tools and services
              </p>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="text-center py-12">
                  <Database className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">External Integrations</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Salesforce, HubSpot, and other CRM integrations coming soon
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
