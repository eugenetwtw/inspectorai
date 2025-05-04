'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useRequireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { extractExifData, extractDateTime, extractGPSCoordinates } from '@/lib/exif-utils';
import { getWeatherData, getLocationFromCoordinates, extractLocationFromDescription } from '@/lib/external-apis';

export default function UploadPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [projects, setProjects] = useState<Array<{
    id: string;
    name: string;
    created_at: string;
    [key: string]: any;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Fetch user's projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        // Fetch projects where the user is a member
        const { data: memberProjects, error: memberError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        if (memberError) {
          throw memberError;
        }

        if (memberProjects && memberProjects.length > 0) {
          const projectIds = memberProjects.map(p => p.project_id);
          
          const { data, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .order('created_at', { ascending: false });

          if (projectsError) {
            throw projectsError;
          }

          setProjects(data || []);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setIsProjectsLoading(false);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    // Check if files are images
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length !== acceptedFiles.length) {
      setError('Only image files are allowed');
      return;
    }
    
    setFiles(imageFiles);
    
    // Create previews
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': []
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one photo to upload');
      return;
    }
    
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    setUploadStatus('Preparing files...');
    
    try {
      // Process and upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = i;
        
        setUploadStatus(`Processing file ${i + 1} of ${files.length}...`);
        
        // Extract EXIF data
        const exifData = await extractExifData(file);
        const dateTime = exifData ? extractDateTime(exifData) : null;
        const gpsCoordinates = exifData ? extractGPSCoordinates(exifData) : null;
        
        // Extract location from description
        await extractLocationFromDescription(locationDescription);
        
        // Get weather data if GPS coordinates are available
        let weatherData = null;
        let geoData = null;
        
        if (gpsCoordinates) {
          // Get weather data for the time the photo was taken
          if (dateTime) {
            const timestamp = Math.floor(dateTime.getTime() / 1000);
            weatherData = await getWeatherData(
              gpsCoordinates.lat,
              gpsCoordinates.lon,
              timestamp
            );
          }
          
          // Get location information from coordinates
          geoData = await getLocationFromCoordinates(
            gpsCoordinates.lat,
            gpsCoordinates.lon
          );
        }
        
        // Upload file to Supabase Storage
        setUploadStatus(`Uploading file ${i + 1} of ${files.length}...`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${fileIndex}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }
        
        // Create a public URL for the uploaded file
        supabase.storage
          .from('photos')
          .getPublicUrl(filePath);
        
        // Save photo information to the database
        const { error: photoError } = await supabase
          .from('photos')
          .insert({
            project_id: projectId,
            uploaded_by: user?.id,
            storage_path: filePath,
            description: description,
            location_description: locationDescription,
            exif_data: exifData,
            weather_data: weatherData,
            geo_data: geoData,
            taken_at: dateTime ? dateTime.toISOString() : null,
            ai_processed: false,
            ai_processing_status: 'pending'
          });
        
        if (photoError) {
          throw new Error(`Error saving photo data: ${photoError.message}`);
        }
        
        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      setUploadStatus('Upload complete!');
      
      // Redirect to the project page
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during upload');
      setIsLoading(false);
    }
  };

  const removeFile = (index: number): void => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header/Navigation */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Photos</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Selection */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project
            </label>
            <select
              id="project"
              name="project"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              disabled={isProjectsLoading || isLoading}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Description */}
          <div>
            <label htmlFor="location-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Location Description
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="location-description"
                name="location-description"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., 4F B區"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Describe the location where the photos were taken (e.g., 4F B區, North Wing, etc.)
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Add a description for these photos"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Photos
            </label>
            <div 
              {...getRootProps()} 
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <input {...getInputProps()} disabled={isLoading} />
                  <p className="pl-1">Drag and drop photos here, or click to select files</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          {previews.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Selected Photos ({previews.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="object-cover"
                      />
                    </div>
                    {!isLoading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploadStatus}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || files.length === 0}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading || files.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Uploading...' : 'Upload Photos'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
