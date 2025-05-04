# AI Inspector Web App - Database Schema

This document outlines the database schema for the AI Inspector Web App using Supabase.

## Overview

The database is designed to support construction site inspections, photo uploads, and automated report generation using AI. It includes tables for users, projects, photos, inspection reports, and more.

## Tables

### 1. users

Stores user authentication and profile information.

```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'inspector',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 2. projects

Stores information about construction projects.

```sql
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (true);
CREATE POLICY "Users can insert projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = created_by);
```

### 3. project_members

Manages the relationship between users and projects.

```sql
CREATE TABLE project_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (true);
CREATE POLICY "Project creators can manage members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.created_by = auth.uid()
    )
  );
```

### 4. locations

Stores information about specific locations within a project.

```sql
CREATE TABLE locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  floor TEXT,
  zone TEXT,
  coordinates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view locations" ON locations
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert locations" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = locations.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can update locations" ON locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = locations.project_id
      AND project_members.user_id = auth.uid()
    )
  );
```

### 5. photos

Stores information about uploaded photos.

```sql
CREATE TABLE photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  description TEXT,
  location_description TEXT,
  exif_data JSONB,
  weather_data JSONB,
  geo_data JSONB,
  taken_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_processing_status TEXT DEFAULT 'pending'
);

-- Set up Row Level Security (RLS)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view photos" ON photos
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert photos" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = photos.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own photos" ON photos
  FOR UPDATE USING (uploaded_by = auth.uid());
```

### 6. documents

Stores construction documents like specifications, drawings, and contracts.

```sql
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'specification', 'drawing', 'contract', 'report'
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  version TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view documents" ON documents
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert documents" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = documents.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (uploaded_by = auth.uid());
```

### 7. contract_items

Stores Bill of Quantities (BOQ) items.

```sql
CREATE TABLE contract_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view contract items" ON contract_items
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert contract items" ON contract_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = contract_items.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can update contract items" ON contract_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = contract_items.project_id
      AND project_members.user_id = auth.uid()
    )
  );
```

### 8. ncr_reports

Stores Non-Conformance Reports (NCR).

```sql
CREATE TABLE ncr_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contract_item_id UUID REFERENCES contract_items(id) ON DELETE SET NULL,
  report_number TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  severity TEXT,
  ai_generated BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Set up Row Level Security (RLS)
ALTER TABLE ncr_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view NCR reports" ON ncr_reports
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert NCR reports" ON ncr_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = ncr_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can update NCR reports" ON ncr_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = ncr_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );
```

### 9. par_reports

Stores Preventive Action Reports (PAR) for safety issues.

```sql
CREATE TABLE par_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  report_number TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  severity TEXT,
  safety_category TEXT,
  ai_generated BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Set up Row Level Security (RLS)
ALTER TABLE par_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view PAR reports" ON par_reports
  FOR SELECT USING (true);
CREATE POLICY "Project members can insert PAR reports" ON par_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = par_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can update PAR reports" ON par_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = par_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );
```

### 10. ai_analysis_results

Stores the results of AI analysis on photos.

```sql
CREATE TABLE ai_analysis_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'ncr', 'par', 'general'
  result JSONB NOT NULL,
  confidence_score NUMERIC,
  processing_time NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI analysis results" ON ai_analysis_results
  FOR SELECT USING (true);
CREATE POLICY "System can insert AI analysis results" ON ai_analysis_results
  FOR INSERT WITH CHECK (true);
```

## Setting Up the Database

To set up this database schema in Supabase:

1. Create a new Supabase project
2. Go to the SQL Editor in the Supabase Dashboard
3. Create a new query and paste the SQL statements for each table
4. Run the queries to create the tables and set up Row Level Security

## Storage Buckets

In addition to the database tables, you'll need to create the following storage buckets in Supabase:

1. `photos` - For storing uploaded photos
2. `thumbnails` - For storing photo thumbnails
3. `documents` - For storing construction documents

## Authentication Setup

Configure Supabase Authentication:

1. Enable Email/Password sign-in method
2. Set up email templates for verification, password reset, etc.
3. Configure redirect URLs for your application

## Environment Variables

Set up the following environment variables in your application:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
