# AI Inspector Web App

AI Inspector is a web application that helps construction inspectors identify non-conformances and safety issues by analyzing site photos using AI. The app compares photos with construction specifications, drawings, and contract items (BOQ) to generate Non-Conformance Reports (NCR) and Preventive Action Reports (PAR).

## Features

- **Email Authentication**: Secure login and registration system
- **Photo Upload**: Upload construction site photos with location descriptions
- **EXIF Data Extraction**: Automatically extract date, time, and location from photo metadata
- **AI Analysis**: Compare photos with specifications, drawings, and contract items using OpenAI's vision model
- **Automated Reports**: Generate NCR and PAR reports based on AI analysis
- **Weather Integration**: Include weather data in reports based on photo location and time
- **Project Management**: Organize photos and reports by projects
- **History Tracking**: View history of uploaded photos and generated reports

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **APIs**: OpenAI API, OpenWeather API, Google Maps Geocoding API

## Prerequisites

Before you begin, ensure you have the following:

- Node.js (v18 or later)
- npm or yarn
- Supabase account
- OpenAI API key
- OpenWeather API key
- Google Maps Geocoding API key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/inspectorai.git
cd inspectorai
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Supabase

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Set up the database schema by following the instructions in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. Create the following storage buckets in Supabase:
   - `photos`: For storing uploaded photos
   - `thumbnails`: For storing photo thumbnails
   - `documents`: For storing construction documents

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# API Keys
OPENAI_API_KEY=your-openai-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace the placeholder values with your actual API keys and configuration.

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 6. Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel at [https://vercel.com](https://vercel.com)
3. Configure the environment variables in the Vercel dashboard
4. Deploy the application

## Database Setup

The application uses Supabase as the backend database and storage solution. Follow these steps to set up the database:

1. Create a new Supabase project
2. Go to the SQL Editor in the Supabase Dashboard
3. Create the database tables by executing the SQL statements in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
4. Set up Row Level Security (RLS) policies as specified in the schema
5. Create the required storage buckets (`photos`, `thumbnails`, `documents`)

## API Integration

### OpenAI API

The application uses OpenAI's vision model to analyze construction site photos. You need to:

1. Create an account at [https://openai.com](https://openai.com)
2. Generate an API key
3. Add the API key to your environment variables

### OpenWeather API

Weather data is retrieved using the OpenWeather API:

1. Create an account at [https://openweathermap.org](https://openweathermap.org)
2. Generate an API key
3. Add the API key to your environment variables

### Google Maps Geocoding API

Location data is enhanced using the Google Maps Geocoding API:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Geocoding API
3. Generate an API key
4. Add the API key to your environment variables

## Usage

### User Registration and Login

1. Navigate to the application URL
2. Click "Sign up" to create a new account
3. Verify your email address
4. Log in with your credentials

### Creating a Project

1. Log in to the application
2. Click "New Project" on the dashboard
3. Fill in the project details
4. Click "Create Project"

### Uploading Photos

1. Navigate to the "Upload Photos" page
2. Select a project
3. Enter a location description
4. Add a description for the photos
5. Drag and drop photos or click to select files
6. Click "Upload Photos"

### Viewing Reports

1. Navigate to the "Reports" page
2. Filter reports by project, type, or status
3. Click on a report to view details
4. Copy the report content to paste into your existing NCR/PAR system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
