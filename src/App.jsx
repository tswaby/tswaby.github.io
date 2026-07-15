import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Calendar, 
  Wifi, 
  WifiOff, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  Compass, 
  Info, 
  Clock, 
  Navigation,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

const DEFAULT_TRIP = {
  id: 'tokyo-kyoto-2026',
  destination: 'Japan Discovery',
  startDate: '2026-10-15',
  endDate: '2026-10-20',
  itinerary: {
    '1': [
      { id: 'item-1', name: 'Shibuya Crossing', time: '09:00 AM', description: 'Experience the world\'s busiest pedestrian intersection.', type: 'sightseeing', lat: 35.6595, lng: 139.7004 },
      { id: 'item-2', name: 'Meiji Jingu Shrine', time: '11:30 AM', description: 'Serene Shinto shrine dedicated to Emperor Meiji.', type: 'culture', lat: 35.6764, lng: 139.6993 },
      { id: 'item-3', name: 'Shinjuku Gyoen National Garden', time: '02:30 PM', description: 'Expansive historic park featuring traditional Japanese gardens.', type: 'nature', lat: 35.6852, lng: 139.7101 }
    ],
    '2': [
      { id: 'item-4', name: 'Kinkaku-ji (Golden Pavilion)', time: '10:00 AM', description: 'Stunning Zen Buddhist temple covered in brilliant gold leaf.', type: 'culture', lat: 35.0394, lng: 135.7292 },
      { id: 'item-5', name: 'Fushimi Inari Taisha', time: '01:30 PM', description: 'Famous shrine path lined with thousands of vibrant orange torii gates.', type: 'culture', lat: 34.9671, lng: 135.7727 }
    ],
    '3': []
  }
};

const PREPOPULATED_LOCATIONS = [
  { name: 'Tokyo Tower', description: 'Iconic Eiffel-inspired tower with skyline viewing decks.', type: 'sightseeing', lat: 35.6586, lng: 139.7454 },
  { name: 'Senso-ji Temple', description: 'Tokyos oldest, most famous ancient Buddhist temple complex.', type: 'culture', lat: 35.7148, lng: 139.7967 },
  { name: 'Tsukiji Outer Market', description: 'Vibrant narrow street lanes packed with fresh seafood stalls.', type: 'food', lat: 35.6654, lng: 139.7701 },
  { name: 'Kyoto Imperial Palace', description: 'The former ruling palace grounds of the Japanese Emperor.', type: 'culture', lat: 35.0254, lng: 135.7621 },
  { name: 'Arashiyama Bamboo Grove', description: 'Breathtaking green pathways bordered by towering bamboo canes.', type: 'nature', lat: 35.0156, lng: 135.6715 },
  { name: 'Kiyomizu-dera Temple', description: 'Historic wooden temple offering magnificent hillside outlooks.', type: 'culture', lat: 34.9949, lng: 135.7850 },
  { name: 'Nara Deer Park', description: 'Peaceful park home to hundreds of free-roaming sacred deer.', type: 'nature', lat: 34.6851, lng: 135.8430 },
  { name: 'Osaka Castle', description: 'Stunning landmark fortress wrapped by sweeping moats and gardens.', type: 'sightseeing', lat: 34.6873, lng: 135.5262 }
];

function DirectLiveMap({ stops, activeDay, offlineMode }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Initialize raw Leaflet map on load
  useEffect(() => {
    if (!window.L || !mapContainerRef.current || offlineMode) return;

    const L = window.L;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [offlineMode]);

  // Synchronize Leaflet markers and fit map views dynamically
  useEffect(() => {
    if (!window.L || !mapInstanceRef.current || offlineMode) return;

    const L = window.L;

    // Clear old elements
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (stops.length === 0) {
      const center = activeDay === '2' ? [35.0116, 135.7681] : [35.6762, 139.6503];
      mapInstanceRef.current.setView(center, 12);
      return;
    }

    // Add interactive markers
    stops.forEach((stop, idx) => {
      const customIcon = L.divIcon({
        html: `<div class="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full border-2 border-white shadow-xl w-7 h-7 text-xs transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150">${idx + 1}</div>`,
        className: 'custom-div-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14], 
      });

      const popupContent = `
        <div class="p-1 min-w-[120px]">
          <span class="inline-block text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded mb-1">
            ${stop.time}
          </span>
          <h4 class="font-bold text-xs text-slate-900 m-0">${stop.name}</h4>
          <p class="text-[10px] text-slate-600 mt-1 leading-normal m-0">${stop.description}</p>
        </div>
      `;

      const marker = L.marker([stop.lat, stop.lng], { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });

    // Add path connections
    if (stops.length > 1) {
      const positions = stops.map(s => [s.lat, s.lng]);
      polylineRef.current = L.polyline(positions, {
        color: '#4f46e5',
        weight: 3,
        dashArray: '5, 10'
      }).addTo(mapInstanceRef.current);
    }

    // Adjust zoom levels safely
    const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });

  }, [stops, activeDay, offlineMode]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />;
}

export default function App() {
  const [trip, setTrip] = useState(() => {
    try {
      const saved = localStorage.getItem('globetrek_trip');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.itinerary) {
          Object.keys(parsed.itinerary).forEach(day => {
            if (!Array.isArray(parsed.itinerary[day])) {
              parsed.itinerary[day] = [];
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.error("Local storage lookup failed; reverting to defaults.", e);
    }
    return DEFAULT_TRIP;
  });

  const [activeDay, setActiveDay] = useState('1');
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlinePanelExpanded, setOfflinePanelExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  const [customName, setCustomName] = useState('');
  const [customTime, setCustomTime] = useState('12:00 PM');
  const [customDesc, setCustomDesc] = useState('');
  const [customType, setCustomType] = useState('sightseeing');
  const [selectedAddDay, setSelectedAddDay] = useState('1');
  const [notification, setNotification] = useState(null);

  // Dynamic script and CSS loading wrapper for CDN Leaflet
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const activeDayStops = useMemo(() => {
    return trip.itinerary[activeDay] || [];
  }, [trip, activeDay]);

  useEffect(() => {
    localStorage.setItem('globetrek_trip', JSON.stringify(trip));
  }, [trip]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return PREPOPULATED_LOCATIONS.filter(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSelectSuggestion = (suggestion) => {
    setCustomName(suggestion.name);
    setCustomDesc(suggestion.description);
    setCustomType(suggestion.type);
    setSearchQuery('');
    setShowSuggestions(false);
    
    setNotification({
      type: 'info',
      message: `Selected "${suggestion.name}". Choose your time and click Add!`
    });
  };

  const handleAddStop = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      setNotification({ type: 'error', message: 'Destination name is required!' });
      return;
    }

    const dayKey = String(selectedAddDay);
    const newStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: customName.trim(),
      time: customTime || '12:00 PM',
      description: customDesc.trim() || 'Custom scheduled stop.',
      type: customType || 'sightseeing',
      lat: 35.6 + (Math.random() - 0.5) * 0.4,
      lng: 139.7 + (Math.random() - 0.5) * 0.4
    };

    // If day is Day 2, adjust coordinate range around Kyoto
    if (dayKey === '2') {
      newStop.lat = 35.0116 + (Math.random() - 0.5) * 0.2;
      newStop.lng = 135.7681 + (Math.random() - 0.5) * 0.2;
    }

    setTrip(prev => {
      const updatedItinerary = { ...prev.itinerary };
      if (!updatedItinerary[dayKey]) {
        updatedItinerary[dayKey] = [];
      }
      updatedItinerary[dayKey] = [...updatedItinerary[dayKey], newStop];
      return {
        ...prev,
        itinerary: updatedItinerary
      };
    });

    setCustomName('');
    setCustomDesc('');
    setCustomTime('12:00 PM');
    setActiveDay(dayKey);

    setNotification({
      type: 'success',
      message: `Added to Day ${dayKey} schedule successfully!`
    });
  };

  const handleDeleteStop = (dayKey, stopId) => {
    setTrip(prev => {
      const updatedItinerary = { ...prev.itinerary };
      if (updatedItinerary[dayKey]) {
        updatedItinerary[dayKey] = updatedItinerary[dayKey].filter(stop => stop.id !== stopId);
      }
      return {
        ...prev,
        itinerary: updatedItinerary
      };
    });

    setNotification({
      type: 'success',
      message: 'Stop removed from schedule.'
    });
  };

  const handleAddNewDay = () => {
    const existingDays = Object.keys(trip.itinerary).map(Number);
    const nextDayNum = existingDays.length > 0 ? Math.max(...existingDays) + 1 : 1;
    const nextDayStr = String(nextDayNum);

    setTrip(prev => ({
      ...prev,
      itinerary: {
        ...prev.itinerary,
        [nextDayStr]: []
      }
    }));

    setActiveDay(nextDayStr);
    setSelectedAddDay(nextDayStr);
    
    setNotification({
      type: 'success',
      message: `Day ${nextDayStr} added to your plan!`
    });
  };

  const tripStats = useMemo(() => {
    let totalStops = 0;
    const days = Object.keys(trip.itinerary);
    days.forEach(d => {
      totalStops += (trip.itinerary[d] || []).length;
    });
    return { daysCount: days.length, totalStops };
  }, [trip]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* Header Bar */}
      <header className="flex flex-shrink-0 items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              GlobeTrek 
              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                Planner
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Custom Travel & Sync Prototype</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setOfflineMode(!offlineMode)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-300 ${
              offlineMode 
                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            {offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
            <span>{offlineMode ? 'Simulated Offline' : 'Online Mode'}</span>
          </button>

          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to reset back to the Tokyo/Kyoto default itinerary?")) {
                setTrip(DEFAULT_TRIP);
                setActiveDay('1');
                setSelectedAddDay('1');
                localStorage.removeItem('globetrek_trip');
              }
            }}
            title="Reset default trip state"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {notification && (
        <div className="absolute top-20 right-6 flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl border border-slate-700 z-50 animate-bounce">
          {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {notification.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Panel Division */}
      <div className="flex flex-1 overflow-hidden w-full">
        
        {/* LEFT PANEL - Scheduler & Input */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 h-full overflow-hidden">
          
          {}
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Select Trip Day
              </span>
              <button 
                onClick={handleAddNewDay}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Day
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {Object.keys(trip.itinerary).map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                    activeDay === day
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Day {activeDay} Itinerary stops
                </h3>
                <span className="text-xs text-slate-400">{activeDayStops.length} stops scheduled</span>
              </div>

              {activeDayStops.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-center bg-slate-50/50 dark:bg-slate-900/40">
                  <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No scheduled items for this day.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Search for a location below to build your schedule.</p>
                </div>
              ) : (
                <div className="relative border-l border-indigo-150 dark:border-indigo-900 ml-3.5 pl-5 space-y-5">
                  {activeDayStops.map((stop, idx) => (
                    <div key={stop.id} className="relative group">
                      <span className="absolute -left-[27px] top-1 bg-white dark:bg-slate-900 border-2 border-indigo-600 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <span className="bg-indigo-600 rounded-full w-1.5 h-1.5"></span>
                      </span>

                      <div className="bg-slate-50 dark:bg-slate-850/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow transition animate-fade-in">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 tracking-wider">
                              {stop.time}
                            </span>
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-1">
                              {stop.name}
                            </h4>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteStop(activeDay, stop.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Delete stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {stop.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-500" />
                Add Stops to Schedule
              </h3>

              <form onSubmit={handleAddStop} className="space-y-3.5">
                
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search landmarks (e.g. Kyoto, Tokyo)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full text-xs px-3 py-2.5 pl-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute top-11 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-20 max-h-56 overflow-y-auto">
                      {filteredSuggestions.map((loc) => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => handleSelectSuggestion(loc)}
                          className="flex items-start gap-2.5 w-full text-left p-3 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{loc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{loc.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Destination Name</label>
                    <input
                      type="text"
                      placeholder="Enter custom landmark name..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time Block</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Schedule Day</label>
                      <select
                        value={selectedAddDay}
                        onChange={(e) => setSelectedAddDay(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:outline-none"
                      >
                        {Object.keys(trip.itinerary).map(day => (
                          <option key={day} value={day}>Day {day}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description / Notes</label>
                    <textarea
                      placeholder="Add travel notes, bookings or must-see info..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      rows={2}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {['sightseeing', 'culture', 'nature', 'food'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCustomType(type)}
                        className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md uppercase border transition ${
                          customType === type
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Save Destination
                </button>
              </form>
            </div>

          </div>

          {}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 rounded-xl p-3 shadow-sm">
              
              <button 
                onClick={() => setOfflinePanelExpanded(!offlinePanelExpanded)}
                className="flex items-center justify-between w-full font-bold text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-500" />
                  Offline Trip Snapshot
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] rounded font-mono font-bold text-slate-500">
                    {tripStats.totalStops} Stops
                  </span>
                  {offlinePanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
              
              {offlinePanelExpanded && (
                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-3 max-h-40 overflow-y-auto">
                  <div className="bg-amber-50 dark:bg-amber-950/35 border border-amber-200/50 dark:border-amber-900/40 p-2 rounded-lg text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>This data is cached locally on your device. You can safely view all of these stops when fully offline!</span>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.keys(trip.itinerary).map(day => {
                      const stops = trip.itinerary[day] || [];
                      return (
                        <div key={day} className="border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                            <span>Day {day} Schedule:</span>
                            <span className="text-slate-400 text-[10px]">{stops.length} stops</span>
                          </p>
                          {stops.length > 0 ? (
                            <p className="text-slate-400 dark:text-slate-500 mt-0.5 italic truncate">
                              {stops.map(s => s.name).join(' → ')}
                            </p>
                          ) : (
                            <p className="text-slate-300 dark:text-slate-600 italic">No scheduled stops.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL - Live Map Canvas */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 flex flex-col h-full overflow-hidden relative">
          
          <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-lg z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Active Trip
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Oct 15 - Oct 20
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white mt-1">
                {trip.destination} - Day {activeDay} Route Plan
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Total Stops</p>
                <p className="text-slate-700 dark:text-slate-200 text-sm font-bold">{tripStats.totalStops} visited</p>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Trip Days</p>
                <p className="text-slate-700 dark:text-slate-200 text-sm font-bold">{tripStats.daysCount} active</p>
              </div>
            </div>
          </div>

          {}
          <div className="flex-1 w-full h-full flex items-center justify-center p-6 relative">
            <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-950/20 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {offlineMode ? (
              <div className="z-10 flex flex-col items-center justify-center p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 max-w-sm rounded-2xl text-center shadow-2xl animate-fade-in">
                <div className="bg-amber-100 text-amber-800 p-4 rounded-full mb-4 dark:bg-amber-950 dark:text-amber-400 shadow-md">
                  <WifiOff className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Map View Unavailable Offline</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Active tile loading has been paused during simulated offline performance mode. Your itinerary updates will automatically sync when network access is restored.
                </p>
                <button
                  onClick={() => setOfflineMode(false)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition"
                >
                  Reconnect Map
                </button>
              </div>
            ) : !leafletLoaded ? (
              <div className="z-10 flex flex-col items-center justify-center p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 max-w-sm rounded-2xl text-center shadow-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Loading Map Assets...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Integrating global positioning framework.</p>
              </div>
            ) : (
              <div className="w-full h-full max-w-2xl max-h-[500px] bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden relative flex flex-col z-0">
                <div className="flex-1 w-full h-full min-h-[350px]">
                  <DirectLiveMap stops={activeDayStops} activeDay={activeDay} offlineMode={offlineMode} />
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 text-white border border-slate-800 p-3 rounded-xl flex items-center justify-between text-[11px] backdrop-blur z-[1000] shadow-lg">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    Map dynamic: showing {activeDayStops.length} live interactive markers.
                  </span>
                  <span className="text-slate-400">Powered by Leaflet CDN</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}