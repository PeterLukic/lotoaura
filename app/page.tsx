"use client";

import { useEffect, useState, type FormEvent } from "react";

type GenerationResult = {
  numbers: number[];
  reading: string;
};

type Country = {
  code: string;
  name: string;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [visibleNumbers, setVisibleNumbers] = useState<number[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [animatedNumbers, setAnimatedNumbers] = useState([
    7, 12, 28, 49, 63, 84,
  ]);
  const [minNumber, setMinNumber] = useState("0");
  const [maxNumber, setMaxNumber] = useState("99");

  useEffect(() => {
    async function loadCountries() {
      try {
        const response = await fetch("/api/countries");
        const data = (await response.json()) as Country[] | { error?: string };

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(
            !Array.isArray(data) && data.error
              ? data.error
              : "Could not load the country list.",
          );
        }

        setCountries(data);
      } catch (caughtError) {
        setCountryError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load the country list.",
        );
      } finally {
        setCountriesLoading(false);
      }
    }

    void loadCountries();
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const interval = window.setInterval(() => {
      setAnimatedNumbers((current) =>
        current.map((number, index) => (number + 7 + index * 3) % 100),
      );
    }, 120);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!result) return;

    const timers = result.numbers.map((number, index) =>
      window.setTimeout(() => {
        setVisibleNumbers((current) => [...current, number]);

        if (index === result.numbers.length - 1) {
          setIsRevealing(false);
        }
      }, (index + 1) * 250),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [result]);

  const min = Number(minNumber);
  const max = Number(maxNumber);
  const rangeSize =
    Number.isInteger(min) && Number.isInteger(max) && max >= min
      ? max - min + 1
      : 1;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    setVisibleNumbers([]);
    setIsRevealing(false);

    const formData = new FormData(event.currentTarget);
    const quantity = Number(formData.get("quantity"));

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max > 99 ||
      min > max
    ) {
      setError("Choose a valid range between 0 and 99.");
      setIsLoading(false);
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > rangeSize) {
      setError(
        `Choose between 1 and ${rangeSize} numbers for your selected range.`,
      );
      setIsLoading(false);
      return;
    }

    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      zodiacSign: String(formData.get("zodiacSign") ?? ""),
      birthCity: String(formData.get("birthCity") ?? ""),
      birthCountry: String(formData.get("birthCountry") ?? ""),
      minNumber: min,
      maxNumber: max,
      quantity,
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as GenerationResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not generate your numbers.");
      }

      setIsRevealing(true);
      setResult(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="intro">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span>
            Loto<span className="brand-light">Aura</span>
          </span>
        </div>

        <p className="eyebrow">AI-INSPIRED LUCKY NUMBERS</p>

        <h1>
          Your story.
          <br />
          Your <span>lucky numbers.</span>
        </h1>

        <p className="intro-text">
          Share a few details about yourself. LotoAura will use your horoscope
          to create a personal number reading.
        </p>

        <div className="range-badge">
          <span className="range-number">
            {minNumber}–{maxNumber}
          </span>
          <span>Choose your range and number count</span>
        </div>
      </section>

      <section className="form-card">
        <div className="form-heading">
          <p className="eyebrow">YOUR PERSONAL READING</p>
          <h2>Tell us about yourself</h2>
          <p>We’ll use these details to prepare your AI-inspired result.</p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            First name
            <input
              name="firstName"
              type="text"
              placeholder="Your first name"
              autoComplete="given-name"
              maxLength={80}
              required
            />
          </label>

          <label>
            Last name
            <input
              name="lastName"
              type="text"
              placeholder="Your last name"
              autoComplete="family-name"
              maxLength={80}
              required
            />
          </label>

          <label>
            Date of birth
            <input name="dateOfBirth" type="date" required />
          </label>

          <label>
            Zodiac sign
            <select name="zodiacSign" required defaultValue="">
              <option value="" disabled>
                Select your sign
              </option>
              <option>Aries</option>
              <option>Taurus</option>
              <option>Gemini</option>
              <option>Cancer</option>
              <option>Leo</option>
              <option>Virgo</option>
              <option>Libra</option>
              <option>Scorpio</option>
              <option>Sagittarius</option>
              <option>Capricorn</option>
              <option>Aquarius</option>
              <option>Pisces</option>
            </select>
          </label>

          <label>
            City of birth
            <input
              name="birthCity"
              type="text"
              placeholder="City"
              autoComplete="address-level2"
              maxLength={100}
              pattern="[\p{L}\p{M}\s.'’-]+"
              title="Use letters, spaces, hyphens, or apostrophes. Numbers are not allowed."
              value={birthCity}
              onChange={(event) =>
                setBirthCity(
                  event.target.value.replace(/[^\p{L}\p{M}\s.'’-]/gu, ""),
                )
              }
              required
            />
          </label>

          <label>
            Country of birth
            <select
              name="birthCountry"
              required
              value={
                countries.find(
                  (country) => country.code === selectedCountryCode,
                )?.name ?? ""
              }
              onChange={(event) => {
                const country = countries.find(
                  (item) => item.name === event.target.value,
                );

                setSelectedCountryCode(country?.code ?? "");
                setBirthCity("");
              }}
              disabled={countriesLoading || countries.length === 0}
              autoComplete="country-name"
            >
              <option value="" disabled>
                {countriesLoading ? "Loading countries..." : "Select a country"}
              </option>

              {countries.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>

            {countryError && (
              <span className="field-hint" role="alert">
                {countryError}
              </span>
            )}
          </label>

          <label>
            Range from
            <input
              name="minNumber"
              type="number"
              min="0"
              max="99"
              step="1"
              value={minNumber}
              onChange={(event) => setMinNumber(event.target.value)}
              required
            />
          </label>

          <label>
            Range to
            <input
              name="maxNumber"
              type="number"
              min="0"
              max="99"
              step="1"
              value={maxNumber}
              onChange={(event) => setMaxNumber(event.target.value)}
              required
            />
          </label>

          <label className="field-full">
            How many numbers do you want?
            <input
              name="quantity"
              type="number"
              min="1"
              max={rangeSize}
              defaultValue={7}
              required
            />
            <span className="field-hint">
              Choose 1–{rangeSize} unique numbers within your selected range.
            </span>
          </label>

          <button
            className="continue-button field-full"
            type="submit"
            disabled={
              isLoading ||
              isRevealing ||
              countriesLoading ||
              countries.length === 0
            }
          >
            {isLoading
              ? "Generating..."
              : isRevealing
                ? "Revealing numbers..."
                : "Generate my numbers"}
            <span aria-hidden="true">→</span>
          </button>

          <div className="draw-stage field-full" aria-live="polite">
       

            {isLoading ? (
              <div className="draw-animation" role="status">
                <div className="draw-orbit">
                  {animatedNumbers.map((number, index) => (
                    <span className="draw-ball" key={index}>
                      {String(number).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                <p className="draw-status">Mixing your numbers...</p>
              </div>
            ) : result ? (
              <>
                <div className="draw-results">
                  {visibleNumbers.map((number) => (
                    <span className="draw-result-ball" key={number}>
                      {String(number).padStart(2, "0")}
                    </span>
                  ))}

                  {visibleNumbers.length === 0 && (
                    <p className="draw-status">Your reading is ready...</p>
                  )}
                </div>

                {!isRevealing && (
                  <p className="draw-reading">{result.reading}</p>
                )}
              </>
            ) : (
              <div className="draw-idle">
                <span className="draw-idle-ball">✦</span>
                <p>Your numbers will appear here</p>
              </div>
            )}
          </div>
        </form>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

      </section>
    </main>
  );
}