"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, RotateCcw } from "lucide-react";

interface AladinLiteProps {
  width?: number;
  height?: number;
  className?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
  } | null;
}

declare global {
  interface Window {
    A: {
      aladin: (element: HTMLElement, options: Record<string, unknown>) => {
        setImageSurvey: (survey: string) => void;
        setProjection: (projection: string) => void;
        setFoV: (fov: number) => void;
        gotoObject: (target: string) => void;
        addCatalog: (catalog: unknown) => void;
      };
      catalog: (options: Record<string, unknown>) => unknown;
    };
  }
}

export function AladinLite({ width = 800, height = 600, className = "", userLocation }: AladinLiteProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<{
    setImageSurvey: (survey: string) => void;
    setProjection: (projection: string) => void;
    setFoV: (fov: number) => void;
    gotoObject: (target: string) => void;
    addCatalog: (catalog: unknown) => void;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState("P/DSS2/color");
  const [projection, setProjection] = useState("SIN");
  const [fov, setFov] = useState(60);

  // Load Aladin Lite script
  useEffect(() => {
    const loadAladinLite = () => {
      if (window.A) {
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
      script.onload = () => {
        setIsLoaded(true);
        setIsLoading(false);
      };
      script.onerror = () => {
        console.error('Failed to load Aladin Lite');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadAladinLite();
  }, []);

  // Initialize Aladin Lite
  useEffect(() => {
    if (!isLoaded || !divRef.current || aladinRef.current) return;

    try {
      const A = window.A;
      
      const aladin = A.aladin(divRef.current, {
        survey: survey,
        projection: projection,
        fov: fov,
        target: 'M31', // Default target
        cooFrame: 'ICRS',
        showReticle: true,
        showZoomControl: true,
        showFullscreenControl: true,
        showLayersControl: true,
        showGotoControl: true,
        showShareControl: false,
        showCatalog: true,
        showFrame: true,
        showCooGrid: false,
        reticleColor: '#ff0000',
        reticleSize: 22,
        log: false
      });

      aladinRef.current = aladin;

      // Add some catalogs for enhanced viewing
      const cat = A.catalog({name: 'Hipparcos', sourceSize: 8});
      aladin.addCatalog(cat);

      // Add constellation lines
      const constellations = A.catalog({
        name: 'Constellations',
        sourceSize: 5,
        color: '#00ff00'
      });
      aladin.addCatalog(constellations);

    } catch (error) {
      console.error('Error initializing Aladin Lite:', error);
    }
  }, [isLoaded, survey, projection, fov]);

  // Handle survey change
  const changeSurvey = (newSurvey: string) => {
    setSurvey(newSurvey);
    if (aladinRef.current) {
      aladinRef.current.setImageSurvey(newSurvey);
    }
  };

  // Handle projection change
  const changeProjection = (newProjection: string) => {
    setProjection(newProjection);
    if (aladinRef.current) {
      aladinRef.current.setProjection(newProjection);
    }
  };

  // Handle field of view change
  const changeFov = (newFov: number) => {
    setFov(newFov);
    if (aladinRef.current) {
      aladinRef.current.setFoV(newFov);
    }
  };

  // Go to specific coordinates
  const gotoObject = (target: string) => {
    if (aladinRef.current) {
      aladinRef.current.gotoObject(target);
    }
  };

  // Reset view
  const resetView = () => {
    if (aladinRef.current) {
      aladinRef.current.gotoObject('M31');
      changeFov(60);
    }
  };

  // Go to zenith (overhead position based on user location)
  const gotoZenith = () => {
    if (aladinRef.current && userLocation) {
      // For zenith, we would need current LST calculation
      // For now, just center on a prominent object
      aladinRef.current.gotoObject('Polaris');
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Aladin Lite Sky Survey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center border rounded-lg bg-muted/50"
            style={{ width: width, height: height }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading Aladin Lite...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Aladin Lite Sky Survey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center border rounded-lg bg-muted/50"
            style={{ width: width, height: height }}
          >
            <div className="text-center">
              <p className="text-muted-foreground">Failed to load Aladin Lite</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please check your internet connection and try again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Aladin Lite Sky Survey
        </CardTitle>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              Interactive astronomical sky survey
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              title="Reset view to M31"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            {userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={gotoZenith}
                title="Go to zenith (overhead)"
              >
                <MapPin className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="survey-select">Sky Survey</Label>
            <Select value={survey} onValueChange={changeSurvey}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P/DSS2/color">DSS2 Color</SelectItem>
                <SelectItem value="P/DSS2/red">DSS2 Red</SelectItem>
                <SelectItem value="P/2MASS/color">2MASS Color</SelectItem>
                <SelectItem value="P/allWISE/color">AllWISE Color</SelectItem>
                <SelectItem value="P/SDSS9/color">SDSS9 Color</SelectItem>
                <SelectItem value="P/Mellinger/color">Mellinger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="projection-select">Projection</Label>
            <Select value={projection} onValueChange={changeProjection}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIN">Orthographic (SIN)</SelectItem>
                <SelectItem value="STG">Stereographic (STG)</SelectItem>
                <SelectItem value="TAN">Gnomonic (TAN)</SelectItem>
                <SelectItem value="ZEA">Zenithal Equal Area (ZEA)</SelectItem>
                <SelectItem value="AIT">Aitoff (AIT)</SelectItem>
                <SelectItem value="MOL">Mollweide (MOL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fov-select">Field of View</Label>
            <Select value={fov.toString()} onValueChange={(value) => changeFov(Number(value))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="180">180° (All Sky)</SelectItem>
                <SelectItem value="90">90° (Quarter Sky)</SelectItem>
                <SelectItem value="60">60° (Wide)</SelectItem>
                <SelectItem value="30">30° (Medium)</SelectItem>
                <SelectItem value="15">15° (Narrow)</SelectItem>
                <SelectItem value="5">5° (Very Narrow)</SelectItem>
                <SelectItem value="1">1° (Zoom)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('M31')}
          >
            Andromeda Galaxy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('M42')}
          >
            Orion Nebula
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('M45')}
          >
            Pleiades
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('M13')}
          >
            Hercules Cluster
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('Polaris')}
          >
            North Star
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoObject('Vega')}
          >
            Vega
          </Button>
        </div>

        {/* Aladin container */}
        <div 
          ref={divRef}
          className="border rounded-lg"
          style={{ width: width, height: height }}
        />

        {/* Instructions */}
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>• <strong>Mouse:</strong> Left-click and drag to pan, scroll to zoom</p>
          <p>• <strong>Right-click:</strong> Context menu with object information</p>
          <p>• <strong>Controls:</strong> Use the overlay controls for layers, goto, and fullscreen</p>
          <p>• <strong>Surveys:</strong> Switch between different astronomical image surveys</p>
          <p>• <strong>Catalogs:</strong> Hipparcos stars and constellation lines are loaded</p>
        </div>
      </CardContent>
    </Card>
  );
}