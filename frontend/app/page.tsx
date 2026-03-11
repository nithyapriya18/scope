import Link from 'next/link';
import { FileText, TrendingUp, Users, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ps-primary-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to <span className="text-ps-primary-600 dark:text-ps-primary-400 dark:text-ps-primary-400">Lumina Scope</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            AI-Driven RFP Response System for Pharmaceutical Primary Market Research
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-ps-primary-600 hover:bg-ps-primary-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 dark:border-gray-600 hover:border-ps-primary-600 dark:hover:border-ps-primary-400 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<FileText className="w-8 h-8 text-ps-primary-600 dark:text-ps-primary-400" />}
            title="RFP Intake"
            description="Automatically parse and extract requirements from RFP documents"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-ps-primary-600 dark:text-ps-primary-400" />}
            title="AI-Powered"
            description="Multi-agent system with human-in-loop approval checkpoints"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-ps-primary-600 dark:text-ps-primary-400" />}
            title="HCP Matching"
            description="Intelligent matching from internal HCP database"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 text-ps-primary-600 dark:text-ps-primary-400" />}
            title="Automated Pricing"
            description="WBS estimation and pricing calculation with detailed breakdown"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-all border border-transparent dark:border-gray-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  );
}
