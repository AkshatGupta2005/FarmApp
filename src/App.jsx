import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wifi, Thermometer, Droplets, Sun, Settings, Video, Home, Activity, AlertTriangle, CheckCircle, Clock, Zap, Cloud, TrendingUp, TrendingDown, Minus, RefreshCw, Bell, Shield, Leaf, Sprout, TreePine, Wind, Eye, Power, Database, Calendar, BarChart3, Map, Smartphone, Wifi as Wifi4, WifiOff } from 'lucide-react';
import './App.css';

// --- Configuration ---
const ESP32_API_IP = "192.168.202.52";
const ESP32_CAM_STREAM_IP = "192.168.202.120";

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [esp32Status, setEsp32Status] = useState('checking');
  const [camStatus, setCamStatus] = useState('checking');
  const [sensorData, setSensorData] = useState(null);
  const [thresholds, setThresholds] = useState({ temp: '30.0', moist: '40' });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
        const response = await fetch(`http://${ESP32_API_IP}/status`);
        setEsp32Status(response.ok ? 'connected' : 'disconnected');
    } catch (error) {
        setEsp32Status('disconnected');
    }

    try {
        const img = new Image();
        let timeout = setTimeout(() => {
            setCamStatus('disconnected');
            img.src = '';
        }, 10000);

        img.onload = () => {
            setCamStatus('connected');
            clearTimeout(timeout);
        };
        img.onerror = () => {
            setCamStatus('disconnected');
            clearTimeout(timeout);
        };
        img.src = `http://${ESP32_CAM_STREAM_IP}:81/stream`;
        
    } catch (error) {
        setCamStatus('disconnected');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (esp32Status !== 'connected') return;
    try {
      const response = await fetch(`http://${ESP32_API_IP}/data`);
      const data = await response.json();
      setSensorData(data.sensors);
      setThresholds(data.thresholds);
      setLastUpdate(new Date());
      
      const newAlerts = [];
      if (data.sensors.insideTemp > parseFloat(data.thresholds.temp)) {
        newAlerts.push({
          id: 'temp-high',
          type: 'warning',
          message: `High temperature detected: ${data.sensors.insideTemp}°C`,
          timestamp: new Date()
        });
      }
      if (data.sensors.moisture < parseInt(data.thresholds.moist)) {
        newAlerts.push({
          id: 'moisture-low',
          type: 'warning',
          message: `Low soil moisture: ${data.sensors.moisture}%`,
          timestamp: new Date()
        });
      }
      setAlerts(newAlerts);
      
    } catch (error) {
      console.error("Failed to fetch sensor data:", error);
      setEsp32Status('disconnected');
    }
  }, [esp32Status]);

  useEffect(() => {
    checkStatus();
    const statusInterval = setInterval(checkStatus, 10000);
    return () => clearInterval(statusInterval);
  }, [checkStatus]);

  useEffect(() => {
    if (esp32Status === 'connected') {
      fetchData();
      const dataInterval = setInterval(fetchData, 3000);
      return () => clearInterval(dataInterval);
    }
  }, [esp32Status, fetchData]);

  const pages = {
    home: <HomePage 
      esp32Status={esp32Status} 
      camStatus={camStatus} 
      sensorData={sensorData}
      alerts={alerts}
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
    />,
    data: <DataPage 
      sensorData={sensorData} 
      thresholds={thresholds} 
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
    />,
    stream: <StreamPage camStatus={camStatus} />,
    settings: <SettingsPage 
      currentThresholds={thresholds} 
      onUpdate={fetchData} 
      setEsp32Status={setEsp32Status}
    />,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">AgriSmart</h1>
                  <p className="text-xs text-gray-500">Farm Monitor</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<Home className="w-5 h-5" />} 
            label="Dashboard" 
            active={activePage === 'home'} 
            onClick={() => setActivePage('home')}
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Analytics" 
            active={activePage === 'data'} 
            onClick={() => setActivePage('data')}
            collapsed={sidebarCollapsed}
            badge={alerts.length}
          />
          <NavItem 
            icon={<Eye className="w-5 h-5" />} 
            label="Live View" 
            active={activePage === 'stream'} 
            onClick={() => setActivePage('stream')}
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            icon={<Settings className="w-5 h-5" />} 
            label="Settings" 
            active={activePage === 'settings'} 
            onClick={() => setActivePage('settings')}
            collapsed={sidebarCollapsed}
          />
        </nav>

        {/* Status Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="flex space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                esp32Status === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div className={`w-2 h-2 rounded-full ${
                camStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-medium text-gray-700">System Status</p>
                <p className="text-xs text-gray-500">
                  {esp32Status === 'connected' && camStatus === 'connected' ? 'All Online' : 'Issues Detected'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">{activePage}</h2>
              <p className="text-sm text-gray-600">
                {activePage === 'home' && 'Monitor your farm operations'}
                {activePage === 'data' && 'Detailed sensor analytics'}
                {activePage === 'stream' && 'Live camera feed'}
                {activePage === 'settings' && 'Configure system parameters'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              {alerts.length > 0 && (
                <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  <Bell className="w-4 h-4 mr-1" />
                  {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {pages[activePage]}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 relative ${
        active 
          ? 'bg-green-50 text-green-700 border-l-4 border-green-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="ml-3 font-medium">{label}</span>
      )}
    </button>
  );
}

function HomePage({ esp32Status, camStatus, sensorData, alerts, lastUpdate, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const systemHealth = useMemo(() => {
    if (esp32Status === 'connected' && camStatus === 'connected') return 'excellent';
    if (esp32Status === 'connected' || camStatus === 'connected') return 'good';
    return 'poor';
  }, [esp32Status, camStatus]);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
        <div className={`flex items-center px-4 py-2 rounded-lg ${
          systemHealth === 'excellent' ? 'bg-green-100 text-green-800' :
          systemHealth === 'good' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          <Shield className="w-4 h-4 mr-2" />
          System {systemHealth === 'excellent' ? 'Healthy' : systemHealth === 'good' ? 'Warning' : 'Critical'}
        </div>
      </div>

      {/* Stats Grid */}
      {sensorData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Temperature"
            value={`${sensorData.insideTemp}°C`}
            icon={<Thermometer className="w-6 h-6" />}
            color="bg-red-500"
            trend={sensorData.insideTemp > 25 ? 'up' : 'down'}
          />
          <StatCard
            title="Soil Moisture"
            value={`${sensorData.moisture}%`}
            icon={<Droplets className="w-6 h-6" />}
            color="bg-blue-500"
            trend={sensorData.moisture > 50 ? 'up' : 'down'}
          />
          <StatCard
            title="Humidity"
            value={`${sensorData.insideHumidity}%`}
            icon={<Cloud className="w-6 h-6" />}
            color="bg-teal-500"
            trend="stable"
          />
          <StatCard
            title="Light Level"
            value={sensorData.light}
            icon={<Sun className="w-6 h-6" />}
            color="bg-yellow-500"
            trend="stable"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DeviceCard
              name="Farm Controller"
              status={esp32Status}
              icon={<Database className="w-5 h-5" />}
              description="Main sensor hub"
            />
            <DeviceCard
              name="Security Camera"
              status={camStatus}
              icon={<Video className="w-5 h-5" />}
              description="Live monitoring"
            />
          </div>
          
          {sensorData && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3">Automation Status</h4>
              <div className="grid grid-cols-3 gap-4">
                <AutomationCard
                  name="Water Valve"
                  active={sensorData.valve === 1}
                  icon={<Droplets className="w-4 h-4" />}
                />
                <AutomationCard
                  name="Cooling Fan"
                  active={sensorData.fan === 1}
                  icon={<Wind className="w-4 h-4" />}
                />
                <AutomationCard
                  name="Shed Door"
                  active={sensorData.shed === 1}
                  icon={<Home className="w-4 h-4" />}
                />
              </div>
            </div>
          )}
        </div>

        {/* Alerts & Weather */}
        <div className="space-y-6">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-amber-500" />
                Active Alerts
              </h3>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{alert.message}</p>
                      <p className="text-xs text-amber-600">{alert.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Farm Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Location</span>
                <span className="text-sm font-medium text-gray-900">Smart Greenhouse</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Area</span>
                <span className="text-sm font-medium text-gray-900">250 m²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Crop Type</span>
                <span className="text-sm font-medium text-gray-900">Mixed Vegetables</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Season</span>
                <span className="text-sm font-medium text-gray-900">Growing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataPage({ sensorData, thresholds, lastUpdate, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!sensorData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {lastUpdate && (
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleString()}
          </div>
        )}
      </div>

      {/* Environmental Sensors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Thermometer className="w-5 h-5 mr-2 text-red-500" />
          Environmental Monitoring
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SensorGauge
            title="Temperature"
            value={sensorData.insideTemp}
            unit="°C"
            max={50}
            threshold={parseFloat(thresholds.temp)}
            color="red"
          />
          <SensorGauge
            title="Soil Moisture"
            value={sensorData.moisture}
            unit="%"
            max={100}
            threshold={parseInt(thresholds.moist)}
            color="blue"
            reverse={true}
          />
          <SensorGauge
            title="Humidity"
            value={sensorData.insideHumidity}
            unit="%"
            max={100}
            color="teal"
          />
        </div>
      </div>

      {/* Additional Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">External Conditions</h3>
          <div className="space-y-4">
            <SensorRow
              label="Outside Temperature"
              value={`${sensorData.outsideTemp}°C`}
              icon={<Thermometer className="w-4 h-4" />}
            />
            <SensorRow
              label="Outside Humidity"
              value={`${sensorData.outsideHumidity}%`}
              icon={<Droplets className="w-4 h-4" />}
            />
            <SensorRow
              label="Light Level"
              value={sensorData.light}
              icon={<Sun className="w-4 h-4" />}
            />
            <SensorRow
              label="Rain Detection"
              value={sensorData.rain === 1 ? "Detected" : "None"}
              icon={<Cloud className="w-4 h-4" />}
              status={sensorData.rain === 1}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Controls</h3>
          <div className="space-y-4">
            <SensorRow
              label="Water Valve"
              value={sensorData.valve === 1 ? "Active" : "Inactive"}
              icon={<Droplets className="w-4 h-4" />}
              status={sensorData.valve === 1}
            />
            <SensorRow
              label="Cooling Fan"
              value={sensorData.fan === 1 ? "Running" : "Stopped"}
              icon={<Wind className="w-4 h-4" />}
              status={sensorData.fan === 1}
            />
            <SensorRow
              label="Shed Door"
              value={sensorData.shed === 1 ? "Open" : "Closed"}
              icon={<Home className="w-4 h-4" />}
              status={sensorData.shed === 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StreamPage({ camStatus }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Live Camera Feed</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              camStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : camStatus === 'disconnected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                camStatus === 'connected' 
                  ? 'bg-green-500' 
                  : camStatus === 'disconnected'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`} />
              {camStatus === 'connected' ? 'Live' : camStatus === 'disconnected' ? 'Offline' : 'Connecting'}
            </div>
          </div>
        </div>
        
        <div className="aspect-video bg-gray-900 relative">
          {camStatus === 'connected' ? (
            <img 
              src={`http://${ESP32_CAM_STREAM_IP}:81/stream`}
              alt="Live stream from ESP32-CAM"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="bg-gray-800 rounded-full p-8 mb-4">
                {camStatus === 'checking' ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                ) : (
                  <Video className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {camStatus === 'disconnected' ? 'Camera Offline' : 'Connecting to Camera'}
              </h3>
              <p className="text-gray-400 text-center max-w-md">
                {camStatus === 'disconnected' 
                  ? 'Check camera power and network connection'
                  : 'Establishing connection...'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Camera Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Camera Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Connection</span>
              <span className={`text-sm font-medium ${
                camStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {camStatus === 'connected' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Resolution</span>
              <span className="text-sm font-medium text-gray-900">640x480</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Frame Rate</span>
              <span className="text-sm font-medium text-gray-900">15 FPS</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Recording</h4>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Start Recording
            </button>
            <p className="text-xs text-gray-500 text-center">
              Manual recording controls
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">View Options</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Fullscreen
            </button>
            <button className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Take Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ currentThresholds, onUpdate, setEsp32Status }) {
  const [temp, setTemp] = useState(currentThresholds.temp);
  const [moist, setMoist] = useState(currentThresholds.moist);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setTemp(currentThresholds.temp);
    setMoist(currentThresholds.moist);
  }, [currentThresholds]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await fetch(`http://${ESP32_API_IP}/set?temp=${temp}&moist=${moist}`);
      if (response.ok) {
        setMessage({ text: 'Settings updated successfully!', type: 'success' });
        onUpdate();
      } else {
        setMessage({ text: 'Failed to update settings', type: 'error' });
        setEsp32Status('disconnected');
      }
    } catch (error) {
      setMessage({ text: 'Connection failed', type: 'error' });
      setEsp32Status('disconnected');
    }
    setIsUpdating(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threshold Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Automation Thresholds</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature Threshold (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Fan activates above this temperature</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soil Moisture Threshold (%)
              </label>
              <input
                type="number"
                value={moist}
                onChange={(e) => setMoist(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Water valve activates below this level</p>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Settings'}
            </button>

            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Current Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Configuration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Temperature Limit</p>
                <p className="text-sm text-gray-600">Cooling activation point</p>
              </div>
              <span className="text-2xl font-bold text-red-600">{currentThresholds.temp}°C</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Moisture Minimum</p>
                <p className="text-sm text-gray-600">Irrigation trigger point</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{currentThresholds.moist}%</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">System Status</h4>
            <p className="text-sm text-green-700">
              Automation is active and monitoring your farm conditions 24/7.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">System Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Network Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Controller IP</span>
                <span className="font-mono text-gray-900">{ESP32_API_IP}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Camera IP</span>
                <span className="font-mono text-gray-900">{ESP32_CAM_STREAM_IP}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Data Collection</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Update Interval</span>
                <span className="text-gray-900">3 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status Check</span>
                <span className="text-gray-900">10 seconds</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Alerts</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Temperature alerts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Moisture alerts</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// UI Components
function StatCard({ title, value, icon, color, trend }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} text-white`}>
          {icon}
        </div>
        <TrendIcon className={`w-5 h-5 ${
          trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
        }`} />
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DeviceCard({ name, status, icon, description }) {
  return (
    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg mr-3 ${
        status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{name}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className={`w-3 h-3 rounded-full ${
        status === 'connected' ? 'bg-green-500' : 'bg-red-500'
      }`} />
    </div>
  );
}

function AutomationCard({ name, active, icon }) {
  return (
    <div className="text-center">
      <div className={`p-3 rounded-lg mx-auto mb-2 w-fit ${
        active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-700">{name}</p>
      <p className={`text-xs ${active ? 'text-green-600' : 'text-gray-500'}`}>
        {active ? 'Active' : 'Inactive'}
      </p>
    </div>
  );
}

function SensorGauge({ title, value, unit, max, threshold, color, reverse = false }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isAlert = threshold && (reverse ? value < threshold : value > threshold);
  
  const colorClasses = {
    red: 'text-red-500',
    blue: 'text-blue-500',
    teal: 'text-teal-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500'
  };

  return (
    <div className="text-center">
      <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.51} 251`}
            strokeLinecap="round"
            className={isAlert ? 'stroke-red-500' : colorClasses[color]}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${isAlert ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      {threshold && (
        <p className="text-xs text-gray-500">
          Threshold: {threshold}{unit}
          {isAlert && <span className="text-red-600 block">Alert!</span>}
        </p>
      )}
    </div>
  );
}

function SensorRow({ label, value, icon, status }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="text-gray-400 mr-3">
          {icon}
        </div>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-900 mr-2">{value}</span>
        {status !== undefined && (
          <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-gray-400'}`} />
        )}
      </div>
    </div>
  );
}