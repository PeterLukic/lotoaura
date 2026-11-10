import { NextResponse } from "next/server";

type GeoNamesCountry = {
    countryCode: string;
    countryName: string;
};

export async function GET() {
    const username = process.env.GEONAMES_USERNAME?.trim();

    if (!username) {
        return NextResponse.json(
            { error: "GeoNames is not configured. Check .env.local." },
            { status: 500 },
        );
    }

    try {
        const url = new URL("https://secure.geonames.org/countryInfoJSON");
        url.searchParams.set("username", username);

        const response = await fetch(url, {
            next: { revalidate: 86400 },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Could not load the country list." },
                { status: 502 },
            );
        }

        const data = (await response.json()) as {
            geonames?: GeoNamesCountry[];
            status?: { message?: string };
        };

        if (!Array.isArray(data.geonames)) {
            return NextResponse.json(
                { error: data.status?.message || "GeoNames returned an invalid response." },
                { status: 502 },
            );
        }

        const countries = data.geonames
            .filter((country) => country.countryCode && country.countryName)
            .map((country) => ({
                code: country.countryCode,
                name: country.countryName,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(countries);
    } catch {
        return NextResponse.json(
            { error: "Could not connect to GeoNames." },
            { status: 502 },
        );
    }
}