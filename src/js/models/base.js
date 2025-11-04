/**
 * Базовый класс для всех моделей приложения
 */
class BaseModel {
    constructor() {
        this.id = this.generateId();
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Обновление времени последнего изменения
     */
    updateTimestamp() {
        this.updatedAt = new Date();
    }

    /**
     * Преобразование объекта в JSON
     * @returns {Object} JSON представление объекта
     */
    toJSON() {
        // Проверка валидности дат перед сериализацией
        const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());
        
        const createdAt = isValidDate(this.createdAt) ? this.createdAt.toISOString() : new Date().toISOString();
        const updatedAt = isValidDate(this.updatedAt) ? this.updatedAt.toISOString() : new Date().toISOString();
        
        return {
            id: this.id,
            createdAt: createdAt,
            updatedAt: updatedAt
        };
    }

    /**
     * Создание объекта из JSON
     * @param {Object} json - JSON данные
     * @param {Function} constructor - Конструктор класса
     * @returns {BaseModel} Новый экземпляр класса
     */
    static fromJSON(json, constructor) {
        const instance = new constructor();
        instance.id = json.id;
        
        // Проверка и обработка валидности дат при десериализации
        const parseDate = (dateString) => {
            if (!dateString) return new Date();
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? new Date() : date;
        };
        
        instance.createdAt = parseDate(json.createdAt);
        instance.updatedAt = parseDate(json.updatedAt);
        return instance;
    }
}

/**
 * Класс для управления коллекцией объектов
 */
class Collection {
    constructor() {
        this.items = [];
    }

    /**
     * Добавление элемента в коллекцию
     * @param {BaseModel} item - Элемент для добавления
     */
    add(item) {
        logger.debug('Добавление элемента в коллекцию', {
            itemId: item.id,
            itemType: item.constructor.name
        });
        
        this.items.push(item);
        this.updateTimestamp();
    }

    /**
     * Удаление элемента из коллекции
     * @param {string} id - ID элемента для удаления
     * @returns {boolean} Успешно ли удалено
     */
    remove(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            logger.debug('Удаление элемента из коллекции', {
                itemId: id,
                itemType: this.items[index].constructor.name
            });
            
            this.items.splice(index, 1);
            this.updateTimestamp();
            return true;
        }
        return false;
    }

    /**
     * Поиск элемента по ID
     * @param {string} id - ID элемента
     * @returns {BaseModel|null} Найденный элемент или null
     */
    findById(id) {
        return this.items.find(item => item.id === id) || null;
    }

    /**
     * Получение всех элементов
     * @returns {Array} Массив всех элементов
     */
    getAll() {
        return [...this.items];
    }

    /**
     * Очистка коллекции
     */
    clear() {
        logger.debug('Очистка коллекции', {
            itemCount: this.items.length
        });
        
        this.items = [];
        this.updateTimestamp();
    }

    /**
     * Получение количества элементов
     * @returns {number} Количество элементов
     */
    size() {
        return this.items.length;
    }

    /**
     * Проверка, пуста ли коллекция
     * @returns {boolean} Пуста ли коллекция
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Обновление времени последнего изменения
     */
    updateTimestamp() {
        this.updatedAt = new Date();
    }

    /**
     * Преобразование коллекции в JSON
     * @returns {Array} Массив JSON представлений элементов
     */
    toJSON() {
        return this.items.map(item => item.toJSON());
    }

    /**
     * Перемещение элемента в коллекции
     * @param {string} id - ID элемента для перемещения
     * @param {number} newIndex - Новый индекс
     * @returns {boolean} Успешно ли перемещено
     */
    move(id, newIndex) {
        const currentIndex = this.items.findIndex(item => item.id === id);
        if (currentIndex === -1 || newIndex < 0 || newIndex >= this.items.length) {
            return false;
        }

        const item = this.items[currentIndex];
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, item);
        this.updateTimestamp();
        
        logger.debug('Элемент перемещен в коллекции', {
            itemId: id,
            oldIndex: currentIndex,
            newIndex: newIndex,
            itemType: item.constructor.name
        });
        
        return true;
    }
}

// Экспорт для использования в модулях
export { BaseModel, Collection };
