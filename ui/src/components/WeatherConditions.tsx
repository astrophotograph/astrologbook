"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cloud, Droplets, Eye, Wind, MapPin, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  cloudCover: number;
  description: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

type UnitSystem = 'metric' | 'imperial';

export function WeatherConditions() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useState<UnitSystem>(() => {
    // Initialize units from localStorage immediately
    if (typeof window !== 'undefined') {
      const savedUnits = localStorage.getItem('weatherUnits') as UnitSystem
      return (savedUnits === 'metric' || savedUnits === 'imperial') ? savedUnits : 'metric'
    }
    return 'metric'
  })
  const [unitsLoaded, setUnitsLoaded] = useState(false)

  // Update weather when units change (but not on initial load)
  useEffect(() => {
    if (location && weather && unitsLoaded) {
      fetchWeatherData(location.latitude, location.longitude, units)
    }
  }, [units])

  // Mark units as loaded after component mounts
  useEffect(() => {
    setUnitsLoaded(true)
  }, [])

  const toggleUnits = () => {
    const newUnits = units === 'metric' ? 'imperial' : 'metric'
    setUnits(newUnits)
    localStorage.setItem('weatherUnits', newUnits)
  }

  const getTemperatureUnit = () => units === 'metric' ? '°C' : '°F'
  const getSpeedUnit = () => units === 'metric' ? 'm/s' : 'mph'
  const getDistanceUnit = () => units === 'metric' ? 'km' : 'mi'

  const getSeeingCondition = (visibility: number, cloudCover: number, windSpeed: number) => {
    // Calculate seeing based on visibility, cloud cover, and wind
    const visibilityScore = Math.min(visibility / 10, 1) // Normalize to 0-1
    const cloudScore = (100 - cloudCover) / 100 // Invert cloud cover
    const windScore = Math.max(0, (15 - windSpeed) / 15) // Less wind is better

    const overallScore = (visibilityScore + cloudScore + windScore) / 3

    if (overallScore > 0.8) return { condition: "Excellent", value: 1.2 }
    if (overallScore > 0.6) return { condition: "Good", value: 1.8 }
    if (overallScore > 0.4) return { condition: "Fair", value: 2.5 }
    return { condition: "Poor", value: 3.5 }
  }

  const fetchWeatherData = async (lat: number, lon: number, unitSystem: UnitSystem = units) => {
    try {
      setIsLoading(true)
      setError(null)

      // Using OpenWeatherMap API (you'll need to add NEXT_PUBLIC_OPENWEATHER_API_KEY to your .env)
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      if (!apiKey) {
        throw new Error('Weather API key not configured')
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unitSystem}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()

      const weatherData: WeatherData = {
        condition: data.weather[0].main.toLowerCase(),
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg || 0,
        visibility: (data.visibility || 10000) / 1000, // Convert to km
        cloudCover: data.clouds.all,
        description: data.weather[0].description
      }

      setWeather(weatherData)
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')

      // Fallback to mock data
      setWeather({
        condition: 'clear',
        temperature: unitSystem === 'metric' ? 15 : 59,
        humidity: 45,
        windSpeed: unitSystem === 'metric' ? 8.2 : 18.3,
        windDirection: 180,
        visibility: unitSystem === 'metric' ? 10 : 6.2,
        cloudCover: 20,
        description: 'clear sky'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }

        setLocation(newLocation)
        localStorage.setItem('weatherLocation', JSON.stringify(newLocation))
        await fetchWeatherData(newLocation.latitude, newLocation.longitude, units)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError('Unable to get your location')
        setIsLoading(false)

        // Try to use saved location or default
        const savedLocation = localStorage.getItem('weatherLocation')
        if (savedLocation) {
          const parsed = JSON.parse(savedLocation)
          setLocation(parsed)
          fetchWeatherData(parsed.latitude, parsed.longitude, units)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  useEffect(() => {
    // Try to load saved location first
    const savedLocation = localStorage.getItem('weatherLocation')
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        setLocation(parsed)
        fetchWeatherData(parsed.latitude, parsed.longitude, units)
        return
      } catch (err) {
        console.error('Error parsing saved location:', err)
      }
    }

    // If no saved location, get current location
    getCurrentLocation()
  }, [units])

  const refreshWeather = () => {
    if (location) {
      fetchWeatherData(location.latitude, location.longitude, units)
    } else {
      getCurrentLocation()
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-400 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refreshWeather}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weather) return null

  const seeingData = getSeeingCondition(weather.visibility, weather.cloudCover, weather.windSpeed)

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather Conditions
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleUnits}
              className="h-6 px-2 text-xs"
              title={`Switch to ${units === 'metric' ? 'Imperial' : 'Metric'}`}
            >
              {units === 'metric' ? '°C' : '°F'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshWeather}
              className="h-6 w-6 p-0"
              title="Refresh weather data"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {location && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-gray-300">Sky</div>
              <div className="text-white font-medium capitalize">{weather.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-gray-300">Humidity</div>
              <div className="text-white font-medium">{weather.humidity}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-300">Wind</div>
              <div className="text-white font-medium">{weather.windSpeed.toFixed(1)} {getSpeedUnit()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-gray-300">Seeing</div>
              <div className="text-white font-medium">
                {seeingData.condition}
                <span className="text-xs text-gray-400 ml-1">({seeingData.value.toFixed(1)}")</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-300">Temperature</div>
            <div className="text-white font-medium">{Math.round(weather.temperature)}{getTemperatureUnit()}</div>
          </div>
          <div>
            <div className="text-gray-300">Visibility</div>
            <div className="text-white font-medium">{weather.visibility.toFixed(1)} {getDistanceUnit()}</div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium mb-3">7-Day Forecast Heatmap</h4>
          
          {/* Day labels */}
          <div className="grid grid-cols-8 gap-1 mb-2 text-xs">
            <div></div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div key={index} className="text-center text-gray-400 font-medium">{day}</div>
            ))}
          </div>

          {/* Sky Transparency Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-gray-300 flex items-center">Transparency</div>
            {[85, 70, 90, 60, 45, 80, 95].map((transparency, index) => {
              const getTransparencyColor = (value: number) => {
                if (value >= 80) return 'bg-green-500'
                if (value >= 60) return 'bg-yellow-500'
                if (value >= 40) return 'bg-orange-500'
                return 'bg-red-500'
              }
              
              return (
                <div 
                  key={index} 
                  className={`h-6 rounded ${getTransparencyColor(transparency)} flex items-center justify-center text-xs font-medium text-white`}
                  title={`Transparency: ${transparency}%`}
                >
                  {transparency}%
                </div>
              )
            })}
          </div>

          {/* Seeing Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-gray-300 flex items-center">Seeing</div>
            {[1.8, 2.5, 1.5, 3.2, 4.1, 2.0, 1.2].map((seeing, index) => {
              const getSeeingColor = (value: number) => {
                if (value <= 1.5) return 'bg-green-500'
                if (value <= 2.5) return 'bg-yellow-500'
                if (value <= 3.5) return 'bg-orange-500'
                return 'bg-red-500'
              }
              
              return (
                <div 
                  key={index} 
                  className={`h-6 rounded ${getSeeingColor(seeing)} flex items-center justify-center text-xs font-medium text-white`}
                  title={`Seeing: ${seeing}" arcsec`}
                >
                  {seeing}"
                </div>
              )
            })}
          </div>

          {/* Day/Night indicator */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-gray-300 flex items-center">Day/Night</div>
            {[true, false, true, true, false, true, false].map((isNight, index) => (
              <div 
                key={index} 
                className={`h-4 rounded ${isNight ? 'bg-gray-900 border border-gray-600' : 'bg-yellow-200'} flex items-center justify-center`}
                title={isNight ? 'Night time' : 'Day time'}
              >
                <div className={`w-2 h-2 rounded-full ${isNight ? 'bg-gray-300' : 'bg-yellow-600'}`}></div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 mb-1">Legend:</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-300">Excellent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-gray-300">Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-gray-300">Fair</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-300">Poor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Status Indicator */}
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Observing Conditions</span>
            <Badge
              variant={
                seeingData.condition === "Excellent" || seeingData.condition === "Good"
                  ? "default"
                  : seeingData.condition === "Fair"
                    ? "secondary"
                    : "destructive"
              }
            >
              {seeingData.condition === "Excellent" || seeingData.condition === "Good"
                ? "Optimal"
                : seeingData.condition === "Fair"
                  ? "Moderate"
                  : "Poor"}
            </Badge>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Cloud cover: {weather.cloudCover}%
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
