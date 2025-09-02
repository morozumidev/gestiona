import { Injectable, signal } from '@angular/core';

export interface TicketStatusLike {
  _id?: string;
  name?: string;
  slug?: string;
  cssClass?: string;
}

export interface ThemeVars {
  bg: string;      // fondo de la tarjeta
  fg: string;      // color de texto
  icon?: string;   // color del ícono
  badgeBg?: string;
  badgeFg?: string;
}

@Injectable({ providedIn: 'root' })
export class StatusTheme {
  /** Overrides opcionales por clave normalizada del estado */
  private overrides = signal<Record<string, Partial<ThemeVars>>>({});

  /** Clave canónica del estado (cssClass > slug > name > _id) en snake_case */
  keyOf(s: TicketStatusLike | string | null | undefined): string {
    if (!s) return 'unknown';
    const raw =
      typeof s === 'string'
        ? s
        : (s.cssClass || s.slug || s.name || s._id || 'unknown');
    return raw.toString().trim().toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Devuelve variables de tema (no usa ngStyle). Úsalo con
   * [style.--card-bg], [style.--card-fg], etc. en la plantilla.
   */
  varsFor(s: TicketStatusLike | string | null | undefined): ThemeVars {
    const key = this.keyOf(s);
    const base = this.computeFromKey(key);
    const ov = this.overrides()[key] || {};
    return { ...base, ...ov };
  }

  /** Permite definir overrides (p. ej. “canceled” siempre rojo) sin tocar componentes */
  setOverrides(map: Record<string, Partial<ThemeVars>>) {
    this.overrides.set(map);
  }

  // ===================== internals =====================

  /** Color determinista (hash → HSL) */
  private computeFromKey(key: string): ThemeVars {
    const h = this.hash(key);
    const hue = h % 360;   // 0..359
    const sat = 62;        // saturación equilibrada para glass UI
    const light = 48;      // luminosidad media para buen contraste

    const bg = `hsl(${hue}deg ${sat}% ${light}%)`;
    const fg = light >= 52 ? 'rgba(0,0,0,0.86)' : 'white';

    return {
      bg,
      fg,
      icon: fg,
      badgeBg: `hsl(${hue}deg ${sat}% ${Math.min(light + 8, 90)}%)`,
      badgeFg: fg,
    };
  }

  /** FNV-1a 32-bit (rápido y estable) */
  private hash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h;
  }
}
