import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCapture } from '@/hooks/useCaptures';
import { DamageStatus } from '@/types';
import { addCaptureComment, assignCaptureTeam, updateCaptureStatus } from '@/services/captures';
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
import StatusBadge from '@/components/damage/StatusBadge';
import SeverityIndicator from '@/components/damage/SeverityIndicator';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  Car,
  Users,
  Camera,
  Send,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'];

const DamageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [comment, setComment] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DamageStatus | ''>('');
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: damage, isLoading, isError, error } = useCapture(id);

  const isManager = user?.role === 'manager';

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
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
          <Button onClick={() => navigate('/dashboard')}>
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

  const damageTypeLabels: Record<string, string> = {
    pothole: 'Pothole',
    'transverse-crack': 'Transverse Crack',
    'longitudinal-crack': 'Longitudinal Crack',
    alligator: 'Alligator Crack',
    other: 'Other',
  };

  const trafficLabels: Record<string, { label: string; color: string }> = {
    high: { label: 'High Traffic', color: 'text-status-urgent' },
    medium: { label: 'Medium Traffic', color: 'text-status-pending' },
    low: { label: 'Low Traffic', color: 'text-status-completed' },
  };

  const refreshCapture = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['captures'] }),
      queryClient.invalidateQueries({ queryKey: ['captures', id] }),
    ]);
  };

  const handleAddComment = async () => {
    const trimmedComment = comment.trim();
    if (!trimmedComment || !damage || !user) return;

    try {
      setSavingAction('comment');
      await addCaptureComment(damage.captureId ?? damage.id, {
        authorId: user.id,
        authorName: user.name,
        text: trimmedComment,
      });
      setComment('');
      await refreshCapture();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Check your Firestore permissions and try again.');
    } finally {
      setSavingAction(null);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam || !damage) return;

    try {
      setSavingAction('team');
      await assignCaptureTeam(damage.captureId ?? damage.id, selectedTeam);
      await refreshCapture();
    } catch (err) {
      console.error('Failed to assign team:', err);
      alert('Failed to assign team. Check your Firestore permissions and try again.');
    } finally {
      setSavingAction(null);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !damage) return;

    try {
      setSavingAction('status');
      await updateCaptureStatus(damage.captureId ?? damage.id, selectedStatus);
      await refreshCapture();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Check your Firestore permissions and try again.');
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-card border-b px-4 flex items-center gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-semibold">Damage Report {damage.id}</h1>
          <p className="text-xs text-muted-foreground">{damageTypeLabels[damage.type]}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={damage.status} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Damage Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Reported Damage</p>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={damage.imageUrl}
                        alt="Damage"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {damage.afterRepairImageUrl ? (
                    <div>
                      <p className="text-sm font-medium mb-2">After Repair</p>
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={damage.afterRepairImageUrl}
                          alt="After Repair"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : isManager ? (
                    <div>
                      <p className="text-sm font-medium mb-2">After Repair</p>
                      <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <div className="text-center p-4">
                          <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Upload after repair photo</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Upload Photo
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

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
            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write your comment here..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddComment} disabled={!comment.trim()}>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Severity</span>
                  <SeverityIndicator severity={damage.severity} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={damage.status} size="sm" />
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Inference</p>
                    <p className="text-sm text-muted-foreground">
                      {damage.hasInferenced ? `${damage.inferenceModel ?? 'Model'} completed` : 'Waiting for inference'}
                    </p>
                    {typeof damage.inferenceTimeMs === 'number' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {damage.inferenceTimeMs.toFixed(1)} ms
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{damage.location.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {damage.location.lat.toFixed(4)}, {damage.location.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date Reported</p>
                    <p className="text-sm text-muted-foreground">{formatDate(damage.dateReported)}</p>
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
                        <p className="text-xs text-muted-foreground capitalize">
                          Source: {damage.trafficCongestion.source}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {typeof damage.accuracy === 'number' && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium">GPS Accuracy</p>
                      <p className="text-sm text-muted-foreground">{damage.accuracy.toFixed(2)} meters</p>
                    </div>
                  </>
                )}
                {damage.workerId && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium">Worker</p>
                      <p className="text-sm text-muted-foreground">{damage.workerId}</p>
                    </div>
                  </>
                )}
                {damage.assignedTeam && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Assigned Team</p>
                        <p className="text-sm text-muted-foreground">{damage.assignedTeam}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Manager actions */}
            {isManager && (
              <Card>
                <CardHeader>
                  <CardTitle>Manager Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assign Team</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAssignTeam}
                      disabled={!selectedTeam || savingAction === 'team'}
                    >
                      {savingAction === 'team' ? 'Assigning...' : 'Assign Team'}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Update Status</Label>
                    <Select 
                      value={selectedStatus} 
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
    </div>
  );
};

export default DamageDetail;
