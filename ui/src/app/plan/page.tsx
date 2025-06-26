"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherConditions } from "@/components/WeatherConditions";
import { MoonPhase } from "@/components/MoonPhase";
import { ObjectAltitudeDialog } from "@/components/object-altitude-dialog";
import { StarMap } from "@/components/StarMap";
import { Telescope, Search, Calendar, Plus, Clock, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { AstroObject, User } from "@/lib/models";
import { DefaultBreadcrumb } from "@/components/default-breadcrumb";
import { useUser } from "@clerk/nextjs";
import { useAuthMode } from "@/hooks/useAuthMode";

interface PlanningItem {
  id: string;
  objectName: string;
  startTime: string;
  duration: number; // in minutes
  ra: string;
  dec: string;
  magnitude: string;
  objectType?: string;
}

export default function PlanPage() {
  const [astroObjects, setAstroObjects] = useState<AstroObject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObject, setSelectedObject] = useState<AstroObject | null>(null);
  const [schedule, setSchedule] = useState<PlanningItem[]>([]);
  const [newItemStartTime, setNewItemStartTime] = useState("");
  const [newItemDuration, setNewItemDuration] = useState(30);
  const [showAltitudeDialog, setShowAltitudeDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user: clerkUser } = useUser();
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    username: clerkUser.username || '',
    first_name: clerkUser.firstName || '',
    last_name: clerkUser.lastName || '',
    name: clerkUser.fullName || clerkUser.username || '',
    initials: `${clerkUser.firstName?.[0] || ''}${clerkUser.lastName?.[0] || ''}`,
    avatar_url: clerkUser.imageUrl || '',
    metadata_: {},
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
  } : null;

  const { isSQLite } = useAuthMode();

  const loadAstroObjects = async (query: string) => {
    if (!query) {
      setAstroObjects([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lookup-astronomy-object?name=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch objects');
      }
      const objects = await response.json();
      setAstroObjects(objects.map((obj: any) => ({
        ...obj,
        id: obj.name,
        display_name: obj.name,
        otype: obj.objectType,
        metadata_: {
          ra: obj.ra,
          dec: obj.dec,
          magnitude: obj.magnitude,
        }
      })));
    } catch (error) {
      console.error('Error loading astronomical objects:', error);
      toast.error('Failed to load astronomical objects');
    } finally {
      setIsLoading(false);
    }
  };

  // No need for filtering, API does it
  const filteredObjects = astroObjects;

  const addToSchedule = () => {
    if (!selectedObject || !newItemStartTime) {
      toast.error('Please select an object and set a start time');
      return;
    }

    const newItem: PlanningItem = {
      id: crypto.randomUUID(),
      objectName: selectedObject.display_name || selectedObject.name,
      startTime: newItemStartTime,
      duration: newItemDuration,
      ra: selectedObject.metadata_?.ra || '0',
      dec: selectedObject.metadata_?.dec || '0',
      magnitude: selectedObject.metadata_?.magnitude || 'N/A',
      objectType: selectedObject.otype || undefined
    };

    setSchedule(prev => [...prev, newItem].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setNewItemStartTime("");
    toast.success(`Added ${newItem.objectName} to schedule`);
  };

  const removeFromSchedule = (id: string) => {
    setSchedule(prev => prev.filter(item => item.id !== id));
    toast.success('Removed from schedule');
  };

  const getRecommendedObjects = () => {
    // Simple recommendation based on magnitude (brighter objects)
    return astroObjects
      .filter(obj => obj.metadata_?.magnitude && parseFloat(obj.metadata_?.magnitude) < 8)
      .sort((a, b) => parseFloat(a.metadata_?.magnitude || '99') - parseFloat(b.metadata_?.magnitude || '99'))
      .slice(0, 10);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + duration;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    return `${(endHours % 24).toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <DefaultBreadcrumb user={isSQLite ? undefined : user!} pageName="Plan" />
      <div className="flex items-center gap-3 mb-8">
        <Telescope className="w-8 h-8 text-blue-400" />
        <h1 className="text-3xl font-bold">Astronomy Planning</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="lookup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lookup" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Object Lookup
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Telescope className="w-4 h-4" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lookup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Astronomical Object Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="search">Search Objects</Label>
                    <form onSubmit={(e) => { e.preventDefault(); loadAstroObjects(searchQuery); }}>
                      <div className="flex">
                        <Input
                          id="search"
                          placeholder="Search by name (e.g., M31, Orion, NGC 7000)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mt-1 rounded-r-none"
                        />
                        <Button type="submit" className="mt-1 rounded-l-none">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading astronomical objects...
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredObjects.length > 0 ? (
                        filteredObjects.slice(0, 20).map((obj) => (
                          <div
                            key={obj.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedObject?.id === obj.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                            }`}
                            onClick={() => setSelectedObject(obj)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">
                                  {obj.display_name || obj.name}
                                </h3>
                                <div className="text-sm text-muted-foreground space-x-4">
                                  <span>Type: {obj.otype || 'Unknown'}</span>
                                  <span>Mag: {obj.metadata_?.magnitude || 'N/A'}</span>
                                  {obj.metadata_?.ra && obj.metadata_?.dec && (
                                    <span>RA: {obj.metadata_?.ra} Dec: {obj.metadata_?.dec}</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedObject(obj);
                                  setShowAltitudeDialog(true);
                                }}
                              >
                                <Info className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No objects found' : 'Start typing to search for objects'}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedObject && (
                    <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-medium mb-2">Selected Object</h3>
                      <p className="text-lg font-semibold">
                        {selectedObject.display_name || selectedObject.name}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          {selectedObject.otype || 'Unknown'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Magnitude: </span>
                          {selectedObject.metadata_?.magnitude || 'N/A'}
                        </div>
                        {selectedObject.metadata_?.ra && selectedObject.metadata_?.dec && (
                          <>
                            <div>
                              <span className="text-muted-foreground">RA: </span>
                              {selectedObject.metadata_?.ra}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dec: </span>
                              {selectedObject.metadata_?.dec}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => setShowAltitudeDialog(true)}
                          variant="outline"
                        >
                          View Altitude Chart
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Telescope className="w-5 h-5" />
                    Recommended Objects for Tonight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getRecommendedObjects().map((obj) => (
                      <div
                        key={obj.id}
                        className="p-3 border rounded-lg cursor-pointer hover:border-gray-300 dark:border-gray-700 transition-colors"
                        onClick={() => setSelectedObject(obj)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">
                              {obj.display_name || obj.name}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              {obj.otype || 'Unknown'} • Mag: {obj.metadata_?.magnitude || 'N/A'}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedObject(obj);
                              setShowAltitudeDialog(true);
                            }}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Observation Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedObject && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-medium mb-3">Add to Schedule</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="startTime">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={newItemStartTime}
                            onChange={(e) => setNewItemStartTime(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            min="5"
                            max="300"
                            value={newItemDuration}
                            onChange={(e) => setNewItemDuration(parseInt(e.target.value) || 30)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={addToSchedule} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Schedule
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="font-medium">Tonight&#39;s Schedule</h3>
                    {schedule.length > 0 ? (
                      schedule.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 border rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <h4 className="font-medium">{item.objectName}</h4>
                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(item.startTime)} - {calculateEndTime(item.startTime, item.duration)}
                              </span>
                              <span>{item.duration} min</span>
                              <span>Mag: {item.magnitude}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromSchedule(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No objects scheduled yet. Select an object and add it to your schedule.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WeatherConditions />
          <MoonPhase />
          <StarMap width={350} height={350} />
        </div>
      </div>

      {/* Altitude Dialog */}
      {selectedObject && (
        <ObjectAltitudeDialog
          open={showAltitudeDialog}
          onOpenChange={setShowAltitudeDialog}
          objectName={selectedObject.display_name || selectedObject.name}
          ra={selectedObject.metadata_?.ra || '0'}
          dec={selectedObject.metadata_?.dec || '0'}
        />
      )
      }
    </div>
  );
}
