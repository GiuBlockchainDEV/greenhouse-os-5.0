export type SupportedLocale = "en" | "it" | "es" | "fr";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          preferred_language: string;
          ai_provider_preferences: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          preferred_language?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      greenhouses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          latitude: number;
          longitude: number;
          dimensions: Record<string, number>;
          covering_material: Record<string, number | string>;
          crop_config: Record<string, number | string>;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          latitude: number;
          longitude: number;
          dimensions: Record<string, number>;
          covering_material: Record<string, number | string>;
          crop_config: Record<string, number | string>;
          description?: string | null;
          is_public?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["greenhouses"]["Insert"]>;
      };
    };
  };
}

export interface AuthUser {
  id: string;
  email: string;
}

export type ClimateComputerFormat = "priva" | "ridder" | "hoogendoorn";

export interface ClimateComputerExport {
  format: ClimateComputerFormat;
  version: string;
  greenhouse_name: string;
  exported_at: string;
  setpoints: Array<{
    tag: string;
    name: string;
    value: number;
    unit: string;
    min_value?: number;
    max_value?: number;
  }>;
  rules: Array<{
    condition: string;
    action: string;
    priority: number;
  }>;
  metadata: Record<string, string | number>;
}
