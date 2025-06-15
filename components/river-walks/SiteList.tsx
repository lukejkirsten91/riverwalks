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
      <div className="text-center p-6 sm:p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No measurement sites added yet.</p>
        <button
          onClick={onAddNewSite}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation"
        >
          Add First Site
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile-first header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-semibold">
          Measurement Sites ({sites.length})
        </h3>
        <button
          onClick={onAddNewSite}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg font-medium touch-manipulation"
        >
          Add New Site
        </button>
      </div>

      {sites.map((site) => (
        <div key={site.id} className="border rounded-lg p-4 bg-gray-50">
          {/* Mobile-first site layout */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base">
                Site {site.site_number}: {site.site_name}
              </h4>
              <p className="text-gray-600 text-sm">
                River Width: {site.river_width}m
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                {site.measurement_points?.length || 0} measurement points
              </p>
            </div>

            {/* Action buttons - stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:gap-0">
              <button
                onClick={() => onEditMeasurements(site)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium touch-manipulation"
              >
                Measurements
              </button>
              <button
                onClick={() => onEditSite(site)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium touch-manipulation"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteSite(site)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium touch-manipulation"
              >
                Delete
              </button>
            </div>
          </div>

          {site.measurement_points && site.measurement_points.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Measurement Points:
              </h5>
              {/* Mobile-responsive grid for measurement points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 text-sm">
                {site.measurement_points.map((point) => (
                  <div
                    key={point.id}
                    className="bg-white p-3 rounded-lg border"
                  >
                    <div className="font-medium text-gray-800">
                      Point {point.point_number}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {point.distance_from_bank}m from bank
                    </div>
                    <div className="text-gray-600 text-xs">
                      {point.depth}m depth
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
