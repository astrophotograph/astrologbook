"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Moon } from "lucide-react"

export function MoonPhase() {
  const moon = {
    phase: "Waxing Gibbous",
    illumination: 78.5,
    age: 10.2, // days since new moon
    rise: "18:45",
    set: "06:23",
    isVisible: true,
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Moon className="w-5 h-5" />
          Moon Phase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16 bg-gray-700 rounded-full overflow-hidden">
            {/* Moon visualization */}
            <div className="absolute inset-0 bg-gray-300 rounded-full"></div>
            <div
              className="absolute inset-0 bg-gray-700 rounded-full transition-all duration-1000"
              style={{
                clipPath:
                  moon.illumination > 50
                    ? `inset(0 ${100 - moon.illumination}% 0 0)`
                    : `inset(0 0 0 ${moon.illumination}%)`,
              }}
            ></div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div>
            <div className="text-sm text-gray-300">Phase</div>
            <div className="text-white font-medium">{moon.phase}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-300">Illumination</div>
              <div className="text-white font-medium">{Math.round(moon.illumination)}%</div>
            </div>
            <div>
              <div className="text-gray-300">Age</div>
              <div className="text-white font-medium">{moon.age.toFixed(1)} days</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div>
              <div className="text-gray-300">Moonrise</div>
              <div className="text-white font-medium">{moon.rise}</div>
            </div>
            <div>
              <div className="text-gray-300">Moonset</div>
              <div className="text-white font-medium">{moon.set}</div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Currently Visible</span>
              <Badge variant={moon.isVisible ? "default" : "secondary"}>
                {moon.isVisible ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Moon impact on observing */}
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Light Pollution</span>
            <Badge
              variant={
                moon.illumination < 25
                  ? "default"
                  : moon.illumination < 75
                    ? "secondary"
                    : "destructive"
              }
            >
              {moon.illumination < 25
                ? "Minimal"
                : moon.illumination < 75
                  ? "Moderate"
                  : "High"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
