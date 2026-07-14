import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Calendar, 
  Wifi, 
  WifiOff, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  ChevronRight, 
  Compass, 
  Save, 
  Info, 
  Clock, 
  Navigation,
  BookOpen,
  Map as MapIcon
} from 'lucide-react';

// Prepopulate with a beautiful Tokyo itinerary so the map is instantly alive
const DEFAULT_TRIP = {
  id: 'tokyo-2026',
  name: 'Tokyo & Kyoto Adventure',
  destination: 'Tokyo, Japan',
  days: [
    {
      dayNumber: 1,
      title: 'Exploring Shibuya & Meiji Jingu',
      locations: [
        { id: 'loc-1', name: 'Shibuya Excel Hotel Tokyu', lat: 35.6586, lng: 139.7005, time: '09:00', notes: 'Check-in and drop bags.' },
        { id: 'loc-2', name: 'Shibuya Crossing', lat: 35.6595, lng: 139.7004, time: '10:00', notes: 'Walk the famous crossing.' },
        { id: 'loc-3', name: 'Meiji Jingu Shrine', lat: 35.6764, lng: 139.6993, time: '13:00', notes: 'Forest walk and main shrine.' },
        { id: 'loc-4', name: 'Shinjuku Gyoen National Garden', lat: 35.6852, lng: 139.7101, time: '15:30', notes: 'Afternoon tea in the greenhouse.' }
      ]
    },
    {
      dayNumber: 2,
      title: 'Historical Asakusa & Skytree',
      locations: [
        { id: 'loc-5', name: 'Senso-ji Temple', lat: 35.7148, lng: 139.7967, time: '09:30', notes: 'Explore Tokyo\'s oldest temple.' },
        { id: 'loc-6', name: 'Nakamise-dori Street', lat: 35.7125, lng: 139.7964, time: '11:00', notes: 'Try melonpan and buy souvenirs.' },
        { id: 'loc-7', name: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, time: '15:00', notes: 'Incredible panoramic views of the city.' }
      ]
    }
  ]
};

export default function App() {
  const [trip, setTrip] = useState(() => {
    const saved = localStorage.getItem('globetrek_trip');
    return saved ? JSON.parse(saved) : DEFAULT_TRIP;
  });
  
  const [activeDay, setActiveDay] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addTime, setAddTime] = useState('12:00');
  const [addNotes, setAddNotes] = useState('');
  
  // States for handling offline snapshots
  const [offlineMapCache, setOfflineMapCache] = useState(() => {
    const saved = localStorage.getItem('globetrek_map_cache');
    return saved ? JSON.parse(saved) : {};
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [infoMessage, setInfoMessage] = useState({ text: 'Welcome to GlobeTrek! Add items, view routes, and try the Offline Simulator.', type: 'info' });
  
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  useEffect(() => {
    // Avoid double injecting scripts if already present
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const jsScript = document.createElement('script');
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    jsScript.async = true;
    jsScript.onload = () => {
      setMapLoaded(true);
    };
    document.body.appendChild(jsScript);

    return () => {
      // Clean up assets on unmount
      if (document.head.contains(cssLink)) document.head.removeChild(cssLink);
      if (document.body.contains(jsScript)) document.body.removeChild(jsScript);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('globetrek_trip', JSON.stringify(trip));
  }, [trip]);

  useEffect(() => {
    localStorage.setItem('globetrek_map_cache', JSON.stringify(offlineMapCache));
  }, [offlineMapCache]);

  useEffect(() => {
    if (!mapLoaded || !window.L || isOffline) return;

    const currentDayData = trip.days.find(d => d.dayNumber === activeDay);
    if (!currentDayData) return;

    // Center map on first location of active day, or default to Tokyo central
    const defaultCenter = [35.6762, 139.6503];
    const initialCenter = currentDayData.locations.length > 0 
      ? [currentDayData.locations[0].lat, currentDayData.locations[0].lng]
      : defaultCenter;

    // Initialize map if it doesn't exist yet
    if (!leafletMapInstance.current && mapRef.current) {
      leafletMapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false // We will render zoom controls cleanly or let standard handle it
      }).setView(initialCenter, 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMapInstance.current);

      window.L.control.zoom({ position: 'bottomright' }).addTo(leafletMapInstance.current);
    }

    const map = leafletMapInstance.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Clear previous polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const coordinates = [];

    // Add new markers matching the current day's itinerary
    currentDayData.locations.forEach((loc, index) => {
      coordinates.push([loc.lat, loc.lng]);

      // Create a gorgeous high-contrast numbered marker using Tailwind styled divIcon
      const htmlIcon = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-xl border-2 border-white transform transition-transform hover:scale-110">
          ${index + 1}
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: htmlIcon,
        className: 'custom-div-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const popupContent = `
        <div class="p-2 font-sans">
          <p class="font-bold text-slate-800 text-sm m-0">${index + 1}. ${loc.name}</p>
          <p class="text-xs text-indigo-600 font-semibold m-0 mt-1">${loc.time}</p>
          ${loc.notes ? `<p class="text-xs text-slate-500 m-0 mt-1 italic">${loc.notes}</p>` : ''}
        </div>
      `;

      const marker = window.L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);

      markersRef.current.push(marker);
    });

    // Draw connecting paths (Sequential Itinerary flow lines)
    if (coordinates.length > 1) {
      polylineRef.current = window.L.polyline(coordinates, {
        color: '#4f46e5', // Indigo-600
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds smoothly
      map.fitBounds(window.L.polyline(coordinates).getBounds(), {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 0.8
      });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 14, { animate: true });
    }

  }, [mapLoaded, trip, activeDay, isOffline]);

  const focusLocationOnMap = (lat, lng) => {
    if (leafletMapInstance.current && !isOffline) {
      leafletMapInstance.current.setView([lat, lng], 15, {
        animate: true,
        duration: 0.6
      });
    }
  };

  const handleLocationSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Fetching free Nominatim OpenStreetMap Geocoding API
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        setInfoMessage({ text: 'No matching destinations found. Try typing a broader landmark or city.', type: 'error' });
      }
    } catch (err) {
      setInfoMessage({ text: 'Search failed. Check your network or search terms.', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  const addLocationToDay = (place) => {
    const newLocation = {
      id: `loc-${Date.now()}`,
      name: place.display_name.split(',')[0] || place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      time: addTime,
      notes: addNotes
    };

    const updatedDays = trip.days.map(d => {
      if (d.dayNumber === activeDay) {
        return {
          ...d,
          locations: [...d.locations, newLocation].sort((a, b) => a.time.localeCompare(b.time))
        };
      }
      return d;
    });

    setTrip({ ...trip, days: updatedDays });
    setSearchResults([]);
    setSearchQuery('');
    setAddNotes('');
    setInfoMessage({ text: `Successfully added "${newLocation.name}" to Day ${activeDay}!`, type: 'success' });
  };

  const deleteLocation = (locId) => {
    const updatedDays = trip.days.map(d => {
      if (d.dayNumber === activeDay) {
        return {
          ...d,
          locations: d.locations.filter(l => l.id !== locId)
        };
      }
      return d;
    });

    setTrip({ ...trip, days: updatedDays });
    setInfoMessage({ text: 'Location removed from itinerary.', type: 'info' });
  };

  const addTripDay = () => {
    const nextDayNum = trip.days.length + 1;
    const newDay = {
      dayNumber: nextDayNum,
      title: `Day ${nextDayNum} Schedule`,
      locations: []
    };

    setTrip({
      ...trip,
      days: [...trip.days, newDay]
    });
    setActiveDay(nextDayNum);
    setInfoMessage({ text: `Added Day ${nextDayNum} to your itinerary!`, type: 'success' });
  };

  // Draws a beautiful schematic route layout onto canvas so it's immune to CORS,
  // then caches the representation as a base64 string directly inside localStorage.
  const generateOfflineSnapshot = () => {
    const currentDayData = trip.days.find(d => d.dayNumber === activeDay);
    if (!currentDayData || currentDayData.locations.length === 0) {
      setInfoMessage({ text: 'Please add at least one location before caching a map.', type: 'error' });
      return;
    }

    setInfoMessage({ text: 'Processing high-res map layout...', type: 'info' });

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');

    // 1. Fill clean background grid pattern
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw decorative blueprint grid
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 2. Draw mock street elements to look like a realistic schematic blueprint map
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // Draw some stylized scenic street outlines
    const streets = [
      [[50, 120], [750, 120]],
      [[150, 50], [150, 500]],
      [[550, 50], [550, 500]],
      [[50, 380], [750, 380]],
      [[300, 200], [700, 450]]
    ];
    streets.forEach(st => {
      ctx.beginPath();
      ctx.moveTo(st[0][0], st[0][1]);
      ctx.lineTo(st[1][0], st[1][1]);
      ctx.stroke();
    });

    // 3. Render coordinate boundaries mapping
    const locs = currentDayData.locations;
    const lats = locs.map(l => l.lat);
    const lngs = locs.map(l => l.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const mapPadding = 80;
    const mapWidth = canvas.width - (mapPadding * 2);
    const mapHeight = canvas.height - (mapPadding * 2);

    // Coordinate converters
    const getCanvasX = (lng) => {
      if (maxLng === minLng) return canvas.width / 2;
      return mapPadding + ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    };

    const getCanvasY = (lat) => {
      if (maxLat === minLat) return canvas.height / 2;
      // Subtract from height to invert latitude standard layout
      return canvas.height - (mapPadding + ((lat - minLat) / (maxLat - minLat)) * mapHeight);
    };

    // 4. Draw linking line path between destinations
    if (locs.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#6366f1'; // indigo-500
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      locs.forEach((loc, index) => {
        const x = getCanvasX(loc.lng);
        const y = getCanvasY(loc.lat);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // 5. Draw interactive numbered pinpoint nodes on map
    locs.forEach((loc, index) => {
      const x = getCanvasX(loc.lng);
      const y = getCanvasY(loc.lat);

      // Node shadow
      ctx.beginPath();
      ctx.arc(x, y + 2, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fill();

      // Outer border circle
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Inner fill circle
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5'; // Indigo color
      ctx.fill();

      // Index number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index + 1, x, y);

      // Drop clean contextual label directly under markers
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.textAlign = 'center';
      ctx.fillText(loc.name.slice(0, 18), x, y + 30);
    });

    // 6. Infographic Header overlays
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)'; // Slate dark
    ctx.fillRect(0, 0, canvas.width, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`GlobeTrek Offline Guide: ${trip.name}`, 20, 32);

    ctx.fillStyle = '#a5b4fc'; // Light indigo
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`DAY ${activeDay} OFFLINE DEPLOYED CACHE`, canvas.width - 20, 32);

    // 7. Render contextual stamp details
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, canvas.height - 35, 220, 25);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(15, canvas.height - 35, 220, 25);
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Coordinates: ${minLat.toFixed(3)}°N to ${maxLng.toFixed(3)}°E`, 25, canvas.height - 18);

    // Save output base64 data to our offline application storage cache
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const updatedCache = {
      ...offlineMapCache,
      [`${trip.id}_day_${activeDay}`]: dataUrl
    };

    setOfflineMapCache(updatedCache);
    setInfoMessage({ text: `Day ${activeDay} itinerary map snapshot saved successfully! Ready to test offline.`, type: 'success' });
  };

  const downloadSnapshotFile = () => {
    const cachedImage = offlineMapCache[`${trip.id}_day_${activeDay}`];
    if (!cachedImage) {
      setInfoMessage({ text: 'Please save a map snapshot before downloading.', type: 'error' });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = cachedImage;
    anchor.download = `GlobeTrek_Offline_Day_${activeDay}_Tokyo.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setInfoMessage({ text: 'Physical itinerary file download started!', type: 'success' });
  };

  const resetToDefault = () => {
    if (window.confirm('Are you sure you want to restore default itinerary planning parameters?')) {
      setTrip(DEFAULT_TRIP);
      setOfflineMapCache({});
      setActiveDay(1);
      setIsOffline(false);
      setInfoMessage({ text: 'GlobeTrek restored to default template.', type: 'info' });
    }
  };

  const activeDayData = trip.days.find(d => d.dayNumber === activeDay) || trip.days[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      
      {}
      <header className="flex flex-wrap items-center justify-between bg-slate-900 px-6 py-4 text-white shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Compass className="h-6 w-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">GlobeTrek</h1>
            <p className="text-xs text-indigo-300">Offline Itinerary Compiler</p>
          </div>
        </div>

        {/* Global Travel Stats Banner */}
        <div className="hidden md:flex space-x-6 items-center px-4 py-2 bg-slate-800 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Active Trip</span>
            <span className="text-sm font-semibold text-slate-200">{trip.name}</span>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Trip Duration</span>
            <span className="text-sm font-semibold text-slate-200">{trip.days.length} Days Planned</span>
          </div>
        </div>

        {/* Action Controls for Offline Simulation */}
        <div className="flex items-center space-x-3">
          {/* Offline Mode Switcher */}
          <button 
            onClick={() => {
              setIsOffline(!isOffline);
              setInfoMessage({
                text: !isOffline 
                  ? 'AIRPLANE MODE ACTIVATED: Live map offline. Standard fallbacks displaying base64 imagery.'
                  : 'ONLINE MODE RESUMED: Live interactive Leaflet engine connected.',
                type: !isOffline ? 'warning' : 'success'
              });
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-md ${
              isOffline 
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            <span>{isOffline ? 'Offline Mode Active' : 'Live Status: Online'}</span>
          </button>

          <button 
            onClick={resetToDefault}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all"
          >
            Reset
          </button>
        </div>
      </header>

      {}
      {infoMessage && (
        <div className={`flex items-center justify-between px-6 py-2 border-b text-xs font-medium z-10 transition-all ${
          infoMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          infoMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          infoMessage.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Info className="h-3.5 w-3.5" />
            <span>{infoMessage.text}</span>
          </div>
          <button 
            onClick={() => setInfoMessage(null)}
            className="hover:scale-110 font-bold text-slate-400 hover:text-slate-600 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main split dashboard view */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {}
        <div className="w-full lg:w-5/12 bg-white flex flex-col h-1/2 lg:h-full border-r border-slate-200 shadow-xl overflow-hidden z-20">
          
          {/* Day selection tabs navigation bar */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none pr-4">
              {trip.days.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => {
                    setActiveDay(d.dayNumber);
                    setSearchResults([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                    activeDay === d.dayNumber
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Day {d.dayNumber}
                </button>
              ))}

              <button
                onClick={addTripDay}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-200 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 font-semibold rounded-lg text-xs transition-all border border-dashed border-slate-300"
              >
                <Plus className="h-3 w-3" />
                <span>Add Day</span>
              </button>
            </div>
          </div>

          {/* Active day detail text input */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Itinerary Details</span>
              <input 
                type="text" 
                value={activeDayData?.title || ''} 
                onChange={(e) => {
                  const updatedDays = trip.days.map(d => {
                    if (d.dayNumber === activeDay) {
                      return { ...d, title: e.target.value };
                    }
                    return d;
                  });
                  setTrip({ ...trip, days: updatedDays });
                }}
                className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-all w-full"
                placeholder="Day Theme Description..."
              />
            </div>
          </div>

          {}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <form onSubmit={handleLocationSearch} className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search landmark (e.g. Shibuya crossing)..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:bg-indigo-400 shadow-md flex items-center justify-center space-x-1"
              >
                {isSearching ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </form>

            {/* Displaying async search results panel if results found */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 shadow-inner max-h-60 overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Found Destinations</span>
                  <button 
                    onClick={() => setSearchResults([])}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                </div>
                
                {/* Addition Controls block */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Target Arrival Time</label>
                    <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="time" 
                        value={addTime} 
                        onChange={(e) => setAddTime(e.target.value)}
                        className="text-xs text-slate-600 focus:outline-none w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Itinerary Notes</label>
                    <input 
                      type="text" 
                      value={addNotes} 
                      onChange={(e) => setAddNotes(e.target.value)}
                      placeholder="e.g. Try sushi"
                      className="text-xs text-slate-600 focus:outline-none w-full border border-slate-200 rounded-lg px-2 py-1 h-[26px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  {searchResults.map((place) => (
                    <button
                      key={place.place_id}
                      onClick={() => addLocationToDay(place)}
                      className="w-full text-left p-2 hover:bg-indigo-50 border border-slate-200 bg-white rounded-lg transition-all flex items-start space-x-2 text-xs"
                    >
                      <MapPin className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800">{place.display_name.split(',')[0]}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{place.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Daily Itinerary Stops ({activeDayData?.locations?.length || 0})
            </h3>

            {(!activeDayData || activeDayData.locations.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <MapPin className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Itinerary is empty</p>
                <p className="text-xs mt-1 max-w-xs">Use the search box above to discover and append awesome destinations to your trip.</p>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                {activeDayData.locations.map((loc, index) => (
                  <div
                    key={loc.id}
                    onClick={() => focusLocationOnMap(loc.lat, loc.lng)}
                    className="flex items-start justify-between bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Sequential Number Bubble Node */}
                      <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border-2 border-indigo-500 text-indigo-600 font-extrabold text-sm shadow-sm">
                        {index + 1}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                        
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span className="font-semibold text-slate-600">{loc.time}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                          </span>
                        </div>

                        {loc.notes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-lg inline-block border border-slate-100">
                            {loc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Stop parent highlight click
                        deleteLocation(loc.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                      title="Remove from trip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline Snapshots compile controller panel */}
          <div className="p-6 bg-slate-900 text-slate-100 border-t border-slate-800 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <BookOpen className="h-4 w-4" />
                <span>Offline Snapshot Panel</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-full">
                {offlineMapCache[`${trip.id}_day_${activeDay}`] ? 'Snapshot Cached' : 'No Cache'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Generate and cache a high-fidelity rendering of your map. This saves your maps locally inside the browser's storage so that if you launch GlobeTrek on your phone while traveling offline, your custom maps render immediately.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={generateOfflineSnapshot}
                className="flex items-center justify-center space-x-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl text-xs transition-all shadow-md"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Offline Map</span>
              </button>

              <button
                onClick={downloadSnapshotFile}
                disabled={!offlineMapCache[`${trip.id}_day_${activeDay}`]}
                className="flex items-center justify-center space-x-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 disabled:opacity-40 font-semibold rounded-xl text-xs transition-all border border-slate-700 shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .jpg</span>
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="w-full lg:w-7/12 h-1/2 lg:h-full relative bg-slate-200 z-10">
          
          {/* Map Overlay Badge indicators */}
          <div className="absolute top-4 left-4 z-[400] flex space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 text-white font-bold text-[10px] tracking-wider uppercase shadow-xl backdrop-blur-md">
              <MapIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span>Day {activeDay} Map Overview</span>
            </div>
            
            {offlineMapCache[`${trip.id}_day_${activeDay}`] && (
              <div className="flex items-center space-x-1 bg-emerald-500 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-full tracking-wider uppercase shadow-xl animate-pulse">
                <span>✓ Cache Active</span>
              </div>
            )}
          </div>

          {/* RENDER MODE CONDITIONAL: Switch Live Map out for cached snapshot URI if Offline Simulation is toggled */}
          {isOffline ? (
            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-6 relative">
              {/* Airplane mode banner header */}
              <div className="absolute top-4 right-4 z-[400] flex items-center space-x-2 px-4 py-2 bg-amber-500/90 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-lg shadow-2xl backdrop-blur-md animate-pulse">
                <WifiOff className="h-4 w-4" />
                <span>Viewing Offline Mode — Using Cached Data</span>
              </div>

              {offlineMapCache[`${trip.id}_day_${activeDay}`] ? (
                <div className="flex flex-col items-center space-y-4 max-w-2xl w-full">
                  <div className="bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-700">
                    <img 
                      src={offlineMapCache[`${trip.id}_day_${activeDay}`]} 
                      alt="Offline cached map visual snippet"
                      className="rounded-xl w-full h-auto object-cover border border-slate-800 shadow-md max-h-[70vh]"
                    />
                  </div>
                  <div className="text-center text-slate-300">
                    <p className="font-bold text-sm text-slate-100">Displaying saved static blueprint for Day {activeDay}</p>
                    <p className="text-xs text-slate-400 mt-1">This layout was loaded instantly from your device browser's database. It does not require any live internet connections or Leaflet calls!</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 bg-slate-900/90 p-8 rounded-3xl max-w-md shadow-2xl border border-slate-800">
                  <WifiOff className="h-16 w-16 text-amber-500 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-lg font-bold text-slate-200">No Cache Available for Day {activeDay}</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    You have toggled GlobeTrek's simulated Offline Mode, but you have not compiled an offline map cache for Day {activeDay} yet.
                  </p>
                  <button
                    onClick={() => {
                      setIsOffline(false);
                      generateOfflineSnapshot();
                    }}
                    className="mt-6 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-lg"
                  >
                    Go Online & Generate Cache
                  </button>
                </div>
              )}
            </div>
          ) : (
            // LIVE ONLINE LEAFLET VIEW
            <div className="w-full h-full relative">
              <div 
                ref={mapRef} 
                className="w-full h-full"
                style={{ background: '#cbd5e1' }}
              />
              
              {/* Dynamic Overlay instructing users on how standard flow behaves */}
              <div className="absolute bottom-4 left-4 z-[400] max-w-sm bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl border border-slate-800 backdrop-blur-md">
                <div className="flex items-start space-x-2.5">
                  <Navigation className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Live Navigation Connected</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add addresses on the left to watch routes update dynamically on Leaflet. Click 'Save Offline Map' to compile this map path into an offline graphic!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}