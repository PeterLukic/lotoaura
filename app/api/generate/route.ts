import { NextResponse } from "next/server";

const zodiacSigns = new Set([
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
]);

function readText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function parseJsonContent(content: unknown): Record<string, unknown> | null {
  if (typeof content !== "string") {
    return null;
  }

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(cleaned);

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  const model = process.env.OLLAMA_MODEL?.trim();
  const baseUrl =
    process.env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://ollama.com";

  if (!model) {
    return NextResponse.json(
      { error: "Ollama is not configured. Check your .env.local file." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  const firstName = readText(input.firstName, 80);
  const lastName = readText(input.lastName, 80);
  const dateOfBirth = readText(input.dateOfBirth, 20);
  const zodiacSign = readText(input.zodiacSign, 20);
  const birthCity = readText(input.birthCity, 100);
  const birthCountry = readText(input.birthCountry, 100);
  const minNumber = input.minNumber;
  const maxNumber = input.maxNumber;
  const quantity = input.quantity;

  if (
    !firstName ||
    !lastName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    !zodiacSigns.has(zodiacSign) ||
    !birthCity ||
    !birthCountry
  ) {
    return NextResponse.json(
      { error: "Please complete all required fields." },
      { status: 400 },
    );
  }

  if (
    !isIntegerInRange(minNumber, 0, 99) ||
    !isIntegerInRange(maxNumber, 0, 99) ||
    minNumber > maxNumber
  ) {
    return NextResponse.json(
      { error: "Choose a valid range between 0 and 99." },
      { status: 400 },
    );
  }

  const availableNumbers = maxNumber - minNumber + 1;

  if (
    !isIntegerInRange(quantity, 1, 100) ||
    quantity > availableNumbers
  ) {
    return NextResponse.json(
      {
        error: `Choose between 1 and ${availableNumbers} numbers for your selected range.`,
      },
      { status: 400 },
    );
  }

  const userDetails = {
    firstName,
    lastName,
    dateOfBirth,
    zodiacSign,
    birthCity,
    birthCountry,
    minNumber,
    maxNumber,
    quantity,
  };

  const systemPrompt = `
You are LotoAura, an assistant that creates horoscope-inspired number suggestions for entertainment.

Use the person's zodiac sign and personal details only as creative inspiration. Do not claim astrology predicts lottery results, improves the odds, or guarantees a win.

Return only valid JSON in this exact shape:
{"numbers":[1,2,3],"reading":"A short personal interpretation."}

Rules:
- Return exactly ${quantity} numbers.
- Every number must be a unique integer from ${minNumber} to ${maxNumber}, inclusive.
- Sort the numbers from lowest to highest.
- Make the reading warm, personal, and brief.
- Do not repeat the person's full name or date of birth.
- Do not include Markdown or text outside the JSON.
`;

  try {
    const ollamaResponse = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a number reading from these details:\n${JSON.stringify(userDetails)}`,
          },
        ],
      }),
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json(
        { error: "Ollama could not generate a result. Check your connection and try again." },
        { status: 502 },
      );
    }

    const ollamaData = (await ollamaResponse.json()) as {
      message?: { content?: unknown };
    };

    const generated = parseJsonContent(ollamaData.message?.content);

    if (!generated) {
      return NextResponse.json(
        { error: "Ollama returned an invalid result. Try again." },
        { status: 502 },
      );
    }

    const numbers = generated.numbers;
    const reading = generated.reading;

    if (
      !Array.isArray(numbers) ||
      numbers.length !== quantity ||
      !numbers.every((number) =>
        isIntegerInRange(number, minNumber, maxNumber),
      ) ||
      new Set(numbers).size !== quantity ||
      typeof reading !== "string" ||
      !reading.trim() ||
      reading.length > 1000
    ) {
      return NextResponse.json(
        { error: "Ollama returned an invalid result. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      numbers: [...numbers].sort((a, b) => a - b),
      reading: reading.trim(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to Ollama or read its response." },
      { status: 502 },
    );
  }
}