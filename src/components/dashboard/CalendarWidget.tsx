import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Clock, FileText, Receipt, UserCheck, Loader2 } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'follow_up' | 'due_date' | 'activity' | 'invoice';
  description?: string;
  link?: string;
}

const eventTypeConfig = {
  follow_up: {
    icon: UserCheck,
    color: 'bg-info/10 text-info border-info/20',
    label: 'Follow-up',
  },
  due_date: {
    icon: Clock,
    color: 'bg-warning/10 text-warning border-warning/20',
    label: 'Jatuh Tempo',
  },
  activity: {
    icon: CalendarDays,
    color: 'bg-primary/10 text-primary border-primary/20',
    label: 'Aktivitas',
  },
  invoice: {
    icon: Receipt,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Invoice',
  },
};

export function CalendarWidget() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const allEvents: CalendarEvent[] = [];

      // Fetch activities with scheduled dates
      const { data: activities } = await supabase
        .from('activities')
        .select('id, subject, scheduled_at, activity_type, is_completed')
        .not('scheduled_at', 'is', null)
        .eq('is_completed', false)
        .order('scheduled_at', { ascending: true });

      if (activities) {
        activities.forEach((activity) => {
          if (activity.scheduled_at) {
            allEvents.push({
              id: `activity-${activity.id}`,
              title: activity.subject,
              date: parseISO(activity.scheduled_at),
              type: 'activity',
              description: `${activity.activity_type}`,
            });
          }
        });
      }

      // Fetch leads with next follow-up dates
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, next_follow_up_at, company_name')
        .not('next_follow_up_at', 'is', null)
        .order('next_follow_up_at', { ascending: true });

      if (leads) {
        leads.forEach((lead) => {
          if (lead.next_follow_up_at) {
            allEvents.push({
              id: `lead-${lead.id}`,
              title: `Follow-up: ${lead.company_name || lead.name}`,
              date: parseISO(lead.next_follow_up_at),
              type: 'follow_up',
              description: lead.name,
              link: `/leads/${lead.id}`,
            });
          }
        });
      }

      // Fetch payment terms due dates
      const { data: terms } = await supabase
        .from('payment_terms')
        .select(`
          id, 
          term_name, 
          due_date,
          is_locked,
          project:projects!inner(project_name)
        `)
        .not('due_date', 'is', null)
        .eq('is_locked', false)
        .order('due_date', { ascending: true });

      if (terms) {
        terms.forEach((term) => {
          if (term.due_date) {
            allEvents.push({
              id: `term-${term.id}`,
              title: `Termin: ${term.term_name}`,
              date: parseISO(term.due_date),
              type: 'due_date',
              description: (term.project as any)?.project_name,
            });
          }
        });
      }

      // Fetch invoices due dates
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          due_date,
          status,
          project:projects!inner(project_name)
        `)
        .in('status', ['Sent', 'Overdue'])
        .order('due_date', { ascending: true });

      if (invoices) {
        invoices.forEach((invoice) => {
          if (invoice.due_date) {
            allEvents.push({
              id: `invoice-${invoice.id}`,
              title: `Invoice ${invoice.invoice_number}`,
              date: parseISO(invoice.due_date),
              type: 'invoice',
              description: (invoice.project as any)?.project_name,
              link: '/invoices',
            });
          }
        });
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter((event) => isSameDay(event.date, selectedDate))
    : [];

  // Get dates with events for calendar highlighting
  const eventDates = events.map((e) => e.date);

  // Custom day renderer to highlight dates with events
  const modifiers = {
    hasEvent: eventDates,
  };

  const modifiersStyles = {
    hasEvent: {
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      borderRadius: '50%',
    },
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Kalender Jadwal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-primary" />
          Kalender Jadwal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={id}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border pointer-events-auto"
          />
        </div>

        {/* Events for selected date */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: id }) : 'Pilih tanggal'}
          </h4>
          
          <ScrollArea className="h-[180px]">
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map((event) => {
                  const config = eventTypeConfig[event.type];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors',
                        config.color
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {event.description && (
                            <p className="text-xs opacity-80 truncate">{event.description}</p>
                          )}
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tidak ada jadwal</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Upcoming events summary */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2">Jadwal Mendatang</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-info" />
              <span>{events.filter((e) => e.type === 'follow_up').length} Follow-up</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>{events.filter((e) => e.type === 'due_date').length} Termin</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{events.filter((e) => e.type === 'activity').length} Aktivitas</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>{events.filter((e) => e.type === 'invoice').length} Invoice</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
