import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  Shield,
  BarChart3,
  Brain,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-y-auto">
      {/* Hero Section with Gradient Background */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-ps-secondary-700 via-ps-primary-600 to-ps-primary-500 dark:from-ps-secondary-900 dark:via-ps-primary-800 dark:to-ps-primary-700">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-ps-secondary-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="size-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="text-white" size={32} />
              </div>
              <h2 className="text-4xl font-bold text-white">Lumina Scope</h2>
            </div>

            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Transform Your
              <br />
              <span className="text-ps-primary-100">RFP Response Process</span>
            </h1>

            <p className="text-xl lg:text-2xl text-ps-primary-50 mb-12 max-w-3xl mx-auto leading-relaxed">
              AI-powered RFP automation for pharmaceutical primary market research.
              Win more bids with intelligent proposals, faster turnaround, and precision pricing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="group bg-white hover:bg-ps-primary-50 text-ps-primary-600 px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
              <Link
                href="/dashboard"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/30 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              >
                View Demo
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-ps-primary-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} />
                <span className="text-lg">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} />
                <span className="text-lg">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} />
                <span className="text-lg">SOC 2 Certified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-neutral-0 dark:bg-neutral-950">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-neutral-0 mb-4">
              Complete RFP Automation
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              From intake to proposal delivery, Lumina Scope handles every step of your RFP response workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<FileText className="w-10 h-10" />}
              title="RFP Intake"
              description="Automatically parse and extract requirements from RFP documents, emails, and PDFs"
              gradient="from-ps-primary-500 to-ps-primary-600"
            />
            <FeatureCard
              icon={<Brain className="w-10 h-10" />}
              title="AI Analysis"
              description="Multi-agent AI system identifies gaps, generates clarifications, and validates scope"
              gradient="from-ps-secondary-500 to-ps-secondary-600"
            />
            <FeatureCard
              icon={<Users className="w-10 h-10" />}
              title="HCP Matching"
              description="Intelligent matching from 500+ internal HCP database with specialty filtering"
              gradient="from-success to-[#22C55E]"
            />
            <FeatureCard
              icon={<TrendingUp className="w-10 h-10" />}
              title="Smart Pricing"
              description="WBS estimation and pricing calculation with detailed cost breakdown"
              gradient="from-info to-[#06B6D4]"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-neutral-0 mb-6">
                Why Teams Choose Lumina Scope
              </h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
                Purpose-built for pharmaceutical market research firms to win more RFPs faster
              </p>

              <div className="space-y-6">
                <BenefitItem
                  icon={<Clock className="text-ps-primary-600 dark:text-ps-primary-400" size={24} />}
                  title="10x Faster Proposals"
                  description="Reduce proposal creation time from days to hours with AI-powered automation"
                />
                <BenefitItem
                  icon={<Target className="text-success" size={24} />}
                  title="Higher Win Rates"
                  description="Data-driven insights and competitive pricing increase your win probability"
                />
                <BenefitItem
                  icon={<Shield className="text-ps-secondary-600 dark:text-ps-secondary-400" size={24} />}
                  title="Consistent Quality"
                  description="Standardized templates and quality checks ensure every proposal meets high standards"
                />
                <BenefitItem
                  icon={<BarChart3 className="text-info" size={24} />}
                  title="Full Visibility"
                  description="Track every RFP from intake to delivery with real-time progress monitoring"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-12 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="space-y-8">
                <StatItem number="50+" label="RFPs Processed Monthly" />
                <StatItem number="85%" label="Average Win Rate" />
                <StatItem number="72hrs" label="Average Response Time" />
                <StatItem number="$2.4M" label="Contracts Won (YTD)" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-ps-primary-600 via-ps-primary-500 to-ps-secondary-600 dark:from-ps-primary-800 dark:via-ps-primary-700 dark:to-ps-secondary-800">
        <div className="container mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your RFP Process?
          </h2>
          <p className="text-xl text-ps-primary-50 mb-12 max-w-2xl mx-auto">
            Join leading pharmaceutical research firms using AI to win more bids
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white hover:bg-ps-primary-50 text-ps-primary-600 px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
            <Link
              href="mailto:sales@petasight.com"
              className="bg-transparent hover:bg-white/10 border-2 border-white text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-950 dark:bg-neutral-950 border-t border-neutral-800">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="size-10 bg-ps-primary-600 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-white">Lumina Scope</span>
            </div>
            <p className="text-neutral-400 text-sm">
              © 2026 PetaSight. All rights reserved. | Powered by AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-neutral-200 dark:border-neutral-800 hover:scale-105">
      <div className={`inline-flex items-center justify-center p-4 rounded-xl bg-gradient-to-br ${gradient} mb-6 text-white`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-0 mb-3">{title}</h3>
      <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
    </div>
  );
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 size-12 rounded-xl bg-white dark:bg-neutral-900 flex items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-800">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-0 mb-1">{title}</h4>
        <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
    </div>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl font-bold text-ps-primary-600 dark:text-ps-primary-400 mb-2">{number}</div>
      <div className="text-neutral-600 dark:text-neutral-400 font-medium">{label}</div>
    </div>
  );
}
