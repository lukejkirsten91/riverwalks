import { useState, useEffect } from 'react';
import { Ruler, Settings } from 'lucide-react';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { LoadingButton } from '../ui/LoadingSpinner';
import type { Site, MeasurementPointFormData, UnitType, TodoStatus } from '../../types';

interface CrossSectionFormProps {
  site: Site;
  onSubmit: (
    riverWidth: number,
    measurementData: MeasurementPointFormData[],
    numMeasurements: number,
    depthUnits: UnitType,
    todoStatus?: TodoStatus
  ) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const UNIT_OPTIONS: { value: UnitType; label: string; shortLabel: string }[] = [
  { value: 'm', label: 'Meters', shortLabel: 'm' },
  { value: 'cm', label: 'Centimeters', shortLabel: 'cm' },
  { value: 'mm', label: 'Millimeters', shortLabel: 'mm' },
  { value: 'ft', label: 'Feet', shortLabel: 'ft' },
  { value: 'in', label: 'Inches', shortLabel: 'in' },
  { value: 'yd', label: 'Yards', shortLabel: 'yd' },
];

export function CrossSectionForm({
  site,
  onSubmit,
  onCancel,
  loading,
}: CrossSectionFormProps) {
  // Form state
  const [depthUnits, setDepthUnits] = useState<UnitType>(site.depth_units || 'm');
  const [numMeasurements, setNumMeasurements] = useState(site.measurement_points?.length || 5);
  const [riverWidth, setRiverWidth] = useState(site.river_width || 10);
  const [measurementData, setMeasurementData] = useState<MeasurementPointFormData[]>([]);

  // Track if form has been modified
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize measurement data - always auto-update distances when parameters change
  useEffect(() => {
    if (site.measurement_points && site.measurement_points.length > 0) {
      // Use existing measurement points but auto-update distances to match river width and number of points
      const existing = site.measurement_points
        .sort((a, b) => a.point_number - b.point_number)
        .map(point => ({
          distance_from_bank: point.distance_from_bank,
          depth: point.depth,
        }));
      
      // If the number of measurement points changed, regenerate to match
      if (existing.length !== numMeasurements) {
        const newDistances = generateEvenlySpacedDistances(riverWidth, numMeasurements);
        const newMeasurements = Array.from({ length: numMeasurements }, (_, index) => ({
          distance_from_bank: newDistances[index],
          depth: index < existing.length ? existing[index].depth : 0,
        }));
        setMeasurementData(newMeasurements);
      } else {
        // Same number of points - just update distances to match current river width
        const newDistances = generateEvenlySpacedDistances(riverWidth, numMeasurements);
        const updatedMeasurements = existing.map((point, index) => ({
          distance_from_bank: newDistances[index],
          depth: point.depth,
        }));
        setMeasurementData(updatedMeasurements);
      }
    } else {
      // Generate evenly spaced measurement points for new sites
      const newMeasurements = Array.from({ length: numMeasurements }, (_, index) => ({
        distance_from_bank: (index * riverWidth) / (numMeasurements - 1),
        depth: 0,
      }));
      setMeasurementData(newMeasurements);
    }
  }, [numMeasurements, riverWidth, site]);

  // Generate evenly spaced distances based on river width and number of measurements
  const generateEvenlySpacedDistances = (riverWidth: number, numPoints: number): number[] => {
    const distances: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      distances.push(
        numPoints === 1 ? riverWidth / 2 : (riverWidth / (numPoints - 1)) * i
      );
    }
    return distances;
  };

  const handleMeasurementChange = (index: number, field: keyof MeasurementPointFormData, value: string) => {
    const newData = [...measurementData];
    newData[index] = {
      ...newData[index],
      [field]: parseFloat(value) || 0,
    };
    setMeasurementData(newData);
    setHasUnsavedChanges(true);
  };

  const handleNumMeasurementsChange = (num: number) => {
    setNumMeasurements(num);
    setHasUnsavedChanges(true);

    // Generate new evenly spaced distances
    const newDistances = generateEvenlySpacedDistances(riverWidth, num);

    // Create new measurement data array, preserving depths where possible
    const newMeasurementData: MeasurementPointFormData[] = [];
    for (let i = 0; i < num; i++) {
      newMeasurementData.push({
        distance_from_bank: newDistances[i],
        depth: i < measurementData.length ? measurementData[i].depth : 0,
      });
    }
    setMeasurementData(newMeasurementData);
  };

  const handleRiverWidthChange = (width: number) => {
    setRiverWidth(width);
    setHasUnsavedChanges(true);

    // Always auto-redistribute distances when width changes, preserving depths
    const newDistances = generateEvenlySpacedDistances(width, numMeasurements);
    const newMeasurementData = measurementData.map((point, index) => ({
      distance_from_bank: newDistances[index] || 0,
      depth: point.depth,
    }));
    setMeasurementData(newMeasurementData);
  };

  const handleDepthUnitsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepthUnits(e.target.value as UnitType);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();
    const todoStatus: TodoStatus = markComplete ? 'complete' : 'in_progress';
    await onSubmit(riverWidth, measurementData, numMeasurements, depthUnits, todoStatus);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="card-modern-xl p-6 bg-card max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600">
          <Ruler className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Cross-Sectional Area</h3>
          <p className="text-muted-foreground">
            Measure river width and depth at multiple points across the channel
          </p>
        </div>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
          {/* Units and Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Depth Units
                </span>
              </label>
              <select
                value={depthUnits}
                onChange={handleDepthUnitsChange}
                className="input-modern"
                required
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                River Width ({depthUnits})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">Width:</span>
                <InlineNumberEdit
                  value={riverWidth}
                  onSave={handleRiverWidthChange}
                  suffix={depthUnits}
                  min={depthUnits === 'mm' ? 100 : 0.1}
                  decimals={depthUnits === 'mm' ? 0 : 2}
                  className="text-base font-medium border border-border min-w-[100px] flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Distances will auto-update when changed
              </p>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                Number of Measurement Points
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">Points:</span>
                <InlineNumberEdit
                  value={numMeasurements}
                  onSave={handleNumMeasurementsChange}
                  min={2}
                  max={20}
                  decimals={0}
                  className="text-base font-medium border border-border min-w-[80px] flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Distances will auto-space evenly
              </p>
            </div>
          </div>

          {/* Measurement Points */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Distance from Bank ({depthUnits})</h5>
              <div className="space-y-3">
                {measurementData.map((point, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 min-w-[60px]">
                      Point {index + 1}:
                    </label>
                    <InlineNumberEdit
                      value={point.distance_from_bank || 0}
                      onSave={(value) =>
                        handleMeasurementChange(index, 'distance_from_bank', value.toString())
                      }
                      suffix={depthUnits}
                      min={0}
                      max={riverWidth}
                      decimals={2}
                      className="flex-1 border border-border min-w-[100px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-3">Depth ({depthUnits})</h5>
              <div className="space-y-3">
                {measurementData.map((point, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 min-w-[60px]">
                      Point {index + 1}:
                    </label>
                    <InlineNumberEdit
                      value={point.depth || 0}
                      onSave={(value) =>
                        handleMeasurementChange(index, 'depth', value.toString())
                      }
                      suffix={depthUnits}
                      min={0}
                      max={depthUnits === 'mm' ? 10000 : 10}
                      decimals={2}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Saving..."
            className="btn-success touch-manipulation flex-1 sm:flex-none"
          >
            Save and Exit
          </LoadingButton>
          <LoadingButton
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, true)}
            loading={loading}
            loadingText="Completing..."
            className="btn-primary touch-manipulation flex-1 sm:flex-none"
          >
            Save and Mark Complete
          </LoadingButton>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary touch-manipulation flex-1 sm:flex-none"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}