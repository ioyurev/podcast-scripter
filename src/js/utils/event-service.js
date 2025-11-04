/**
 * Сервис для централизованного управления событиями
 */

import { logger } from '../logger.js';

class EventService {
    constructor() {
        this.listeners = new Map(); // Хранит глобальные обработчики событий
        this.eventQueue = []; // Очередь событий
        this.isProcessingQueue = false;
        this.customEvents = new Map(); // Пользовательские события
        this.eventHistory = []; // История событий
        this.maxHistorySize = 100; // Максимальный размер истории
    }

    /**
     * Подписка на событие
     * @param {string} event - название события
     * @param {Function} callback - функция-обработчик
     * @param {Object} options - опции подписки
     * @returns {Function} Функция отписки
     */
    subscribe(event, callback, options = {}) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = {
            callback,
            options,
            id: this.generateId()
        };

        this.listeners.get(event).push(listener);

        logger.debug('Подписка на событие', {
            event,
            listenerId: listener.id,
            options
        });

        // Возвращаем функцию отписки
        return () => this.unsubscribe(event, listener.id);
    }

    /**
     * Отписка от события
     * @param {string} event - название события
     * @param {string} listenerId - ID слушателя (если не указан, отписывает все)
     * @returns {boolean} Успешно ли выполнена отписка
     */
    unsubscribe(event, listenerId = null) {
        if (!this.listeners.has(event)) {
            return false;
        }

        const listeners = this.listeners.get(event);
        if (listenerId) {
            const index = listeners.findIndex(l => l.id === listenerId);
            if (index > -1) {
                listeners.splice(index, 1);
                logger.debug('Отписка от события', {
                    event,
                    listenerId
                });
                return true;
            }
        } else {
            listeners.length = 0;
            logger.debug('Отписка от всех слушателей события', { event });
        }

        return false;
    }

    /**
     * Публикация события
     * @param {string} event - название события
     * @param {...any} args - аргументы события
     * @returns {number} Количество обработчиков, вызванных для события
     */
    publish(event, ...args) {
        const startTime = Date.now();
        let handledCount = 0;

        try {
            // Вызываем глобальных слушателей
            if (this.listeners.has(event)) {
                const listeners = [...this.listeners.get(event)]; // Создаем копию для безопасности
                for (const listener of listeners) {
                    try {
                        if (listener.options.once) {
                            this.unsubscribe(event, listener.id);
                        }
                        listener.callback(...args);
                        handledCount++;
                    } catch (error) {
                        logger.error('Ошибка в обработчике события', {
                            event,
                            listenerId: listener.id,
                            error: error.message
                        });
                    }
                }
            }

            // Вызываем пользовательские события
            if (this.customEvents.has(event)) {
                const customEvent = this.customEvents.get(event);
                customEvent(...args);
            }

            // Добавляем в историю событий
            this.addToHistory(event, args, Date.now() - startTime, handledCount);

            logger.debug('Событие опубликовано', {
                event,
                argsCount: args.length,
                handlersCalled: handledCount,
                duration: Date.now() - startTime
            });

        } catch (error) {
            logger.error('Ошибка при публикации события', {
                event,
                error: error.message
            });
        }

        return handledCount;
    }

    /**
     * Публикация события с ожиданием (async)
     * @param {string} event - название события
     * @param {...any} args - аргументы события
     * @returns {Promise<Array>} Promise, разрешающийся с результатами обработчиков
     */
    async publishAsync(event, ...args) {
        const results = [];
        const startTime = Date.now();

        try {
            if (this.listeners.has(event)) {
                const listeners = [...this.listeners.get(event)];
                for (const listener of listeners) {
                    try {
                        if (listener.options.once) {
                            this.unsubscribe(event, listener.id);
                        }
                        const result = await Promise.resolve(listener.callback(...args));
                        results.push(result);
                    } catch (error) {
                        logger.error('Ошибка в асинхронном обработчике события', {
                            event,
                            listenerId: listener.id,
                            error: error.message
                        });
                        results.push(null);
                    }
                }
            }

            // Добавляем в историю событий
            this.addToHistory(event, args, Date.now() - startTime, results.length, true);

        } catch (error) {
            logger.error('Ошибка при асинхронной публикации события', {
                event,
                error: error.message
            });
        }

        return results;
    }

    /**
     * Ожидание события
     * @param {string} event - название события
     * @param {number} timeout - таймаут в миллисекундах
     * @returns {Promise<any>} Promise, разрешающийся с аргументами события
     */
    waitForEvent(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.unsubscribe(event, listenerId);
                reject(new Error(`Таймаут ожидания события "${event}"`));
            }, timeout);

            const listenerId = this.subscribe(event, (...args) => {
                clearTimeout(timeoutId);
                resolve(args);
            });

            // Сохраняем ID таймаута для возможной очистки
            const cleanup = () => clearTimeout(timeoutId);
            this.subscribe('cleanup', cleanup, { once: true });
        });
    }

    /**
     * Подписка на событие с автоматическим удалением после одного вызова
     * @param {string} event - название события
     * @param {Function} callback - функция-обработчик
     * @returns {Function} Функция отписки
     */
    once(event, callback) {
        return this.subscribe(event, callback, { once: true });
    }

    /**
     * Создание пользовательского события
     * @param {string} eventName - название пользовательского события
     * @param {Function} handler - обработчик события
     * @returns {Function} Функция удаления события
     */
    createCustomEvent(eventName, handler) {
        if (this.customEvents.has(eventName)) {
            logger.warn('Пользовательское событие уже существует', { eventName });
        }

        this.customEvents.set(eventName, handler);
        logger.debug('Пользовательское событие создано', { eventName });

        return () => this.removeCustomEvent(eventName);
    }

    /**
     * Удаление пользовательского события
     * @param {string} eventName - название пользовательского события
     * @returns {boolean} Успешно ли удалено
     */
    removeCustomEvent(eventName) {
        const removed = this.customEvents.delete(eventName);
        if (removed) {
            logger.debug('Пользовательское событие удалено', { eventName });
        }
        return removed;
    }

    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Добавление события в историю
     * @param {string} event - название события
     * @param {Array} args - аргументы события
     * @param {number} duration - длительность обработки
     * @param {number} handlersCount - количество обработчиков
     * @param {boolean} isAsync - асинхронное ли событие
     */
    addToHistory(event, args, duration, handlersCount, isAsync = false) {
        const historyEntry = {
            event,
            args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg),
            timestamp: Date.now(),
            duration,
            handlersCount,
            isAsync
        };

        this.eventHistory.push(historyEntry);

        // Ограничиваем размер истории
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Получение истории событий
     * @param {number} limit - ограничение количества событий
     * @returns {Array} История событий
     */
    getHistory(limit = 50) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Очистка истории событий
     */
    clearHistory() {
        this.eventHistory = [];
        logger.debug('История событий очищена');
    }

    /**
     * Подсчет количества слушателей для события
     * @param {string} event - название события
     * @returns {number} Количество слушателей
     */
    getListenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }

    /**
     * Получение списка всех событий с слушателями
     * @returns {Array} Список событий
     */
    getEventList() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Очистка всех слушателей
     */
    clearAllListeners() {
        this.listeners.clear();
        this.customEvents.clear();
        logger.debug('Все слушатели событий очищены');
    }

    /**
     * Подписка на DOM событие с автоматической очисткой
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - тип DOM события
     * @param {Function} handler - обработчик события
     * @param {Object} options - опции addEventListener
     * @returns {Function} Функция отписки
     */
    subscribeToDOMEvent(element, event, handler, options = {}) {
        const wrappedHandler = (e) => {
            try {
                return handler(e);
            } catch (error) {
                logger.error('Ошибка в обработчике DOM события', {
                    event,
                    error: error.message
                });
            }
        };

        element.addEventListener(event, wrappedHandler, options);

        logger.debug('Подписка на DOM событие', {
            element: element.tagName,
            event,
            options
        });

        // Возвращаем функцию отписки
        return () => {
            element.removeEventListener(event, wrappedHandler, options);
            logger.debug('Отписка от DOM события', {
                element: element.tagName,
                event
            });
        };
    }

    /**
     * Подписка на несколько DOM событий одновременно
     * @param {HTMLElement} element - DOM элемент
     * @param {Object} events - объект с событиями и обработчиками { 'click': handler1, 'focus': handler2 }
     * @param {Object} options - опции addEventListener
     * @returns {Array} Массив функций отписки
     */
    subscribeToMultipleDOMEvents(element, events, options = {}) {
        const unsubscribes = [];
        for (const [event, handler] of Object.entries(events)) {
            const unsubscribe = this.subscribeToDOMEvent(element, event, handler, options);
            unsubscribes.push(unsubscribe);
        }
        return unsubscribes;
    }

    /**
     * Ожидание DOM события
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - тип DOM события
     * @param {number} timeout - таймаут в миллисекундах
     * @returns {Promise<Event>} Promise, разрешающийся с DOM событием
     */
    waitForDOMEvent(element, event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                element.removeEventListener(event, handler);
                reject(new Error(`Таймаут ожидания DOM события "${event}"`));
            }, timeout);

            const handler = (e) => {
                clearTimeout(timeoutId);
                element.removeEventListener(event, handler);
                resolve(e);
            };

            element.addEventListener(event, handler);
        });
    }

    /**
     * Создание промисифицированного DOM события
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - тип DOM события
     * @returns {Promise<Event>} Promise, разрешающийся с DOM событием
     */
    promisifyDOMEvent(element, event) {
        return new Promise((resolve) => {
            const handler = (e) => {
                element.removeEventListener(event, handler);
                resolve(e);
            };
            element.addEventListener(event, handler);
        });
    }

    /**
     * Подписка на события клавиатуры
     * @param {Object} shortcuts - объект с комбинациями клавиш и обработчиками
     * @returns {Array} Массив функций отписки
     */
    subscribeToKeyboardShortcuts(shortcuts) {
        const unsubscribes = [];

        const handleKeydown = (e) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey;
            const shift = e.shiftKey;
            const alt = e.altKey;

            // Проверяем все комбинации
            for (const [shortcut, handler] of Object.entries(shortcuts)) {
                const parts = shortcut.toLowerCase().split('+').map(part => part.trim());
                let matches = true;

                // Проверяем Ctrl
                if (parts.includes('ctrl') !== ctrl) matches = false;
                // Проверяем Shift
                if (parts.includes('shift') !== shift) matches = false;
                // Проверяем Alt
                if (parts.includes('alt') !== alt) matches = false;

                // Проверяем клавишу
                const keyPart = parts.find(part => !['ctrl', 'shift', 'alt'].includes(part));
                if (keyPart && keyPart !== key.toLowerCase()) matches = false;

                if (matches) {
                    e.preventDefault();
                    try {
                        handler(e);
                    } catch (error) {
                        logger.error('Ошибка в обработчике горячей клавиши', {
                            shortcut,
                            error: error.message
                        });
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeydown);
        unsubscribes.push(() => document.removeEventListener('keydown', handleKeydown));

        return unsubscribes;
    }

    /**
     * Подписка на изменение размера окна с debounce
     * @param {Function} handler - обработчик события resize
     * @param {number} delay - задержка в миллисекундах
     * @returns {Function} Функция отписки
     */
    subscribeToResize(handler, delay = 250) {
        let timeoutId;
        const debouncedHandler = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                try {
                    handler();
                } catch (error) {
                    logger.error('Ошибка в обработчике resize', {
                        error: error.message
                    });
                }
            }, delay);
        };

        window.addEventListener('resize', debouncedHandler);
        return () => {
            window.removeEventListener('resize', debouncedHandler);
            clearTimeout(timeoutId);
        };
    }

    /**
     * Подписка на прокрутку с throttle
     * @param {Function} handler - обработчик события scroll
     * @returns {Function} Функция отписки
     */
    subscribeToScroll(handler) {
        let ticking = false;
        const throttledHandler = (e) => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    try {
                        handler(e);
                    } catch (error) {
                        logger.error('Ошибка в обработчике scroll', {
                            error: error.message
                        });
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', throttledHandler);
        return () => window.removeEventListener('scroll', throttledHandler);
    }

    /**
     * Получение состояния сервиса событий
     * @returns {Object} Состояние сервиса
     */
    getState() {
        return {
            listenerCount: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            customEventCount: this.customEvents.size,
            historySize: this.eventHistory.length,
            events: Array.from(this.listeners.keys()),
            maxHistorySize: this.maxHistorySize
        };
    }

    /**
     * Очистка сервиса событий
     */
    destroy() {
        this.clearAllListeners();
        this.clearHistory();
        this.eventQueue = [];
        this.isProcessingQueue = false;
        logger.debug('Сервис событий уничтожен');
    }
}

// Создаем глобальный экземпляр EventService
const eventService = new EventService();

export { EventService, eventService };
