// src/api/leafDetectionApi.ts

const API_BASE_URL = 'https://87sne099el.execute-api.ap-southeast-1.amazonaws.com/prodimageu';

export interface LeafDetection {
  id: string;
  farmerId: string;
  content: string;
  location?: string;
  photoUrl: string;
  pestType: string;
  label: string;
  createdAt: string;
}

// GET - Retrieve image by ID
export const getDetection = async (id: string): Promise<LeafDetection> => {
  const response = await fetch(`${API_BASE_URL}/images/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get detection: ${response.statusText}`);
  }
  
  return response.json();
};

// POST - Upload new detection
export const createDetection = async (data: {
  farmerId: string;
  content: string;
  location?: string;
  imageData?: string;
  imageType?: string;
}): Promise<LeafDetection> => {
  const response = await fetch(`${API_BASE_URL}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create detection: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.detection;
};

// PUT - Update detection (label, pestType, farmerId, location, image)
export const updateDetection = async (
  id: string,
  updates: {
    label?: string;
    pestType?: string;
    farmerId?: string;
    location?: string;
    content?: string;
    imageData?: string;
    imageType?: string;
  }
): Promise<LeafDetection> => {
  const response = await fetch(`${API_BASE_URL}/images/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update detection: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.updatedItem;
};

// DELETE - Remove detection
export const deleteDetection = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/images/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete detection: ${response.statusText}`);
  }
};

// LIST ALL - Get all detections
export const listAllDetections = async (): Promise<LeafDetection[]> => {
  const response = await fetch(`${API_BASE_URL}/images`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list detections: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.detections || [];
};