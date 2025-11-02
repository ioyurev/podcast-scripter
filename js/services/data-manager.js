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
            logger.logReplicaAction('перемещение через менеджер данных', replicaId, {
                newIndex: newIndex
            });
        }
        return result;
    }

    /**
     * Обновление статистики
     */
    updateStatistics() {
        const totalWords = this.replicaManager.getTotalWordCount(this.roleManager);
        const totalDuration = this.replicaManager.calculateTotalDuration(this.roleManager);
        
        logger.logCalculation('обновление статистики', {
            totalWords,
            totalDuration
        });

        this.notifyUpdate();
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
            // Очистка текущих данных
            this.roleManager.clear();
            this.replicaManager.clear();
            
            // Импорт ролей
            if (data.roles) {
                data.roles.forEach(roleData => {
                    let role;
                    if (roleData.type === 'speaker') {
                        role = Speaker.fromJSON(roleData);
                    } else if (roleData.type === 'sound') {
                        role = SoundEffect.fromJSON(roleData);
                    } else {
                        role = Role.fromJSON(roleData);
                    }
                    this.roleManager.add(role);
                });
            }

            // Импорт реплик
            if (data.replicas) {
                data.replicas.forEach(replicaData => {
                    const replica = Replica.fromJSON(replicaData);
                    this.replicaManager.add(replica);
                });
            }

            this.updateStatistics();
            
            logger.logFileOperation('импорт данных', 'script.json', {
                roleCount: data.roles ? data.roles.length : 0,
                replicaCount: data.replicas ? data.replicas.length : 0,
                version: data.version
            });

            return true;
        } catch (error) {
            logger.error('Ошибка при импорте данных', {
                error: error.message,
                stack: error.stack
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
