import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global API & Backend Configuration
 * 
 * You can set your deployed Google Apps Script Web App URL in three ways:
 * 1. Directly in this file (GAS_WEB_APP_URL)
 * 2. In an .env file as: EXPO_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/.../exec
 * 3. In the mobile app UI under the "Settings" tab!
 */

const STORAGE_KEY_API_URL = '@goldloan_custom_gas_url';
const STORAGE_KEY_USE_MOCK = '@goldloan_use_mock';

// If you deploy to Google Apps Script, paste your deployed Web App URL here:
export const DEFAULT_GAS_WEB_APP_URL = 
  process.env.EXPO_PUBLIC_GAS_API_URL || 
  ""; // e.g. "https://script.google.com/macros/s/AKfycbx.../exec"

export const SPREADSHEET_ID = 
  process.env.EXPO_PUBLIC_SPREADSHEET_ID || 
  "";

class ApiConfigManager {
  private customUrl: string | null = null;
  private forceMock: boolean | null = null;

  async init(): Promise<void> {
    try {
      const [savedUrl, savedMock] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_API_URL),
        AsyncStorage.getItem(STORAGE_KEY_USE_MOCK),
      ]);
      if (savedUrl) this.customUrl = savedUrl;
      if (savedMock !== null) this.forceMock = savedMock === 'true';
    } catch (e) {
      console.warn('Failed to load API config from storage:', e);
    }
  }

  getApiUrl(): string {
    return (this.customUrl || DEFAULT_GAS_WEB_APP_URL).trim();
  }

  isConfigured(): boolean {
    const url = this.getApiUrl();
    return url.length > 0 && url.startsWith('http');
  }

  isMockMode(): boolean {
    // This port is intentionally a front-end prototype.  It must never read
    // from or write to Sheets/Drive until the integration phase is approved.
    return true;
  }

  async setApiUrl(url: string): Promise<void> {
    this.customUrl = url.trim();
    if (this.customUrl) {
      await AsyncStorage.setItem(STORAGE_KEY_API_URL, this.customUrl);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_API_URL);
    }
  }

  async setMockMode(useMock: boolean): Promise<void> {
    this.forceMock = useMock;
    await AsyncStorage.setItem(STORAGE_KEY_USE_MOCK, String(useMock));
  }
}

export const ApiConfig = new ApiConfigManager();
