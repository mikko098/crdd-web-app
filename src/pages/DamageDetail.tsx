import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCapture, useCaptures, useCaptureWorkflowEvents } from '@/hooks/useCaptures';
import { useCreateMaintenanceTeam, useMaintenanceTeams } from '@/hooks/useMaintenanceTeams';
import { hasPermission } from '@/lib/permissions';
import { DamageStatus } from '@/types';
import {
  addCaptureComment,
  assignCaptureTeam,
  markCaptureNoDamage,
  updateCaptureStatus,
  uploadCaptureAfterRepairPhoto,
} from '@/services/captures';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StatusBadge from '@/components/damage/StatusBadge';
import SeverityIndicator from '@/components/damage/SeverityIndicator';
import DamageImageWithDetections from '@/components/damage/DamageImageWithDetections';
import { InferenceDetection } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  Car,
  Camera,
  Send,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Maximize2,
  X,
} from 'lucide-react';

interface DetailNavigationState {
  returnView?: 'map' | 'list';
  reportIds?: string[];
}

const DamageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [comment, setComment] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DamageStatus | ''>('');
  const [displayLocation, setDisplayLocation] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [isNoDamageDialogOpen, setIsNoDamageDialogOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{
    src: string;
    alt: string;
    title: string;
    detections?: InferenceDetection[];
  } | null>(null);
  const afterRepairInputRef = useRef<HTMLInputElement>(null);
  const { data: damage, isLoading, isError, error } = useCapture(id);
  const { data: allDamages = [] } = useCaptures();
  const { data: teams = [], isLoading: isLoadingTeams } = useMaintenanceTeams();
  const createTeam = useCreateMaintenanceTeam();
  const { toast } = useToast();

  const canComment = hasPermission(user, 'reports:comment');
  const canAssignTeam = hasPermission(user, 'reports:assign-team');
  const canUpdateStatus = hasPermission(user, 'reports:update-status');
  const canMarkNoDamage = canUpdateStatus;
  const canUploadAfterPhoto = hasPermission(user, 'reports:upload-after-photo');
  const canViewWorkflowHistory = hasPermission(user, 'reports:view-workflow-history');
  const canCreateTeams = hasPermission(user, 'teams:create');
  const { data: workflowEvents = [] } = useCaptureWorkflowEvents(canViewWorkflowHistory ? id : undefined);
  const detailNavigationState = (location.state ?? {}) as DetailNavigationState;
  const returnView = detailNavigationState.returnView === 'list' ? 'list' : 'map';
  const routeReportIds = Array.isArray(detailNavigationState.reportIds) ? detailNavigationState.reportIds : [];
  const reportIds = routeReportIds.length ? routeReportIds : allDamages.map((report) => report.id);
  const currentReportIndex = id ? reportIds.indexOf(id) : -1;
  const previousReportId = currentReportIndex > 0 ? reportIds[currentReportIndex - 1] : undefined;
  const nextReportId = currentReportIndex >= 0 && currentReportIndex < reportIds.length - 1
    ? reportIds[currentReportIndex + 1]
    : undefined;
  const navigationState: DetailNavigationState = {
    returnView,
    reportIds,
  };
  const goBackToDashboard = () => navigate('/dashboard', { state: { view: returnView } });
  const goToReport = (reportId?: string) => {
    if (!reportId) return;
    navigate(`/damage/${reportId}`, { state: navigationState });
  };

  useEffect(() => {
    if (!damage) return;
    setDisplayLocation(damage.location.address);
  }, [damage]);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/30 p-6">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !damage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{isError ? 'Unable to Load Report' : 'Report Not Found'}</h1>
          <p className="text-muted-foreground mb-4">
            {isError && error instanceof Error ? error.message : "The damage report you're looking for doesn't exist."}
          </p>
          <Button onClick={goBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatModelName = (model?: string) => {
    if (!model?.trim()) return 'Pending';

    const fileName = model.split(/[\\/]/).pop() ?? model;
    const withoutExtension = fileName.replace(/\.[^.]+$/, '');
    const readable = withoutExtension.replace(/[_-]+/g, ' ').trim();
    if (!readable) return 'Pending';

    const lower = readable.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const damageTypeLabels: Record<string, string> = {
    pothole: 'Pothole',
    'transverse-crack': 'Transverse Crack',
    'longitudinal-crack': 'Longitudinal Crack',
    alligator: 'Alligator Crack',
    other: 'Other',
    'no-damage': 'No Damage',
  };

  const trafficLabels: Record<string, { label: string; color: string }> = {
    high: { label: 'High Traffic', color: 'text-status-urgent' },
    medium: { label: 'Medium Traffic', color: 'text-status-pending' },
    low: { label: 'Low Traffic', color: 'text-status-completed' },
  };
  const damageDetections = damage.inferenceResults ?? [];
  const hasDamageDetections = damageDetections.some((detection) => Array.isArray(detection.bbox) && detection.bbox.length >= 4);
  const isNoDamageReport = damage.type === 'no-damage';

  const refreshCapture = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['captures'] }),
      queryClient.invalidateQueries({ queryKey: ['captures', id] }),
      queryClient.invalidateQueries({ queryKey: ['capture-events', id] }),
    ]);
  };

  const handleAddComment = async () => {
    const trimmedComment = comment.trim();
    if (!trimmedComment || !damage || !user) return;
    if (!canComment) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can add maintenance comments.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAction('comment');
      await addCaptureComment(damage.id, {
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        text: trimmedComment,
      });
      setComment('');
      await refreshCapture();
      toast({ title: 'Comment added' });
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast({
        title: 'Failed to add comment',
        description: 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam || !damage) return;
    if (!user || !canAssignTeam) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can assign maintenance teams.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAction('team');
      await assignCaptureTeam(damage.id, selectedTeam, { id: user.id, name: user.name, role: user.role });
      setSelectedStatus('in-progress');
      await refreshCapture();
      toast({
        title: 'Team assigned',
        description: `${selectedTeam} is now assigned to this report.`,
      });
    } catch (err) {
      console.error('Failed to assign team:', err);
      toast({
        title: 'Failed to assign team',
        description: 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleCreateTeam = async () => {
    const cleanName = newTeamName.trim();
    if (!cleanName) return;
    if (!user || !canCreateTeams) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can add maintenance teams.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTeam.mutateAsync({
        name: cleanName,
        actor: { id: user.id, name: user.name, role: user.role },
      });
      setSelectedTeam(cleanName);
      setNewTeamName('');
      toast({ title: 'Team added', description: `${cleanName} can now be assigned to reports.` });
    } catch (err) {
      console.error('Failed to create team:', err);
      toast({
        title: 'Failed to add team',
        description: 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !damage) return;
    if (!user || !canUpdateStatus) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can update repair status.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAction('status');
      await updateCaptureStatus(damage.id, selectedStatus, { id: user.id, name: user.name, role: user.role });
      await refreshCapture();
      toast({
        title: 'Status updated',
        description: `Repair status changed to ${selectedStatus.replace('-', ' ')}.`,
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        title: 'Failed to update status',
        description: 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleMarkNoDamage = async () => {
    if (!damage) return;
    if (!user || !canMarkNoDamage) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can mark false reports as no damage.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAction('no-damage');
      await markCaptureNoDamage(damage.id, { id: user.id, name: user.name, role: user.role });
      setSelectedStatus('completed');
      setIsNoDamageDialogOpen(false);
      await refreshCapture();
      toast({
        title: 'Report marked as no damage',
        description: 'Firestore was updated and the report is no longer treated as road damage.',
      });
    } catch (err) {
      console.error('Failed to mark report as no damage:', err);
      toast({
        title: 'Failed to mark no damage',
        description: 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleAfterRepairUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !damage) return;
    if (!user || !canUploadAfterPhoto) {
      toast({
        title: 'Manager role required',
        description: 'Only managers can upload after-repair evidence.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please choose an image file.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    try {
      setSavingAction('after-repair-photo');
      await uploadCaptureAfterRepairPhoto(damage.id, file, { id: user.id, name: user.name, role: user.role });
      setSelectedStatus('completed');
      await refreshCapture();
      toast({
        title: 'After-repair photo uploaded',
        description: 'This report has been marked as completed.',
      });
    } catch (err) {
      console.error('Failed to upload after repair photo:', err);
      toast({
        title: 'Failed to upload photo',
        description: 'Check your Storage and Firestore permissions, then try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="h-16 border-b bg-card/95 px-4 flex items-center gap-4 sticky top-0 z-50 shadow-sm backdrop-blur">
        <Button variant="ghost" size="icon" onClick={goBackToDashboard}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-semibold">Damage Report {damage.captureId ?? damage.id}</h1>
          <p className="text-xs text-muted-foreground">{damageTypeLabels[damage.type]}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToReport(previousReportId)}
            disabled={!previousReportId}
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous Report</span>
            <span className="sr-only sm:hidden">Previous report</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToReport(nextReportId)}
            disabled={!nextReportId}
          >
            <span className="hidden sm:inline">Next Report</span>
            <span className="sr-only sm:hidden">Next report</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4 lg:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(340px,0.8fr)]">
          {/* Main content */}
          <div className="min-w-0 space-y-6">
            {/* Images */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Damage Images
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={damage.status} size="sm" />
                    <SeverityIndicator severity={damage.severity} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Reported Damage</p>
                    <button
                      type="button"
                      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() =>
                        setExpandedImage({
                          src: damage.imageUrl,
                          alt: 'Reported damage',
                          title: 'Reported Damage',
                          detections: damageDetections,
                        })
                      }
                    >
                      <DamageImageWithDetections
                        src={damage.imageUrl}
                        alt="Reported damage"
                        detections={damageDetections}
                        className="h-full w-full"
                        showLabels
                      />
                      <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Maximize2 className="h-4 w-4" />
                        <span className="sr-only">Expand reported damage image</span>
                      </span>
                    </button>
                    {hasDamageDetections && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() =>
                          setExpandedImage({
                            src: damage.imageUrl,
                            alt: 'Original reported damage',
                            title: 'Original Reported Damage',
                          })
                        }
                      >
                        View original image
                      </Button>
                    )}
                  </div>
                  {damage.afterRepairImageUrl ? (
                    <div>
                      <p className="text-sm font-medium mb-2">After Repair</p>
                      <button
                        type="button"
                        className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() =>
                          setExpandedImage({
                            src: damage.afterRepairImageUrl!,
                            alt: 'After repair',
                            title: 'After Repair',
                          })
                        }
                      >
                        <img src={damage.afterRepairImageUrl} alt="After repair" className="h-full w-full object-cover" />
                        <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Maximize2 className="h-4 w-4" />
                          <span className="sr-only">Expand after repair image</span>
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium mb-2">After Repair</p>
                      <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40">
                        <div className="text-center p-4">
                          <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">No fixed image uploaded</p>
                          <p className="mt-1 text-xs text-muted-foreground">After-repair evidence will appear here.</p>
                          {canUploadAfterPhoto && (
                            <>
                              <input
                                ref={afterRepairInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAfterRepairUpload}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => afterRepairInputRef.current?.click()}
                                disabled={savingAction === 'after-repair-photo'}
                              >
                                {savingAction === 'after-repair-photo' ? 'Uploading...' : 'Upload Photo'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {expandedImage && (
              <div
                className="fixed -top-12 left-0 z-[9999] flex h-[calc(100dvh+3rem)] w-screen items-center justify-center bg-black/90 p-3"
                role="dialog"
                aria-modal="true"
                aria-label={expandedImage.title}
                onClick={() => setExpandedImage(null)}
              >
                <button
                  type="button"
                  aria-label="Close expanded image"
                  className="absolute right-4 top-8 z-[10000] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedImage(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex h-full w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
                  {expandedImage.detections?.length ? (
                    <DamageImageWithDetections
                      src={expandedImage.src}
                      alt={expandedImage.alt}
                      detections={expandedImage.detections}
                      fit="contain"
                      showLabels
                      className="h-[94vh] w-[96vw] bg-transparent"
                    />
                  ) : (
                    <img
                      src={expandedImage.src}
                      alt={expandedImage.alt}
                      className="max-h-[94vh] max-w-[96vw] object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {damage.description || 'No detailed description available.'}
                </p>
                {damage.comment && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <MessageSquare className="w-4 h-4" />
                      Reporter's Comment
                    </div>
                    <p className="text-sm text-muted-foreground">{damage.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments section */}
            {canComment && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Maintenance Comment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Write your comment here..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddComment} disabled={!comment.trim() || savingAction === 'comment'}>
                      <Send className="w-4 h-4 mr-2" />
                      {savingAction === 'comment' ? 'Saving...' : 'Submit Comment'}
                    </Button>
                  </div>
                  {damage.maintenanceComments?.length ? (
                    <div className="mt-5 space-y-3">
                      {damage.maintenanceComments.map((maintenanceComment) => (
                        <div
                          key={`${maintenanceComment.authorId}-${maintenanceComment.createdAt}`}
                          className="rounded-lg border bg-muted/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">{maintenanceComment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(maintenanceComment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{maintenanceComment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {canViewWorkflowHistory && (
              <Card>
                <CardHeader>
                  <CardTitle>Workflow History</CardTitle>
                </CardHeader>
                <CardContent>
                  {workflowEvents.length ? (
                    <div className="space-y-3">
                      {workflowEvents.map((event) => (
                        <div key={event.id} className="rounded-lg border bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">{event.action.replace(/-/g, ' ')}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">By {event.actorName}</p>
                          {event.details ? (
                            <p className="mt-2 text-sm text-muted-foreground">{event.details}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No workflow history recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date Reported</p>
                    <p className="text-sm text-muted-foreground">{formatDate(damage.dateReported)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{displayLocation || damage.location.address}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Car className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Traffic Status</p>
                    <p className={`text-sm font-medium ${trafficLabels[damage.trafficStatus].color}`}>
                      {trafficLabels[damage.trafficStatus].label}
                    </p>
                    {damage.trafficCongestion && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          {damage.trafficCongestion.level} congestion ({damage.trafficCongestion.percent}%)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {damage.trafficCongestion.speed} km/h - {damage.trafficCongestion.impact}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Contributor</p>
                    <p className="text-sm text-muted-foreground">{damage.contributor.name}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Inference Model</p>
                    <p className="text-sm text-muted-foreground">{formatModelName(damage.inferenceModel)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manager actions */}
            {(canAssignTeam || canUpdateStatus) && (
              <Card>
                <CardHeader>
                  <CardTitle>Manager Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canMarkNoDamage && (
                    <>
                      <div className="space-y-2">
                        <Label>False Report Review</Label>
                        <Button
                          type="button"
                          variant={isNoDamageReport ? 'secondary' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setIsNoDamageDialogOpen(true)}
                          disabled={isNoDamageReport || savingAction === 'no-damage'}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {isNoDamageReport
                            ? 'Marked as No Damage'
                            : savingAction === 'no-damage'
                              ? 'Updating...'
                              : 'Mark as No Damage'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Use when a manager confirms the model detection is a false report.
                        </p>
                      </div>

                      <Separator />
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Assign Team</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAssignTeam}
                      disabled={!selectedTeam || savingAction === 'team'}
                    >
                      {savingAction === 'team' ? 'Assigning...' : isLoadingTeams ? 'Loading Teams...' : 'Assign Team'}
                    </Button>
                    {canCreateTeams && (
                      <div className="grid grid-cols-[1fr_auto] gap-2 pt-2">
                        <Input
                          value={newTeamName}
                          onChange={(event) => setNewTeamName(event.target.value)}
                          placeholder="Add maintenance team"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCreateTeam}
                          disabled={!newTeamName.trim() || createTeam.isPending}
                        >
                          {createTeam.isPending ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Update Status</Label>
                    <Select 
                      value={selectedStatus || damage.status} 
                      onValueChange={(v) => setSelectedStatus(v as DamageStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full"
                      onClick={handleUpdateStatus}
                      disabled={!selectedStatus || savingAction === 'status'}
                    >
                      {savingAction === 'status' ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={isNoDamageDialogOpen}
        onOpenChange={(open) => {
          if (savingAction !== 'no-damage') setIsNoDamageDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this report as no damage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the stored detection results, mark inference and repair status as completed,
              and save a manager review entry in Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingAction === 'no-damage'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleMarkNoDamage();
              }}
              disabled={savingAction === 'no-damage'}
            >
              {savingAction === 'no-damage' ? 'Updating...' : 'Mark No Damage'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DamageDetail;
