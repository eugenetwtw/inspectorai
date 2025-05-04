import ExifReader from 'exifreader';

// Function to extract EXIF data from an image file
export async function extractExifData(file: File): Promise<any> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);
    
    // Extract relevant EXIF data
    const exifData: any = {};
    
    // Date and time
    if (tags['DateTimeOriginal']) {
      exifData.dateTimeOriginal = tags['DateTimeOriginal'].description;
    } else if (tags['DateTime']) {
      exifData.dateTime = tags['DateTime'].description;
    }
    
    // GPS coordinates
    if (tags['GPSLatitude'] && tags['GPSLongitude']) {
      exifData.gps = {
        latitude: tags['GPSLatitude'].description,
        longitude: tags['GPSLongitude'].description,
      };
      
      // Convert GPS coordinates to decimal format if they're in DMS format
      if (typeof exifData.gps.latitude === 'string' && exifData.gps.latitude.includes('deg')) {
        exifData.gps.latitudeDecimal = convertDMSToDecimal(exifData.gps.latitude);
        exifData.gps.longitudeDecimal = convertDMSToDecimal(exifData.gps.longitude);
      }
    }
    
    // Camera information
    if (tags['Make']) {
      exifData.make = tags['Make'].description;
    }
    
    if (tags['Model']) {
      exifData.model = tags['Model'].description;
    }
    
    // Image information
    if (tags['ImageWidth'] && tags['ImageHeight']) {
      exifData.dimensions = {
        width: tags['ImageWidth'].value,
        height: tags['ImageHeight'].value,
      };
    }
    
    return exifData;
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return null;
  }
}

// Function to convert DMS (degrees, minutes, seconds) to decimal format
function convertDMSToDecimal(dms: string): number | null {
  try {
    // Example format: "51deg 30' 35.66"" N"
    const parts = dms.split(/[^\d\w\.]+/);
    const degrees = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    const direction = parts[3];
    
    let decimal = degrees + minutes / 60 + seconds / 3600;
    
    // If direction is South or West, make the coordinate negative
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    
    return decimal;
  } catch (error) {
    console.error('Error converting DMS to decimal:', error);
    return null;
  }
}

// Function to extract date and time from EXIF data
export function extractDateTime(exifData: any): Date | null {
  try {
    if (exifData.dateTimeOriginal) {
      // Format: "YYYY:MM:DD HH:MM:SS"
      const [datePart, timePart] = exifData.dateTimeOriginal.split(' ');
      const [year, month, day] = datePart.split(':');
      const [hour, minute, second] = timePart.split(':');
      
      return new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed in JavaScript Date
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    } else if (exifData.dateTime) {
      // Try with dateTime if dateTimeOriginal is not available
      const [datePart, timePart] = exifData.dateTime.split(' ');
      const [year, month, day] = datePart.split(':');
      const [hour, minute, second] = timePart.split(':');
      
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting date and time from EXIF data:', error);
    return null;
  }
}

// Function to extract GPS coordinates from EXIF data
export function extractGPSCoordinates(exifData: any): { lat: number; lon: number } | null {
  try {
    if (exifData.gps && exifData.gps.latitudeDecimal && exifData.gps.longitudeDecimal) {
      return {
        lat: exifData.gps.latitudeDecimal,
        lon: exifData.gps.longitudeDecimal,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting GPS coordinates from EXIF data:', error);
    return null;
  }
}
