import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wifi, Thermometer, Droplets, Sun, Settings, Video, Home, 
  Activity, AlertTriangle, CheckCircle, Clock, Zap, Cloud,
  TrendingUp, TrendingDown, Minus, RefreshCw, Bell, Shield
} from 'lucide-react';
import './App.css';

// --- Configuration ---
// IMPORTANT: Replace these with the actual IP addresses of your ESP32 devices.
const ESP32_API_IP = "192.168.202.52"; // Your main ESP32's IP
const ESP32_CAM_STREAM_IP = "192.168.202.120"; // Your ESP32-CAM's IP
// --------------------

// Main App Component
export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [esp32Status, setEsp32Status] = useState('checking');
  const [camStatus, setCamStatus] = useState('checking');
  const [sensorData, setSensorData] = useState(null);
  const [thresholds, setThresholds] = useState({ temp: '30.0', moist: '40' });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const checkStatus = useCallback(async () => {
    // Check ESP32 Data Server
    try {
        const response = await fetch(`http://${ESP32_API_IP}/status`);
        if (response.ok) {
            setEsp32Status('connected');
        } else {
            setEsp32Status('disconnected');
        }
    } catch (error) {
        setEsp32Status('disconnected');
    }

    // Check ESP32-CAM Server
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
      
      // Check for alerts
      const newAlerts = [];
      if (data.sensors.insideTemp > parseFloat(data.thresholds.temp)) {
        newAlerts.push({
          id: 'temp-high',
          type: 'warning',
          message: `Temperature is high: ${data.sensors.insideTemp}°C`,
          timestamp: new Date()
        });
      }
      if (data.sensors.moisture < parseInt(data.thresholds.moist)) {
        newAlerts.push({
          id: 'moisture-low',
          type: 'warning',
          message: `Soil moisture is low: ${data.sensors.moisture}%`,
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
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans text-gray-800 flex flex-col md:flex-row">
      <nav className="bg-white md:w-20 lg:w-72 border-r border-gray-200 shadow-lg">
        <div className="flex items-center justify-center lg:justify-start p-4 lg:py-6 lg:px-6 border-b border-gray-100">
           <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
             <Wifi className="text-white h-6 w-6" />
           </div>
           <div className="ml-3 hidden lg:block">
             <h1 className="text-xl font-bold text-gray-800">Smart Farm</h1>
             <p className="text-sm text-gray-500">IoT Dashboard</p>
           </div>
        </div>
        <div className="p-2 lg:p-4">
          <NavItem 
            icon={<Home />} 
            label="Dashboard" 
            active={activePage === 'home'} 
            onClick={() => setActivePage('home')} 
          />
          <NavItem 
            icon={<Activity />} 
            label="Sensor Data" 
            active={activePage === 'data'} 
            onClick={() => setActivePage('data')} 
            badge={alerts.length > 0 ? alerts.length : null}
          />
          <NavItem 
            icon={<Video />} 
            label="Live Stream" 
            active={activePage === 'stream'} 
            onClick={() => setActivePage('stream')} 
          />
          <NavItem 
            icon={<Settings />} 
            label="Settings" 
            active={activePage === 'settings'} 
            onClick={() => setActivePage('settings')} 
          />
        </div>
      </nav>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {pages[activePage]}
        </div>
      </main>
    </div>
  );
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <div className="mb-1">
      <button 
        onClick={onClick}
        className={`w-full flex items-center justify-center lg:justify-start p-3 lg:px-4 lg:py-3 rounded-xl transition-all duration-200 group relative ${
          active 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:scale-105'
        }`}>
        <div className="relative">
          {React.cloneElement(icon, { 
            className: `h-5 w-5 ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}` 
          })}
          {badge && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {badge}
            </span>
          )}
        </div>
        <span className={`ml-3 font-medium hidden lg:block ${active ? 'text-white' : 'text-gray-700'}`}>
          {label}
        </span>
        {active && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full hidden lg:block" />
        )}
      </button>
    </div>
  );
}

// --- Page Components ---

function HomePage({ esp32Status, camStatus, sensorData, alerts, lastUpdate }) {
  const systemHealth = useMemo(() => {
    if (esp32Status === 'connected' && camStatus === 'connected') return 'excellent';
    if (esp32Status === 'connected' || camStatus === 'connected') return 'good';
    return 'poor';
  }, [esp32Status, camStatus]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Monitor your smart farm in real-time</p>
        </div>
        {lastUpdate && (
          <div className="flex items-center text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Clock className="h-4 w-4 mr-2" />
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">System Health</h2>
          <SystemHealthBadge health={systemHealth} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusCard 
            deviceName="Smart Farm Controller" 
            status={esp32Status} 
            icon={<Shield className="h-6 w-6" />}
            description="Main control unit managing sensors and automation"
          />
          <StatusCard 
            deviceName="Live Camera Feed" 
            status={camStatus} 
            icon={<Video className="h-6 w-6" />}
            description="Real-time video monitoring system"
          />
        </div>
      </div>

      {/* Quick Stats */}
      {sensorData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickStatCard
            title="Temperature"
            value={`${sensorData.insideTemp}°C`}
            icon={<Thermometer className="h-6 w-6" />}
            trend={sensorData.insideTemp > 25 ? 'up' : 'down'}
            color="from-red-400 to-red-600"
          />
          <QuickStatCard
            title="Soil Moisture"
            value={`${sensorData.moisture}%`}
            icon={<Droplets className="h-6 w-6" />}
            trend={sensorData.moisture > 50 ? 'up' : 'down'}
            color="from-blue-400 to-blue-600"
          />
          <QuickStatCard
            title="Humidity"
            value={`${sensorData.insideHumidity}%`}
            icon={<Cloud className="h-6 w-6" />}
            trend="stable"
            color="from-teal-400 to-teal-600"
          />
          <QuickStatCard
            title="Light Level"
            value={sensorData.light}
            icon={<Sun className="h-6 w-6" />}
            trend="stable"
            color="from-yellow-400 to-yellow-600"
          />
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <Bell className="h-6 w-6 text-amber-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Active Alerts</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center mb-4">
          <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4">
            <Home className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Welcome to Smart Farm</h3>
            <p className="text-green-100">Your intelligent farming companion</p>
          </div>
        </div>
        <p className="text-green-50 leading-relaxed">
          Monitor your farm's vital signs, watch live video feeds, and control automated systems 
          all from this centralized dashboard. Your farm is running smoothly with real-time 
          monitoring and intelligent automation.
        </p>
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
    return <LoadingSpinner message="Connecting to sensors..." />;
  }
  
  const {
      insideTemp, outsideTemp, insideHumidity, outsideHumidity,
      rain, light, shed, valve, fan, moisture
  } = sensorData;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sensor Data</h1>
          <p className="text-gray-600">Real-time monitoring of all farm sensors</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="flex items-center text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Clock className="h-4 w-4 mr-2" />
              {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Environmental Sensors */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Thermometer className="h-5 w-5 mr-2 text-red-500" />
          Environmental Monitoring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GaugeCard 
            title="Inside Temperature" 
            value={insideTemp} 
            unit="°C" 
            max={50} 
            threshold={parseFloat(thresholds.temp)} 
            color="from-red-400 to-red-600" 
          />
          <GaugeCard 
            title="Soil Moisture" 
            value={moisture} 
            unit="%" 
            max={100} 
            threshold={parseInt(thresholds.moist)} 
            color="from-blue-400 to-blue-600" 
            reverse={true}
          />
          <GaugeCard 
            title="Inside Humidity" 
            value={insideHumidity} 
            unit="%" 
            max={100} 
            color="from-teal-400 to-teal-600" 
          />
        </div>
      </div>

      {/* Additional Sensors */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-500" />
          Additional Sensors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ValueCard title="Outside Temperature" value={`${outsideTemp}°C`} icon={<Thermometer />} />
          <ValueCard title="Outside Humidity" value={`${outsideHumidity}%`} icon={<Droplets />} />
          <ValueCard title="Light Level" value={light} icon={<Sun />} />
          <BinaryCard title="Rain Detected" isOn={rain === 1} onText="Yes" offText="No" icon={<Cloud />} />
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BinaryCard title="Shed Door" isOn={shed === 1} onText="Open" offText="Closed" icon={<Home />} />
          <BinaryCard title="Water Valve" isOn={valve === 1} onText="Active" offText="Inactive" icon={<Droplets />} />
          <BinaryCard title="Cooling Fan" isOn={fan === 1} onText="Running" offText="Stopped" icon={<Zap />} />
        </div>
      </div>
    </div>
  );
}

function StreamPage({ camStatus }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Live Stream</h1>
        <p className="text-gray-600">Real-time video feed from your farm</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="bg-black rounded-xl overflow-hidden aspect-video max-w-5xl mx-auto shadow-2xl">
           {camStatus === 'connected' ? (
                <img 
                    src={`http://${ESP32_CAM_STREAM_IP}:81/stream`}
                    alt="Live stream from ESP32-CAM"
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <div className="bg-gray-800 rounded-full p-6 mb-6">
                      <Video className="h-16 w-16 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">
                      {camStatus === 'disconnected' ? 'Camera Offline' : 'Connecting...'}
                    </h3>
                    <p className="text-gray-400 text-center max-w-md">
                      {camStatus === 'disconnected' 
                        ? 'Please check that the ESP32-CAM is powered on and connected to WiFi.'
                        : 'Establishing connection to camera feed...'
                      }
                    </p>
                    {camStatus === 'checking' && (
                      <div className="mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    )}
                </div>
            )}
        </div>
        
        <div className="mt-6 flex items-center justify-center">
          <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
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
        setMessage({ text: 'Failed to update settings. Please try again.', type: 'error' });
        setEsp32Status('disconnected');
      }
    } catch (error) {
      setMessage({ text: 'Connection failed. Check device connectivity.', type: 'error' });
      setEsp32Status('disconnected');
    }
    setIsUpdating(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your smart farm automation thresholds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Threshold Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="bg-green-100 rounded-full p-3 mr-4">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Automation Thresholds</h2>
              <p className="text-gray-600">Set trigger points for automated systems</p>
            </div>
          </div>
            
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3" htmlFor="temp">
                Temperature Threshold
              </label>
              <div className="relative">
                <input
                  id="temp"
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-lg"
                  placeholder="30.0"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">°C</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Fan will activate when temperature exceeds this value</p>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3" htmlFor="moisture">
                Soil Moisture Threshold
              </label>
              <div className="relative">
                <input
                  id="moisture"
                  type="number"
                  value={moist}
                  onChange={(e) => setMoist(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-lg"
                  placeholder="40"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Water valve will activate when moisture falls below this value</p>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Thresholds'
              )}
            </button>
            
            {message.text && (
              <div className={`p-4 rounded-xl text-center font-medium ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Current Settings Display */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 rounded-full p-3 mr-4">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Current Settings</h2>
              <p className="text-gray-600">Active automation parameters</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Temperature Limit</span>
                <span className="text-2xl font-bold text-red-600">{currentThresholds.temp}°C</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(parseFloat(currentThresholds.temp) / 50) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Moisture Minimum</span>
                <span className="text-2xl font-bold text-blue-600">{currentThresholds.moist}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${parseInt(currentThresholds.moist)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Automation Status</h3>
              <p className="text-green-700 text-sm">
                Your smart farm is actively monitoring these thresholds and will automatically 
                adjust systems to maintain optimal growing conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Enhanced UI Components ---

function SystemHealthBadge({ health }) {
  const config = {
    excellent: { text: 'Excellent', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
    good: { text: 'Good', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertTriangle },
    poor: { text: 'Needs Attention', color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle }
  };
  
  const { text, color, bg, icon: Icon } = config[health];
  
  return (
    <div className={`flex items-center px-4 py-2 rounded-full ${bg} ${color} font-medium`}>
      <Icon className="h-4 w-4 mr-2" />
      {text}
    </div>
  );
}

function QuickStatCard({ title, value, icon, trend, color }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`bg-gradient-to-r ${color} rounded-xl p-3 text-white shadow-lg`}>
          {icon}
        </div>
        <TrendIcon className={`h-5 w-5 ${
          trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
        }`} />
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AlertCard({ alert }) {
  return (
    <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-amber-800 font-medium">{alert.message}</p>
        <p className="text-amber-600 text-sm">{alert.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function StatusCard({ deviceName, status, icon, description }) {
    const statusInfo = useMemo(() => {
        switch (status) {
            case 'connected': 
                return { 
                    text: 'Online', 
                    color: 'text-green-700', 
                    bgColor: 'bg-green-100',
                    borderColor: 'border-green-200',
                    iconColor: 'text-green-600'
                };
            case 'disconnected': 
                return { 
                    text: 'Offline', 
                    color: 'text-red-700', 
                    bgColor: 'bg-red-100',
                    borderColor: 'border-red-200',
                    iconColor: 'text-red-600'
                };
            default: 
                return { 
                    text: 'Checking...', 
                    color: 'text-yellow-700', 
                    bgColor: 'bg-yellow-100',
                    borderColor: 'border-yellow-200',
                    iconColor: 'text-yellow-600'
                };
        }
    }, [status]);

    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border ${statusInfo.borderColor} hover:shadow-lg transition-all duration-300`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${statusInfo.bgColor}`}>
                    {React.cloneElement(icon, { className: `h-6 w-6 ${statusInfo.iconColor}` })}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.text}
                </div>
            </div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{deviceName}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
        </div>
    );
}

function LoadingSpinner({ message }) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading</h3>
                <p className="text-gray-600">{message}</p>
            </div>
        </div>
    );
}

function GaugeCard({ title, value, unit, max, threshold, color, reverse = false }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const isAlert = threshold && (reverse ? value < threshold : value > threshold);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
      <h3 className="font-semibold text-gray-700 text-center mb-6">{title}</h3>
      <div className="relative flex justify-center mb-4">
        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="#f3f4f6" 
            strokeWidth="8" 
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${
              isAlert ? 'stroke-red-500' : `bg-gradient-to-r ${color}`
            }`}
            style={{
              stroke: isAlert ? '#ef4444' : `url(#gradient-${title.replace(/\s+/g, '')})`
            }}
          />
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0%\" y1="0%\" x2="100%\" y2="0%">
              <stop offset="0%" className={color.split(' ')[0].replace('from-', 'text-')} />
              <stop offset="100%" className={color.split(' ')[2].replace('to-', 'text-')} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isAlert ? 'text-red-600' : 'text-gray-800'}`}>
              {value}
            </span>
            <span className="text-gray-500 text-sm font-medium">{unit}</span>
        </div>
      </div>
      {threshold && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Threshold: {threshold}{unit}
          </p>
          {isAlert && (
            <p className="text-xs text-red-600 font-medium mt-1">
              {reverse ? 'Below' : 'Above'} threshold!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ValueCard({ title, value, icon }) {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{title}</h3>
                {icon && React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function BinaryCard({ title, isOn, onText, offText, icon }) {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{title}</h3>
                {icon && React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
            </div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-lg ${
                isOn 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
                <div className={`w-3 h-3 rounded-full mr-2 ${isOn ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isOn ? onText : offText}
            </div>
        </div>
    );
}