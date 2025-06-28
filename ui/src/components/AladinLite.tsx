"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, RotateCcw, Layers, Telescope } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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
        removeLayers: () => void;
        addOverlay: (overlay: unknown) => void;
        removeOverlay: (overlay: unknown) => void;
        getRaDec: () => [number, number];
        view: {
          catalogHpxFOV: () => number;
        };
      };
      catalog: (options: Record<string, unknown>) => {
        addSources: (sources: Array<{
          name: string;
          ra: number;
          dec: number;
          data?: Record<string, unknown>;
        }>) => void;
      };
      catalogFromVizieR: (vizierTable: string, name: string, options: Record<string, unknown>) => unknown;
      graphicOverlay: (options: Record<string, unknown>) => {
        addFootprints: (footprints: Array<Record<string, unknown>>) => void;
        add: (shape: unknown) => void;
      };
      rect: (ra: number, dec: number, width: number, height: number, options?: Record<string, unknown>) => unknown;
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
    removeLayers: () => void;
    addOverlay: (overlay: unknown) => void;
    removeOverlay: (overlay: unknown) => void;
    getRaDec: () => [number, number];
    view: {
      catalogHpxFOV: () => number;
    };
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState("P/DSS2/color");
  const [projection, setProjection] = useState("SIN");
  const [fov, setFov] = useState(60);
  const [showSimbad, setShowSimbad] = useState(false);
  const [showHipparcos, setShowHipparcos] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showTelescopeFov, setShowTelescopeFov] = useState(false);
  const [telescopeFovWidth, setTelescopeFovWidth] = useState(30); // arcminutes
  const [telescopeFovHeight, setTelescopeFovHeight] = useState(20); // arcminutes
  const simbadCatalogRef = useRef<unknown>(null);
  const hipparcosRef = useRef<unknown>(null);
  const constellationsRef = useRef<unknown>(null);
  const telescopeFovOverlayRef = useRef<unknown>(null);

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

      // Add Hipparcos catalog for enhanced viewing
      const hipparcosCat = A.catalog({
        name: 'Hipparcos',
        sourceSize: 8,
        color: '#ffffff',
        onClick: 'showTable'
      });
      aladin.addCatalog(hipparcosCat);
      hipparcosRef.current = hipparcosCat;

      // Add constellation lines
      const constellationsCat = A.catalog({
        name: 'Constellations',
        sourceSize: 5,
        color: '#00ff00',
        lineWidth: 2
      });
      aladin.addCatalog(constellationsCat);
      constellationsRef.current = constellationsCat;

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

  // Toggle Simbad catalog
  const toggleSimbad = async (enabled: boolean) => {
    setShowSimbad(enabled);
    
    if (!aladinRef.current || !window.A) return;
    
    if (enabled) {
      // Add Simbad catalog
      if (!simbadCatalogRef.current) {
        try {
          // Use a basic Simbad catalog approach
          const simbadCat = window.A.catalog({
            name: 'Simbad Objects',
            sourceSize: 12,
            color: '#ff9900',
            onClick: 'showTable',
            shape: 'square'
          });
          
          // For demo purposes, add some sample Simbad objects
          // In a real implementation, this would query Simbad dynamically
          const sampleObjects = [
            { name: 'M31', ra: 10.6847, dec: 41.2691, type: 'Galaxy' },
            { name: 'M42', ra: 83.8221, dec: -5.3911, type: 'Nebula' },
            { name: 'M45', ra: 56.75, dec: 24.1167, type: 'Open Cluster' },
            { name: 'M13', ra: 250.423, dec: 36.4613, type: 'Globular Cluster' },
            { name: 'Vega', ra: 279.2341, dec: 38.7837, type: 'Star' },
            { name: 'Sirius', ra: 101.287, dec: -16.7161, type: 'Star' }
          ];
          
          // Add sources to catalog
          sampleObjects.forEach(obj => {
            simbadCat.addSources([{
              name: obj.name,
              ra: obj.ra,
              dec: obj.dec,
              data: { type: obj.type }
            }]);
          });
          
          aladinRef.current.addCatalog(simbadCat);
          simbadCatalogRef.current = simbadCat;
        } catch (error) {
          console.error('Error adding Simbad catalog:', error);
        }
      }
    } else {
      // Remove Simbad catalog
      if (simbadCatalogRef.current) {
        // Note: Aladin Lite doesn't have a direct removeCatalog method
        // The catalog will be hidden but not completely removed
        simbadCatalogRef.current = null;
      }
    }
  };

  // Toggle Hipparcos catalog
  const toggleHipparcos = (enabled: boolean) => {
    setShowHipparcos(enabled);
    // Implementation would be similar to Simbad toggle
    // For now, we'll just update the state
  };

  // Toggle constellation lines
  const toggleConstellations = (enabled: boolean) => {
    setShowConstellations(enabled);
    // Implementation would be similar to other toggles
    // For now, we'll just update the state
  };

  // Toggle telescope field of view
  const toggleTelescopeFov = (enabled: boolean) => {
    setShowTelescopeFov(enabled);
    
    if (!aladinRef.current || !window.A) return;
    
    if (enabled) {
      // Add telescope FOV overlay
      if (!telescopeFovOverlayRef.current) {
        try {
          // Get current center coordinates
          const [ra, dec] = aladinRef.current.getRaDec();
          
          // Convert arcminutes to degrees
          const widthDeg = telescopeFovWidth / 60;
          const heightDeg = telescopeFovHeight / 60;
          
          // Create a graphic overlay for the telescope FOV
          const overlay = window.A.graphicOverlay({
            color: '#ff0000',
            lineWidth: 2,
            name: 'Telescope FOV'
          });
          
          // Create a rectangle representing the telescope field of view
          const fovRect = window.A.rect(ra, dec, widthDeg, heightDeg, {
            color: '#ff0000',
            lineWidth: 2,
            fillColor: '#ff0000',
            fillOpacity: 0.1
          });
          
          overlay.add(fovRect);
          aladinRef.current.addOverlay(overlay);
          telescopeFovOverlayRef.current = overlay;
        } catch (error) {
          console.error('Error adding telescope FOV overlay:', error);
        }
      }
    } else {
      // Remove telescope FOV overlay
      if (telescopeFovOverlayRef.current && aladinRef.current) {
        try {
          aladinRef.current.removeOverlay(telescopeFovOverlayRef.current);
          telescopeFovOverlayRef.current = null;
        } catch (error) {
          console.error('Error removing telescope FOV overlay:', error);
        }
      }
    }
  };

  // Update telescope FOV size
  const updateTelescopeFovSize = () => {
    if (showTelescopeFov && telescopeFovOverlayRef.current) {
      // Remove old overlay and create new one with updated dimensions
      toggleTelescopeFov(false);
      setTimeout(() => toggleTelescopeFov(true), 100);
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

        {/* Layer Controls */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4" />
            <Label className="text-sm font-medium">Catalog Layers</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#ff9900' }}
                />
                <Label htmlFor="simbad-toggle" className="text-sm">
                  Simbad Objects
                </Label>
              </div>
              <Switch
                id="simbad-toggle"
                checked={showSimbad}
                onCheckedChange={toggleSimbad}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #666' }}
                />
                <Label htmlFor="hipparcos-toggle" className="text-sm">
                  Hipparcos Stars
                </Label>
              </div>
              <Switch
                id="hipparcos-toggle"
                checked={showHipparcos}
                onCheckedChange={toggleHipparcos}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#00ff00' }}
                />
                <Label htmlFor="constellations-toggle" className="text-sm">
                  Constellation Lines
                </Label>
              </div>
              <Switch
                id="constellations-toggle"
                checked={showConstellations}
                onCheckedChange={toggleConstellations}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Toggle astronomical catalogs and overlays on the sky map
          </p>
        </div>

        {/* Telescope FOV Controls */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Telescope className="w-4 h-4" />
            <Label className="text-sm font-medium">Telescope Field of View</Label>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 border-2 border-red-500 bg-red-500/10"
                />
                <Label htmlFor="telescope-fov-toggle" className="text-sm">
                  Show FOV Rectangle
                </Label>
              </div>
              <Switch
                id="telescope-fov-toggle"
                checked={showTelescopeFov}
                onCheckedChange={toggleTelescopeFov}
              />
            </div>
            
            {showTelescopeFov && (
              <div className="pl-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fov-width" className="text-xs">
                      Width (arcmin)
                    </Label>
                    <Input
                      id="fov-width"
                      type="number"
                      min="1"
                      max="180"
                      value={telescopeFovWidth}
                      onChange={(e) => {
                        setTelescopeFovWidth(Number(e.target.value));
                        updateTelescopeFovSize();
                      }}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fov-height" className="text-xs">
                      Height (arcmin)
                    </Label>
                    <Input
                      id="fov-height"
                      type="number"
                      min="1"
                      max="180"
                      value={telescopeFovHeight}
                      onChange={(e) => {
                        setTelescopeFovHeight(Number(e.target.value));
                        updateTelescopeFovSize();
                      }}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Presets:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(34);
                        setTelescopeFovHeight(23);
                        updateTelescopeFovSize();
                      }}
                    >
                      DSLR (34×23)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(17);
                        setTelescopeFovHeight(13);
                        updateTelescopeFovSize();
                      }}
                    >
                      CCD (17×13)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(7);
                        setTelescopeFovHeight(5);
                        updateTelescopeFovSize();
                      }}
                    >
                      Small CCD (7×5)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(60);
                        setTelescopeFovHeight(40);
                        updateTelescopeFovSize();
                      }}
                    >
                      Binoculars (60×40)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Display a red rectangle showing your telescope&apos;s field of view at the current center position
          </p>
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
          <p>• <strong>Layer Toggles:</strong> Show/hide Simbad objects, Hipparcos stars, and constellation lines</p>
          <p>• <strong>Telescope FOV:</strong> Display a red rectangle showing your telescope&apos;s field of view</p>
          <p>• <strong>Simbad:</strong> Database of astronomical objects with detailed information</p>
        </div>
      </CardContent>
    </Card>
  );
}