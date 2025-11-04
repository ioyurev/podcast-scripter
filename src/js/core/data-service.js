import { logger } from '../logger.js';
import { ScriptData } from '../models/script-data.js';
import { ModalComponent } from '../ui/modal-component.js';

/**
 * Core data service for unified script loading/saving functionality
 * Used by both main application and viewer mode
 */
class DataService {
    constructor() {
        this.logger = logger;
    }

    /**
     * Закрытие модального окна загрузки файла по названию файла
     * Использует реестр модальных окон для объектно-ориентированного подхода
     * @param {string} fileName - название файла для поиска модального окна
     */
    closeFileLoadModal(fileName) {
        try {
            this.logger.debug('Поиск модального окна загрузки файла для закрытия', {
                fileName: fileName
            });

            let closedCount = 0;

            // Используем ModalService для поиска и закрытия модального окна по метаданным
            if (window.modalService) {
                // Поиск модальных окон с конкретным именем файла в метаданных
                const searchCriteria = {
                    fileName: fileName
                };
                
                const modalsToClose = window.modalService.findModalsByMetadataPublic(searchCriteria);
                for (const modalInfo of modalsToClose) {
                    try {
                        if (modalInfo.instance && typeof modalInfo.instance.closeModal === 'function') {
                            modalInfo.instance.closeModal(null);
                            this.logger.info('Модальное окно загрузки файла закрыто через реестр модальных окон (по fileName в метаданных)', {
                                fileName: fileName,
                                modalId: modalInfo.id
                            });
                            closedCount++;
                        } else {
                            // Если экземпляр недоступен, удаляем из DOM напрямую
                            if (modalInfo.instance && modalInfo.instance.overlay && modalInfo.instance.overlay.parentNode) {
                                modalInfo.instance.overlay.parentNode.removeChild(modalInfo.instance.overlay);
                                this.logger.info('Модальное окно удалено из DOM (экземпляр недоступен, но overlay найден)', {
                                    fileName: fileName,
                                    modalId: modalInfo.id
                                });
                                closedCount++;
                            } else {
                                // Дополнительный резервный способ: поиск по ID модального окна в DOM
                                const modalOverlay = document.querySelector(`.modal-overlay[data-modal-id="${modalInfo.id}"]`);
                                if (modalOverlay && modalOverlay.parentNode) {
                                    modalOverlay.parentNode.removeChild(modalOverlay);
                                    this.logger.info('Модальное окно удалено из DOM (по ID модального окна)', {
                                        fileName: fileName,
                                        modalId: modalInfo.id
                                    });
                                    closedCount++;
                                }
                            }
                        }
                    } catch (closeError) {
                        this.logger.error('Ошибка при закрытии модального окна по fileName в метаданных', {
                            fileName: fileName,
                            modalId: modalInfo.id,
                            error: closeError.message
                        });
                        
                        // Резервный способ: удаление через DOM если метод закрытия не сработал
                        try {
                            if (modalInfo.instance && modalInfo.instance.overlay && modalInfo.instance.overlay.parentNode) {
                                modalInfo.instance.overlay.parentNode.removeChild(modalInfo.instance.overlay);
                                this.logger.info('Модальное окно принудительно удалено из DOM после ошибки закрытия', {
                                    fileName: fileName,
                                    modalId: modalInfo.id
                                });
                                closedCount++;
                            }
                        } catch (domError) {
                            this.logger.error('Ошибка при принудительном удалении модального окна из DOM', {
                                fileName: fileName,
                                modalId: modalInfo.id,
                                error: domError.message
                            });
                        }
                    }
                }

                // Если нашли и закрыли модальные окна по fileName, возвращаем результат
                if (closedCount > 0) {
                    this.logger.info('Модальные окна загрузки файла закрыты через реестр', {
                        fileName: fileName,
                        closedCount: closedCount
                    });
                    return true;
                }

                // Дополнительный поиск: модальные окна с заголовком 'Загрузка файла' и содержимым с именем файла
                const searchCriteriaByContent = {};
                searchCriteriaByContent.title = (title) => title && typeof title === 'string' && title.includes('Загрузка файла');
                
                const modalsToCheckByContent = window.modalService.findModalsByMetadataPublic(searchCriteriaByContent);
                for (const modalInfo of modalsToCheckByContent) {
                    // Проверяем, содержит ли содержимое модального окна название файла
                    if (modalInfo.metadata.content && typeof modalInfo.metadata.content === 'string' && 
                        modalInfo.metadata.content.includes(fileName)) {
                        try {
                            if (modalInfo.instance && typeof modalInfo.instance.closeModal === 'function') {
                                modalInfo.instance.closeModal(null);
                                this.logger.info('Модальное окно загрузки файла закрыто через реестр модальных окон (по содержимому файла)', {
                                    fileName: fileName,
                                    modalId: modalInfo.id
                                });
                                closedCount++;
                            } else {
                                // Если экземпляр недоступен, удаляем из DOM напрямую
                                if (modalInfo.instance && modalInfo.instance.overlay && modalInfo.instance.overlay.parentNode) {
                                    modalInfo.instance.overlay.parentNode.removeChild(modalInfo.instance.overlay);
                                    this.logger.info('Модальное окно удалено из DOM (экземпляр недоступен, но overlay найден по содержимому)', {
                                        fileName: fileName,
                                        modalId: modalInfo.id
                                    });
                                    closedCount++;
                                } else {
                                    // Дополнительный резервный способ: поиск по ID модального окна в DOM
                                    const modalOverlay = document.querySelector(`.modal-overlay[data-modal-id="${modalInfo.id}"]`);
                                    if (modalOverlay && modalOverlay.parentNode) {
                                        modalOverlay.parentNode.removeChild(modalOverlay);
                                        this.logger.info('Модальное окно удалено из DOM (по ID модального окна, найдено по содержимому)', {
                                            fileName: fileName,
                                            modalId: modalInfo.id
                                        });
                                        closedCount++;
                                    }
                                }
                            }
                        } catch (closeError) {
                            this.logger.error('Ошибка при закрытии модального окна по содержимому файла', {
                                fileName: fileName,
                                modalId: modalInfo.id,
                                error: closeError.message
                            });
                            
                            // Резервный способ: удаление через DOM если метод закрытия не сработал
                            try {
                                if (modalInfo.instance && modalInfo.instance.overlay && modalInfo.instance.overlay.parentNode) {
                                    modalInfo.instance.overlay.parentNode.removeChild(modalInfo.instance.overlay);
                                    this.logger.info('Модальное окно принудительно удалено из DOM после ошибки закрытия (по содержимому)', {
                                        fileName: fileName,
                                        modalId: modalInfo.id
                                    });
                                    closedCount++;
                                }
                            } catch (domError) {
                                this.logger.error('Ошибка при принудительном удалении модального окна из DOM (по содержимому)', {
                                    fileName: fileName,
                                    modalId: modalInfo.id,
                                    error: domError.message
                                });
                            }
                        }
                    }
                }

                // Если закрыли что-то по содержимому, возвращаем результат
                if (closedCount > 0) {
                    this.logger.info('Модальные окна загрузки файла закрыты через реестр (по содержимому)', {
                        fileName: fileName,
                        closedCount: closedCount
                    });
                    return true;
                }
            }

            // Резервный способ: поиск по DOM по имени файла в содержимом
            const modalOverlays = document.querySelectorAll('.modal-overlay');
            for (const overlay of modalOverlays) {
                const modalContent = overlay.querySelector('.modal-content');
                if (modalContent) {
                    const titleElement = modalContent.querySelector('.modal-header h3');
                    const bodyElement = modalContent.querySelector('.modal-body');
                    
                    const hasLoadTitle = titleElement && titleElement.textContent.includes('Загрузка файла');
                    const hasFileName = bodyElement && bodyElement.textContent.includes(`Загружаем файл: ${fileName}`);

                    if (hasLoadTitle && hasFileName) {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                            this.logger.info('Модальное окно загрузки файла принудительно закрыто (резервный способ по DOM)', {
                                fileName: fileName
                            });
                            closedCount++;
                        }
                    }
                }
            }

            // Дополнительный резервный способ: поиск по DOM только по имени файла в содержимом
            const allModalOverlays = document.querySelectorAll('.modal-overlay');
            for (const overlay of allModalOverlays) {
                const modalContent = overlay.querySelector('.modal-content');
                if (modalContent) {
                    const bodyElement = modalContent.querySelector('.modal-body');
                    if (bodyElement && bodyElement.textContent.includes(`Загружаем файл: ${fileName}`)) {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                            this.logger.info('Модальное окно загрузки файла принудительно закрыто (по содержимому файла в DOM)', {
                                fileName: fileName
                            });
                            closedCount++;
                        }
                    }
                }
            }

            // Финальный резервный способ: поиск по всем модальным окнам с похожим содержимым
            if (closedCount === 0) {
                const allOverlays = document.querySelectorAll('.modal-overlay');
                for (const overlay of allOverlays) {
                    const titleElement = overlay.querySelector('.modal-header h3');
                    const bodyElement = overlay.querySelector('.modal-body');
                    
                    if (titleElement && titleElement.textContent.includes('Загрузка файла')) {
                        if (bodyElement && (bodyElement.textContent.includes(fileName) || bodyElement.textContent.includes('Загружаем файл'))) {
                            if (overlay.parentNode) {
                                overlay.parentNode.removeChild(overlay);
                                this.logger.info('Модальное окно загрузки файла принудительно закрыто (по общему сходству в DOM)', {
                                    fileName: fileName
                                });
                                closedCount++;
                            }
                        }
                    }
                }
            }

            if (closedCount > 0) {
                this.logger.info('Модальные окна загрузки файла закрыты (резервный способ)', {
                    fileName: fileName,
                    closedCount: closedCount
                });
                return true;
            }

            this.logger.warn('Модальное окно для закрытия не найдено в реестре и DOM', {
                fileName: fileName
            });

            return false;
        } catch (error) {
            this.logger.error('Ошибка при закрытии модального окна загрузки файла через реестр', {
                error: error.message,
                fileName: fileName,
                stack: error.stack
            });
            return false;
        }
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
                let completed = false; // Flag to prevent multiple resolutions

                // Set up timeout to prevent hanging
                const timeoutId = setTimeout(() => {
                    if (!completed) {
                        completed = true;
                        this.logger.error('Таймаут загрузки файла', {
                            fileName: file.name,
                            fileSize: file.size
                        });
                        resolve(null);
                    }
                }, 30000); // 30 second timeout

                // Store timeout ID in reader for additional safety
                reader.timeoutId = timeoutId;

                reader.onload = (event) => {
                    if (completed) return; // Prevent multiple resolutions
                    completed = true;
                    clearTimeout(timeoutId);

                    try {
                        this.logger.info('Начало загрузки JSON файла', { fileName: file.name, fileSize: file.size });
                        
                        const data = JSON.parse(event.target.result);
                        this.logger.debug('JSON успешно распарсен', { 
                            keys: Object.keys(data), 
                            rolesCount: Array.isArray(data.roles) ? data.roles.length : 'not array', 
                            replicasCount: Array.isArray(data.replicas) ? data.replicas.length : 'not array'
                        });
                        
                        const scriptData = new ScriptData(data);
                        this.logger.debug('Создан экземпляр ScriptData', { isValid: scriptData.validate(), roles: scriptData.roles.length, replicas: scriptData.replicas.length });
                        
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
                                fileName: file.name,
                                rolesCount: Array.isArray(data.roles) ? data.roles.length : 'not array',
                                replicasCount: Array.isArray(data.replicas) ? data.replicas.length : 'not array'
                            });
                            resolve(null);
                        }
                    } catch (parseError) {
                        this.logger.error('Ошибка парсинга JSON файла', {
                            error: parseError.message,
                            fileName: file.name,
                            stack: parseError.stack
                        });
                        resolve(null);
                    }
                };

                reader.onerror = () => {
                    if (completed) return; // Prevent multiple resolutions
                    completed = true;
                    clearTimeout(timeoutId);

                    this.logger.error('Ошибка чтения файла', {
                        fileName: file.name
                    });
                    resolve(null);
                };

                reader.onabort = () => {
                    if (completed) return; // Prevent multiple resolutions
                    completed = true;
                    clearTimeout(timeoutId);

                    this.logger.error('Загрузка файла прервана', {
                        fileName: file.name
                    });
                    resolve(null);
                };

                reader.readAsText(file);

                // Additional safety: if the reader is in a loading state for too long,
                // check if it's stuck and resolve the promise
                setTimeout(() => {
                    if (!completed && reader.readyState === FileReader.LOADING) {
                        this.logger.error('FileReader застрял в состоянии LOADING', {
                            fileName: file.name,
                            readyState: reader.readyState,
                            fileSize: file.size
                        });
                        if (!completed) {
                            completed = true;
                            clearTimeout(timeoutId);
                            resolve(null);
                        }
                    }
                }, 35000); // Slightly longer than the main timeout

            } catch (error) {
                this.logger.error('Ошибка при загрузке JSON файла', {
                    error: error.message,
                    fileName: file.name,
                    stack: error.stack
                });
                resolve(null);
            }
        });
    }

    /**
     * Load data for import into DataManager (converts ScriptData to DataManager format if needed)
     * @param {ScriptData|Object} data - Data to convert for DataManager import
     * @returns {Object} Data in DataManager import format
     */
    convertForDataManagerImport(data) {
        let importData;
        if (data instanceof ScriptData) {
            // Convert ScriptData instance to DataManager import format
            // DataManager expects roles and replicas arrays directly
            importData = {
                roles: data.roles,
                replicas: data.replicas,
                version: data.version,
                exportDate: data.exportDate
            };
            this.logger.debug('Конвертация ScriptData для импорта в DataManager', {
                rolesCount: data.roles.length,
                replicasCount: data.replicas.length,
                version: data.version
            });
        } else {
            // Data is already in the expected format
            importData = data;
            this.logger.debug('Данные уже в формате для импорта в DataManager', {
                rolesCount: Array.isArray(data.roles) ? data.roles.length : 0,
                replicasCount: Array.isArray(data.replicas) ? data.replicas.length : 0
            });
        }
        return importData;
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
     * Save script data to JSON file with modal feedback
     * @param {ScriptData} scriptData - Script data to save
     * @param {string} filename - Name for the file (without extension)
     * @returns {Promise<boolean>} Success status
     */
    async saveToJSONFileWithFeedback(scriptData, filename) {
        try {
            if (!scriptData || !scriptData.validate()) {
                this.logger.error('Попытка сохранить невалидные данные');
                return false;
            }

            // Show progress modal
            const result = await ModalComponent.show({
                title: 'Сохранение файла',
                type: 'info',
                content: `Подготовка файла: ${filename}.json`,
                buttons: [
                    {
                        text: 'Отмена',
                        icon: 'x-circle',
                        type: 'secondary',
                        onClick: () => false,
                        autoClose: true
                    }
                ],
                closable: false,
                closeOnEscape: false
            });

            // If user cancelled, return false
            if (result === false) {
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

            // Show success notification
            await ModalComponent.showInfo('Успех', `Файл ${filename}.json успешно сохранен!`);

            return true;
        } catch (error) {
            this.logger.error('Ошибка при сохранении JSON файла', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Load script data from JSON file with modal feedback
     * @param {File} file - JSON file to load
     * @returns {Promise<ScriptData|null>} ScriptData object or null if failed
     */
    async loadFromJSONFileWithFeedback(file) {
        this.logger.debug('Начало загрузки файла с обратной связью', {
            fileName: file.name,
            fileSize: file.size
        });

        try {
            // Load the file and return the data
            const scriptData = await this.loadFromJSONFile(file);
            
            if (scriptData) {
                this.logger.info('Данные успешно загружены из JSON файла', {
                    fileName: file.name,
                    fileSize: file.size,
                    roleCount: scriptData.roles.length,
                    replicaCount: scriptData.replicas.length
                });
                return scriptData;
            } else {
                this.logger.error('Не удалось загрузить данные из JSON файла', {
                    fileName: file.name
                });
                return null;
            }
        } catch (error) {
            this.logger.error('Ошибка при загрузке JSON файла с обратной связью', {
                error: error.message,
                fileName: file.name,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Save data to localStorage
     * @param {ScriptData|Object} scriptData - Script data to save (can be ScriptData instance or plain object)
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    saveToStorage(scriptData, key = 'podcastScriptData') {
        let dataToSave;
        let roleCount, replicaCount;
        
        if (!scriptData) {
            this.logger.error('Попытка сохранить null/undefined данные в localStorage');
            return false;
        }

        // Check if it's a ScriptData instance or plain object
        if (scriptData instanceof ScriptData) {
            if (!scriptData.validate()) {
                this.logger.error('Попытка сохранить невалидные данные в localStorage');
                return false;
            }
            dataToSave = scriptData.toJSON();
            roleCount = scriptData.roles.length;
            replicaCount = scriptData.replicas.length;
        } else {
            // It's a plain object from DataManager.exportData()
            if (!this.validateScriptData(scriptData)) {
                this.logger.error('Попытка сохранить невалидные данные в localStorage');
                return false;
            }
            dataToSave = scriptData;
            roleCount = scriptData.roles?.length || 0;
            replicaCount = scriptData.replicas?.length || 0;
        }

        try {
            localStorage.setItem(key, JSON.stringify(dataToSave));
            this.logger.info('Данные успешно сохранены в localStorage', {
                key: key,
                roleCount: roleCount,
                replicaCount: replicaCount
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
