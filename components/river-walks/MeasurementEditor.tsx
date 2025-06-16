import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import type { Site, MeasurementPointFormData } from '../../types';

interface MeasurementEditorProps {
  site: Site;
  measurementData: MeasurementPointFormData[];
  numMeasurements: number;
  currentRiverWidth: number;
  loading: boolean;
  onNumMeasurementsChange: (num: number) => void;
  onRiverWidthChange: (width: number) => void;
  onMeasurementChange: (
    index: number,
    field: keyof MeasurementPointFormData,
    value: string
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MeasurementEditor({
  site,
  measurementData,
  numMeasurements,
  currentRiverWidth,
  loading,
  onNumMeasurementsChange,
  onRiverWidthChange,
  onMeasurementChange,
  onSave,
  onCancel,
}: MeasurementEditorProps) {
  return (
    <div className="bg-blue-50 p-4 sm:p-6 rounded-lg mb-6 border">
      <h3 className="text-lg sm:text-xl font-semibold mb-4">
        Add Measurements - {site.site_name}
      </h3>

      {/* Mobile-first controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            River Width (meters)
          </label>
          <InlineNumberEdit
            value={currentRiverWidth}
            onSave={(value) => onRiverWidthChange(value)}
            suffix="m"
            min={0.1}
            decimals={1}
            className="text-base font-medium"
          />
          <p className="text-xs text-gray-500 mt-1">
            Distances will auto-update when changed
          </p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Number of Measurement Points
          </label>
          <InlineNumberEdit
            value={numMeasurements}
            onSave={(value) => onNumMeasurementsChange(Math.round(value))}
            min={2}
            max={20}
            decimals={0}
            className="text-base font-medium"
          />
          <p className="text-xs text-gray-500 mt-1">
            Distances will auto-space evenly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">
            Distance from Bank (m)
          </h4>
          <div className="space-y-3">
            {measurementData.map((point, index) => (
              <div key={index} className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[60px]">
                  Point {index + 1}:
                </label>
                <InlineNumberEdit
                  value={parseFloat(point.distance_from_bank) || 0}
                  onSave={(value) =>
                    onMeasurementChange(index, 'distance_from_bank', value.toString())
                  }
                  suffix="m"
                  min={0}
                  max={currentRiverWidth}
                  decimals={1}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Depth (m)</h4>
          <div className="space-y-3">
            {measurementData.map((point, index) => (
              <div key={index} className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[60px]">
                  Point {index + 1}:
                </label>
                <InlineNumberEdit
                  value={parseFloat(point.depth) || 0}
                  onSave={(value) =>
                    onMeasurementChange(index, 'depth', value.toString())
                  }
                  suffix="m"
                  min={0}
                  max={10}
                  decimals={1}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile-first button layout */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
        <button
          onClick={onSave}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Measurements'}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
