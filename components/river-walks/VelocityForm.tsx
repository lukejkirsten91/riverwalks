import { useState, useEffect } from 'react';
import { Activity, Clock, Settings } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { LoadingButton } from '../ui/LoadingSpinner';
import { SaveConfirmationDialog } from '../ui/SaveConfirmationDialog';
import type { Site, VelocityMeasurement, VelocityData, UnitType, TodoStatus } from '../../types';

interface VelocityFormProps {
  site: Site;
  onSubmit: (
    velocityData: VelocityData,
    velocityMeasurementCount: number,
    todoStatus?: TodoStatus
  ) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const DISTANCE_UNIT_OPTIONS: { value: UnitType; label: string; shortLabel: string }[] = [
  { value: 'm', label: 'Meters', shortLabel: 'm' },
  { value: 'cm', label: 'Centimeters', shortLabel: 'cm' },
  { value: 'mm', label: 'Millimeters', shortLabel: 'mm' },
  { value: 'ft', label: 'Feet', shortLabel: 'ft' },
  { value: 'in', label: 'Inches', shortLabel: 'in' },
  { value: 'yd', label: 'Yards', shortLabel: 'yd' },
];

const TIME_UNIT_OPTIONS = [
  { value: 'seconds', label: 'Seconds', shortLabel: 's' },
  { value: 'minutes', label: 'Minutes', shortLabel: 'min' },
] as const;

export function VelocityForm({
  site,
  onSubmit,
  onCancel,
  loading,
}: VelocityFormProps) {
  // Form state
  const [numMeasurements, setNumMeasurements] = useState(site.velocity_measurement_count || 3);
  const [floatDistanceUnits, setFloatDistanceUnits] = useState<UnitType>(
    site.velocity_data?.float_distance_units || site.depth_units || 'm'
  );
  const [timeUnits, setTimeUnits] = useState<'seconds' | 'minutes'>(
    site.velocity_data?.time_units || 'seconds'
  );
  const [velocityMeasurements, setVelocityMeasurements] = useState<VelocityMeasurement[]>([]);

  // Track if form has been modified
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Initialize velocity measurements
  useEffect(() => {
    if (site.velocity_data?.measurements && site.velocity_data.measurements.length > 0) {
      const existing = site.velocity_data.measurements;
      
      // If the number of measurements changed, adjust the array to match
      if (existing.length !== numMeasurements) {
        const newMeasurements = Array.from({ length: numMeasurements }, (_, index) => ({
          measurement_number: index + 1,
          time_seconds: index < existing.length ? existing[index].time_seconds : 0,
          float_travel_distance: index < existing.length ? existing[index].float_travel_distance : 0,
          velocity_ms: index < existing.length ? existing[index].velocity_ms : 0,
        }));
        setVelocityMeasurements(newMeasurements);
      } else {
        // Same number of measurements - use existing data
        setVelocityMeasurements(existing);
      }
    } else {
      // Initialize with empty measurements for new sites
      const newMeasurements = Array.from({ length: numMeasurements }, (_, index) => ({
        measurement_number: index + 1,
        time_seconds: 0,
        float_travel_distance: 0,
        velocity_ms: 0,
      }));
      setVelocityMeasurements(newMeasurements);
    }
  }, [numMeasurements, site]);

  const handleVelocityMeasurementChange = (index: number, field: keyof VelocityMeasurement, value: string | number) => {
    const newData = [...velocityMeasurements];
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    
    newData[index] = {
      ...newData[index],
      [field]: numValue,
    };

    // Auto-calculate velocity when time and distance are provided
    if (field === 'time_seconds' || field === 'float_travel_distance') {
      const measurement = newData[index];
      if (measurement.time_seconds > 0 && measurement.float_travel_distance > 0) {
        // Convert to meters per second
        let distanceInMeters = measurement.float_travel_distance;
        switch (floatDistanceUnits) {
          case 'cm':
            distanceInMeters = measurement.float_travel_distance / 100;
            break;
          case 'mm':
            distanceInMeters = measurement.float_travel_distance / 1000;
            break;
          case 'ft':
            distanceInMeters = measurement.float_travel_distance * 0.3048;
            break;
          case 'in':
            distanceInMeters = measurement.float_travel_distance * 0.0254;
            break;
          case 'yd':
            distanceInMeters = measurement.float_travel_distance * 0.9144;
            break;
          default: // 'm'
            distanceInMeters = measurement.float_travel_distance;
            break;
        }

        const timeInSeconds = timeUnits === 'minutes' ? measurement.time_seconds * 60 : measurement.time_seconds;
        newData[index].velocity_ms = distanceInMeters / timeInSeconds;
      }
    }

    setVelocityMeasurements(newData);
    setHasUnsavedChanges(true);
  };

  const handleNumMeasurementsChange = (num: number) => {
    setNumMeasurements(num);
    setHasUnsavedChanges(true);

    // Adjust measurements array
    const newMeasurements = Array.from({ length: num }, (_, index) => ({
      measurement_number: index + 1,
      time_seconds: index < velocityMeasurements.length ? velocityMeasurements[index].time_seconds : 0,
      float_travel_distance: index < velocityMeasurements.length ? velocityMeasurements[index].float_travel_distance : 0,
      velocity_ms: index < velocityMeasurements.length ? velocityMeasurements[index].velocity_ms : 0,
    }));
    setVelocityMeasurements(newMeasurements);
  };

  const handleUnitsChange = (field: string, value: string) => {
    if (field === 'floatDistanceUnits') {
      setFloatDistanceUnits(value as UnitType);
    } else if (field === 'timeUnits') {
      setTimeUnits(value as 'seconds' | 'minutes');
    }
    setHasUnsavedChanges(true);
  };

  // Calculate average velocity
  const averageVelocity = velocityMeasurements.length > 0 
    ? velocityMeasurements.reduce((sum, m) => sum + m.velocity_ms, 0) / velocityMeasurements.length 
    : 0;

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();
    const todoStatus: TodoStatus = markComplete ? 'complete' : 'in_progress';
    
    const velocityData: VelocityData = {
      measurements: velocityMeasurements,
      average_velocity: averageVelocity,
      float_distance_units: floatDistanceUnits,
      time_units: timeUnits,
    };

    await onSubmit(velocityData, numMeasurements, todoStatus);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="card-modern-xl p-6 bg-card w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Velocity Measurements</h3>
          <p className="text-muted-foreground">
            Time float travel distance to calculate water velocity
          </p>
        </div>
      </div>

      {/* Instructions for Students */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions for Velocity Measurements</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>1.</strong> Mark out a known distance along the riverbank (e.g., 5 or 10 meters)</p>
          <p><strong>2.</strong> Use a floating object like an orange, stick, or cork as your "float"</p>
          <p><strong>3.</strong> Start the timer when the float crosses your start line</p>
          <p><strong>4.</strong> Stop the timer when the float crosses your end line</p>
          <p><strong>5.</strong> Repeat this 3+ times to get an average velocity</p>
          <p><strong>6.</strong> Take measurements in the fastest-flowing part of the channel (thalweg)</p>
          <p><strong>Safety:</strong> Never enter fast-flowing or deep water - use a float method only</p>
        </div>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        <div className="bg-green-50/50 rounded-xl p-6 border border-green-100">
          {/* Units and Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Distance Units
                </span>
              </label>
              <select
                value={floatDistanceUnits}
                onChange={(e) => handleUnitsChange('floatDistanceUnits', e.target.value)}
                className="input-modern"
              >
                {DISTANCE_UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Units
                </span>
              </label>
              <select
                value={timeUnits}
                onChange={(e) => handleUnitsChange('timeUnits', e.target.value)}
                className="input-modern"
              >
                {TIME_UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                Number of Measurements
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">Count:</span>
                <InlineNumberEdit
                  value={numMeasurements}
                  onSave={handleNumMeasurementsChange}
                  min={1}
                  max={10}
                  decimals={0}
                  className="text-base font-medium border border-border min-w-[80px] flex-1"
                />
              </div>
            </div>
          </div>

          {/* Velocity Measurements */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-700">Velocity Measurements</h5>
            {velocityMeasurements.map((measurement, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-green-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement {index + 1}
                  </label>
                  <div className="text-lg font-bold text-green-600">#{index + 1}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time ({timeUnits})
                  </label>
                  <NumberInput
                    value={measurement.time_seconds.toString()}
                    onChange={(value) =>
                      handleVelocityMeasurementChange(index, 'time_seconds', value)
                    }
                    placeholder="0.0"
                    step={timeUnits === 'seconds' ? 0.1 : 0.01}
                    min={0}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance ({floatDistanceUnits})
                  </label>
                  <NumberInput
                    value={measurement.float_travel_distance.toString()}
                    onChange={(value) =>
                      handleVelocityMeasurementChange(index, 'float_travel_distance', value)
                    }
                    placeholder="0.0"
                    step={floatDistanceUnits === 'mm' ? 1 : 0.1}
                    min={0}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Velocity (m/s)
                  </label>
                  <div className="input-modern bg-gray-50 text-gray-700 font-mono">
                    {measurement.velocity_ms.toFixed(3)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Average Velocity Display */}
          {velocityMeasurements.length > 0 && (
            <div className="mt-6 p-4 bg-green-100 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Average Velocity</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {averageVelocity.toFixed(3)} m/s
              </div>
              <div className="text-xs text-green-600 mt-1">
                Based on {velocityMeasurements.filter(m => m.velocity_ms > 0).length} valid measurements
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Saving..."
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-yellow-600 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none"
          >
            Save and Mark as In Progress
          </LoadingButton>
          <LoadingButton
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, true)}
            loading={loading}
            loadingText="Completing..."
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-green-600 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none"
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