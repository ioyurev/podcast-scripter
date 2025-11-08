import { logger } from '../logger.js';
import { domService } from '../utils/dom-utils.js';
import { eventService } from '../utils/event-service.js';

import { themeManager } from './theme-manager.js';

class BaseUIComponent {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Set();
        this.components = new Map();
        this.themeUnsubscribe = null;
    }

    /**
     * Инициализация базового компонента
     */
    initialize() {
        this.setupThemeHandling();
        logger.info('Базовый UI компонент инициализирован');
    }

    /**
     * Настройка обработки темы
     */
    setupThemeHandling() {
        // Подписываемся на изменения темы
        this.themeUnsubscribe = themeManager.subscribeToThemeChange((theme) => {
            this.updateTheme(theme);
        });
    }

    /**
     * Загрузка предпочтений темы
     */
    loadThemePreference() {
        return themeManager.loadThemePreference();
    }

    /**
     * Применение темы
     * @param {string} theme - тема для применения
     */
    applyTheme(theme) {
        themeManager.applyTheme(theme);
    }

    /**
     * Обновление темы
     * @param {string} theme - новая тема
     */
    updateTheme() {
        // Может быть переопределен в дочерних классах
    }

    /**
     * Настройка кнопки темы
     * @param {string} buttonId - ID кнопки темы
     * @param {Function} customHandler - кастомный обработчик
     */
    setupThemeButton(buttonId, customHandler = null) {
        const themeBtn = domService.getElement(buttonId);
        if (themeBtn && themeBtn.exists()) {
            themeManager.setupThemeButton(themeBtn.getElement(), customHandler);
        } else {
            logger.error('Кнопка темы не найдена', { buttonId });
        }
    }

    /**
     * Обновление иконки кнопки темы
     * @param {string} buttonId - ID кнопки темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(buttonId, theme) {
        const themeBtn = domService.getElement(buttonId);
        if (themeBtn && themeBtn.exists()) {
            themeManager.updateThemeButtonIcon(themeBtn.getElement(), theme);
        }
    }

    /**
     * Регистрация элемента
     * @param {string} key - ключ элемента
     * @param {HTMLElement} element - DOM элемент
     */
    registerElement(key, element) {
        this.elements.set(key, element);
    }

    /**
     * Получение элемента по ключу
     * @param {string} key - ключ элемента
     * @returns {HTMLElement} DOM элемент
     */
    getElement(key) {
        return this.elements.get(key);
    }

    /**
     * Подписка на DOM событие
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - тип события
     * @param {Function} handler - обработчик
     * @returns {Function} функция отписки
     */
    subscribeToDOMEvent(element, event, handler) {
        const unsubscribe = eventService.subscribeToDOMEvent(element, event, handler);
        this.eventListeners.add(unsubscribe);
        return unsubscribe;
    }

    /**
     * Очистка компонента
     */
    cleanup() {
        // Отписываемся от событий
        for (const unsubscribe of this.eventListeners) {
            unsubscribe();
        }
        this.eventListeners.clear();

        // Очищаем компоненты
        for (const [, component] of this.components) {
            if (component.destroy) {
                component.destroy();
            }
        }
        this.components.clear();

        // Отписываемся от темы
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
        }

        // Очищаем элементы
        this.elements.clear();

        logger.info('Базовый UI компонент очищен');
    }

    /**
     * Безопасное выполнение DOM операций
     * @param {Function} operation - функция для выполнения
     * @param {*} defaultValue - значение по умолчанию
     * @returns {*} результат операции
     */
    safeDOMExecute(operation, defaultValue = null) {
        return domService.safeExecute(operation, defaultValue);
    }

    /**
     * Подписка на событие
     * @param {string} event - название события
     * @param {Function} callback - обработчик
     * @returns {Function} функция отписки
     */
    subscribeToEvent(event, callback) {
        return eventService.subscribe(event, callback);
    }

    /**
     * Публикация события
     * @param {string} event - название события
     * @param {...any} args - аргументы
     */
    publishEvent(event, ...args) {
        return eventService.publish(event, ...args);
    }
}

export { BaseUIComponent };
