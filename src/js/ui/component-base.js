/**
 * Базовый класс для UI компонентов
 * Наследуется от BaseDOMElement и добавляет функциональность компонентов
 */

import { logger } from '../logger.js';
import { BaseDOMElement } from '../utils/dom-utils.js';

class ComponentBase extends BaseDOMElement {
    constructor(elementId = null, element = null, options = {}) {
        super(elementId, element);
        this.isInitialized = false;
        this.isDestroyed = false;
        this.isDynamicComponent = options.isDynamic || false;
        this.lifecycleCallbacks = {
            init: [],
            update: [],
            destroy: []
        };
        this.subComponents = new Map(); // Подкомпоненты
        this.timers = new Set(); // Таймеры для очистки
        this.intervals = new Set(); // Интервалы для очистки
        this.rafCallbacks = new Set(); // Callbacks анимационного кадра для очистки
    }

    /**
     * Добавление callback'а для жизненного цикла
     * @param {string} phase - фаза жизненного цикла (init, update, destroy)
     * @param {Function} callback - функция для вызова
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    addLifecycleCallback(phase, callback) {
        if (this.lifecycleCallbacks[phase]) {
            this.lifecycleCallbacks[phase].push(callback);
        }
        return this;
    }

    /**
     * Вызов callback'ов для фазы жизненного цикла
     * @param {string} phase - фаза жизненного цикла
     * @param {...any} args - аргументы для передачи в callback'и
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    callLifecycleCallbacks(phase, ...args) {
        if (this.lifecycleCallbacks[phase]) {
            for (const callback of this.lifecycleCallbacks[phase]) {
                try {
                    callback(...args);
                } catch (error) {
                    logger.error(`Ошибка в callback'е фазы ${phase}`, {
                        error: error.message,
                        component: this.constructor.name
                    });
                }
            }
        }
        return this;
    }

    /**
     * Инициализация компонента
     * @returns {Promise<boolean>} Успешно ли инициализирован компонент
     */
    async initialize() {
        if (this.isDestroyed) {
            logger.error('Попытка инициализировать уничтоженный компонент', {
                component: this.constructor.name
            });
            return false;
        }

        if (this.isInitialized) {
            logger.warn('Компонент уже инициализирован', {
                component: this.constructor.name
            });
            return true;
        }

        try {
            if (this.isDynamicComponent) {
                // Для динамических компонентов сначала вызываем onInitialize, затем проверяем exists()
                await this.onInitialize();
                
                // Проверяем существование элемента после инициализации
                if (!this.exists()) {
                    logger.error('Элемент динамического компонента не найден после инициализации', {
                        elementId: this.elementId,
                        component: this.constructor.name
                    });
                    return false;
                }
            } else {
                // Для обычных компонентов проверяем существование элемента перед onInitialize
                if (!this.exists()) {
                    logger.error('Элемент компонента не найден', {
                        elementId: this.elementId,
                        component: this.constructor.name
                    });
                    return false;
                }

                // Вызываем пользовательскую инициализацию
                await this.onInitialize();
            }

            // Вызываем callback'и инициализации
            this.callLifecycleCallbacks('init');

            this.isInitialized = true;
            logger.debug('Компонент инициализирован', {
                component: this.constructor.name,
                elementId: this.elementId
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при инициализации компонента', {
                component: this.constructor.name,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Обновление компонента
     * @param {Object} data - данные для обновления
     * @returns {Promise<boolean>} Успешно ли обновлен компонент
     */
    async update(data = {}) {
        if (!this.isInitialized || this.isDestroyed) {
            logger.warn('Попытка обновить неинициализированный или уничтоженный компонент', {
                component: this.constructor.name
            });
            return false;
        }

        try {
            // Вызываем пользовательское обновление
            await this.onUpdate(data);

            // Вызываем callback'и обновления
            this.callLifecycleCallbacks('update', data);

            logger.debug('Компонент обновлен', {
                component: this.constructor.name,
                elementId: this.elementId
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при обновлении компонента', {
                component: this.constructor.name,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Уничтожение компонента
     * @returns {boolean} Успешно ли уничтожен компонент
     */
    destroy() {
        if (this.isDestroyed) {
            return true;
        }

        try {
            // Вызываем пользовательское уничтожение
            this.onDestroy();

            // Вызываем callback'и уничтожения
            this.callLifecycleCallbacks('destroy');

            // Уничтожаем подкомпоненты
            for (const [, component] of this.subComponents) {
                component.destroy();
            }
            this.subComponents.clear();

            // Очищаем таймеры
            this.clearAllTimers();

            // Очищаем обработчики событий
            this.removeAllEventListeners();

            // Очищаем наблюдателей
            this.observers.clear();

            // Очищаем дочерние элементы
            this.children.clear();

            this.isDestroyed = true;
            this.isInitialized = false;

            logger.debug('Компонент уничтожен', {
                component: this.constructor.name,
                elementId: this.elementId
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при уничтожении компонента', {
                component: this.constructor.name,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Пользовательская логика инициализации (переопределяется в наследниках)
     * @returns {Promise<void>}
     */
    async onInitialize() {
        // Переопределяется в наследниках
    }

    /**
     * Пользовательская логика обновления (переопределяется в наследниках)
     * @param {Object} data - данные для обновления
     * @returns {Promise<void>}
     */
    async onUpdate() {
        // Переопределяется в наследниках
    }

    /**
     * Пользовательская логика уничтожения (переопределяется в наследниках)
     * @returns {void}
     */
    onDestroy() {
        // Переопределяется в наследниках
    }

    /**
     * Добавление подкомпонента
     * @param {string} key - ключ для подкомпонента
     * @param {ComponentBase} component - подкомпонент
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    addSubComponent(key, component) {
        if (this.subComponents.has(key)) {
            this.subComponents.get(key).destroy();
        }
        this.subComponents.set(key, component);
        return this;
    }

    /**
     * Получение подкомпонента
     * @param {string} key - ключ подкомпонента
     * @returns {ComponentBase|null} Подкомпонент или null
     */
    getSubComponent(key) {
        return this.subComponents.get(key) || null;
    }

    /**
     * Удаление подкомпонента
     * @param {string} key - ключ подкомпонента
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    removeSubComponent(key) {
        const component = this.subComponents.get(key);
        if (component) {
            component.destroy();
            this.subComponents.delete(key);
        }
        return this;
    }

    /**
     * Создание и добавление подкомпонента
     * @param {string} key - ключ для подкомпонента
     * @param {Function} ComponentClass - класс подкомпонента
     * @param {...any} args - аргументы для конструктора подкомпонента
     * @returns {ComponentBase} Созданный подкомпонент
     */
    async createSubComponent(key, ComponentClass, ...args) {
        try {
            const component = new ComponentClass(...args);
            await component.initialize();
            this.addSubComponent(key, component);
            return component;
        } catch (error) {
            logger.error('Ошибка при создании подкомпонента', {
                key,
                component: ComponentClass.name,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Установка состояния компонента
     * @param {string} key - ключ состояния
     * @param {*} value - значение состояния
     * @param {boolean} notify - уведомлять ли наблюдателей
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    setState(key, value, notify = true) {
        const oldValue = this.state[key];
        super.setState(key, value, notify);
        
        // Вызываем callback изменения состояния
        if (notify && oldValue !== value) {
            this.onStateChange(key, value, oldValue);
        }
        return this;
    }

    /**
     * Пользовательская логика изменения состояния (переопределяется в наследниках)
     * @param {string} key - ключ состояния
     * @param {*} newValue - новое значение
     * @param {*} oldValue - старое значение
     * @returns {void}
     */
    onStateChange() {
        // Переопределяется в наследниках
    }

    /**
     * Добавление таймера для автоматической очистки
     * @param {number} timerId - ID таймера
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    addTimer(timerId) {
        this.timers.add(timerId);
        return this;
    }

    /**
     * Добавление интервала для автоматической очистки
     * @param {number} intervalId - ID интервала
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    addInterval(intervalId) {
        this.intervals.add(intervalId);
        return this;
    }

    /**
     * Добавление callback'а анимационного кадра для автоматической очистки
     * @param {number} rafId - ID callback'а анимационного кадра
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    addRAFCallback(rafId) {
        this.rafCallbacks.add(rafId);
        return this;
    }

    /**
     * Очистка всех таймеров
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    clearAllTimers() {
        for (const timerId of this.timers) {
            clearTimeout(timerId);
        }
        this.timers.clear();

        for (const intervalId of this.intervals) {
            clearInterval(intervalId);
        }
        this.intervals.clear();

        for (const rafId of this.rafCallbacks) {
            cancelAnimationFrame(rafId);
        }
        this.rafCallbacks.clear();

        return this;
    }

    /**
     * Проверка инициализации компонента
     * @returns {boolean} Инициализирован ли компонент
     */
    isComponentInitialized() {
        return this.isInitialized;
    }

    /**
     * Проверка уничтожения компонента
     * @returns {boolean} Уничтожен ли компонент
     */
    isComponentDestroyed() {
        return this.isDestroyed;
    }

    /**
     * Асинхронное ожидание инициализации
     * @param {number} timeout - таймаут в миллисекундах
     * @returns {Promise<boolean>} Успешно ли инициализирован
     */
    async waitForInitialization(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (this.isInitialized) {
                    resolve(true);
                } else if (this.isDestroyed) {
                    reject(new Error('Компонент был уничтожен'));
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Таймаут ожидания инициализации'));
                } else {
                    setTimeout(check, 10);
                }
            };
            check();
        });
    }

    /**
     * Создание элемента с автоматическим добавлением в дочерние
     * @param {string} tagName - тег элемента
     * @param {Object} attributes - атрибуты элемента
     * @param {string} key - ключ для кэширования
     * @returns {BaseDOMElement} Созданный элемент
     */
    createElement(tagName, attributes = {}, key = null) {
        const element = document.createElement(tagName);
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, value);
        }

        const baseElement = new BaseDOMElement(null, element);
        if (key) {
            this.setChild(key, baseElement);
        }

        return baseElement;
    }

    /**
     * Создание элемента с автоматическим добавлением в DOM
     * @param {string} tagName - тег элемента
     * @param {Object} attributes - атрибуты элемента
     * @param {string} key - ключ для кэширования
     * @param {HTMLElement} parent - родительский элемент
     * @returns {BaseDOMElement} Созданный элемент
     */
    createAndAppendElement(tagName, attributes = {}, key = null, parent = null) {
        const element = this.createElement(tagName, attributes, key);
        const parentElement = parent || this.getElement();
        if (parentElement) {
            parentElement.appendChild(element.getElement());
        }
        return element;
    }

    /**
     * Проверка готовности компонента к работе
     * @returns {boolean} Готов ли компонент
     */
    isReady() {
        return this.isInitialized && !this.isDestroyed && this.exists();
    }

    /**
     * Безопасное выполнение операций с компонентом
     * @param {Function} operation - функция для выполнения
     * @param {*} defaultValue - значение по умолчанию
     * @returns {*} Результат операции или defaultValue
     */
    safeComponentExecute(operation, defaultValue = null) {
        if (!this.isReady()) {
            logger.warn('Компонент не готов для выполнения операции', {
                component: this.constructor.name,
                elementId: this.elementId
            });
            return defaultValue;
        }

        try {
            return operation(this);
        } catch (error) {
            logger.error('Ошибка при выполнении операции с компонентом', {
                component: this.constructor.name,
                error: error.message
            });
            return defaultValue;
        }
    }

    /**
     * Получение состояния готовности компонента
     * @returns {Object} Объект состояния
     */
    getComponentState() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            isReady: this.isReady(),
            elementExists: this.exists(),
            elementId: this.elementId,
            childCount: this.children.size,
            subComponentCount: this.subComponents.size,
            eventListenerCount: this.eventListeners.size
        };
    }

    /**
     * Обновление элемента компонента
     * @param {string} elementId - новый ID элемента
     * @param {HTMLElement} element - новый элемент
     * @returns {ComponentBase} Текущий экземпляр для цепочки вызовов
     */
    updateElement(elementId = null, element = null) {
        if (this.isInitialized && !this.isDestroyed) {
            logger.warn('Попытка обновить элемент инициализированного компонента', {
                component: this.constructor.name
            });
        }

        this.elementId = elementId || this.elementId;
        this.element = element || this.element;
        return this;
    }
}

export { ComponentBase };
