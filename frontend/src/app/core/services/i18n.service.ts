import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly STORAGE_KEY = 'preferredLanguage';
  private readonly DEFAULT_LANGUAGE = 'ar';
  private readonly RTL_LANGUAGES = ['ar'];

  currentLanguage = signal<string>(this.DEFAULT_LANGUAGE);
  currentDirection = signal<'ltr' | 'rtl'>('rtl');

  constructor(private translateService: TranslateService) {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Get language from localStorage or use default
    const storedLanguage = localStorage.getItem(this.STORAGE_KEY);
    const language = storedLanguage || this.DEFAULT_LANGUAGE;

    // Set up translate service
    this.translateService.addLangs(['en', 'ar', 'fr']);
    this.translateService.setDefaultLang(this.DEFAULT_LANGUAGE);

    // Apply the language
    this.setLanguage(language);
  }

  setLanguage(language: string): void {
    if (!this.translateService.langs.includes(language)) {
      console.warn(`Language ${language} not supported. Falling back to ${this.DEFAULT_LANGUAGE}`);
      language = this.DEFAULT_LANGUAGE;
    }

    // Use translate service
    this.translateService.use(language).subscribe(() => {
      // Update signals
      this.currentLanguage.set(language);
      this.currentDirection.set(this.getDirection(language));

      // Store preference
      localStorage.setItem(this.STORAGE_KEY, language);

      // Update HTML dir attribute
      document.documentElement.dir = this.currentDirection();
      document.documentElement.lang = language;

      // Add/remove RTL class to body
      if (this.isRtl(language)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
    });
  }

  getCurrentLanguage(): string {
    return this.currentLanguage();
  }

  getDirection(language?: string): 'ltr' | 'rtl' {
    const lang = language || this.currentLanguage();
    return this.isRtl(lang) ? 'rtl' : 'ltr';
  }

  isRtl(language?: string): boolean {
    const lang = language || this.currentLanguage();
    return this.RTL_LANGUAGES.includes(lang);
  }

  toggleLanguage(): void {
    const newLanguage = this.currentLanguage() === 'en' ? 'ar' : 'en';
    this.setLanguage(newLanguage);
  }

  getAvailableLanguages(): string[] {
    return this.translateService.langs;
  }
}
