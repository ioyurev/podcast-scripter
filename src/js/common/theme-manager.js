import { logger } from '../logger.js';
import { eventService } from '../utils/event-service.js';

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadThemePreference();
        this.storageKey = 'themePreference';
        this.themeChangeCallbacks = [];
    }

    /**
     * Загрузка предпочтений темы из localStorage
     */
    loadThemePreference() {
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme) {
            return savedTheme;
        } else {
            // Если нет сохраненной темы, используем системную предпочтительную тему
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return systemPrefersDark ? 'dark' : 'light';
        }
    }

    /**
     * Применение темы
     * @param {string} theme - 'light', 'dark' или 'auto'
     */
    applyTheme(theme) {
        const html = document.documentElement;
        html.removeAttribute('data-theme'); // Удаляем предыдущую тему
        
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            html.removeAttribute('data-theme'); // Используем светлую тему по умолчанию
        } else if (theme === 'auto') {
            // Автоматически определяем по системным настройкам
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
                html.setAttribute('data-theme', 'dark');
            }
        }
        
        this.currentTheme = theme;
    }

    /**
     * Переключение темы
     */
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'light';
        let newTheme;
        
        if (currentTheme === 'light') {
            newTheme = 'dark';
        } else if (currentTheme === 'dark') {
            newTheme = 'light';
        } else {
            newTheme = 'dark';
        }
        
        this.applyTheme(newTheme);
        this.saveThemePreference(newTheme);
        this.notifyThemeChange(newTheme);
        
        logger.logUserAction('переключение темы', {
            theme: newTheme
        });
        
        return newTheme;
    }

    /**
     * Сохранение предпочтений темы
     * @param {string} theme - тема для сохранения
     */
    saveThemePreference(theme) {
        localStorage.setItem(this.storageKey, theme);
    }

    /**
     * Получение текущей темы
     * @returns {string} текущая тема
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Обновление иконки кнопки темы
     * @param {HTMLElement} themeBtn - кнопка темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(themeBtn, theme) {
        const themeIcon = themeBtn.querySelector('.theme-icon');
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.textContent = '☀️'; // Солнце для темной темы
                themeBtn.title = 'Светлая тема';
            } else {
                themeIcon.textContent = '🌙'; // Луна для светлой темы
                themeBtn.title = 'Темная тема';
            }
        }
    }

    /**
     * Настройка кнопки темы
     * @param {HTMLElement} themeBtn - кнопка темы
     * @param {Function} customHandler - кастомный обработчик
     */
    setupThemeButton(themeBtn, customHandler = null) {
        const initialTheme = this.loadThemePreference();
        this.applyTheme(initialTheme);
        this.updateThemeButtonIcon(themeBtn, initialTheme);

        themeBtn.addEventListener('click', () => {
            const newTheme = customHandler ? customHandler() : this.toggleTheme();
            if (!customHandler) {
                this.updateThemeButtonIcon(themeBtn, newTheme);
            }
        });
    }

    /**
     * Подписка на изменения темы
     * @param {Function} callback - функция обратного вызова
     * @returns {Function} функция отписки
     */
    subscribeToThemeChange(callback) {
        this.themeChangeCallbacks.push(callback);
        return () => {
            const index = this.themeChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.themeChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Уведомление о смене темы
     * @param {string} theme - новая тема
     */
    notifyThemeChange(theme) {
        this.themeChangeCallbacks.forEach(callback => {
            try {
                callback(theme);
            } catch (error) {
                logger.error('Ошибка в обработчике смены темы', {
                    error: error.message
                });
            }
        });
        
        // Также отправляем событие через eventService
        eventService.publish('theme:change', theme);
    }
}

// Экспорт singleton экземпляра для глобального использования
export const themeManager = new ThemeManager();
export { ThemeManager };
