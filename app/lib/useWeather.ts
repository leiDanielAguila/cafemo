"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentCoordinates } from "@/app/lib/geolocation";

export type WeatherData = {
  temperature: number;
  name: string;
  region: string;
  country: string;
};

type WeatherErrorResponse = {
  error?: string;
};

export const WEATHER_QUERY_KEY = ["weather"] as const;

const WEATHER_CACHE_MS = 1000 * 60 * 30;

async function fetchWeather() {
  const { lat, lon } = await getCurrentCoordinates();

  const response = await fetch(
    `/api/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as WeatherErrorResponse | null;

    throw new Error(errorData?.error || "Failed to fetch weather data.");
  }

  const data = (await response.json()) as Partial<WeatherData>;

  if (
    typeof data.temperature !== "number" ||
    typeof data.name !== "string" ||
    typeof data.region !== "string" ||
    typeof data.country !== "string"
  ) {
    throw new Error("Invalid weather response shape.");
  }

  return {
    temperature: data.temperature,
    name: data.name,
    region: data.region,
    country: data.country,
  } satisfies WeatherData;
}

export function useWeather() {
  const cacheTime = WEATHER_CACHE_MS;

  return useQuery({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: fetchWeather,
    staleTime: WEATHER_CACHE_MS,
    gcTime: cacheTime,
  });
}
