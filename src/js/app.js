// Импорты всех необходимых классов
import { DataService } from './core/data-service.js';
import { logger } from './logger.js';
import { Speaker, SoundEffect} from './models/role.js';
import { DataManager } from './services/data-manager.js';
import { UIComponents } from './ui/components.js';
import { featherIconsService } from './utils/feather-icons.js';

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

            // Создание сервиса данных
            this.dataService = new DataService();
            logger.info('Сервис данных создан');

            // Инициализация Feather Icons
            this.initFeatherIcons();

            // Создание компонентов UI
            this.uiComponents = new UIComponents(this.dataManager, this.dataService);
            logger.info('Компоненты UI созданы');

            // Инициализация компонентов
            this.uiComponents.initialize();
            logger.info('Приложение инициализировано успешно');

            // Загрузка сохраненных данных из localStorage (если есть)
            this.loadSavedData();
            
        } catch (error) {
            logger.time('app-initialization-error');
            logger.error('Ошибка при инициализации приложения', {
                error: error.message
            });
            logger.timeEnd('app-initialization-error');
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
                if (this.dataService.validateScriptData(data)) {
                    // Проверяем размер данных чтобы избежать проблем с производительностью
                    const roleCount = data.roles?.length || 0;
                    const replicaCount = data.replicas?.length || 0;
                    const totalItems = roleCount + replicaCount;
                    
                    // Устанавливаем разумный лимит для предотвращения чрезмерной нагрузки
                    const MAX_ITEMS = 10000; // Максимум 10,000 элементов
                    
                    if (totalItems > MAX_ITEMS) {
                        logger.warn('Слишком большой объем данных в localStorage, загрузка отменена', {
                            roleCount: roleCount,
                            replicaCount: replicaCount,
                            totalItems: totalItems,
                            maxItems: MAX_ITEMS
                        });
                        
                        // Предлагаем пользователю очистить данные
                        if (confirm(`Обнаружен очень большой объем данных (${totalItems} элементов). Это может вызвать проблемы с производительностью. Очистить localStorage и начать с пустого скрипта?`)) {
                            localStorage.removeItem('podcastScriptData');
                            logger.info('localStorage очищен пользователем из-за большого объема данных');
                        }
                        return; // Не загружаем данные если их слишком много
                    }
                    
                    if (totalItems > 10) { // Если больше 10 элементов, показываем что грузим
                        logger.group('Загрузка сохраненных данных');
                        logger.info('Начало загрузки большого объема данных', {
                            roleCount: roleCount,
                            replicaCount: replicaCount
                        });
                    }

                    // Convert data if needed and import into DataManager
                    const importData = this.dataService.convertForDataManagerImport(data);
                    this.dataManager.importData(importData);
                    
                    // Обновляем UI в одном вызове для оптимизации
                    this.uiComponents.updateAllLists();
                    
                    if (totalItems > 10) {
                        logger.info('Сохраненные данные загружены из localStorage', {
                            roleCount: roleCount,
                            replicaCount: replicaCount
                        });
                        logger.groupEnd();
                    } else {
                        logger.info('Сохраненные данные загружены из localStorage', {
                            roleCount: roleCount,
                            replicaCount: replicaCount
                        });
                    }
                } else {
                    logger.warn('Невалидные данные в localStorage, очистка');
                    localStorage.removeItem('podcastScriptData');
                }
            }
        } catch (error) {
            logger.error('Ошибка при загрузке сохраненных данных', {
                error: error.message
            });
        }
    }

    /**
     * Сохранение данных в localStorage
     */
    saveDataToStorage() {
        try {
            const data = this.dataManager.exportData();
            // Validate the data before saving
            if (this.dataService.validateScriptData(data)) {
                const success = this.dataService.saveToStorage(data, 'podcastScriptData');
                if (success) {
                    logger.debug('Данные сохранены в localStorage');
                } else {
                    logger.error('Ошибка при сохранении данных в localStorage');
                }
            } else {
                logger.error('Невалидные данные для сохранения в localStorage', {
                    roleCount: data.roles?.length || 0,
                    replicaCount: data.replicas?.length || 0
                });
            }
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
     * Открытие режима просмотра
     * Сохраняет текущие данные в localStorage и открывает viewer.html в новой вкладке
     * @returns {boolean} Успешно ли открыто
     */
    openViewerMode() {
        try {
            // Экспортируем текущее состояние
            const state = this.getState();
            const data = {
                roles: state.roles || [],
                replicas: state.replicas || [],
                version: '1.0',
                exportDate: new Date().toISOString()
            };

            // Сохраняем в localStorage для передачи в режим просмотра
            const storageKey = 'podcastScriptViewerData';
            localStorage.setItem(storageKey, JSON.stringify(data));

            // Переходим в режим просмотра в той же вкладке
            const viewerUrl = 'viewer.html';
            window.location.href = viewerUrl;

            logger.info('Режим просмотра открыт', {
                rolesCount: data.roles.length,
                replicasCount: data.replicas.length
            });
            return true;
        } catch (error) {
            logger.error('Ошибка при открытии режима просмотра', {
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
            featherIconsService.setLogger(logger);
            const success = featherIconsService.initialize();
            this.featherInitialized = success;
            if (success) {
                logger.info('Feather Icons инициализированы');
            }
        }
    }

    /**
     * Обновление Feather Icons
     */
    updateFeatherIcons() {
        featherIconsService.update();
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

// Обработка события pageshow для перезагрузки данных при возврате со страницы кэша
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Страница загружена из кэша браузера
        if (window.app && window.app.loadSavedData) {
            window.app.loadSavedData();
            logger.info('Данные перезагружены из кэша');
        }
    }
});

logger.info('Скрипт приложения загружен');

// Экспорт для использования в модулях
window.PodcastScripterApp = PodcastScripterApp;
