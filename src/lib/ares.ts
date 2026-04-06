export type AresCompany = {
  ico: string;
  name: string;
  address: string;
  dic?: string;
};

const ARES_EKON_SUBJEKT_URL =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

type AresErrorJson = { kod?: string; popis?: string };

function formatDic(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const t = raw.trim();
  if (t.startsWith("CZ")) return t;
  if (/^\d{8,10}$/.test(t)) return `CZ${t}`;
  return t;
}

export async function searchAresByIco(ico: string): Promise<AresCompany | null> {
  const cleanIco = ico.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleanIco)) {
    return null;
  }

  const url = `${ARES_EKON_SUBJEKT_URL}/${cleanIco}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Record<string, unknown> & AresErrorJson;
    if (data.kod === "NENALEZENO" || !data.obchodniJmeno) {
      return null;
    }

    const name = String(data.obchodniJmeno ?? "");
    const sidlo = data.sidlo as Record<string, unknown> | undefined;
    const address =
      (typeof sidlo?.textovaAdresa === "string" && sidlo.textovaAdresa.trim()) ||
      buildAddressFromSidlo(sidlo);

    return {
      ico: cleanIco,
      name,
      address,
      dic: formatDic(data.dic),
    };
  } catch {
    return null;
  }
}

function buildAddressFromSidlo(
  sidlo: Record<string, unknown> | undefined,
): string {
  if (!sidlo) return "";
  const ulice = typeof sidlo.nazevUlice === "string" ? sidlo.nazevUlice : "";
  const dom = sidlo.cisloDomovni;
  const ori = sidlo.cisloOrientacni;
  const oriP = sidlo.cisloOrientacniPismeno;
  let line1 = ulice;
  if (dom !== undefined && dom !== null) {
    line1 += ` ${dom}`;
    if (ori !== undefined && ori !== null) {
      line1 += `/${ori}`;
      if (typeof oriP === "string" && oriP) line1 += oriP;
    }
  }
  const cast = typeof sidlo.nazevCastiObce === "string" ? sidlo.nazevCastiObce : "";
  const psc = sidlo.psc != null ? String(sidlo.psc) : "";
  const obec = typeof sidlo.nazevObce === "string" ? sidlo.nazevObce : "";
  const line2 = [psc && obec ? `${psc} ${obec}` : obec || psc, cast]
    .filter(Boolean)
    .join(", ");

  return [line1, line2].filter(Boolean).join(", ");
}
