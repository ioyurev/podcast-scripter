/**
 * Менеджер хранилища для режима просмотра
 */
class StorageManager {
    constructor() {
        this.storageKey = 'podcastScriptViewerData';
        this.listeners = [];
        this.setupStorageListener();
    }

    /**
     * Сохранение данных в localStorage
     * @param {Object} data - Данные для сохранения
     * @returns {boolean} Успешно ли сохранено
     */
    save(data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(this.storageKey, jsonData);
            this.notifyListeners(data);
            return true;
        } catch (error) {
            console.error('Ошибка при сохранении в localStorage:', error);
            return false;
        }
    }

    /**
     * Загрузка данных из localStorage
     * @returns {Object|null} Данные или null
     */
    load() {
        try {
            const jsonData = localStorage.getItem(this.storageKey);
            if (jsonData) {
                const data = JSON.parse(jsonData);
                return data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка при загрузке из localStorage:', error);
            return null;
        }
    }

    /**
     * Удаление данных из localStorage
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            this.notifyListeners(null);
        } catch (error) {
            console.error('Ошибка при очистке localStorage:', error);
        }
    }

    /**
     * Подписка на изменения хранилища
     * @param {Function} callback - Функция обратного вызова
     * @returns {Function} Функция отписки
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Уведомление подписчиков о изменениях
     * @param {Object} data - Новые данные
     */
    notifyListeners(data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Ошибка в callback подписчика:', error);
            }
        });
    }

    /**
     * Настройка слушателя для изменений в других вкладках
     */
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.storageKey && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    this.notifyListeners(data);
                } catch (error) {
                    console.error('Ошибка при парсинге данных из storage event:', error);
                    this.notifyListeners(null);
                }
            }
        });
    }

    /**
     * Проверка поддержки localStorage
     * @returns {boolean} Поддерживается ли localStorage
     */
    isStorageSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Получение размера данных в localStorage
     * @returns {number} Размер в байтах
     */
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Проверка, есть ли данные в хранилище
     * @returns {boolean} Есть ли данные
     */
    hasData() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * Получение информации о хранилище
     * @returns {Object} Информация о хранилище
     */
    getStorageInfo() {
        return {
            hasData: this.hasData(),
            size: this.getStorageSize(),
            isSupported: this.isStorageSupported(),
            key: this.storageKey
        };
    }
}

// Экспорт для использования в модулях
export { StorageManager };
