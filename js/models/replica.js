/**
 * Класс для реплики
 */
class Replica extends BaseModel {
    constructor(text = '', roleId = null) {
        super();
        this.text = text;
        this.roleId = roleId;
        this.updateWordCount();
        logger.logReplicaAction('создание', this.id, { 
            textLength: text.length,
            roleId 
        });
    }

    /**
     * Обновление количества слов
     */
    updateWordCount() {
        if (this.text.trim()) {
            this.wordCount = this.text.trim().split(/\s+/).length;
        } else {
            this.wordCount = 0;
        }
        this.updateTimestamp();
        logger.logCalculation('обновление количества слов реплики', this.wordCount, {
            replicaId: this.id,
            textLength: this.text.length
        });
    }

    /**
     * Установка текста реплики
     * @param {string} text - Текст реплики
     */
    setText(text) {
        const oldText = this.text;
        const oldWordCount = this.wordCount;
        this.text = text;
        this.updateWordCount();
        logger.logReplicaAction('изменение текста', this.id, {
            oldTextLength: oldText.length,
            newTextLength: text.length,
            oldWordCount,
            newWordCount: this.wordCount
        });
    }

    /**
     * Установка роли для реплики
     * @param {string} roleId - ID роли
     */
    setRole(roleId) {
        const oldRoleId = this.roleId;
        this.roleId = roleId;
        this.updateTimestamp();
        logger.logReplicaAction('изменение роли', this.id, {
            oldRoleId,
            newRoleId: roleId
        });
    }

    /**
     * Преобразование реплики в JSON
     * @returns {Object} JSON представление реплики
     */
    toJSON() {
        return {
            ...super.toJSON(),
            text: this.text,
            roleId: this.roleId,
            wordCount: this.wordCount
        };
    }

    /**
     * Создание реплики из JSON
     * @param {Object} json - JSON данные
     * @returns {Replica} Новый экземпляр реплики
     */
    static fromJSON(json) {
        const replica = new Replica(json.text, json.roleId);
        replica.id = json.id;
        replica.createdAt = new Date(json.createdAt);
        replica.updatedAt = new Date(json.updatedAt);
        replica.wordCount = json.wordCount || 0;
        return replica;
    }
}

/**
 * Менеджер реплик
 */
class ReplicaManager extends Collection {
    constructor() {
        super();
        logger.info('Менеджер реплик инициализирован');
    }

    /**
     * Добавление реплики
     * @param {Replica} replica - Реплика для добавления
     */
    add(replica) {
        super.add(replica);
        logger.logReplicaAction('добавление в менеджер', replica.id, {
            textLength: replica.text.length,
            roleId: replica.roleId
        });
    }

    /**
     * Удаление реплики
     * @param {string} id - ID реплики для удаления
     * @returns {boolean} Успешно ли удалено
     */
    remove(id) {
        const replica = this.findById(id);
        if (replica) {
            const result = super.remove(id);
            if (result) {
                logger.logReplicaAction('удаление из менеджера', id, {
                    textLength: replica.text.length,
                    roleId: replica.roleId
                });
            }
            return result;
        }
        return false;
    }

    /**
     * Перемещение реплики в коллекции
     * @param {string} id - ID реплики
     * @param {number} newIndex - Новый индекс
     * @returns {boolean} Успешно ли перемещено
     */
    move(id, newIndex) {
        const currentIndex = this.items.findIndex(item => item.id === id);
        if (currentIndex === -1 || newIndex < 0 || newIndex >= this.items.length) {
            return false;
        }

        const replica = this.items[currentIndex];
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, replica);
        replica.updateTimestamp();
        
        logger.logReplicaAction('перемещение', id, {
            oldIndex: currentIndex,
            newIndex: newIndex
        });
        
        return true;
    }

    /**
     * Получение реплик для определенной роли
     * @param {string} roleId - ID роли
     * @returns {Array} Массив реплик для роли
     */
    getByRole(roleId) {
        return this.items.filter(replica => replica.roleId === roleId);
    }

    /**
     * Получение реплик спикеров (учитываются в подсчете слов)
     * @param {RoleManager} roleManager - Менеджер ролей
     * @returns {Array} Массив реплик спикеров
     */
    getSpeakerReplicas(roleManager) {
        return this.items.filter(replica => {
            const role = roleManager.findById(replica.roleId);
            return role && role instanceof Speaker;
        });
    }

    /**
     * Подсчет общего количества слов в репликах спикеров
     * @param {RoleManager} roleManager - Менеджер ролей
     * @returns {number} Общее количество слов
     */
    getTotalWordCount(roleManager) {
        const speakerReplicas = this.getSpeakerReplicas(roleManager);
        const totalWords = speakerReplicas.reduce((sum, replica) => sum + replica.wordCount, 0);
        
        logger.logCalculation('подсчет общего количества слов', totalWords, {
            replicaCount: speakerReplicas.length
        });
        
        return totalWords;
    }

    /**
     * Расчет общей длительности подкаста
     * @param {RoleManager} roleManager - Менеджер ролей
     * @returns {number} Общая длительность в минутах
     */
    calculateTotalDuration(roleManager) {
        let totalDuration = 0;

        // Длительность для реплик спикеров
        const speakerReplicas = this.getSpeakerReplicas(roleManager);
        speakerReplicas.forEach(replica => {
            const role = roleManager.findById(replica.roleId);
            if (role instanceof Speaker) {
                const duration = role.calculateTime(replica.wordCount);
                totalDuration += duration;
            }
        });

        // Длительность для звуковых эффектов
        this.items.forEach(replica => {
            const role = roleManager.findById(replica.roleId);
            if (role instanceof SoundEffect) {
                const durationInMinutes = role.duration / 60;
                totalDuration += durationInMinutes;
            }
        });

        logger.logCalculation('расчет общей длительности', totalDuration, {
            speakerReplicaCount: speakerReplicas.length,
            soundReplicaCount: this.items.filter(replica => {
                const role = roleManager.findById(replica.roleId);
                return role instanceof SoundEffect;
            }).length
        });

        return totalDuration;
    }

    /**
     * Создание менеджера реплик из JSON
     * @param {Array} json - JSON массив данных
     * @returns {ReplicaManager} Новый экземпляр менеджера реплик
     */
    static fromJSON(json) {
        const manager = new ReplicaManager();
        json.forEach(replicaData => {
            const replica = Replica.fromJSON(replicaData);
            manager.add(replica);
        });
        return manager;
    }
}
