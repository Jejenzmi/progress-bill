// Type definitions for settings values

export interface TargetsSettings {
  monthly_target_2026?: number;
  yearly_target_2026?: number;
}

export interface ClientRelation {
  id?: string;
  name?: string;
  address?: string | null;
  client_type?: string;
  pic_name?: string | null;
  pic_email?: string | null;
  pic_phone?: string | null;
}

export interface QuotationRelation {
  id?: string;
  project_name?: string;
  grand_total?: number | null;
  negotiated_price?: number | null;
  negotiation_status?: string | null;
  margin_percentage?: number | null;
}

// Helper function to safely extract targets from settings value
export function parseTargetsSettings(value: unknown): TargetsSettings {
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return {
      monthly_target_2026: typeof obj.monthly_target_2026 === 'number' ? obj.monthly_target_2026 : 500000000,
      yearly_target_2026: typeof obj.yearly_target_2026 === 'number' ? obj.yearly_target_2026 : 6000000000,
    };
  }
  return {
    monthly_target_2026: 500000000,
    yearly_target_2026: 6000000000,
  };
}

// Helper to safely extract client name from relation
export function getClientName(client: unknown): string {
  if (typeof client === 'object' && client !== null && 'name' in client) {
    return (client as ClientRelation).name || 'N/A';
  }
  return 'N/A';
}
