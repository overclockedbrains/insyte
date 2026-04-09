export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      query_hashes: {
        Row: {
          created_at: string
          hash: string
          normalized_query: string
          scene_slug: string | null
        }
        Insert: {
          created_at?: string
          hash: string
          normalized_query: string
          scene_slug?: string | null
        }
        Update: {
          created_at?: string
          hash?: string
          normalized_query?: string
          scene_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'query_hashes_scene_slug_fkey'
            columns: ['scene_slug']
            isOneToOne: false
            referencedRelation: 'scenes'
            referencedColumns: ['slug']
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          ip: string
          window_start: string
        }
        Insert: {
          count?: number
          ip: string
          window_start: string
        }
        Update: {
          count?: number
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
      saved_scenes: {
        Row: {
          id: string
          saved_at: string
          scene_slug: string
          user_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          scene_slug: string
          user_id: string
        }
        Update: {
          id?: string
          saved_at?: string
          scene_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saved_scenes_scene_slug_fkey'
            columns: ['scene_slug']
            isOneToOne: false
            referencedRelation: 'scenes'
            referencedColumns: ['slug']
          },
        ]
      }
      scenes: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          scene_json: Json
          slug: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id: string
          scene_json: Json
          slug: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          scene_json?: Json
          slug?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      topic_index: {
        Row: {
          category: string
          created_at: string
          description: string | null
          is_featured: boolean
          is_prebuilt: boolean
          slug: string
          tags: string[] | null
          title: string
          type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          is_featured?: boolean
          is_prebuilt?: boolean
          slug: string
          tags?: string[] | null
          title: string
          type: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          is_featured?: boolean
          is_prebuilt?: boolean
          slug?: string
          tags?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_generated_scenes: {
        Row: {
          generated_at: string
          id: string
          query: string | null
          scene_slug: string | null
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          query?: string | null
          scene_slug?: string | null
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          query?: string | null
          scene_slug?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_generated_scenes_scene_slug_fkey'
            columns: ['scene_slug']
            isOneToOne: false
            referencedRelation: 'scenes'
            referencedColumns: ['slug']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_hit_count: {
        Args: {
          slug_arg: string
        }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
