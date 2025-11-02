import { logger } from '../logger.js';

/**
 * Обработчик файловых операций
 */
class FileHandler {
    constructor(dataManager) {
        this.dataManager = dataManager;
        logger.info('Обработчик файлов инициализирован');
    }

    /**
     * Сохранение скрипта в файл
     * @param {string} filename - Имя файла для сохранения (опционально)
     */
    saveScript(filename = null) {
        try {
            const data = this.dataManager.exportData();
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            
            // Генерация имени файла
            if (!filename) {
                filename = `podcast-script_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            } else {
                // Валидация и обработка имени файла
                if (!filename.toLowerCase().endsWith('.json')) {
                    filename += '.json';
                }
                // Удаление недопустимых символов для имен файлов
                filename = filename.replace(/[<>:"/\\|?*]/g, '_');
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            logger.logFileOperation('скачивание скрипта', link.download, {
                fileSize: jsonData.length,
                roleCount: data.roles.length,
                replicaCount: data.replicas.length
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при скачивании скрипта', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Загрузка скрипта из файла
     * @param {File} file - Файл для загрузки
     * @returns {Promise<boolean>} Успешно ли загружено
     */
    async loadScript(file) {
        return new Promise((resolve) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        
                        if (this.validateScriptData(data)) {
                            const success = this.dataManager.importData(data);
                            if (success) {
                                logger.logFileOperation('загрузка скрипта', file.name, {
                                    fileSize: file.size,
                                    roleCount: data.roles.length,
                                    replicaCount: data.replicas.length,
                                    version: data.version
                                });
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        } else {
                            logger.error('Невалидные данные скрипта', {
                                fileName: file.name
                            });
                            resolve(false);
                        }
                    } catch (parseError) {
                        logger.error('Ошибка парсинга JSON файла', {
                            error: parseError.message,
                            fileName: file.name
                        });
                        resolve(false);
                    }
                };

                reader.onerror = () => {
                    logger.error('Ошибка чтения файла', {
                        fileName: file.name
                    });
                    resolve(false);
                };

                reader.readAsText(file);
            } catch (error) {
                logger.error('Ошибка при загрузке скрипта', {
                    error: error.message,
                    fileName: file.name
                });
                resolve(false);
            }
        });
    }

    /**
     * Валидация данных скрипта
     * @param {Object} data - Данные для валидации
     * @returns {boolean} Валидны ли данные
     */
    validateScriptData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Проверка обязательных полей
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
            
            // roleId может быть null для реплик без роли
            if (replica.roleId !== null && typeof replica.roleId !== 'string') {
                return false;
            }
        }

        return true;
    }

    /**
     * Экспорт данных в формате, готовом для скачивания
     * @param {Object} data - Данные для экспорта
     * @param {string} filename - Имя файла
     */
    exportToFile(data, filename) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            logger.logFileOperation('экспорт в файл', filename, {
                fileSize: jsonData.length
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при экспорте в файл', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Импорт данных из файла
     * @param {File} file - Файл для импорта
     * @returns {Promise<Object|null>} Данные или null в случае ошибки
     */
    async importFromFile(file) {
        return new Promise((resolve) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (this.validateScriptData(data)) {
                            logger.logFileOperation('импорт из файла', file.name, {
                                fileSize: file.size
                            });
                            resolve(data);
                        } else {
                            logger.error('Невалидные данные при импорте', {
                                fileName: file.name
                            });
                            resolve(null);
                        }
                    } catch (parseError) {
                        logger.error('Ошибка парсинга JSON при импорте', {
                            error: parseError.message,
                            fileName: file.name
                        });
                        resolve(null);
                    }
                };

                reader.onerror = () => {
                    logger.error('Ошибка чтения файла при импорте', {
                        fileName: file.name
                    });
                    resolve(null);
                };

                reader.readAsText(file);
            } catch (error) {
                logger.error('Ошибка при импорте файла', {
                    error: error.message,
                    fileName: file.name
                });
                resolve(null);
            }
        });
    }
}

// Экспорт для использования в модулях
export { FileHandler };
