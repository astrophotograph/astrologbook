"use client"

import {useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Label} from "@/components/ui/label"
import {MapPin, RotateCcw, Layers, Telescope} from "lucide-react"
import {Switch} from "@/components/ui/switch"
import {Input} from "@/components/ui/input"
import {clearTimeout} from "node:timers"
import {DefaultBreadcrumb} from "@/components/default-breadcrumb"
import Script from "next/script"

interface AladinLiteProps {
  isLoaded?: boolean;
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

type Catalog = {
  id: string;
  name: string;
  targets: null | Array<unknown>;
  source: string;
  url: string;
  options: Record<string, unknown>;
  AladinCatalog: unknown;
  color?: string | undefined;
}

const CatalogSources: Record<string, Catalog> = {
  simbad: {
    id: 'simbad',
    targets: null,
    source: 'simbad',
    name: 'SIMBAD  ',
    AladinCatalog: null,
    url: 'https://hipscat.cds.unistra.fr/HiPSCatService/SIMBAD',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  messier: {
    id: 'messier',
    name: "Messier",
    targets: null,
    url: "http://localhost:3000/catalogs/Messier.json",
    source: "simbad",
    AladinCatalog: null,
    color: '#29a329',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  ngc: {
    id: 'ngc',
    name: "NGC",
    targets: null,
    url: "http://localhost:3000/catalogs/OpenNGC.json",
    source: "openngc",
    AladinCatalog: null,
    color: '#cccccc',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  ic: {
    id: 'ic',
    name: "IC",
    targets: null,
    url: "http://localhost:3000/catalogs/OpenIC.json",
    source: "openngc",
    AladinCatalog: null,
    color: '#cccccc',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  sharpless: {
    id: 'sharpless',
    name: "Sharpless",
    targets: null,
    url: "http://localhost:3000/catalogs/Sharpless.json",
    source: "simbad",
    AladinCatalog: null,
    color: '#00afff',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  ldn: {
    id: 'ldn',
    name: "LDN",
    targets: null,
    url: "http://localhost:3000/catalogs/LDN.json",
    source: "vizier",
    AladinCatalog: null,
    color: '#CBCC49',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  lbn: {
    id: 'lbn',
    name: "LBN",
    targets: null,
    url: "http://localhost:3000/catalogs/LBN.json",
    source: "vizier",
    AladinCatalog: null,
    color: '#CBCC49',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },
  barnard: {
    id: 'barnard',
    name: "Barnard",
    targets: null,
    url: "http://localhost:3000/catalogs/Barnard.json",
    source: "vizier",
    AladinCatalog: null,
    color: '#E0FFFF',
    options: {shape: 'circle', sourceSize: 8, color: '#318d80'},
  },  // light cyan
}

function buildCatalogOverlay(aladin, catalogName: keyof typeof CatalogSources) {
  if (!aladin || !window.A) return

  console.log('Building catalog overlay:', catalogName)
  const catalogInfo = CatalogSources[catalogName]
  const catalog = window.A.catalogHiPS(catalogInfo.url, {
    id: catalogInfo.id,
    name: catalogInfo.name,
    shape: catalogInfo.options.shape,
    sourceSize: catalogInfo.options.sourceSize,
    color: catalogInfo.options.color,
    onClick: 'showTable',
  })

  catalog.hide()

  aladin.addCatalog(catalog)

  return catalog
}

const hoursToDeg = 15

function catalogToDataObject(target) {
  // target array
  //   0      1     2      3       4      5       6      7       8      9
  // ["CAT", "RA", "DEC", "TYPE", "CON", "BMAG", "DST", "NAME", "INFO", "SIZE"]
  const catname = target[0]    // CAT
  const extname = target[7]    // NAME
  let dispname
  let size
  if (extname != "") {
    dispname = catname + ', ' + extname
  } else {
    dispname = catname
  }
  if (target.length > 9) {
    size = target[9]
  } else {
    size = 0
  }
  return {
    name: dispname,
    wikiname: catname,
    info: {
      radec: target[1].toFixed(5) + ' ' + target[2].toFixed(5),
      type: target[3],
      constellation: target[4],
      mag: target[5],
      size: size,
      distance: target[6],
      notes: target[8],
    },
  }
}

async function buildJsonCatalog(aladin, catalogName: keyof typeof CatalogSources) {
  if (!aladin || !window.A) return

  const catalog = CatalogSources[catalogName]

  if (catalog.AladinCatalog) return

  catalog.AladinCatalog = window.A.catalog({
    id: catalog.id,
    name: catalogName,
    labelColumn: 'name',
    displayLabel: true,
    labelColor: catalog.options.color,
    labelFont: '12px sans-serif',
  })
  catalog.AladinCatalog.hide()

  const response = await fetch(catalog.url)
  catalog.targets = (await response.json()).data

  for (let i = 0; i < catalog.targets.length; i++) {
    if (i == 0) {
      console.log("addJsonToAladinCatalog:add", catalog.targets[i], catalogName)
    }
    catalog.AladinCatalog.addSources(
      window.A.source(
        catalog.targets[i][1] * hoursToDeg,
        catalog.targets[i][2],
        catalogToDataObject(catalog.targets[i])))
  }

  aladin.addCatalog(catalog.AladinCatalog)
}


export function AladinLite({width = 800, height = 600, className = "", userLocation, isLoaded}: AladinLiteProps) {
  const divRef = useRef<HTMLDivElement>(null)
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
  } | null>(null)
  const [survey, setSurvey] = useState("P/DSS2/color")
  const [projection, setProjection] = useState("SIN")
  const [fov, setFov] = useState(60)
  const [showSimbad, setShowSimbad] = useState(false)
  const [showHipparcos, setShowHipparcos] = useState(true)
  const [showConstellations, setShowConstellations] = useState(true)
  const [showTelescopeFov, setShowTelescopeFov] = useState(false)
  const [telescopeFovWidth, setTelescopeFovWidth] = useState(30) // arcminutes
  const [telescopeFovHeight, setTelescopeFovHeight] = useState(20) // arcminutes
  const simbadCatalogRef = useRef<unknown>(null)
  const constellationsRef = useRef<unknown>(null)
  const telescopeFovOverlayRef = useRef<unknown>(null)

  // Initialize Aladin Lite
  useEffect(() => {
    if (!isLoaded || !divRef.current || aladinRef.current) return

    try {
      aladinRef.current = window.A.aladin(divRef.current, {
        survey,
        projection,
        fov,
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
        log: false,
      })

      // // Add constellation lines
      // const constellationsCat = window.A.catalog({
      //   name: 'Constellations',
      //   sourceSize: 5,
      //   color: '#00ff00',
      //   lineWidth: 2,
      // })
      // aladin.addCatalog(constellationsCat)
      // constellationsRef.current = constellationsCat

    } catch (error) {
      console.error('Error initializing Aladin Lite:', error)
    }
  }, [survey, projection, setProjection, fov, isLoaded])

  useEffect(() => {
    if (!aladinRef.current || !window.A) return

    buildJsonCatalog(aladinRef.current, 'barnard')
    buildJsonCatalog(aladinRef.current, 'lbn')
    buildJsonCatalog(aladinRef.current, 'ldn')
    buildJsonCatalog(aladinRef.current, 'messier')
    buildJsonCatalog(aladinRef.current, 'ngc')
    buildJsonCatalog(aladinRef.current, 'sharpless')
  }, [window.A, aladinRef.current])

  // Handle survey change
  const changeSurvey = (newSurvey: string) => {
    setSurvey(newSurvey)
    if (aladinRef.current) {
      aladinRef.current.setImageSurvey(newSurvey)
    }
  }

  // Handle projection change
  const changeProjection = (newProjection: string) => {
    setProjection(newProjection)
    if (aladinRef.current) {
      aladinRef.current.setProjection(newProjection)
    }
  }

  // Handle field of view change
  const changeFov = (newFov: number) => {
    setFov(newFov)
    if (aladinRef.current) {
      aladinRef.current.setFoV(newFov)
    }
  }

  // Go to specific coordinates
  const gotoObject = (target: string) => {
    if (aladinRef.current) {
      aladinRef.current.gotoObject(target)
    }
  }

  // Reset view
  const resetView = () => {
    if (aladinRef.current) {
      aladinRef.current.gotoObject('M31')
      changeFov(60)
    }
  }

  // Go to zenith (overhead position based on user location)
  const gotoZenith = () => {
    if (aladinRef.current && userLocation) {
      // For zenith, we would need current LST calculation
      // For now, just center on a prominent object
      aladinRef.current.gotoObject('Polaris')
    }
  }

  // Toggle Simbad catalog
  const toggleSimbad = async (enabled: boolean) => {
    setShowSimbad(enabled)

    if (!aladinRef.current || !window.A) return

    if (enabled) {
      // Add Simbad catalog
      if (!simbadCatalogRef.current) {
        try {
          simbadCatalogRef.current = buildCatalogOverlay(aladinRef.current, 'simbad')
        } catch (error) {
          console.error('Error adding Simbad catalog:', error)
        }
      }
      simbadCatalogRef.current.show()
    } else {
      simbadCatalogRef.current.hide()
    }
  }

  // Toggle Hipparcos catalog
  const toggleHipparcos = (enabled: boolean) => {
    setShowHipparcos(enabled)
    // Implementation would be similar to Simbad toggle
    // For now, we'll just update the state
  }

  // Toggle constellation lines
  const toggleConstellations = (enabled: boolean) => {
    setShowConstellations(enabled)
    // Implementation would be similar to other toggles
    // For now, we'll just update the state
  }

  // Toggle telescope field of view
  const toggleTelescopeFov = (enabled: boolean) => {
    setShowTelescopeFov(enabled)

    if (!aladinRef.current || !window.A) return

    if (enabled) {
      // Add telescope FOV overlay
      if (!telescopeFovOverlayRef.current) {
        try {
          // Get current center coordinates
          const [ra, dec] = aladinRef.current.getRaDec()

          // Convert arcminutes to degrees
          const widthDeg = telescopeFovWidth / 60
          const heightDeg = telescopeFovHeight / 60

          // Create a graphic overlay for the telescope FOV
          const overlay = window.A.graphicOverlay({
            color: '#ff0000',
            lineWidth: 2,
            name: 'Telescope FOV',
          })

          // Create a rectangle representing the telescope field of view
          const fovRect = window.A.rect(ra, dec, widthDeg, heightDeg, {
            color: '#ff0000',
            lineWidth: 2,
            fillColor: '#ff0000',
            fillOpacity: 0.1,
          })

          overlay.add(fovRect)
          aladinRef.current.addOverlay(overlay)
          telescopeFovOverlayRef.current = overlay
        } catch (error) {
          console.error('Error adding telescope FOV overlay:', error)
        }
      }
    } else {
      // Remove telescope FOV overlay
      if (telescopeFovOverlayRef.current && aladinRef.current) {
        try {
          aladinRef.current.removeOverlay(telescopeFovOverlayRef.current)
          telescopeFovOverlayRef.current = null
        } catch (error) {
          console.error('Error removing telescope FOV overlay:', error)
        }
      }
    }
  }

  // Update telescope FOV size
  const updateTelescopeFovSize = () => {
    if (showTelescopeFov && telescopeFovOverlayRef.current) {
      // Remove old overlay and create new one with updated dimensions
      toggleTelescopeFov(false)
      setTimeout(() => toggleTelescopeFov(true), 100)
    }
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5"/>
            Aladin Lite Sky Survey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center border rounded-lg bg-muted/50"
            style={{width: width, height: height}}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading Aladin Lite...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5"/>
          Aladin Lite Sky Survey
        </CardTitle>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4"/>
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
              <RotateCcw className="w-4 h-4"/>
            </Button>
            {userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={gotoZenith}
                title="Go to zenith (overhead)"
              >
                <MapPin className="w-4 h-4"/>
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
                <SelectValue/>
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
                <SelectValue/>
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
                <SelectValue/>
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
            <Layers className="w-4 h-4"/>
            <Label className="text-sm font-medium">Catalog Layers</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{backgroundColor: '#ff9900'}}
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
                  style={{backgroundColor: '#ffffff', border: '1px solid #666'}}
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
                  style={{backgroundColor: '#00ff00'}}
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
            <Telescope className="w-4 h-4"/>
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
                        setTelescopeFovWidth(Number(e.target.value))
                        updateTelescopeFovSize()
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
                        setTelescopeFovHeight(Number(e.target.value))
                        updateTelescopeFovSize()
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
                        setTelescopeFovWidth(34)
                        setTelescopeFovHeight(23)
                        updateTelescopeFovSize()
                      }}
                    >
                      DSLR (34×23)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(17)
                        setTelescopeFovHeight(13)
                        updateTelescopeFovSize()
                      }}
                    >
                      CCD (17×13)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(7)
                        setTelescopeFovHeight(5)
                        updateTelescopeFovSize()
                      }}
                    >
                      Small CCD (7×5)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setTelescopeFovWidth(60)
                        setTelescopeFovHeight(40)
                        updateTelescopeFovSize()
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
          style={{width: width, height: height}}
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
  )
}
