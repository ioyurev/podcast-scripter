import feather from 'feather-icons';

// Импорты всех необходимых классов
import { logger } from './logger.js';
import { Speaker, SoundEffect} from './models/role.js';
import { DataManager } from './services/data-manager.js';
import { FileHandler } from './services/file-handler.js';
import { UIComponents } from './ui/components.js';

/**
 * Основная логика приложения
 */
class PodcastScripterApp {
    constructor() {
        this.dataManager = null;
        this.fileHandler = null;
        this.uiComponents = null;
        this.featherInitialized = false;
        
        logger.info('Инициализация приложения создания скрипта подкаста');
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        try {
            // Создание менеджера данных
            this.dataManager = new DataManager();
            logger.info('Менеджер данных создан');

            // Создание обработчика файлов
            this.fileHandler = new FileHandler(this.dataManager);
            logger.info('Обработчик файлов создан');

            // Создание компонентов UI
            this.uiComponents = new UIComponents(this.dataManager, this.fileHandler);
            logger.info('Компоненты UI созданы');

            // Инициализация компонентов
            this.uiComponents.initialize();
            logger.info('Приложение инициализировано успешно');

            // Загрузка сохраненных данных из localStorage (если есть)
            this.loadSavedData();
            
        } catch (error) {
            logger.error('Ошибка при инициализации приложения', {
                error: error.message,
                stack: error.stack
            });
            alert('Произошла ошибка при инициализации приложения. Пожалуйста, перезагрузите страницу.');
        }
    }

    /**
     * Загрузка сохраненных данных из localStorage
     */
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('podcastScriptData');
            if (savedData) {
                const data = JSON.parse(savedData);
                if (this.fileHandler.validateScriptData(data)) {
                    this.dataManager.importData(data);
                    this.uiComponents.updateRolesList();
                    this.uiComponents.updateReplicasList();
                    logger.info('Сохраненные данные загружены из localStorage');
                } else {
                    logger.warn('Невалидные данные в localStorage, очистка');
                    localStorage.removeItem('podcastScriptData');
                }
            }
        } catch (error) {
            logger.error('Ошибка при загрузке сохраненных данных', {
                error: error.message
            });
            localStorage.removeItem('podcastScriptData');
        }
    }

    /**
     * Сохранение данных в localStorage
     */
    saveDataToStorage() {
        try {
            const data = this.dataManager.exportData();
            localStorage.setItem('podcastScriptData', JSON.stringify(data));
            logger.debug('Данные сохранены в localStorage');
        } catch (error) {
            logger.error('Ошибка при сохранении данных в localStorage', {
                error: error.message
            });
        }
    }

    /**
     * Очистка сохраненных данных
     */
    clearSavedData() {
        try {
            localStorage.removeItem('podcastScriptData');
            logger.info('Сохраненные данные очищены');
        } catch (error) {
            logger.error('Ошибка при очистке сохраненных данных', {
                error: error.message
            });
        }
    }

    /**
     * Получение текущего состояния приложения
     * @returns {Object} Состояние приложения
     */
    getState() {
        return {
            statistics: this.dataManager.getStatistics(),
            roles: this.dataManager.roleManager.getAll().map(role => ({
                id: role.id,
                name: role.name,
                type: role.type,
                ...(role instanceof Speaker && { wordsPerMinute: role.wordsPerMinute }),
                ...(role instanceof SoundEffect && { duration: role.duration })
            })),
            replicas: this.dataManager.replicaManager.getAll().map(replica => ({
                id: replica.id,
                text: replica.text,
                roleId: replica.roleId,
                wordCount: replica.wordCount
            }))
        };
    }

    /**
     * Экспорт текущего состояния в JSON
     * @returns {string} JSON строка состояния
     */
    exportState() {
        const state = this.getState();
        return JSON.stringify(state, null, 2);
    }

    /**
     * Импорт состояния из JSON
     * @param {string} jsonString - JSON строка состояния
     * @returns {boolean} Успешно ли импортировано
     */
    importState(jsonString) {
        try {
            const state = JSON.parse(jsonString);
            const data = {
                roles: state.roles || [],
                replicas: state.replicas || [],
                version: '1.0'
            };
            
            const success = this.dataManager.importData(data);
            if (success) {
                this.uiComponents.updateRolesList();
                this.uiComponents.updateReplicasList();
                logger.info('Состояние импортировано успешно');
            }
            return success;
        } catch (error) {
            logger.error('Ошибка при импорте состояния', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Инициализация Feather Icons
     */
    initFeatherIcons() {
        if (!this.featherInitialized) {
            feather.replace();
            this.featherInitialized = true;
            logger.info('Feather Icons инициализированы');
        }
    }

    /**
     * Обновление Feather Icons
     */
    updateFeatherIcons() {
        feather.replace();
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, инициализация приложения');
    window.app = new PodcastScripterApp();
    
    // Настройка автосохранения
    setInterval(() => {
        if (window.app && window.app.saveDataToStorage) {
            window.app.saveDataToStorage();
        }
    }, 30000); // Автосохранение каждые 30 секунд
    
    logger.info('Автосохранение настроено');
});

// Обработка перед закрытием страницы
window.addEventListener('beforeunload', () => {
    if (window.app && window.app.saveDataToStorage) {
        window.app.saveDataToStorage();
        logger.info('Данные сохранены перед закрытием страницы');
    }
});

logger.info('Скрипт приложения загружен');

// Экспорт для использования в модулях
window.PodcastScripterApp = PodcastScripterApp;
