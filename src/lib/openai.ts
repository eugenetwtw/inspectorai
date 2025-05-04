import OpenAI from 'openai';

// Create a single OpenAI client for interacting with the API
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OpenAI API key');
}

export const openai = new OpenAI({
  apiKey,
});

// Function to analyze an image using OpenAI's vision model
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  specifications?: string,
  drawings?: string,
  contractItems?: string
) {
  try {
    // Build the prompt with additional context if available
    let fullPrompt = prompt;
    
    if (specifications) {
      fullPrompt += `\n\nSpecifications:\n${specifications}`;
    }
    
    if (drawings) {
      fullPrompt += `\n\nDrawings:\n${drawings}`;
    }
    
    if (contractItems) {
      fullPrompt += `\n\nContract Items (BOQ):\n${contractItems}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    throw error;
  }
}

// Define interface for photo details
export interface PhotoDetails {
  location_description?: string;
  taken_at?: string;
  weather_data?: Record<string, unknown>;
  [key: string]: unknown;
}

// Function to generate an NCR report based on analysis
export async function generateNCRReport(
  analysisResult: string,
  photoDetails: PhotoDetails,
  specifications?: string,
  drawings?: string,
  contractItems?: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert construction inspector. Your task is to generate a detailed Non-Conformance Report (NCR) based on the analysis of a construction site photo. The report should be professional, specific, and reference relevant specifications, drawings, or contract items."
        },
        {
          role: "user",
          content: `Generate a Non-Conformance Report based on the following analysis:
          
Analysis: ${analysisResult}

Photo Details:
- Location: ${photoDetails.location_description || 'Not specified'}
- Date/Time: ${photoDetails.taken_at ? new Date(photoDetails.taken_at).toLocaleString() : 'Not specified'}
- Weather: ${photoDetails.weather_data ? JSON.stringify(photoDetails.weather_data) : 'Not specified'}

${specifications ? `Specifications:\n${specifications}` : ''}
${drawings ? `Drawings:\n${drawings}` : ''}
${contractItems ? `Contract Items (BOQ):\n${contractItems}` : ''}

Format the report with the following sections:
1. Title
2. Description of Non-Conformance
3. Reference to Specifications/Drawings/Contract Items
4. Recommended Corrective Action
5. Severity (Low, Medium, High)
`
        }
      ],
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating NCR report with OpenAI:', error);
    throw error;
  }
}

// Function to generate a PAR report for safety issues
export async function generatePARReport(
  analysisResult: string,
  photoDetails: PhotoDetails
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert construction safety inspector. Your task is to generate a detailed Preventive Action Report (PAR) based on the analysis of a construction site photo that shows safety concerns. The report should be professional, specific, and reference relevant safety regulations or standards."
        },
        {
          role: "user",
          content: `Generate a Preventive Action Report for safety issues based on the following analysis:
          
Analysis: ${analysisResult}

Photo Details:
- Location: ${photoDetails.location_description || 'Not specified'}
- Date/Time: ${photoDetails.taken_at ? new Date(photoDetails.taken_at).toLocaleString() : 'Not specified'}
- Weather: ${photoDetails.weather_data ? JSON.stringify(photoDetails.weather_data) : 'Not specified'}

Format the report with the following sections:
1. Title
2. Description of Safety Concern
3. Reference to Safety Regulations/Standards
4. Recommended Preventive Action
5. Severity (Low, Medium, High)
`
        }
      ],
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating PAR report with OpenAI:', error);
    throw error;
  }
}
