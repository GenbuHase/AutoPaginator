export interface AppSettings {
  enabled: boolean;
  blacklist: string[];
}

export const defaultSettings: AppSettings = {
  enabled: true,
  blacklist: []
};

export const storage = {
  get: async (): Promise<AppSettings> => {
    try {
      const data = await chrome.storage.local.get(['enabled', 'blacklist']) as Partial<AppSettings>;
      return {
        enabled: data.enabled ?? defaultSettings.enabled,
        blacklist: data.blacklist ?? defaultSettings.blacklist
      };
    } catch (e) {
      console.warn("Storage read failed, using defaults", e);
      return defaultSettings;
    }
  },
  set: async (settings: Partial<AppSettings>) => {
    try {
      await chrome.storage.local.set(settings as { [key: string]: any });
    } catch (e) {
      console.error("Storage write failed", e);
    }
  }
};

export function isBlacklisted(url: string, blacklist: string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    return blacklist.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}
