import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { getRiverWalks, createRiverWalk, updateRiverWalk, deleteRiverWalk } from '../lib/api/river-walks';
import { getSitesForRiverWalk, createSite, updateSite, deleteSite, createMeasurementPoints, deleteMeasurementPointsForSite } from '../lib/api/sites';
import { formatDate } from '../lib/utils';
import { Home, LogOut, MapPin } from 'lucide-react';

export default function RiverWalksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riverWalks, setRiverWalks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentRiverWalk, setCurrentRiverWalk] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    country: 'UK',
    county: ''
  });
  const [error, setError] = useState(null);
  const [selectedRiverWalk, setSelectedRiverWalk] = useState(null);
  const [sites, setSites] = useState([]);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteFormData, setSiteFormData] = useState({
    site_name: '',
    river_width: ''
  });
  const [editingMeasurements, setEditingMeasurements] = useState(null);
  const [numMeasurements, setNumMeasurements] = useState(3);
  const [measurementData, setMeasurementData] = useState([]);
  const [currentRiverWidth, setCurrentRiverWidth] = useState(0);
  const [editingSite, setEditingSite] = useState(null);
  const [editSiteData, setEditSiteData] = useState({
    site_name: '',
    river_width: ''
  });

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }
      
      setUser(session.user);
      fetchRiverWalks();
    };
    
    checkUser();
  }, [router]);

  // Fetch river walks
  const fetchRiverWalks = async () => {
    try {
      setLoading(true);
      const data = await getRiverWalks();
      setRiverWalks(data);
    } catch (err) {
      setError('Failed to load river walks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (currentRiverWalk) {
        await updateRiverWalk(currentRiverWalk.id, formData);
      } else {
        await createRiverWalk(formData);
      }
      
      // Reset form and refresh data
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        country: 'UK',
        county: ''
      });
      setShowForm(false);
      setCurrentRiverWalk(null);
      await fetchRiverWalks();
    } catch (err) {
      setError('Failed to save river walk');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (riverWalk) => {
    setCurrentRiverWalk(riverWalk);
    setFormData({
      name: riverWalk.name,
      date: riverWalk.date,
      country: riverWalk.country || 'UK',
      county: riverWalk.county || ''
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this river walk?')) {
      try {
        setLoading(true);
        await deleteRiverWalk(id);
        await fetchRiverWalks();
      } catch (err) {
        setError('Failed to delete river walk');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Handle manage sites
  const handleManageSites = async (riverWalk) => {
    try {
      setSelectedRiverWalk(riverWalk);
      setLoading(true);
      const sitesData = await getSitesForRiverWalk(riverWalk.id);
      setSites(sitesData);
    } catch (err) {
      setError('Failed to load sites');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Close sites management
  const closeSitesManagement = () => {
    setSelectedRiverWalk(null);
    setSites([]);
    setShowSiteForm(false);
    setSiteFormData({ site_name: '', river_width: '' });
    setEditingMeasurements(null);
    setMeasurementData([]);
    setNumMeasurements(3);
    setCurrentRiverWidth(0);
    setEditingSite(null);
    setEditSiteData({ site_name: '', river_width: '' });
  };

  // Handle site form input changes
  const handleSiteFormChange = (e) => {
    const { name, value } = e.target;
    setSiteFormData({
      ...siteFormData,
      [name]: value
    });
  };

  // Handle site creation
  const handleCreateSite = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const nextSiteNumber = sites.length + 1;
      const newSite = {
        river_walk_id: selectedRiverWalk.id,
        site_number: nextSiteNumber,
        site_name: siteFormData.site_name,
        river_width: parseFloat(siteFormData.river_width)
      };
      
      await createSite(newSite);
      
      // Refresh sites list
      const sitesData = await getSitesForRiverWalk(selectedRiverWalk.id);
      setSites(sitesData);
      
      // Reset form
      setShowSiteForm(false);
      setSiteFormData({ site_name: '', river_width: '' });
      
    } catch (err) {
      setError('Failed to create site');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate evenly spaced distances based on river width and number of measurements
  const generateEvenlySpacedDistances = (riverWidth, numPoints) => {
    const distances = [];
    for (let i = 0; i < numPoints; i++) {
      distances.push(numPoints === 1 ? riverWidth / 2 : (riverWidth / (numPoints - 1)) * i);
    }
    return distances;
  };

  // Handle starting measurement editing for a site
  const handleEditMeasurements = (site) => {
    setEditingMeasurements(site);
    setCurrentRiverWidth(parseFloat(site.river_width));
    
    // Initialize measurement data based on existing points or defaults
    if (site.measurement_points && site.measurement_points.length > 0) {
      setNumMeasurements(site.measurement_points.length);
      setMeasurementData(site.measurement_points.map(point => ({
        distance_from_bank: point.distance_from_bank,
        depth: point.depth
      })));
    } else {
      // Create default evenly spaced measurements
      const riverWidth = parseFloat(site.river_width);
      const distances = generateEvenlySpacedDistances(riverWidth, numMeasurements);
      const defaultMeasurements = distances.map(distance => ({
        distance_from_bank: distance,
        depth: 0
      }));
      setMeasurementData(defaultMeasurements);
    }
  };

  // Handle changing number of measurements
  const handleNumMeasurementsChange = (newNum) => {
    setNumMeasurements(newNum);
    
    // Generate new evenly spaced distances
    const newDistances = generateEvenlySpacedDistances(currentRiverWidth, newNum);
    
    // Create new measurement data array, preserving depths where possible
    const newMeasurementData = [];
    for (let i = 0; i < newNum; i++) {
      newMeasurementData.push({
        distance_from_bank: newDistances[i],
        depth: i < measurementData.length ? measurementData[i].depth : 0
      });
    }
    setMeasurementData(newMeasurementData);
  };

  // Handle river width change
  const handleRiverWidthChange = (newWidth) => {
    setCurrentRiverWidth(newWidth);
    
    // Update distances but preserve depths
    const newDistances = generateEvenlySpacedDistances(newWidth, numMeasurements);
    const newMeasurementData = measurementData.map((point, index) => ({
      distance_from_bank: newDistances[index] || 0,
      depth: point.depth
    }));
    setMeasurementData(newMeasurementData);
  };

  // Handle measurement point data change
  const handleMeasurementChange = (index, field, value) => {
    const newData = [...measurementData];
    newData[index] = {
      ...newData[index],
      [field]: parseFloat(value) || 0
    };
    setMeasurementData(newData);
  };

  // Handle saving measurement points
  const handleSaveMeasurements = async () => {
    try {
      setLoading(true);
      
      // Update site river width if it changed
      if (currentRiverWidth !== parseFloat(editingMeasurements.river_width)) {
        await updateSite(editingMeasurements.id, {
          site_name: editingMeasurements.site_name,
          river_width: currentRiverWidth
        });
      }
      
      // Delete existing measurement points for this site
      await deleteMeasurementPointsForSite(editingMeasurements.id);
      
      // Create new measurement points
      const points = measurementData.map((point, index) => ({
        point_number: index + 1,
        distance_from_bank: point.distance_from_bank,
        depth: point.depth
      }));
      
      await createMeasurementPoints(editingMeasurements.id, points);
      
      // Refresh sites data
      const sitesData = await getSitesForRiverWalk(selectedRiverWalk.id);
      setSites(sitesData);
      
      // Close measurement editing
      setEditingMeasurements(null);
      setMeasurementData([]);
      
    } catch (err) {
      setError('Failed to save measurement points');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel measurement editing
  const handleCancelMeasurements = () => {
    setEditingMeasurements(null);
    setMeasurementData([]);
    setNumMeasurements(3);
    setCurrentRiverWidth(0);
  };

  // Handle site edit
  const handleEditSite = (site) => {
    setEditingSite(site);
    setEditSiteData({
      site_name: site.site_name,
      river_width: site.river_width.toString()
    });
  };

  // Handle site edit form change
  const handleEditSiteChange = (e) => {
    const { name, value } = e.target;
    setEditSiteData({
      ...editSiteData,
      [name]: value
    });
  };

  // Handle site update
  const handleUpdateSite = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      await updateSite(editingSite.id, {
        site_name: editSiteData.site_name,
        river_width: parseFloat(editSiteData.river_width)
      });
      
      // Refresh sites list
      const sitesData = await getSitesForRiverWalk(selectedRiverWalk.id);
      setSites(sitesData);
      
      // Close edit form
      setEditingSite(null);
      setEditSiteData({ site_name: '', river_width: '' });
      
    } catch (err) {
      setError('Failed to update site');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle site delete
  const handleDeleteSite = async (site) => {
    if (window.confirm(`Are you sure you want to delete "${site.site_name}"? This will also delete all measurement points for this site.`)) {
      try {
        setLoading(true);
        
        await deleteSite(site.id);
        
        // Refresh sites list
        const sitesData = await getSitesForRiverWalk(selectedRiverWalk.id);
        setSites(sitesData);
        
      } catch (err) {
        setError('Failed to delete site');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Cancel site edit
  const handleCancelSiteEdit = () => {
    setEditingSite(null);
    setEditSiteData({ site_name: '', river_width: '' });
  };

  // Loading state
  if (loading && !riverWalks.length) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">River Walks</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">River Walks</h1>
          {user && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              ✓ Logged in as {user.email}
            </div>
          )}
          <div className="flex space-x-2">
            <Link href="/">
              <button className="flex items-center text-gray-600 hover:text-gray-800 px-3 py-1 rounded">
                <Home className="w-4 h-4 mr-1" />
                Home
              </button>
            </Link>
            <button 
              onClick={handleSignOut}
              className="flex items-center text-gray-600 hover:text-gray-800 px-3 py-1 rounded"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setShowForm(!showForm);
            setCurrentRiverWalk(null);
            setFormData({
              name: '',
              date: new Date().toISOString().split('T')[0],
              country: 'UK',
              county: ''
            });
          }}
        >
          {showForm ? 'Cancel' : 'Add River Walk'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
          <button 
            className="float-right"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {currentRiverWalk ? 'Edit River Walk' : 'Add New River Walk'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="UK"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">County (Optional)</label>
              <input
                type="text"
                name="county"
                value={formData.county}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {riverWalks.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p>No river walks found. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {riverWalks.map(riverWalk => (
            <div key={riverWalk.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{riverWalk.name}</h2>
                  <p className="text-gray-600">{formatDate(riverWalk.date)}</p>
                  <p className="text-gray-600">
                    {riverWalk.county ? `${riverWalk.county}, ` : ''}
                    {riverWalk.country || 'UK'}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleManageSites(riverWalk)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Sites
                  </button>
                  <button
                    onClick={() => handleEdit(riverWalk)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(riverWalk.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sites Management Modal */}
      {selectedRiverWalk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Manage Sites - {selectedRiverWalk.name}
              </h2>
              <button
                onClick={closeSitesManagement}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">
                {formatDate(selectedRiverWalk.date)} • {selectedRiverWalk.county ? `${selectedRiverWalk.county}, ` : ''}{selectedRiverWalk.country || 'UK'}
              </p>
            </div>

            {editingSite ? (
              <div className="bg-yellow-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Edit Site</h3>
                <form onSubmit={handleUpdateSite}>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Site Name</label>
                    <input
                      type="text"
                      name="site_name"
                      value={editSiteData.site_name}
                      onChange={handleEditSiteChange}
                      className="w-full p-2 border rounded"
                      placeholder="e.g., Upstream, Meander, Confluence"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">River Width (meters)</label>
                    <input
                      type="number"
                      name="river_width"
                      value={editSiteData.river_width}
                      onChange={handleEditSiteChange}
                      className="w-full p-2 border rounded"
                      placeholder="e.g., 3.5"
                      step="0.1"
                      min="0.1"
                      required
                    />
                  </div>
                  <div className="space-x-2">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Site'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSiteEdit}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : editingMeasurements ? (
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  Add Measurements - {editingMeasurements.site_name}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">River Width (meters)</label>
                  <input
                    type="number"
                    value={currentRiverWidth}
                    onChange={(e) => handleRiverWidthChange(parseFloat(e.target.value) || 0)}
                    className="w-32 p-2 border rounded"
                    step="0.1"
                    min="0.1"
                  />
                  <span className="text-sm text-gray-500 ml-2">
                    Distances will auto-update when changed
                  </span>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Number of Measurement Points</label>
                  <input
                    type="number"
                    value={numMeasurements}
                    onChange={(e) => handleNumMeasurementsChange(parseInt(e.target.value) || 3)}
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
                    <h4 className="font-medium text-gray-700 mb-2">Distance from Bank (m)</h4>
                    {measurementData.map((point, index) => (
                      <div key={index} className="mb-2">
                        <label className="text-sm text-gray-600">Point {index + 1}:</label>
                        <input
                          type="number"
                          value={point.distance_from_bank}
                          onChange={(e) => handleMeasurementChange(index, 'distance_from_bank', e.target.value)}
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
                        <label className="text-sm text-gray-600">Point {index + 1}:</label>
                        <input
                          type="number"
                          value={point.depth}
                          onChange={(e) => handleMeasurementChange(index, 'depth', e.target.value)}
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
                    onClick={handleSaveMeasurements}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Measurements'}
                  </button>
                  <button
                    onClick={handleCancelMeasurements}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : showSiteForm ? (
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Add New Site</h3>
                <form onSubmit={handleCreateSite}>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Site Name</label>
                    <input
                      type="text"
                      name="site_name"
                      value={siteFormData.site_name}
                      onChange={handleSiteFormChange}
                      className="w-full p-2 border rounded"
                      placeholder="e.g., Upstream, Meander, Confluence"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">River Width (meters)</label>
                    <input
                      type="number"
                      name="river_width"
                      value={siteFormData.river_width}
                      onChange={handleSiteFormChange}
                      className="w-full p-2 border rounded"
                      placeholder="e.g., 3.5"
                      step="0.1"
                      min="0.1"
                      required
                    />
                  </div>
                  <div className="space-x-2">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Site'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSiteForm(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">No measurement sites added yet.</p>
                <button 
                  onClick={() => setShowSiteForm(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Add First Site
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Measurement Sites ({sites.length})</h3>
                  <button 
                    onClick={() => setShowSiteForm(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Add New Site
                  </button>
                </div>
                
                {sites.map((site, index) => (
                  <div key={site.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">Site {site.site_number}: {site.site_name}</h4>
                        <p className="text-gray-600">River Width: {site.river_width}m</p>
                        <p className="text-sm text-gray-500">
                          {site.measurement_points?.length || 0} measurement points
                        </p>
                      </div>
                      <div className="space-x-2">
                        <button 
                          onClick={() => handleEditMeasurements(site)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Measurements
                        </button>
                        <button 
                          onClick={() => handleEditSite(site)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSite(site)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {site.measurement_points && site.measurement_points.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Measurement Points:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          {site.measurement_points.map((point, pointIndex) => (
                            <div key={point.id} className="bg-white p-2 rounded border">
                              <span className="font-medium">Point {point.point_number}:</span>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}