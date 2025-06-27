import { useState, useEffect } from 'react';
import { Ruler, Settings, BarChart3 } from 'lucide-react';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { LoadingButton } from '../ui/LoadingSpinner';
import { SaveConfirmationDialog } from '../ui/SaveConfirmationDialog';
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
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const handleBackClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSaveComplete = async () => {
    const todoStatus: TodoStatus = 'complete';
    await onSubmit(riverWidth, measurementData, numMeasurements, depthUnits, todoStatus);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    onCancel();
  };

  const handleConfirmSaveInProgress = async () => {
    const todoStatus: TodoStatus = 'in_progress';
    await onSubmit(riverWidth, measurementData, numMeasurements, depthUnits, todoStatus);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    onCancel();
  };

  const handleConfirmLeaveWithoutSaving = () => {
    setShowConfirmDialog(false);
    onCancel();
  };

  return (
    <div className="card-modern-xl p-6 bg-card w-full max-w-6xl mx-auto">
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

      {/* Instructions for Students */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions for Cross-Sectional Area</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>1.</strong> Measure the total width of the river from bank to bank using a tape measure</p>
          <p><strong>2.</strong> Choose 3-5 evenly spaced points across the river width</p>
          <p><strong>3.</strong> At each point, measure the depth using a ranging pole or measuring stick</p>
          <p><strong>4.</strong> Record the distance from the left bank and the depth at each measurement point</p>
          <p><strong>5.</strong> Take measurements in the wetted perimeter (areas with flowing water)</p>
          <p><strong>6.</strong> Be careful near deep water - use a long measuring stick and work in pairs</p>
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
                      className="flex-1 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
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

        {/* Real-time Cross-Sectional Chart */}
        {measurementData.length > 0 && measurementData.some(point => point.depth > 0) && (
          <div className="mt-8 bg-blue-50/50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Cross-Sectional Profile</h4>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200" style={{backgroundColor: 'lightcyan'}}>
              <svg
                width="100%"
                height="300"
                viewBox="0 0 800 300"
                className="border border-gray-200 rounded"
              >
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 30" fill="none" stroke="lightgray" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Chart area calculations */}
                {(() => {
                  const maxDepth = Math.max(...measurementData.map(p => p.depth || 0));
                  const scaleX = 700 / riverWidth; // 700px width for chart area
                  const scaleY = maxDepth > 0 ? 180 / maxDepth : 1; // 180px height for chart area
                  const waterSurfaceY = 70; // Water surface level (0 depth)
                  
                  const points = measurementData.map(point => ({
                    x: 50 + (point.distance_from_bank || 0) * scaleX,
                    y: waterSurfaceY + (point.depth || 0) * scaleY // Positive depth goes down
                  }));
                  
                  // Find the deepest point for underground fill
                  const maxDepthY = Math.max(...points.map(p => p.y));
                  const brownFillBottom = maxDepthY + 40; // Extend brown fill below deepest point
                  
                  return (
                    <>
                      {/* Brown underground area - EXACTLY like report */}
                      <polygon
                        points={`30,${brownFillBottom} 770,${brownFillBottom} 770,${waterSurfaceY} 750,${waterSurfaceY} 50,${waterSurfaceY} 30,${brownFillBottom}`}
                        fill="peru"
                      />
                      
                      {/* Left bank slope */}
                      <polygon
                        points={`30,${waterSurfaceY + 30} 50,${waterSurfaceY} 50,${brownFillBottom} 30,${brownFillBottom}`}
                        fill="peru"
                      />
                      
                      {/* Right bank slope */}
                      <polygon
                        points={`750,${waterSurfaceY} 770,${waterSurfaceY + 30} 770,${brownFillBottom} 750,${brownFillBottom}`}
                        fill="peru"
                      />
                      
                      {/* Water area - fill from water surface to river bed EXACTLY like report */}
                      {points.length > 1 && (
                        <path
                          d={`M 50 ${waterSurfaceY} L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L 750 ${waterSurfaceY} Z`}
                          fill="lightblue"
                        />
                      )}
                      
                      {/* River bed line - EXACTLY like report colors */}
                      {points.length > 1 && (
                        <path
                          d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                          fill="none"
                          stroke="royalblue"
                          strokeWidth="2"
                        />
                      )}
                      
                      {/* Water surface line - EXACTLY like report */}
                      <line 
                        x1="50" 
                        y1={waterSurfaceY} 
                        x2="750" 
                        y2={waterSurfaceY} 
                        stroke="lightblue" 
                        strokeWidth="2" 
                      />
                      
                      {/* Measurement points - EXACTLY like report */}
                      {points.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="darkblue"
                        />
                      ))}
                      
                      {/* Depth labels */}
                      {points.map((point, index) => (
                        <text
                          key={`depth-${index}`}
                          x={point.x}
                          y={point.y + 20}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#000"
                        >
                          {(measurementData[index].depth || 0).toFixed(1)}m
                        </text>
                      ))}
                      
                      {/* Width measurement line - EXACTLY like report */}
                      <line 
                        x1="50" 
                        y1={waterSurfaceY - 20} 
                        x2="750" 
                        y2={waterSurfaceY - 20} 
                        stroke="black" 
                        strokeWidth="2" 
                      />
                      
                      {/* Width measurement end lines */}
                      <line 
                        x1="50" 
                        y1={waterSurfaceY - 20} 
                        x2="50" 
                        y2={waterSurfaceY - 10} 
                        stroke="black" 
                        strokeWidth="2" 
                      />
                      <line 
                        x1="750" 
                        y1={waterSurfaceY - 20} 
                        x2="750" 
                        y2={waterSurfaceY - 10} 
                        stroke="black" 
                        strokeWidth="2" 
                      />
                      
                      {/* Width label */}
                      <text 
                        x="400" 
                        y={waterSurfaceY - 25} 
                        textAnchor="middle" 
                        fontSize="10" 
                        fill="#000"
                      >
                        {riverWidth}m
                      </text>
                    </>
                  );
                })()}
                
                {/* Axis labels - EXACTLY like report */}
                <text x="400" y="290" textAnchor="middle" fontSize="12" fill="#000">
                  Distance from Bank (m)
                </text>
                <text x="25" y="150" textAnchor="middle" fontSize="12" fill="#000" transform="rotate(-90 25 150)">
                  Depth (m)
                </text>
              </svg>
            </div>
            
            {/* Cross-sectional area calculation */}
            {(() => {
              const area = measurementData.reduce((total, point, index, arr) => {
                if (index === 0) return 0;
                const prevPoint = arr[index - 1];
                const width = (point.distance_from_bank || 0) - (prevPoint.distance_from_bank || 0);
                const avgDepth = ((point.depth || 0) + (prevPoint.depth || 0)) / 2;
                return total + (width * avgDepth);
              }, 0);
              
              return (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700 font-medium">Cross-sectional Area:</span>
                    <span className="text-blue-800 font-bold">{area.toFixed(2)} {depthUnits}²</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

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
            onClick={handleBackClick}
            className="btn-secondary touch-manipulation flex-1 sm:flex-none"
            disabled={loading}
          >
            Back
          </button>
        </div>
      </form>
      
      <SaveConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onSaveAndMarkComplete={handleConfirmSaveComplete}
        onSaveAndMarkInProgress={handleConfirmSaveInProgress}
        onLeaveWithoutSaving={handleConfirmLeaveWithoutSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
      />
    </div>
  );
}