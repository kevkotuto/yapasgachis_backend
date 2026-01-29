/**
 * Data Normalization Utilities
 * Ensures consistent data structures across the API
 */

/**
 * Normalize images field to always return an array
 * Handles Json fields from Prisma that may be null/undefined
 */
export const normalizeImages = <T extends { images?: any }>(data: T): T => {
  if (!data) return data;

  return {
    ...data,
    images: Array.isArray(data.images) ? data.images : [],
  };
};

/**
 * Normalize images field for an array of objects
 */
export const normalizeImagesList = <T extends { images?: any }>(
  dataList: T[]
): T[] => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map(normalizeImages);
};

/**
 * Generic normalizer for any field that should be an array
 */
export const normalizeArrayField = <T extends Record<string, any>>(
  data: T,
  fieldName: keyof T
): T => {
  if (!data) return data;

  return {
    ...data,
    [fieldName]: Array.isArray(data[fieldName]) ? data[fieldName] : [],
  };
};

/**
 * Normalize multiple fields that should be arrays
 */
export const normalizeArrayFields = <T extends Record<string, any>>(
  data: T,
  fieldNames: (keyof T)[]
): T => {
  if (!data) return data;

  const normalized = { ...data };
  fieldNames.forEach((fieldName) => {
    (normalized[fieldName] as any) = Array.isArray(normalized[fieldName])
      ? normalized[fieldName]
      : [];
  });

  return normalized;
};

/**
 * Safe JSON parse that returns default value on error
 */
export const safeJsonParse = <T = any>(
  jsonString: string | null | undefined,
  defaultValue: T
): T => {
  if (!jsonString) return defaultValue;

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Normalize nested images in related objects
 * Example: Product with supplier.store.images
 */
export const deepNormalizeImages = <T extends Record<string, any>>(
  data: T,
  nestedPaths: string[] = []
): T => {
  if (!data) return data;

  const normalized = normalizeImages(data);

  // Handle nested paths like 'supplier.store.images'
  nestedPaths.forEach((path) => {
    const keys = path.split('.');
    let current: any = normalized;

    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]]) {
        current = current[keys[i]];
      } else {
        return; // Path doesn't exist
      }
    }

    const lastKey = keys[keys.length - 1];
    if (current && lastKey === 'images') {
      current[lastKey] = Array.isArray(current[lastKey])
        ? current[lastKey]
        : [];
    }
  });

  return normalized;
};
