import { NextResponse } from "next/server";

type WeatherPayload = {
  temperature: number;
  name: string;
  region: string;
  country: string;
};

function parseCoordinate(
  value: string | null,
  name: "lat" | "lon",
  min: number,
  max: number,
) {
  if (!value) {
    return {
      error: `${name} query parameter is required.`,
      status: 400,
    } as const;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return {
      error: `${name} must be a valid number.`,
      status: 400,
    } as const;
  }

  if (parsed < min || parsed > max) {
    return {
      error: `${name} must be between ${min} and ${max}.`,
      status: 400,
    } as const;
  }

  return {
    value: parsed,
  } as const;
}

export async function GET(request: Request) {
  try {
    const weatherApiKey = process.env.WEATHER_API_KEY;
    if (!weatherApiKey) {
      return NextResponse.json(
        { error: "Missing WEATHER_API_KEY" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const latResult = parseCoordinate(searchParams.get("lat"), "lat", -90, 90);
    if ("error" in latResult) {
      return NextResponse.json(
        { error: latResult.error },
        { status: latResult.status },
      );
    }

    const lonResult = parseCoordinate(
      searchParams.get("lon"),
      "lon",
      -180,
      180,
    );
    if ("error" in lonResult) {
      return NextResponse.json(
        { error: lonResult.error },
        { status: lonResult.status },
      );
    }

    const endpoint = new URL("https://api.weatherapi.com/v1/current.json");
    endpoint.searchParams.set("key", weatherApiKey);
    endpoint.searchParams.set("q", `${latResult.value},${lonResult.value}`);

    const upstreamResponse = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      const upstreamError = (await upstreamResponse
        .json()
        .catch(() => null)) as { error?: { message?: string } } | null;

      return NextResponse.json(
        {
          error:
            upstreamError?.error?.message ||
            "Failed to fetch weather data from WeatherAPI.",
        },
        { status: 502 },
      );
    }

    const upstreamData = (await upstreamResponse.json()) as {
      location?: {
        name?: string;
        region?: string;
        country?: string;
      };
      current?: {
        temp_c?: number;
      };
    };

    const temperature = upstreamData.current?.temp_c;
    const name = upstreamData.location?.name;
    const region = upstreamData.location?.region;
    const country = upstreamData.location?.country;

    if (
      typeof temperature !== "number" ||
      typeof name !== "string" ||
      typeof region !== "string" ||
      typeof country !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid weather payload from upstream provider." },
        { status: 502 },
      );
    }

    const payload: WeatherPayload = {
      temperature,
      name,
      region,
      country,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to process weather request." },
      { status: 500 },
    );
  }
}
