"use client";

export type Coordinates = {
  lat: number;
  lon: number;
};

type GetCurrentCoordinatesOptions = {
  timeoutMs?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
  fallback?: Coordinates;
};

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable.";
    case error.TIMEOUT:
      return "Location request timed out.";
    default:
      return "Unable to retrieve current location.";
  }
}

export function getCurrentCoordinates(
  options: GetCurrentCoordinatesOptions = {},
): Promise<Coordinates> {
  const {
    timeoutMs = 10_000,
    maximumAge = 5 * 60 * 1000,
    enableHighAccuracy = false,
    fallback,
  } = options;

  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    if (fallback) {
      return Promise.resolve(fallback);
    }

    return Promise.reject(
      new Error("Geolocation is not available in this environment."),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        if (fallback) {
          resolve(fallback);
          return;
        }

        reject(new Error(getGeolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge,
      },
    );
  });
}
