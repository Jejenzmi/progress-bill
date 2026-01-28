import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lead, LeadStatus } from '@/hooks/useLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Building2,
  Mail,
  Phone,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateQuotationFromLeadDialog } from './CreateQuotationFromLeadDialog';

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => Promise<void>;
  onConvert: (lead: Lead) => Promise<void>;
}

const statusConfig: { status: LeadStatus; label: string; color: string; bgColor: string; headerBg: string }[] = [
  { status: 'cold', label: 'Cold', color: 'text-blue-700', bgColor: 'bg-blue-100', headerBg: 'bg-blue-50' },
  { status: 'warm', label: 'Warm', color: 'text-yellow-700', bgColor: 'bg-yellow-100', headerBg: 'bg-yellow-50' },
  { status: 'hot', label: 'Hot', color: 'text-red-700', bgColor: 'bg-red-100', headerBg: 'bg-red-50' },
];

const formatCurrency = (value: number) => {
  if (value === 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export function LeadKanbanBoard({ leads, onStatusChange, onConvert }: LeadKanbanBoardProps) {
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [leadForQuotation, setLeadForQuotation] = useState<Lead | null>(null);

  const handleCreateQuotation = (lead: Lead) => {
    setLeadForQuotation(lead);
    setQuotationDialogOpen(true);
  };

  const getLeadsByStatus = (status: LeadStatus) =>
    leads.filter(l => l.status === status && !l.converted_to_client_id);

  const getTotalValue = (status: LeadStatus) =>
    getLeadsByStatus(status).reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    
    if (!draggedLead || updating) return;
    
    const lead = leads.find(l => l.id === draggedLead);
    if (!lead || lead.status === targetStatus) {
      setDraggedLead(null);
      return;
    }

    setUpdating(true);
    try {
      await onStatusChange(draggedLead, targetStatus);
    } finally {
      setUpdating(false);
      setDraggedLead(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statusConfig.map((config, index) => {
        const statusLeads = getLeadsByStatus(config.status);
        const totalValue = getTotalValue(config.status);
        const isDropTarget = draggedLead !== null;

        return (
          <div
            key={config.status}
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, config.status)}
          >
            {/* Column Header */}
            <div className={cn('rounded-t-lg p-3', config.headerBg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                  <h3 className={cn('font-semibold', config.color)}>
                    {config.label}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {statusLeads.length}
                  </Badge>
                </div>
                {index < statusConfig.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatCurrency(totalValue)}
              </p>
            </div>

            {/* Column Cards */}
            <div className={cn(
              'flex-1 rounded-b-lg border border-t-0 p-2 min-h-[300px] space-y-2 transition-colors',
              isDropTarget && 'bg-primary/5 border-primary/30',
              !isDropTarget && 'bg-muted/30'
            )}>
              {statusLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className={cn(
                    'rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing',
                    'hover:shadow-md transition-all',
                    draggedLead === lead.id && 'opacity-50 scale-95'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {lead.name}
                      </h4>
                      
                      {lead.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{lead.company_name}</span>
                        </p>
                      )}

                      <div className="space-y-1 mt-2">
                        {lead.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </p>
                        )}
                      </div>

                      {lead.estimated_value > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-semibold text-primary flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(lead.estimated_value)}
                          </p>
                        </div>
                      )}

                      {/* Quick action buttons for hot leads */}
                      {config.status === 'hot' && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 border-success/50 text-success hover:bg-success/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConvert(lead);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Client
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 border-primary/50 text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateQuotation(lead);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Quotation
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {statusLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p className="text-sm">Drop leads di sini</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Create Quotation Dialog */}
      <CreateQuotationFromLeadDialog
        lead={leadForQuotation}
        open={quotationDialogOpen}
        onOpenChange={setQuotationDialogOpen}
      />
    </div>
  );
}
