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

interface ForecastData {
  dateTime: Date;
  transparency: number;
  seeing: number;
  isNight: boolean;
  cloudCover: number;
  humidity: number;
  windSpeed: number;
  temperature: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

type UnitSystem = 'metric' | 'imperial';

export function WeatherConditions() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<ForecastData[]>([])
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

  const calculateAstronomicalConditions = (cloudCover: number, humidity: number, windSpeed: number) => {
    // Calculate transparency (0-100%) - less clouds and humidity = better transparency
    const cloudScore = (100 - cloudCover) / 100
    const humidityScore = Math.max(0, (80 - humidity) / 80) // High humidity reduces transparency
    const transparency = Math.round((cloudScore * 0.7 + humidityScore * 0.3) * 100)

    // Calculate seeing (arcseconds) - less wind and turbulence = better seeing
    const windScore = Math.max(0, (20 - windSpeed) / 20)
    const seeing = 1.0 + (1 - windScore) * 3.0 // Range from 1.0 to 4.0 arcseconds

    return { transparency: Math.max(20, transparency), seeing: Number(seeing.toFixed(1)) }
  }

  const fetchForecastData = async (lat: number, lon: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      if (!apiKey) {
        console.error('Weather API key not configured')
        return
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch forecast data')
      }

      const data = await response.json()

      // Take the next 16 3-hour intervals (48 hours)
      const forecastData: ForecastData[] = data.list
        .slice(0, 16)
        .map((item: any) => {
          const dateTime = new Date(item.dt * 1000)
          const hour = dateTime.getHours()

          const cloudCover = item.clouds.all
          const humidity = item.main.humidity
          const windSpeed = item.wind.speed
          const temperature = item.main.temp

          const conditions = calculateAstronomicalConditions(cloudCover, humidity, windSpeed)

          // Determine if it's night time (simplified - could use sunrise/sunset API)
          const isNight = hour < 6 || hour > 20

          return {
            dateTime,
            transparency: conditions.transparency,
            seeing: conditions.seeing,
            isNight,
            cloudCover,
            humidity,
            windSpeed,
            temperature
          }
        })

      setForecast(forecastData)
    } catch (err) {
      console.error('Forecast fetch error:', err)
      // Fallback to mock data if API fails
      const mockForecast: ForecastData[] = []
      for (let i = 0; i < 16; i++) {
        const dateTime = new Date()
        dateTime.setHours(dateTime.getHours() + (i * 3))
        const hour = dateTime.getHours()

        const conditions = calculateAstronomicalConditions(
          Math.random() * 80, // Random cloud cover
          40 + Math.random() * 40, // Random humidity 40-80%
          Math.random() * 15 // Random wind speed
        )
        mockForecast.push({
          dateTime,
          transparency: conditions.transparency,
          seeing: conditions.seeing,
          isNight: hour < 6 || hour > 20,
          cloudCover: Math.round(Math.random() * 80),
          humidity: Math.round(40 + Math.random() * 40),
          windSpeed: Math.random() * 15,
          temperature: 10 + Math.random() * 20
        })
      }
      setForecast(mockForecast)
    }
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
      // Also fetch forecast data
      await fetchForecastData(lat, lon)
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
          <h4 className="text-sm font-medium mb-3">48-Hour Forecast (3-Hour Intervals)</h4>

          {forecast.length > 0 ? (
            <>
              {/* Time labels */}
              <div className="overflow-x-auto">
                <div className="flex gap-1 mb-2 text-xs min-w-max">
                  <div className="w-16 flex-shrink-0"></div>
                  {forecast.map((data, index) => {
                    // Only show labels every 4th interval (12 hours) or first/last
                    const shouldShowLabel = index === 0 || index === forecast.length - 1 || index % 4 === 0
                    const timeStr = data.dateTime.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit'
                    }).replace(',', '')

                    return (
                      <div key={index} className="w-4 flex-shrink-0 text-center text-gray-400 font-medium text-xs transform -rotate-45 origin-center h-8 flex items-end justify-center">
                        {shouldShowLabel ? <span className="text-xs">{timeStr}</span> : ''}
                      </div>
                    )
                  })}
                </div>

                {/* Sky Transparency Row */}
                <div className="flex gap-1 mb-2 min-w-max">
                  <div className="w-16 flex-shrink-0 text-xs text-gray-300 flex items-center">Transparency</div>
                  {forecast.map((data, index) => {
                    const getTransparencyColor = (value: number) => {
                      if (value >= 80) return 'bg-green-500'
                      if (value >= 60) return 'bg-yellow-500'
                      if (value >= 40) return 'bg-orange-500'
                      return 'bg-red-500'
                    }

                    return (
                      <div
                        key={index}
                        className={`w-4 h-4 flex-shrink-0 rounded cursor-pointer ${getTransparencyColor(data.transparency)}`}
                        title={`${data.dateTime.toLocaleString()}\nTransparency: ${data.transparency}%\nCloud: ${data.cloudCover}%\nHumidity: ${data.humidity}%`}
                      >
                      </div>
                    )
                  })}
                </div>

                {/* Seeing Row */}
                <div className="flex gap-1 mb-2 min-w-max">
                  <div className="w-16 flex-shrink-0 text-xs text-gray-300 flex items-center">Seeing</div>
                  {forecast.map((data, index) => {
                    const getSeeingColor = (value: number) => {
                      if (value <= 1.5) return 'bg-green-500'
                      if (value <= 2.5) return 'bg-yellow-500'
                      if (value <= 3.5) return 'bg-orange-500'
                      return 'bg-red-500'
                    }

                    return (
                      <div
                        key={index}
                        className={`w-4 h-4 flex-shrink-0 rounded cursor-pointer ${getSeeingColor(data.seeing)}`}
                        title={`${data.dateTime.toLocaleString()}\nSeeing: ${data.seeing}" arcsec\nWind: ${data.windSpeed.toFixed(1)} ${getSpeedUnit()}`}
                      >
                      </div>
                    )
                  })}
                </div>

                {/* Day/Night indicator */}
                <div className="flex gap-1 mb-2 min-w-max">
                  <div className="w-16 flex-shrink-0 text-xs text-gray-300 flex items-center">Day/Night</div>
                  {forecast.map((data, index) => (
                    <div
                      key={index}
                      className={`w-4 h-3 flex-shrink-0 rounded cursor-pointer flex items-center justify-center ${data.isNight ? 'bg-gray-900 border border-gray-600' : 'bg-yellow-200'}`}
                      title={`${data.dateTime.toLocaleString()}\n${data.isNight ? 'Night time' : 'Day time'}\nTemp: ${Math.round(data.temperature)}${getTemperatureUnit()}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${data.isNight ? 'bg-gray-300' : 'bg-yellow-600'}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <RefreshCw className="w-4 h-4 mx-auto mb-2 animate-spin" />
              Loading forecast data...
            </div>
          )}

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
