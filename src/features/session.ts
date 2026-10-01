/**
 * Per-browser session: a stable anonymous `userId`, the identity the user picks
 * (nickname + colour), the app preferences from the settings sheet, and a short
 * list of recently opened boards. Persisted to `localStorage`.
 *
 * There are no accounts (mobile/docs/01-introduction). The `userId` is the
 * identity the backend keys presence and permissions on — never the IP.
 *
 * One thing lives here that looks like it belongs to the board: `pins`. A
 * board's PIN never leaves the server (`BoardMeta` only carries `hasPin`), so
 * the only client that can show the creator their own PIN is the one that set
 * it. Keeping the ones we chose ourselves is what lets the access sheet display
 * the PIN instead of four dots.
 */
import { create, persisted } from '../lib/store';
import { newUserId } from '../lib/id';
import { LIMITS } from '../lib/contract';
import { Avatars, avatarColor, type Theme } from '../lib/theme';
import type { Lang } from './strings';

export interface RecentBoard {
  id: string;
  shortCode: string;
  name: string;
  lastOpenedAt: number;
  /** 'creator' if this browser created the board. */
  role: 'creator' | 'member';
}

/**
 * The toggles in the settings sheet. All local to this browser.
 *
 * The mobile app has a fourth, `haptics`; a browser has no vibration to offer
 * on a tool tap, so it is omitted here rather than shown as a dead switch.
 */
export interface AppSettings {
  /** Dot grid under the drawing. */
  grid: boolean;
  /** Show other participants' cursors. */
  peers: boolean;
  /** Curve-fit freehand strokes instead of joining raw points. */
  smooth: boolean;
}

interface SessionState {
  userId: string;
  nickname: string;
  /** Preferred presence colour; the server may still assign a different one. */
  nickColor: string;
  /** Presence icon; its colour is `nickColor`. */
  avatar: string;
  lang: Lang;
  /** Light board or dark board; light unless chosen otherwise. */
  theme: Theme;
  settings: AppSettings;
  recent: RecentBoard[];
  /** PINs this browser chose, by board id. */
  pins: Record<string, string>;
  /** The first-run hint on an empty board has been dismissed (or acted on). */
  hintDismissed: boolean;

  setNickname(nickname: string): void;
  dismissHint(): void;
  setAvatar(avatar: string): void;
  setLang(lang: Lang): void;
  toggleLang(): void;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void;
  rememberBoard(board: Omit<RecentBoard, 'lastOpenedAt'>): void;
  forgetBoard(id: string): void;
  rememberPin(boardId: string, pin: string | null): void;
}

export const DEFAULT_SETTINGS: AppSettings = { grid: true, peers: true, smooth: true };

const STORAGE_KEY = 'shareboard.session';

interface Persisted {
  userId: string;
  nickname: string;
  nickColor: string;
  avatar?: string;
  lang: Lang;
  theme?: Theme;
  settings: AppSettings;
  recent: RecentBoard[];
  pins: Record<string, string>;
  hintDismissed?: boolean;
}

/**
 * The browser's language is a better first guess than a hard default: the
 * design ships Spanish first, but an English-speaking visitor should not have
 * to find the toggle before reading the page.
 */
function preferredLang(): Lang {
  const tags = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const tag of tags) {
    if (!tag) continue;
    if (tag.toLowerCase().startsWith('es')) return 'es';
    if (tag.toLowerCase().startsWith('en')) return 'en';
  }
  return 'es';
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: newUserId(),
  nickname: '',
  nickColor: Avatars[0].color,
  avatar: Avatars[0].icon,
  lang: preferredLang(),
  theme: 'light',
  settings: DEFAULT_SETTINGS,
  recent: [],
  pins: {},
  hintDismissed: false,

  setNickname(nickname) {
    set({ nickname: nickname.trim().slice(0, LIMITS.maxNicknameLength) });
  },

  dismissHint() {
    set({ hintDismissed: true });
  },

  /** The icon brings its colour along: one choice, not two. */
  setAvatar(avatar) {
    set({ avatar, nickColor: avatarColor(avatar) });
  },

  setLang(lang) {
    set({ lang });
  },

  toggleLang() {
    set((s) => ({ lang: s.lang === 'es' ? 'en' : 'es' }));
  },

  setTheme(theme) {
    set({ theme });
  },

  toggleTheme() {
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));
  },

  setSetting(key, value) {
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
  },

  rememberBoard(board) {
    set((s) => {
      const rest = s.recent.filter((b) => b.id !== board.id);
      return { recent: [{ ...board, lastOpenedAt: Date.now() }, ...rest].slice(0, 12) };
    });
  },

  forgetBoard(id) {
    set((s) => {
      const { [id]: _removed, ...pins } = s.pins;
      return { recent: s.recent.filter((b) => b.id !== id), pins };
    });
  },

  rememberPin(boardId, pin) {
    set((s) => {
      if (pin === null) {
        const { [boardId]: _removed, ...pins } = s.pins;
        return { pins };
      }
      return { pins: { ...s.pins, [boardId]: pin } };
    });
  },
}));

// Restore what was saved, merging over the defaults so a setting added later
// does not come back `undefined` and render as "off".
const saved = persisted<SessionState, Persisted>(useSessionStore, STORAGE_KEY, (s) => ({
  userId: s.userId,
  nickname: s.nickname,
  nickColor: s.nickColor,
  avatar: s.avatar,
  lang: s.lang,
  theme: s.theme,
  settings: s.settings,
  recent: s.recent,
  pins: s.pins,
  hintDismissed: s.hintDismissed,
}));

if (saved) {
  useSessionStore.setState({
    ...saved,
    avatar: saved.avatar || Avatars[0].icon,
    nickColor: avatarColor(saved.avatar || Avatars[0].icon),
    theme: saved.theme === 'dark' ? 'dark' : 'light',
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
    hintDismissed: saved.hintDismissed === true,
  });
}

// Nobody is asked their name before they can draw: until they pick one in
// Settings, a guest name stands in (the identity screen is left for a clash).
if (!useSessionStore.getState().nickname) {
  const word = useSessionStore.getState().lang === 'es' ? 'Invitado' : 'Guest';
  useSessionStore.setState({ nickname: `${word} ${1000 + Math.floor(Math.random() * 9000)}` });
}

// The theme is applied as `data-theme` on <html>: the stylesheet switches its
// variables on it, and everything else reads the variables.
if (typeof document !== 'undefined') {
  const apply = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
  };
  apply(useSessionStore.getState().theme);
  useSessionStore.subscribe((s, prev) => {
    if (s.theme !== prev.theme) apply(s.theme);
  });

  // `<html lang>` follows the chosen language, not the one index.html shipped
  // with: screen readers pick their voice and pronunciation from it.
  const applyLang = (lang: Lang) => {
    document.documentElement.lang = lang;
  };
  applyLang(useSessionStore.getState().lang);
  useSessionStore.subscribe((s, prev) => {
    if (s.lang !== prev.lang) applyLang(s.lang);
  });
}
