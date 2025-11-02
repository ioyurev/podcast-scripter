import { logger } from '../logger.js';
import { ScriptData } from '../models/script-data.js';

/**
 * Core data service for unified script loading/saving functionality
 * Used by both main application and viewer mode
 */
class DataService {
    constructor() {
        this.logger = logger;
    }

    /**
     * Load script data from JSON file
     * @param {File} file - JSON file to load
     * @returns {Promise<ScriptData|null>} ScriptData object or null if failed
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
     * Save script data to JSON file
     * @param {ScriptData} scriptData - Script data to save
     * @param {string} filename - Name for the file (without extension)
     * @returns {boolean} Success status
     */
    saveToJSONFile(scriptData, filename) {
        try {
            if (!scriptData || !scriptData.validate()) {
                this.logger.error('Попытка сохранить невалидные данные');
                return false;
            }

            const data = scriptData.toJSON();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.logger.info('Данные успешно сохранены в JSON файл', {
                filename: filename
            });

            return true;
        } catch (error) {
            this.logger.error('Ошибка при сохранении JSON файла', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Save data to localStorage
     * @param {ScriptData} scriptData - Script data to save
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    saveToStorage(scriptData, key = 'podcastScriptData') {
        if (!scriptData || !scriptData.validate()) {
            this.logger.error('Попытка сохранить невалидные данные в localStorage');
            return false;
        }

        try {
            const data = scriptData.toJSON();
            localStorage.setItem(key, JSON.stringify(data));
            this.logger.info('Данные успешно сохранены в localStorage', {
                key: key,
                roleCount: scriptData.roles.length,
                replicaCount: scriptData.replicas.length
            });
            return true;
        } catch (error) {
            this.logger.error('Ошибка при сохранении данных в localStorage', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @returns {ScriptData|null} ScriptData object or null if failed
     */
    loadFromStorage(key = 'podcastScriptData') {
        try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
                const data = JSON.parse(storedData);
                const scriptData = new ScriptData(data);
                if (scriptData.validate()) {
                    this.logger.info('Данные загружены из localStorage', {
                        key: key,
                        roleCount: scriptData.roles.length,
                        replicaCount: scriptData.replicas.length
                    });
                    return scriptData;
                } else {
                    this.logger.error('Невалидные данные в localStorage', { key: key });
                    return null;
                }
            }
            return null;
        } catch (error) {
            this.logger.error('Ошибка при загрузке данных из localStorage', {
                error: error.message,
                key: key
            });
            return null;
        }
    }

    /**
     * Validate script data
     * @param {Object} data - Data to validate
     * @returns {boolean} Validation result
     */
    validateScriptData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!data.roles || !Array.isArray(data.roles)) {
            return false;
        }

        if (!data.replicas || !Array.isArray(data.replicas)) {
            return false;
        }

        // Check role structure
        for (const role of data.roles) {
            if (!role.id || !role.name || !role.type) {
                return false;
            }
            if (!['speaker', 'sound'].includes(role.type)) {
                return false;
            }
        }

        // Check replica structure
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
     * Clear data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    clearStorage(key = 'podcastScriptData') {
        try {
            localStorage.removeItem(key);
            this.logger.info('Данные очищены из localStorage', { key: key });
            return true;
        } catch (error) {
            this.logger.error('Ошибка при очистке localStorage', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Export script data to JSON string
     * @param {ScriptData} scriptData - Script data to export
     * @returns {string|null} JSON string or null if failed
     */
    exportToJSON(scriptData) {
        if (!scriptData || !scriptData.validate()) {
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

    /**
     * Import script data from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {ScriptData|null} ScriptData object or null if failed
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const scriptData = new ScriptData(data);
            if (scriptData.validate()) {
                return scriptData;
            }
            return null;
        } catch (error) {
            this.logger.error('Ошибка при импорте из JSON', {
                error: error.message
            });
            return null;
        }
    }
}

// Export for use in modules
export { DataService };
