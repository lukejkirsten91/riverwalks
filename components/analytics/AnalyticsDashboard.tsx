import { useState, useEffect } from 'react';
import { BarChart3, Users, TrendingUp, MousePointer, ShoppingCart, FileText, Mail } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  newUsers: number;
  pageViews: number;
  sessionDuration: string;
  conversionRate: number;
  topPages: Array<{ page: string; views: number }>;
  recentEvents: Array<{ event: string; count: number; timestamp: string }>;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // This would connect to Google Analytics Reporting API
      // For now, showing mock data structure
      const mockData: AnalyticsData = {
        totalUsers: 1243,
        newUsers: 156,
        pageViews: 4521,
        sessionDuration: '3:24',
        conversionRate: 2.4,
        topPages: [
          { page: '/', views: 1234 },
          { page: '/river-walks', views: 892 },
          { page: '/subscription', views: 234 },
          { page: '/privacy', views: 123 }
        ],
        recentEvents: [
          { event: 'sign_up', count: 23, timestamp: '2 hours ago' },
          { event: 'report_generated', count: 67, timestamp: '4 hours ago' },
          { event: 'upgrade_prompt_shown', count: 145, timestamp: '6 hours ago' }
        ]
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      title: 'Total Users',
      value: data?.totalUsers?.toLocaleString() || '0',
      icon: Users,
      change: '+12%',
      color: 'text-blue-600'
    },
    {
      title: 'New Users',
      value: data?.newUsers?.toLocaleString() || '0',
      icon: TrendingUp,
      change: '+8%',
      color: 'text-green-600'
    },
    {
      title: 'Page Views',
      value: data?.pageViews?.toLocaleString() || '0',
      icon: MousePointer,
      change: '+15%',
      color: 'text-purple-600'
    },
    {
      title: 'Conversion Rate',
      value: `${data?.conversionRate || 0}%`,
      icon: ShoppingCart,
      change: '+0.3%',
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your Riverwalks platform performance</p>
        </div>
        
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <span className="text-sm text-green-600 font-medium">{metric.change}</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {data?.topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="text-sm text-gray-900">{page.page}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{page.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
          <div className="space-y-3">
            {data?.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">{event.event}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-600">{event.count}</div>
                  <div className="text-xs text-gray-500">{event.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Key Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">📈 Growth Opportunities</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Conversion rate is {data?.conversionRate}% - industry average is 2-3%</li>
              <li>• Consider A/B testing the upgrade prompts</li>
              <li>• New user retention looks healthy</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">🎯 Action Items</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Optimize subscription page (high traffic, low conversion)</li>
              <li>• Add more educational content to home page</li>
              <li>• Consider guided onboarding for new users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}