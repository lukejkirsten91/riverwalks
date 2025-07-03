import React from 'react';
import Link from 'next/link';
import { Crown, Zap, FileText, Download } from 'lucide-react';
import { trackUserAction } from '../../hooks/usePerformanceMonitoring';

interface UpgradePromptProps {
  feature: 'reports' | 'export' | 'advanced';
  inline?: boolean;
  onClose?: () => void;
}

const featureConfig = {
  reports: {
    icon: FileText,
    title: 'Generate Professional Reports',
    description: 'Create stunning PDF reports with charts, maps, and analysis for your GCSE Geography coursework.',
    benefits: [
      'Professional PDF reports with charts and maps',
      'Statistical analysis and calculations',
      'GCSE Geography coursework format',
      'Unlimited report generation'
    ]
  },
  export: {
    icon: Download,
    title: 'Export Your Data',
    description: 'Export your river walk data to Excel for further analysis and custom graphs.',
    benefits: [
      'Export to Excel format',
      'Multi-sheet workbooks with raw data',
      'Perfect for creating custom graphs',
      'All measurement data included'
    ]
  },
  advanced: {
    icon: Zap,
    title: 'Advanced Features',
    description: 'Unlock collaboration, advanced analytics, and premium tools.',
    benefits: [
      'Real-time collaboration',
      'Advanced data analytics',
      'Priority support',
      'Early access to new features'
    ]
  }
};

export function UpgradePrompt({ feature, inline = false, onClose }: UpgradePromptProps) {
  const config = featureConfig[feature];
  const Icon = config.icon;

  if (inline) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
            <Crown className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 mb-1">{config.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{config.description}</p>
            <Link href="/subscription">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Upgrade Now
              </button>
            </Link>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg font-semibold"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full mx-auto shadow-2xl">
        {/* Header */}
        <div className="text-center p-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
          <p className="text-gray-600">{config.description}</p>
        </div>

        {/* Benefits */}
        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
          <ul className="space-y-2 mb-6">
            {config.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center text-gray-700">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-900">£1.99/year</div>
                <div className="text-sm text-blue-600">or £3.49 lifetime</div>
              </div>
              <div className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded">
                Less than 40p per month!
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/subscription" className="flex-1">
              <button 
                onClick={() => trackUserAction('premium_feature_attempted', { feature, source: 'upgrade_prompt' })}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Upgrade Now
              </button>
            </Link>
            {onClose && (
              <button 
                onClick={() => {
                  trackUserAction('premium_feature_dismissed', { feature, source: 'upgrade_prompt' });
                  onClose();
                }}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Maybe Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}