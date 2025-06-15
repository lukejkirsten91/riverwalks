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
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No measurement sites added yet.</p>
        <button
          onClick={onAddNewSite}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add First Site
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Measurement Sites ({sites.length})
        </h3>
        <button
          onClick={onAddNewSite}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add New Site
        </button>
      </div>

      {sites.map((site) => (
        <div key={site.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">
                Site {site.site_number}: {site.site_name}
              </h4>
              <p className="text-gray-600">River Width: {site.river_width}m</p>
              <p className="text-sm text-gray-500">
                {site.measurement_points?.length || 0} measurement points
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onEditMeasurements(site)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Measurements
              </button>
              <button
                onClick={() => onEditSite(site)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteSite(site)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>

          {site.measurement_points && site.measurement_points.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Measurement Points:
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {site.measurement_points.map((point) => (
                  <div key={point.id} className="bg-white p-2 rounded border">
                    <span className="font-medium">
                      Point {point.point_number}:
                    </span>
                    <br />
                    <span className="text-gray-600">
                      {point.distance_from_bank}m, {point.depth}m depth
                    </span>
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
