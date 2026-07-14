/**
 * System: Pedestrian Hazard YOLO
 * Module: API Client
 * File URL: frontend/src/api/detect.ts
 * Purpose: Shared frontend detection system API client to communicate with the backend
 */

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export type Detection = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
};

/**
 * Sends an image to the backend for pedestrian hazard detection.
 * 
 * @param image The image (Blob or File) to detect.
 * @returns A Result containing an array of Detections on success, or an error message on failure.
 */
export async function detectImage(image: Blob): Promise<Result<Detection[], string>> {
  try {
    const formData = new FormData();
    formData.append('image', image);

    const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
    const response = await fetch(`${baseUrl}/api/v1/detect`, {
      method: 'POST',
      body: formData,
      // Note: Do NOT set 'Content-Type' manually when using FormData;
      // the browser will automatically set it to 'multipart/form-data' with the correct boundary.
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Fallback to text or generic error if not JSON
        const textError = await response.text().catch(() => null);
        if (textError) {
          errorMessage = textError;
        }
      }
      return { success: false, error: errorMessage };
    }

    const data: Detection[] = await response.json();
    return { success: true, data };
  } catch (error) {
    let errorMessage = 'An unknown network error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
