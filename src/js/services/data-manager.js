import { logger } from '../logger.js';
import { ReplicaManager, Replica  } from '../models/replica.js';
import { RoleManager, Speaker, SoundEffect, Role  } from '../models/role.js';



/**
 * Менеджер данных приложения
 */
class DataManager {
    constructor() {
        this.roleManager = new RoleManager();
        this.replicaManager = new ReplicaManager();
        this.updateCallbacks = [];
        
        logger.info('Менеджер данных инициализирован');
    }

    /**
     * Добавление callback-функции для обновления данных
     * @param {Function} callback - Функция обратного вызова
     */
    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Вызов всех callback-функций обновления
     */
    notifyUpdate() {
        this.updateCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                logger.error('Ошибка в callback обновления', {
                    error: error.message
                });
            }
        });
    }

    /**
     * Добавление роли
     * @param {Role} role - Роль для добавления
     */
    addRole(role) {
        this.roleManager.add(role);
        this.updateStatistics();
        logger.logRoleAction('добавление через менеджер данных', role.name, {
            roleId: role.id,
            roleType: role.type
        });
    }

    /**
     * Удаление роли
     * @param {string} roleId - ID роли для удаления
     * @returns {boolean} Успешно ли удалено
     */
    removeRole(roleId) {
        const role = this.roleManager.findById(roleId);
        if (role) {
            // Удаление всех реплик, связанных с этой ролью
            const replicasToDelete = this.replicaManager.getAll()
                .filter(replica => replica.roleId === roleId);
            
            replicasToDelete.forEach(replica => {
                this.replicaManager.remove(replica.id);
                logger.logReplicaAction('авто-удаление при удалении роли', replica.id, {
                    roleId: roleId,
                    roleName: role.name
                });
            });

            const result = this.roleManager.remove(roleId);
            if (result) {
                this.updateStatistics();
                logger.logRoleAction('удаление через менеджер данных', role.name, {
                    roleId: roleId
                });
            }
            return result;
        }
        return false;
    }

    /**
     * Добавление реплики
     * @param {Replica} replica - Реплика для добавления
     */
    addReplica(replica) {
        this.replicaManager.add(replica);
        this.updateStatistics();
        logger.logReplicaAction('добавление через менеджер данных', replica.id, {
            textLength: replica.text.length,
            roleId: replica.roleId
        });
    }

    /**
     * Удаление реплики
     * @param {string} replicaId - ID реплики для удаления
     * @returns {boolean} Успешно ли удалено
     */
    removeReplica(replicaId) {
        const replica = this.replicaManager.findById(replicaId);
        if (replica) {
            const result = this.replicaManager.remove(replicaId);
            if (result) {
                this.updateStatistics();
                logger.logReplicaAction('удаление через менеджер данных', replicaId, {
                    textLength: replica.text.length,
                    roleId: replica.roleId
                });
            }
            return result;
        }
        return false;
    }

    /**
     * Перемещение реплики
     * @param {string} replicaId - ID реплики
     * @param {number} newIndex - Новый индекс
     * @returns {boolean} Успешно ли перемещено
     */
    moveReplica(replicaId, newIndex) {
        const result = this.replicaManager.move(replicaId, newIndex);
        if (result) {
            this.updateStatistics();
            logger.time('update-statistics');
            logger.logReplicaAction('перемещение через менеджер данных', replicaId, {
                newIndex: newIndex
            });
            logger.timeEnd('update-statistics');
        }
        return result;
    }

    /**
     * Обновление статистики
     */
    updateStatistics() {
        logger.group('Обновление статистики');
        const totalWords = this.replicaManager.getTotalWordCount(this.roleManager);
        const totalDuration = this.replicaManager.calculateTotalDuration(this.roleManager);
        
        logger.logCalculation('обновление статистики', {
            totalWords,
            totalDuration
        });

        this.notifyUpdate();
        logger.groupEnd();
    }

    /**
     * Получение общей статистики
     * @returns {Object} Объект статистикой
     */
    getStatistics() {
        const totalWords = this.replicaManager.getTotalWordCount(this.roleManager);
        const totalDuration = this.replicaManager.calculateTotalDuration(this.roleManager);
        
        return {
            totalWords,
            totalDuration,
            totalDurationFormatted: this.formatDuration(totalDuration),
            roleCount: this.roleManager.size(),
            replicaCount: this.replicaManager.size()
        };
    }

    /**
     * Форматирование длительности в строку (MM:SS)
     * @param {number} minutes - Длительность в минутах
     * @returns {string} Отформатированная строка
     */
    formatDuration(minutes) {
        const totalSeconds = Math.round(minutes * 60);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Экспорт данных в JSON
     * @returns {Object} JSON представление всех данных
     */
    exportData() {
        const data = {
            roles: this.roleManager.toJSON(),
            replicas: this.replicaManager.toJSON(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        logger.logFileOperation('экспорт данных', 'script.json', {
            roleCount: data.roles.length,
            replicaCount: data.replicas.length
        });
        
        return data;
    }

    /**
     * Импорт данных из JSON
     * @param {Object} data - Данные для импорта
     */
    importData(data) {
        try {
            const startTime = Date.now();
            
            // Проверка размера данных для оптимизации
            const roleCount = data.roles ? data.roles.length : 0;
            const replicaCount = data.replicas ? data.replicas.length : 0;
            const totalItems = roleCount + replicaCount;
            
            logger.logWithGroup('Импорт данных', (logger) => {
                logger.info('Начало импорта данных', {
                    roleCount: roleCount,
                    replicaCount: replicaCount,
                    totalItems: totalItems,
                    dataStructure: Object.keys(data),
                    hasRoles: Array.isArray(data.roles),
                    hasReplicas: Array.isArray(data.replicas)
                });

                // Проверка структуры данных перед импортом
                if (!Array.isArray(data.roles)) {
                    logger.error('Данные ролей не являются массивом', { rolesType: typeof data.roles, roles: data.roles });
                    return false;
                }

                if (!Array.isArray(data.replicas)) {
                    logger.error('Данные реплик не являются массивом', { replicasType: typeof data.replicas, replicas: data.replicas });
                    return false;
                }

                // Очистка текущих данных
                logger.debug('Очистка текущих данных перед импортом');
                this.roleManager.clear();
                this.replicaManager.clear();
                
                // Временно отключаем обновления для больших наборов данных
                const originalCallbacks = [...this.updateCallbacks];
                this.updateCallbacks = [];
                logger.debug('Временное отключение обновлений UI для оптимизации импорта');
                
                // Импорт ролей
                if (data.roles) {
                    logger.group('Импорт ролей');
                    logger.debug('Начало импорта ролей', { count: data.roles.length });
                    for (let i = 0; i < data.roles.length; i++) {
                        const roleData = data.roles[i];
                        // logger.debug('Обработка роли', { index: i, roleId: roleData.id, roleName: roleData.name, type: roleData.type });
                        
                        let role;
                        if (roleData.type === 'speaker') {
                            role = Speaker.fromJSON(roleData, true); // Подавляем логи при массовой загрузке
                        } else if (roleData.type === 'sound') {
                            role = SoundEffect.fromJSON(roleData, true); // Подавляем логи при массовой загрузке
                        } else {
                            role = Role.fromJSON(roleData, true); // Подавляем логи при массовой загрузке
                        }
                        this.roleManager.add(role);
                        
                        // Периодически проверяем время для очень больших наборов
                        if (i > 0 && i % 1000 === 0) {
                            const elapsed = Date.now() - startTime;
                            if (elapsed > 5000) { // Если больше 5 секунд, логгируем прогресс
                                logger.info('Прогресс импорта ролей', {
                                    processed: i,
                                    total: roleCount,
                                    elapsed: elapsed
                                });
                            }
                        }
                    }
                    logger.debug('Завершение импорта ролей', { importedCount: this.roleManager.size() });
                    logger.groupEnd();
                }

                // Импорт реплик
                if (data.replicas) {
                    logger.group('Импорт реплик');
                    logger.debug('Начало импорта реплик', { count: data.replicas.length });
                    for (let i = 0; i < data.replicas.length; i++) {
                        const replicaData = data.replicas[i];
                        // logger.debug('Обработка реплики', { index: i, replicaId: replicaData.id, roleId: replicaData.roleId, textLength: replicaData.text?.length });
                        
                        const replica = Replica.fromJSON(replicaData, true); // Подавляем логи при массовой загрузке
                        this.replicaManager.add(replica);
                        
                        // Периодически проверяем время для очень больших наборов
                        if (i > 0 && i % 1000 === 0) {
                            const elapsed = Date.now() - startTime;
                            if (elapsed > 500) { // Если больше 5 секунд, логгируем прогресс
                                logger.info('Прогресс импорта реплик', {
                                    processed: i,
                                    total: replicaCount,
                                    elapsed: elapsed
                                });
                            }
                        }
                    }
                    logger.debug('Завершение импорта реплик', { importedCount: this.replicaManager.size() });
                    logger.groupEnd();
                }

                // Восстанавливаем коллбэки и обновляем статистику один раз
                logger.debug('Восстановление коллбэков и обновление статистики');
                this.updateCallbacks = originalCallbacks;
                this.updateStatistics();
                
                const endTime = Date.now();
                const totalTime = endTime - startTime;
                
                logger.logFileOperation('импорт данных', 'script.json', {
                    roleCount: data.roles ? data.roles.length : 0,
                    replicaCount: data.replicas ? data.replicas.length : 0,
                    version: data.version,
                    totalTimeMs: totalTime
                });

                logger.info('Импорт данных завершен успешно', {
                    roleCount: this.roleManager.size(),
                    replicaCount: this.replicaManager.size(),
                    totalTimeMs: totalTime
                });

                return true;
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при импорте данных', {
                error: error.message,
                stack: error.stack,
                dataStructure: data ? Object.keys(data) : 'undefined'
            });
            return false;
        }
    }

    /**
     * Проверка, пустой ли скрипт
     * @returns {boolean} Пустой ли скрипт
     */
    isEmpty() {
        return this.roleManager.isEmpty() && this.replicaManager.isEmpty();
    }

    /**
     * Очистка всех данных
     */
    clearAll() {
        this.roleManager.clear();
        this.replicaManager.clear();
        this.updateStatistics();
        logger.info('Все данные очищены');
    }
}

// Экспорт для использования в модулях
export { DataManager };
