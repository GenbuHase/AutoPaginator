export interface SiteConfig {
  name: string;
  url: string;
  enabled: boolean;
  exampleUrl?: string;
  pageElement: string; // XPath
  nextLink: string;   // XPath
  insertBefore?: string; // XPath
}

export interface AppSettings {
  enabled: boolean;
  blacklist: string[];
  siteInfo: SiteConfig[];
}

export const defaultSettings: AppSettings = {
  enabled: true,
  blacklist: [],
  siteInfo: []
};

export const storage = {
  get: async (): Promise<AppSettings> => {
    try {
      const data = await chrome.storage.local.get(['enabled', 'blacklist', 'siteInfo']) as Partial<AppSettings>;
      return {
        enabled: data.enabled ?? defaultSettings.enabled,
        blacklist: data.blacklist ?? defaultSettings.blacklist,
        siteInfo: data.siteInfo ?? defaultSettings.siteInfo
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
  },
  export: async (): Promise<string> => {
    const settings = await storage.get();
    return JSON.stringify(settings, null, 2);
  },
  import: async (json: string): Promise<boolean> => {
    try {
      const settings = JSON.parse(json) as AppSettings;
      // Basic validation
      if (typeof settings.enabled !== 'boolean' || !Array.isArray(settings.blacklist)) {
        throw new Error("Invalid format");
      }
      await storage.set(settings);
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
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
