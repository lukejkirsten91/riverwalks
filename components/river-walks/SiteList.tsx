import { MapPin, Trash2, Ruler } from 'lucide-react';
import { InlineEdit } from '../ui/InlineEdit';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import type { Site } from '../../types';

interface SiteListProps {
  sites: Site[];
  onEditMeasurements: (site: Site) => void;
  onEditSite: (site: Site) => void;
  onUpdateSite: (id: string, field: 'river_width', value: number) => Promise<void>;
  onDeleteSite: (site: Site) => void;
  onAddNewSite: () => void;
}

export function SiteList({
  sites,
  onEditMeasurements,
  onEditSite,
  onUpdateSite,
  onDeleteSite,
  onAddNewSite,
}: SiteListProps) {
  if (sites.length === 0) {
    return (
      <div className="card-modern-xl p-8 text-center">
        <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No Sites Yet</h3>
        <p className="text-muted-foreground mb-6">Add your first measurement site to start collecting data.</p>
        <button
          onClick={onAddNewSite}
          className="btn-primary touch-manipulation"
        >
          + Add First Site
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
            Measurement Sites
          </h3>
          <p className="text-muted-foreground text-sm">
            {sites.length} {sites.length === 1 ? 'site' : 'sites'} configured
          </p>
        </div>
        <button
          onClick={onAddNewSite}
          className="btn-primary touch-manipulation"
        >
          + Add New Site
        </button>
      </div>

      {sites.map((site) => (
        <div key={site.id} className="card-modern-xl p-6">
          {/* Site header */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {/* Site photo or camera emoji */}
                {site.photo_url ? (
                  <div className="relative">
                    <img
                      src={site.photo_url}
                      alt={`${site.site_name} photo`}
                      className="w-12 h-12 rounded-lg object-cover border border-border shadow-modern"
                      onError={(e) => {
                        console.error('Image failed to load:', site.photo_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border shadow-modern">
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">
                    Site {site.site_number}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  <span>Width: </span>
                  <InlineNumberEdit
                    value={parseFloat(site.river_width.toString())}
                    onSave={(value) => onUpdateSite(site.id, 'river_width', value)}
                    suffix="m"
                    min={0.1}
                    step={0.1}
                    decimals={1}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons and progress */}
            <div className="flex flex-col gap-3">
              {/* Todo Progress */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`text-xs px-2 py-1 rounded border ${
                  site.todo_site_info_status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                  site.todo_site_info_status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  Site Info: {site.todo_site_info_status === 'complete' ? '✓' : 
                           site.todo_site_info_status === 'in_progress' ? '⏳' : '○'}
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${
                  site.todo_cross_section_status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                  site.todo_cross_section_status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  Cross-Section: {site.todo_cross_section_status === 'complete' ? '✓' : 
                                 site.todo_cross_section_status === 'in_progress' ? '⏳' : '○'}
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${
                  site.todo_velocity_status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                  site.todo_velocity_status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  Velocity: {site.todo_velocity_status === 'complete' ? '✓' : 
                            site.todo_velocity_status === 'in_progress' ? '⏳' : '○'}
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${
                  site.todo_sediment_status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                  site.todo_sediment_status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  Sediment: {site.todo_sediment_status === 'complete' ? '✓' : 
                            site.todo_sediment_status === 'in_progress' ? '⏳' : '○'}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onEditMeasurements(site)}
                  className="btn-primary touch-manipulation"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Manage Site Tasks
                </button>
                <button
                  onClick={() => onDeleteSite(site)}
                  className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-destructive/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
