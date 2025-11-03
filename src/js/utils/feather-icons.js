/**
 * Утилита для работы с Feather Icons
 * Централизованная инициализация и обновление иконок
 */

class FeatherIconsService {
    constructor() {
        this.initialized = false;
        this.logger = null;
    }

    /**
     * Установка логгера для сервиса
     * @param {Object} logger - Логгер для записи сообщений
     */
    setLogger(logger) {
        this.logger = logger;
    }


    /**
     * Безопасная инициализация Feather Icons
     * @param {string} [selector] - Селектор для конкретных иконок (опционально)
     * @returns {boolean} Успешно ли выполнено
     */
    initialize(selector = undefined) {
        try {
            // Проверяем, доступна ли библиотека feather
            if (typeof feather !== 'undefined') {
                if (selector) {
                    feather.replace({ selector });
                } else {
                    feather.replace();
                }
                this.initialized = true;
                if (this.logger) {
                    this.logger.debug('Feather Icons инициализированы', { selector: selector || 'all' });
                }
                return true;
            } else {
                // Если feather не доступен, пытаемся импортировать его
                this.initializeAsync(selector).then(success => {
                    if (success && this.logger) {
                        this.logger.debug('Feather Icons успешно загружены асинхронно', { selector: selector || 'all' });
                    } else if (this.logger) {
                        this.logger.warn('Feather Icons не доступен даже после асинхронной загрузки');
                    }
                }).catch(error => {
                    if (this.logger) {
                        this.logger.error('Ошибка при асинхронной загрузке Feather Icons', {
                            error: error.message
                        });
                    }
                });
                return false;
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('Ошибка при инициализации Feather Icons', {
                    error: error.message,
                    selector: selector || 'all'
                });
            }
            return false;
        }
    }

    /**
     * Обновление иконок (для новых элементов)
     * @param {string} [selector] - Селектор для конкретных иконок (опционально)
     * @returns {boolean} Успешно ли выполнено
     */
    update(selector = undefined) {
        try {
            if (typeof feather !== 'undefined') {
                if (selector) {
                    feather.replace({ selector });
                } else {
                    feather.replace();
                }
                if (this.logger) {
                    this.logger.debug('Feather Icons обновлены', { selector: selector || 'all' });
                }
                return true;
            } else {
                if (this.logger) {
                    this.logger.warn('Feather Icons не доступен для обновления');
                }
                return false;
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('Ошибка при обновлении Feather Icons', {
                    error: error.message,
                    selector: selector || 'all'
                });
            }
            return false;
        }
    }

    /**
     * Проверка доступности Feather Icons
     * @returns {boolean} Доступна ли библиотека
     */
    isAvailable() {
        return typeof feather !== 'undefined';
    }

    /**
     * Получение статуса инициализации
     * @returns {boolean} Инициализирована ли библиотека
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Инициализация с отложенной загрузкой (для использования с динамическим импортом)
     * @param {string} [selector] - Селектор для конкретных иконок (опционально)
     * @returns {Promise<boolean>} Успешно ли выполнено
     */
    async initializeAsync(selector = undefined) {
        if (this.isAvailable()) {
            return this.initialize(selector);
        }

        try {
            // Попытка динамически импортировать feather-icons
            const featherIcons = await import('feather-icons');
            if (featherIcons && featherIcons.default) {
                // Устанавливаем глобальную переменную для совместимости
                window.feather = featherIcons.default;
                return this.initialize(selector);
            } else {
                if (this.logger) {
                    this.logger.error('Feather Icons не удалось загрузить через динамический импорт');
                }
                return false;
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('Ошибка при асинхронной инициализации Feather Icons', {
                    error: error.message
                });
            }
            return false;
        }
    }
}

// Экземпляр сервиса для использования в приложении
export const featherIconsService = new FeatherIconsService();

// Экспорт класса для возможности создания отдельных экземпляров при необходимости
export { FeatherIconsService };
