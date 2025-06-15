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
    <div className="bg-blue-50 p-6 rounded-lg mb-6">
      <h3 className="text-xl font-semibold mb-4">
        Add Measurements - {site.site_name}
      </h3>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">River Width (meters)</label>
        <input
          type="number"
          value={currentRiverWidth}
          onChange={(e) => onRiverWidthChange(parseFloat(e.target.value) || 0)}
          className="w-32 p-2 border rounded"
          step="0.1"
          min="0.1"
        />
        <span className="text-sm text-gray-500 ml-2">
          Distances will auto-update when changed
        </span>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">
          Number of Measurement Points
        </label>
        <input
          type="number"
          value={numMeasurements}
          onChange={(e) =>
            onNumMeasurementsChange(parseInt(e.target.value) || 3)
          }
          className="w-32 p-2 border rounded"
          min="2"
          max="20"
        />
        <span className="text-sm text-gray-500 ml-2">
          Distances will auto-space evenly
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">
            Distance from Bank (m)
          </h4>
          {measurementData.map((point, index) => (
            <div key={index} className="mb-2">
              <label className="text-sm text-gray-600">
                Point {index + 1}:
              </label>
              <input
                type="number"
                value={point.distance_from_bank}
                onChange={(e) =>
                  onMeasurementChange(
                    index,
                    'distance_from_bank',
                    e.target.value
                  )
                }
                className="w-full p-2 border rounded"
                step="0.1"
                min="0"
                max={currentRiverWidth}
              />
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Depth (m)</h4>
          {measurementData.map((point, index) => (
            <div key={index} className="mb-2">
              <label className="text-sm text-gray-600">
                Point {index + 1}:
              </label>
              <input
                type="number"
                value={point.depth}
                onChange={(e) =>
                  onMeasurementChange(index, 'depth', e.target.value)
                }
                className="w-full p-2 border rounded"
                step="0.1"
                min="0"
                max="10"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-x-2">
        <button
          onClick={onSave}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Measurements'}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
