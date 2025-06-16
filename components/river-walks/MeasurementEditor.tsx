import { NumberInput } from '../ui/NumberInput';
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
          <label 
            className="block text-gray-700 mb-2 font-medium cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => document.getElementById('river-width-input')?.focus()}
          >
            River Width (meters)
          </label>
          <NumberInput
            id="river-width-input"
            value={currentRiverWidth}
            onChange={(value) => onRiverWidthChange(parseFloat(value) || 0)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            step={0.1}
            min={0.1}
          />
          <p className="text-xs text-gray-500 mt-1">
            Distances will auto-update when changed
          </p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Number of Measurement Points
          </label>
          <NumberInput
            value={numMeasurements}
            onChange={(value) => onNumMeasurementsChange(parseInt(value) || 3)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            min={2}
            max={20}
            step={1}
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
              <div key={index}>
                <label 
                  className="block text-sm text-gray-600 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => document.getElementById(`distance-${index}`)?.focus()}
                >
                  Point {index + 1}:
                </label>
                <NumberInput
                  id={`distance-${index}`}
                  value={point.distance_from_bank}
                  onChange={(value) =>
                    onMeasurementChange(index, 'distance_from_bank', value)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  step={0.1}
                  min={0}
                  max={currentRiverWidth}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Depth (m)</h4>
          <div className="space-y-3">
            {measurementData.map((point, index) => (
              <div key={index}>
                <label 
                  className="block text-sm text-gray-600 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => document.getElementById(`depth-${index}`)?.focus()}
                >
                  Point {index + 1}:
                </label>
                <NumberInput
                  id={`depth-${index}`}
                  value={point.depth}
                  onChange={(value) =>
                    onMeasurementChange(index, 'depth', value)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  step={0.1}
                  min={0}
                  max={10}
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
