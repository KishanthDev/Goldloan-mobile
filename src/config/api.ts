import AsyncStorage from '@react-native-async-storage/async-storage';
import { Env } from './env';

/**
 * Global API & Backend Configuration Manager
 * 
 * Precedence order for API URL:
 * 1. Custom URL set at runtime via Settings screen (saved in AsyncStorage)
 * 2. Environment variable in .env (EXPO_PUBLIC_GAS_API_URL)
 * 3. Default fallback URL in src/config/env.ts
 */

const STORAGE_KEY_API_URL = '@goldloan_custom_gas_url';
const STORAGE_KEY_USE_MOCK = '@goldloan_use_mock';

export const DEFAULT_GAS_WEB_APP_URL = Env.GAS_API_URL;
export const SPREADSHEET_ID = Env.SPREADSHEET_ID;

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
    if (Env.FORCE_MOCK_MODE) {
      return true;
    }
    if (this.forceMock !== null) {
      return this.forceMock;
    }
    return !this.isConfigured();
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
