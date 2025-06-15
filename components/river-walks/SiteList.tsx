import { MapPin, Edit, Trash2, Plus, Ruler } from 'lucide-react';
import type { Site } from '../../types';

interface SiteListProps {
  sites: Site[];
  onEditMeasurements: (site: Site) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (site: Site) => void;
  onAddNewSite: () => void;
}

export function SiteList({
  sites,
  onEditMeasurements,
  onEditSite,
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
          <Plus className="w-5 h-5 mr-2" />
          Add First Site
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
          <Plus className="w-5 h-5 mr-2" />
          Add New Site
        </button>
      </div>

      {sites.map((site) => (
        <div key={site.id} className="card-modern-xl p-6">
          {/* Site header */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{site.site_number}</span>
                </div>
                <h4 className="text-lg font-semibold text-foreground truncate">
                  {site.site_name}
                </h4>
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  <span>Width: {site.river_width}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{site.measurement_points?.length || 0} points</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onEditMeasurements(site)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-modern hover:shadow-modern-lg touch-manipulation"
              >
                <Ruler className="w-4 h-4 mr-2" />
                Measurements
              </button>
              <button
                onClick={() => onEditSite(site)}
                className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-border shadow-modern hover:shadow-modern-lg touch-manipulation"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => onDeleteSite(site)}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-destructive/20 shadow-modern hover:shadow-modern-lg touch-manipulation"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          {/* Measurement points - clickable */}
          {site.measurement_points && site.measurement_points.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium text-foreground">
                  Measurement Points
                </h5>
                <span className="text-xs text-muted-foreground">
                  Click a point to edit quickly
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {site.measurement_points.map((point) => (
                  <button
                    key={point.id}
                    onClick={() => onEditMeasurements(site)}
                    className="bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 p-3 rounded-lg text-left transition-all duration-200 hover:shadow-modern touch-manipulation"
                  >
                    <div className="font-medium text-foreground text-sm">
                      Point {point.point_number}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {point.distance_from_bank}m from bank
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {point.depth}m depth
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No measurements state */}
          {(!site.measurement_points || site.measurement_points.length === 0) && (
            <div className="pt-4 border-t border-border">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-3">
                  No measurement points added yet
                </p>
                <button
                  onClick={() => onEditMeasurements(site)}
                  className="btn-primary touch-manipulation text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Measurements
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
