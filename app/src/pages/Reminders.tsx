import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dailog';
import { useToast } from '@/hooks/use-toast';
import { listReminders, createReminder, deleteReminder, runDue, type Reminder } from '@/api/reminders';

export function Reminders() {
  const { toast } = useToast();
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sendAt, setSendAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listReminders();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reminders');
      toast({ title: 'Failed to load reminders', description: e?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!message.trim()) return;
    setSaving(true);
    try {
      const created = await createReminder({ message: message.trim(), send_at: new Date(sendAt).toISOString(), channel });
      setItems((prev) => [created, ...prev]);
      setOpen(false);
      setMessage('');
      setChannel('email');
      setSendAt(new Date().toISOString().slice(0, 16));
      toast({ title: 'Reminder created' });
    } catch (e: any) {
      setError(e?.message || 'Failed to create reminder');
      toast({ title: 'Failed to create reminder', description: e?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    setSaving(true);
    try {
      await deleteReminder(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast({ title: 'Reminder deleted' });
    } catch (e: any) {
      setError(e?.message || 'Failed to delete reminder');
      toast({ title: 'Failed to delete reminder', description: e?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-wrap space-y-6">
      <div className="page-header">
        <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className="page-title text-2xl md:text-3xl">Reminders</h2>
          <p className="page-subtitle">Create, schedule, and dispatch reminders across channels.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await runDue();
                toast({ title: 'Processed due reminders', description: typeof res === 'object' && res && 'processed' in res ? `${(res as any).processed} processed` : undefined });
                refresh();
              } catch (e: any) {
                toast({ title: 'Failed to run due reminders', description: e?.message || 'Please try again.' });
              }
            }}
          >
            Run Due
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>New Reminder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reminder</DialogTitle>
              <DialogDescription>Create a reminder to notify you later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="msg">Message</Label>
                <Input id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pay credit card" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sendAt">Send At</Label>
                  <Input id="sendAt" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <select id="channel" className="input" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={onCreate} disabled={saving || !message.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="card fade-in-up">Loading…</div>
      ) : (
        <div className="card fade-in-up">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No reminders.</div>
          ) : (
            <div className="space-y-2">
              {items.map((r) => (
                <div key={r.id} className="interactive-row flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{r.message}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.send_at).toLocaleString()} • {r.channel} • {r.sent ? 'sent' : 'pending'}</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(r.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reminders;
