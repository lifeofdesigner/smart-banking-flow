import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RefreshCw, TrendingUp } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type RateMap = Record<string, number>;

export default function MarketTicker() {
  const settings = useSiteSettings();
  const enabled = settings.market_widget_enabled === "true";
  const baseCurrency = (settings.forex_base_currency || "USD").toUpperCase();
  const currencies = useMemo(
    () => (settings.forex_quote_currencies || "EUR,GBP,NGN")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 6),
    [settings.forex_quote_currencies],
  );
  const stocks = useMemo(
    () => (settings.stock_symbols || "AAPL,MSFT,TSLA")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4),
    [settings.stock_symbols],
  );
  const [rates, setRates] = useState<RateMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || currencies.length === 0) return;

    let isMounted = true;

    const loadRates = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${currencies.join(",")}`,
        );
        const payload = await response.json();
        if (isMounted && payload?.rates) {
          setRates(payload.rates);
        }
      } catch {
        if (isMounted) setRates({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadRates();

    return () => {
      isMounted = false;
    };
  }, [baseCurrency, currencies, enabled]);

  if (!enabled) return null;

  return (
    <section className="border-y border-border bg-white py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-[var(--bank-navy)]">
            <TrendingUp className="h-5 w-5 text-[var(--bank-gold)]" />
            <p className="font-semibold">{settings.market_widget_title || "Market Watch"}</p>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(rates).map(([currency, rate]) => (
              <span key={currency} className="rounded-full bg-[var(--bank-bg)] px-3 py-1 text-[var(--bank-text)]">
                {baseCurrency}/{currency} {Number(rate).toFixed(4)}
              </span>
            ))}

            {stocks.map((symbol) => (
              <a
                key={symbol}
                href={`https://stooq.com/q/?s=${symbol.toLowerCase()}.us`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--bank-navy)] px-3 py-1 text-white"
              >
                {symbol}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
