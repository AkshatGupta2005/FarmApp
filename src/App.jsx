import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wifi, Thermometer, Droplets, Sun, Settings, Video, Home } from 'lucide-react';
import './App.css';
// --- Configuration ---
// IMPORTANT: Replace these with the actual IP addresses of your ESP32 devices.
const ESP32_API_IP = "192.168.202.52"; // Your main ESP32's IP
const ESP32_CAM_STREAM_IP = "192.168.202.120"; // Your ESP32-CAM's IP
// --------------------

// Main App Component
export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [esp32Status, setEsp32Status] = useState('checking'); // 'checking', 'connected', 'disconnected'
  const [camStatus, setCamStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'
  const [sensorData, setSensorData] = useState(null);
  const [thresholds, setThresholds] = useState({ temp: '30.0', moist: '40' });

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
        // We use an Image object to "ping" the stream without actually rendering it here.
        const img = new Image();
        let timeout = setTimeout(() => {
            setCamStatus('disconnected');
            img.src = ''; // Abort loading
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
    } catch (error) {
      console.error("Failed to fetch sensor data:", error);
      setEsp32Status('disconnected'); // Assume disconnected on fetch error
    }
  }, [esp32Status]);

  useEffect(() => {
    checkStatus();
    const statusInterval = setInterval(checkStatus, 10000); // Check status every 10 seconds
    return () => clearInterval(statusInterval);
  }, [checkStatus]);

  useEffect(() => {
    if (esp32Status === 'connected') {
      fetchData(); // Fetch immediately on connect
      const dataInterval = setInterval(fetchData, 3000); // Fetch data every 3 seconds
      return () => clearInterval(dataInterval);
    }
  }, [esp32Status, fetchData]);


  const pages = {
    home: <HomePage esp32Status={esp32Status} camStatus={camStatus} />,
    data: <DataPage sensorData={sensorData} thresholds={thresholds} />,
    stream: <StreamPage camStatus={camStatus} />,
    settings: <SettingsPage currentThresholds={thresholds} onUpdate={fetchData} setEsp32Status={setEsp32Status}/>,
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-800 flex flex-col md:flex-row">
      <nav className="bg-white md:w-20 lg:w-64 border-r border-gray-200">
        <div className="flex items-center justify-center p-4 lg:py-6 border-b">
           <Wifi className="text-green-600 h-8 w-8" />
           <h1 className="text-xl font-bold ml-2 text-gray-700 hidden lg:block">Smart Farm</h1>
        </div>
        <ul>
          <NavItem icon={<Home />} label="Home" active={activePage === 'home'} onClick={() => setActivePage('home')} />
          <NavItem icon={<Thermometer />} label="Sensor Data" active={activePage === 'data'} onClick={() => setActivePage('data')} />
          <NavItem icon={<Video />} label="Live Stream" active={activePage === 'stream'} onClick={() => setActivePage('stream')} />
          <NavItem icon={<Settings />} label="Settings" active={activePage === 'settings'} onClick={() => setActivePage('settings')} />
        </ul>
      </nav>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {pages[activePage]}
      </main>
    </div>
  );
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick }) {
  return (
    <li className="px-4 lg:px-6">
      <a href="#" onClick={e => {e.preventDefault(); onClick();}} 
         className={`flex items-center justify-center lg:justify-start my-2 p-3 rounded-lg transition-colors duration-200 ${
            active ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
         }`}>
        {React.cloneElement(icon, { className: "h-6 w-6" })}
        <span className="ml-4 text-md font-medium hidden lg:block">{label}</span>
      </a>
    </li>
  );
}

// --- Page Components ---

function HomePage({ esp32Status, camStatus }) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatusCard deviceName="Smart Farm Controller" status={esp32Status} />
                <StatusCard deviceName="Live Camera Feed" status={camStatus} />
            </div>
            <div className="mt-8 p-6 bg-white rounded-xl shadow-md">
                 <h3 className="text-xl font-semibold mb-3">Welcome to your Smart Farm!</h3>
                 <p className="text-gray-600">Use the menu on the left to navigate. You can monitor live sensor data, watch the video stream from your farm, and adjust system thresholds in the settings.</p>
                 <p className="text-gray-600 mt-2">Everything seems to be running smoothly.</p>
            </div>
        </div>
    );
}

function DataPage({ sensorData, thresholds }) {
  if (!sensorData) {
    return <LoadingSpinner message="Waiting for sensor data from ESP32..." />;
  }
  
  const {
      insideTemp, outsideTemp, insideHumidity, outsideHumidity,
      rain, light, shed, valve, fan, moisture
  } = sensorData;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Live Sensor Data</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <GaugeCard title="Inside Temperature" value={insideTemp} unit="°C" max={50} threshold={parseFloat(thresholds.temp)} color="bg-red-500" />
        <GaugeCard title="Soil Moisture" value={moisture} unit="%" max={100} threshold={parseInt(thresholds.moist)} color="bg-blue-500" />
        <GaugeCard title="Inside Humidity" value={insideHumidity} unit="%" max={100} color="bg-teal-500" />
        <ValueCard title="Outside Temperature" value={`${outsideTemp} °C`} />
        <ValueCard title="Outside Humidity" value={`${outsideHumidity} %`} />
        <ValueCard title="Light Level" value={light} />
        <BinaryCard title="Raining" isOn={rain === 1} onText="Yes" offText="No" />
        <BinaryCard title="Shed" isOn={shed === 1} onText="Open" offText="Closed" />
        <BinaryCard title="Water Valve" isOn={valve === 1} onText="On" offText="Off" />
        <BinaryCard title="Fan" isOn={fan === 1} onText="On" offText="Off" />
      </div>
    </div>
  );
}

function StreamPage({ camStatus }) {
  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Live Stream</h2>
        <div className="bg-black rounded-xl shadow-lg overflow-hidden aspect-video max-w-4xl mx-auto">
           {camStatus === 'connected' ? (
                <img 
                    src={`http://${ESP32_CAM_STREAM_IP}:81/stream`}
                    alt="Live stream from ESP32-CAM"
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <Video className="h-16 w-16 text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold">{camStatus === 'disconnected' ? 'Camera Disconnected' : 'Connecting to camera...'}</h3>
                    <p className="text-gray-400">Please ensure the ESP32-CAM is powered on and connected to the WiFi.</p>
                </div>
            )}
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
        setMessage({ text: 'Thresholds updated successfully!', type: 'success' });
        onUpdate(); // Re-fetch data to confirm update
      } else {
        setMessage({ text: 'Failed to update. The device responded with an error.', type: 'error' });
        setEsp32Status('disconnected');
      }
    } catch (error) {
      setMessage({ text: 'Connection failed. Check device IP and network.', type: 'error' });
      setEsp32Status('disconnected');
    }
    setIsUpdating(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };
  
  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">System Settings</h2>
        <div className="max-w-md bg-white rounded-xl shadow-md p-8">
            <h3 className="text-xl font-semibold mb-4">Set Thresholds</h3>
            <p className="text-gray-500 mb-6">These values determine when automated systems like the fan or water valve will activate.</p>
            
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="temp">
                    Temperature Threshold (°C)
                </label>
                <input
                    id="temp"
                    type="number"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="shadow-inner appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="moisture">
                    Soil Moisture Threshold (%)
                </label>
                <input
                    id="moisture"
                    type="number"
                    value={moist}
                    onChange={(e) => setMoist(e.target.value)}
                    className="shadow-inner appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:bg-gray-400"
            >
                {isUpdating ? 'Updating...' : 'Update Thresholds'}
            </button>
            
            {message.text && (
                <div className={`mt-4 text-center p-2 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}
        </div>
    </div>
  );
}

// --- Reusable UI Components ---

function StatusCard({ deviceName, status }) {
    const statusInfo = useMemo(() => {
        switch (status) {
            case 'connected': return { text: 'Connected', color: 'text-green-500', bgColor: 'bg-green-100' };
            case 'disconnected': return { text: 'Disconnected', color: 'text-red-500', bgColor: 'bg-red-100' };
            default: return { text: 'Checking...', color: 'text-yellow-500', bgColor: 'bg-yellow-100' };
        }
    }, [status]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <p className="font-semibold text-lg">{deviceName}</p>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.text}
            </div>
        </div>
    );
}

function LoadingSpinner({ message }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg">{message}</p>
        </div>
    );
}

function GaugeCard({ title, value, unit, max, threshold, color }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const circumference = 2 * Math.PI * 52; // 2 * pi * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const isOverThreshold = threshold && value > threshold;

  return (
    <div className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center">
      <h3 className="font-semibold text-gray-600 text-center mb-2">{title}</h3>
      <div className="relative">
        <svg className="w-32 h-32" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#e6e6e6" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className={`transition-all duration-500 ease-in-out ${isOverThreshold ? 'text-red-500' : 'text-green-500'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isOverThreshold ? 'text-red-500' : 'text-gray-800'}`}>{value}</span>
            <span className="text-gray-500">{unit}</span>
        </div>
      </div>
      {threshold && <p className="text-xs text-gray-400 mt-2">Threshold: {threshold}{unit}</p>}
    </div>
  );
}

function ValueCard({ title, value }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center text-center h-full">
            <h3 className="font-semibold text-gray-600 mb-2">{title}</h3>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    );
}

function BinaryCard({ title, isOn, onText, offText }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center text-center h-full">
            <h3 className="font-semibold text-gray-600 mb-2">{title}</h3>
            <div className={`px-4 py-2 rounded-full font-bold text-xl ${isOn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isOn ? onText : offText}
            </div>
        </div>
    );
}

