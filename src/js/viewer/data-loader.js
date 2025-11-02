import { logger } from '../logger.js';
import { ScriptData } from '../models/script-data.js';

/**
 * Загрузчик данных для режима просмотра
 */
class DataLoader {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.logger = logger;
    }

    /**
     * Загрузка данных из localStorage
     * @returns {Promise<ScriptData|null>} Данные скрипта или null
     */
    async loadFromStorage() {
        try {
            const data = this.storageManager.load();
            if (data) {
                const scriptData = new ScriptData(data);
                if (scriptData.validate()) {
                    this.logger.info('Данные загружены из localStorage', {
                        roleCount: scriptData.roles.length,
                        replicaCount: scriptData.replicas.length
                    });
                    return scriptData;
                } else {
                    this.logger.error('Невалидные данные в localStorage');
                    return null;
                }
            }
            return null;
        } catch (error) {
            this.logger.error('Ошибка при загрузке из localStorage', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Загрузка данных из JSON файла
     * @param {File} file - JSON файл
     * @returns {Promise<ScriptData|null>} Данные скрипта или null
     */
    async loadFromJSONFile(file) {
        return new Promise((resolve) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        const scriptData = new ScriptData(data);
                        
                        if (scriptData.validate()) {
                            this.logger.info('Данные загружены из JSON файла', {
                                fileName: file.name,
                                fileSize: file.size,
                                roleCount: scriptData.roles.length,
                                replicaCount: scriptData.replicas.length
                            });
                            resolve(scriptData);
                        } else {
                            this.logger.error('Невалидные данные в JSON файле', {
                                fileName: file.name
                            });
                            resolve(null);
                        }
                    } catch (parseError) {
                        this.logger.error('Ошибка парсинга JSON файла', {
                            error: parseError.message,
                            fileName: file.name
                        });
                        resolve(null);
                    }
                };

                reader.onerror = () => {
                    this.logger.error('Ошибка чтения файла', {
                        fileName: file.name
                    });
                    resolve(null);
                };

                reader.readAsText(file);
            } catch (error) {
                this.logger.error('Ошибка при загрузке JSON файла', {
                    error: error.message,
                    fileName: file.name
                });
                resolve(null);
            }
        });
    }

    /**
     * Валидация данных
     * @param {Object} data - Данные для валидации
     * @returns {boolean} Валидны ли данные
     */
    validateData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!data.roles || !Array.isArray(data.roles)) {
            return false;
        }

        if (!data.replicas || !Array.isArray(data.replicas)) {
            return false;
        }

        // Проверка структуры ролей
        for (const role of data.roles) {
            if (!role.id || !role.name || !role.type) {
                return false;
            }
            if (!['speaker', 'sound'].includes(role.type)) {
                return false;
            }
        }

        // Проверка структуры реплик
        for (const replica of data.replicas) {
            if (!replica.id || typeof replica.text !== 'string') {
                return false;
            }
            if (replica.roleId !== null && typeof replica.roleId !== 'string') {
                return false;
            }
        }

        return true;
    }

    /**
     * Сохранение данных в localStorage через storageManager
     * @param {ScriptData} scriptData - Данные скрипта
     * @returns {boolean} Успешно ли сохранено
     */
    saveToStorage(scriptData) {
        if (!(scriptData instanceof ScriptData)) {
            this.logger.error('Попытка сохранить некорректные данные', {
                dataType: typeof scriptData
            });
            return false;
        }

        if (!scriptData.validate()) {
            this.logger.error('Попытка сохранить невалидные данные');
            return false;
        }

        const success = this.storageManager.save(scriptData.toJSON());
        if (success) {
            this.logger.info('Данные успешно сохранены в localStorage', {
                roleCount: scriptData.roles.length,
                replicaCount: scriptData.replicas.length
            });
        } else {
            this.logger.error('Ошибка при сохранении данных в localStorage');
        }

        return success;
    }

    /**
     * Экспорт данных в JSON строку
     * @param {ScriptData} scriptData - Данные скрипта
     * @returns {string|null} JSON строка или null
     */
    exportToJSON(scriptData) {
        if (!(scriptData instanceof ScriptData)) {
            return null;
        }

        try {
            return JSON.stringify(scriptData.toJSON(), null, 2);
        } catch (error) {
            this.logger.error('Ошибка при экспорте в JSON', {
                error: error.message
            });
            return null;
        }
    }
}

// Экспорт для использования в модулях
export { DataLoader };
