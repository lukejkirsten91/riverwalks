import { getEnvironmentInfo } from '../../lib/environment';

/**
 * Environment badge component
 * Shows environment indicator in non-production environments
 */
export function EnvironmentBadge() {
  const envInfo = getEnvironmentInfo();
  
  // Don't show badge in production
  if (!envInfo.show) {
    return null;
  }
  
  const colorClasses: { [key: string]: string } = {
    blue: 'bg-blue-500 text-white',
    orange: 'bg-orange-500 text-white', 
    green: 'bg-green-500 text-white'
  };
  
  return (
    <div className="fixed top-0 left-0 z-50 pointer-events-none">
      <div className={`
        px-2 py-1 text-xs font-medium rounded-br-lg shadow-lg
        ${colorClasses[envInfo.color] || 'bg-gray-500 text-white'}
      `}>
        {envInfo.name}
      </div>
    </div>
  );
}