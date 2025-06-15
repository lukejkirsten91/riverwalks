import { useState } from 'react';
import {
  createMeasurementPoints,
  deleteMeasurementPointsForSite,
} from '../lib/api/sites';
import type {
  Site,
  CreateMeasurementPointData,
  MeasurementPointFormData,
} from '../types';

export function useMeasurements() {
  const [measurementData, setMeasurementData] = useState<
    MeasurementPointFormData[]
  >([]);
  const [numMeasurements, setNumMeasurements] = useState(3);
  const [currentRiverWidth, setCurrentRiverWidth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate evenly spaced distances based on river width and number of measurements
  const generateEvenlySpacedDistances = (
    riverWidth: number,
    numPoints: number
  ): number[] => {
    const distances: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      distances.push(
        numPoints === 1 ? riverWidth / 2 : (riverWidth / (numPoints - 1)) * i
      );
    }
    return distances;
  };

  const initializeMeasurements = (site: Site) => {
    setCurrentRiverWidth(parseFloat(site.river_width.toString()));

    // Initialize measurement data based on existing points or defaults
    if (site.measurement_points && site.measurement_points.length > 0) {
      setNumMeasurements(site.measurement_points.length);
      setMeasurementData(
        site.measurement_points.map((point) => ({
          distance_from_bank: point.distance_from_bank,
          depth: point.depth,
        }))
      );
    } else {
      // Create default evenly spaced measurements
      const riverWidth = parseFloat(site.river_width.toString());
      const distances = generateEvenlySpacedDistances(
        riverWidth,
        numMeasurements
      );
      const defaultMeasurements: MeasurementPointFormData[] = distances.map(
        (distance) => ({
          distance_from_bank: distance,
          depth: 0,
        })
      );
      setMeasurementData(defaultMeasurements);
    }
  };

  const handleNumMeasurementsChange = (newNum: number) => {
    setNumMeasurements(newNum);

    // Generate new evenly spaced distances
    const newDistances = generateEvenlySpacedDistances(
      currentRiverWidth,
      newNum
    );

    // Create new measurement data array, preserving depths where possible
    const newMeasurementData: MeasurementPointFormData[] = [];
    for (let i = 0; i < newNum; i++) {
      newMeasurementData.push({
        distance_from_bank: newDistances[i],
        depth: i < measurementData.length ? measurementData[i].depth : 0,
      });
    }
    setMeasurementData(newMeasurementData);
  };

  const handleRiverWidthChange = (newWidth: number) => {
    setCurrentRiverWidth(newWidth);

    // Update distances but preserve depths
    const newDistances = generateEvenlySpacedDistances(
      newWidth,
      numMeasurements
    );
    const newMeasurementData = measurementData.map((point, index) => ({
      distance_from_bank: newDistances[index] || 0,
      depth: point.depth,
    }));
    setMeasurementData(newMeasurementData);
  };

  const handleMeasurementChange = (
    index: number,
    field: keyof MeasurementPointFormData,
    value: string
  ) => {
    const newData = [...measurementData];
    newData[index] = {
      ...newData[index],
      [field]: value === '' ? 0 : parseFloat(value) || 0,
    };
    setMeasurementData(newData);
  };

  const saveMeasurementPoints = async (
    siteId: string
  ): Promise<CreateMeasurementPointData[]> => {
    try {
      setLoading(true);

      // Delete existing measurement points for this site
      await deleteMeasurementPointsForSite(siteId);

      // Create new measurement points
      const points: CreateMeasurementPointData[] = measurementData.map(
        (point, index) => ({
          point_number: index + 1,
          distance_from_bank: point.distance_from_bank,
          depth: point.depth,
        })
      );

      await createMeasurementPoints(siteId, points);
      return points;
    } catch (err) {
      setError('Failed to save measurement points');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetMeasurements = () => {
    setMeasurementData([]);
    setNumMeasurements(3);
    setCurrentRiverWidth(0);
    setError(null);
  };

  return {
    measurementData,
    numMeasurements,
    currentRiverWidth,
    loading,
    error,
    setError,
    initializeMeasurements,
    handleNumMeasurementsChange,
    handleRiverWidthChange,
    handleMeasurementChange,
    saveMeasurementPoints,
    resetMeasurements,
  };
}
