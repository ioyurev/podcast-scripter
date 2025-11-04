class Logger {
    constructor() {
        this.enabled = true;
        this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error', 'trace'
        this.logHistory = [];
        this.debugBuffer = []; // Буфер для DEBUG логов
        this.keyCategories = new Set([
            'Пользовательское действие',
            'Файловая операция', 
            'Импорт данных',
            'Экспорт данных',
            'Ошибка',
            'Предупреждение',
            'Инициализация',
            'Загрузка',
            'Сохранение',
            'Удаление',
            'Добавление'
        ]);
        this.maxHistorySize = 100;
        this.maxDebugBufferSize = 5000;
        // Добавляем стек для группировки логов
        this.groupStack = [];
        this.currentGroup = null;
        this.groupOperationStats = new Map(); // Для сбора статистики по операциям
    }

    log(level, message, data = null, category = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            category,
            data,
            userAgent: navigator.userAgent
        };

        // Добавляем в историю логов
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory = this.logHistory.slice(-this.maxHistorySize);
        }

        // Для DEBUG и TRACE логов - добавляем в буфер
        if (level === 'debug' || level === 'trace') {
            this.debugBuffer.push(logEntry);
            if (this.debugBuffer.length > this.maxDebugBufferSize) {
                this.debugBuffer = this.debugBuffer.slice(-this.maxDebugBufferSize);
            }
        }

        // Выводим в консоль в любом случае - уровень будет отфильтрован в outputToConsole
        this.outputToConsole(level, timestamp, message, data);
    }

    // Helper method to safely convert objects to string representation for console output
    formatDataForConsole(data) {
        if (data === null || data === undefined) {
            return null;
        }
        
        if (typeof data === 'object') {
            try {
                // Try to create a more readable representation for objects
                if (Array.isArray(data)) {
                    return data.length <= 5 ? data : `[Array(${data.length})]`;
                } else if (data instanceof Error) {
                    return {
                        name: data.name,
                        message: data.message,
                        stack: data.stack ? data.stack.split('\n')[0] : undefined
                    };
                } else if (data instanceof Date) {
                    return data.toISOString();
                } else {
                    // For regular objects, limit the size to prevent console spam
                    const keys = Object.keys(data);
                    if (keys.length > 5) {
                        const limitedData = {};
                        keys.slice(0, 5).forEach(key => {
                            limitedData[key] = this.formatValueForConsole(data[key]);
                        });
                        limitedData[`...${keys.length - 5} more`] = '';
                        return limitedData;
                    }
                    return data;
                }
            } catch {
                // If formatting fails, return a safe string representation
                return `[Object: ${typeof data}]`;
            }
        }
        return data;
    }

    // Helper method to format individual values
    formatValueForConsole(value) {
        if (value === null || value === undefined) {
            return value;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.length <= 3 ? value : `[Array(${value.length})]`;
            } else if (value instanceof Date) {
                return value.toISOString();
            } else if (value instanceof Error) {
                return { name: value.name, message: value.message };
            } else {
                return value;
            }
        }
        return value;
    }

    outputToConsole(level, timestamp, message, data) {
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        const formattedData = this.formatDataForConsole(data);
        
        // Always output to the appropriate console method so browser filtering works
        // The application log level will be handled by the browser's console level settings
        switch (level) {
            case 'error':
                if (formattedData) {
                    console.error(logMessage, formattedData);
                } else {
                    console.error(logMessage);
                }
                break;
            case 'warn':
                if (formattedData) {
                    console.warn(logMessage, formattedData);
                } else {
                    console.warn(logMessage);
                }
                break;
            case 'info':
                if (formattedData) {
                    console.info(logMessage, formattedData);
                } else {
                    console.info(logMessage);
                }
                break;
            case 'debug':
                if (formattedData) {
                    console.debug(logMessage, formattedData);
                } else {
                    console.debug(logMessage);
                }
                break;
            case 'trace':
                if (formattedData) {
                    console.debug(logMessage, formattedData);
                } else {
                    console.debug(logMessage);
                }
                break;
            default:
                if (formattedData) {
                    console.log(logMessage, formattedData);
                } else {
                    console.log(logMessage);
                }
        }
    }

    // Проверяем, является ли сообщение ключевым
    isKeyMessage(message) {
        return Array.from(this.keyCategories).some(category => 
            message.includes(category)
        );
    }

    trace(message, data = null) {
        this.log('trace', message, data);
    }

    debug(message, data = null) {
        // DEBUG логи по умолчанию не выводятся, только сохраняются
        this.log('debug', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    // Console group methods for organizing related log entries
    group(label) {
        if (this.groupStack.length === 0) {
            console.group(`[LOG] ${label}`);
        } else {
            console.group('  '.repeat(this.groupStack.length) + `[LOG] ${label}`);
        }
        this.groupStack.push(label);
        this.currentGroup = label;
    }

    groupEnd() {
        if (this.groupStack.length > 0) {
            console.groupEnd();
            this.groupStack.pop();
            this.currentGroup = this.groupStack[this.groupStack.length - 1] || null;
        }
    }

    groupCollapsed(label) {
        if (this.groupStack.length === 0) {
            console.groupCollapsed(`[LOG] ${label}`);
        } else {
            console.groupCollapsed('  '.repeat(this.groupStack.length) + `[LOG] ${label}`);
        }
        this.groupStack.push(label);
        this.currentGroup = label;
    }

    // Console time methods for performance measurement
    time(label) {
        console.time(`[LOG] ${label}`);
    }

    timeEnd(label) {
        console.timeEnd(`[LOG] ${label}`);
    }

    // Console table method for visualizing data structures
    table(data, columns = null) {
        console.table(data, columns);
        // Also log to history for analysis
        this.log('debug', 'Table data logged', { 
            dataType: Array.isArray(data) ? 'array' : 'object',
            itemCount: Array.isArray(data) ? data.length : Object.keys(data).length,
            hasColumns: !!columns
        });
    }

    // Performance logging method
    logPerformance(operation, startTime, additionalData = {}) {
        const duration = Date.now() - startTime;
        if (duration > 100) { // Log only slow operations
            this.warn(`Slow operation detected: ${operation}`, {
                duration: `${duration}ms`,
                ...additionalData
            });
        }
    }

    // Методы для логирования действий пользователя
    logUserAction(action, details = null) {
        this.info(`Пользовательское действие: ${action}`, details, 'user-action');
    }

    // Методы для контекстного логирования с группированием
    logRoleAction(action, roleName, details = null) {
        // Для массовых операций собираем статистику вместо отдельных сообщений
        const operationKey = `role_${action}`;
        if (!this.groupOperationStats.has(operationKey)) {
            this.groupOperationStats.set(operationKey, { count: 0, items: [] });
        }
        const stats = this.groupOperationStats.get(operationKey);
        stats.count++;
        if (stats.items.length < 3) { // Сохраняем только первые 3 детали для экономии
            stats.items.push({ roleName, ...details });
        }
    }

    logReplicaAction(action, replicaId, details = null) {
        // Для массовых операций собираем статистику вместо отдельных сообщений
        const operationKey = `replica_${action}`;
        if (!this.groupOperationStats.has(operationKey)) {
            this.groupOperationStats.set(operationKey, { count: 0, items: [] });
        }
        const stats = this.groupOperationStats.get(operationKey);
        stats.count++;
        if (stats.items.length < 3) { // Сохраняем только первые 3 детали для экономии
            stats.items.push({ replicaId, ...details });
        }
    }

    logFileOperation(operation, fileName, details = null) {
        this.info(`Файловая операция: ${operation}`, {
            fileName,
            ...details
        }, 'file-operation');
    }

    logCalculation(calculation, result, details = null) {
        this.debug(`Расчет: ${calculation}`, {
            result,
            ...details
        }, 'calculation');
    }

    // Метод для завершения и вывода статистики по массовым операциям
    flushOperationStats() {
        if (this.groupOperationStats.size > 0) {
            for (const [key, stats] of this.groupOperationStats) {
                if (stats.count > 1) { // Только если было больше одной операции
                    const [type, action] = key.split('_');
                    if (type === 'role') {
                        this.debug(`Действия с ролями: ${action}`, {
                            total: stats.count,
                            details: stats.items.length > 0 ? stats.items : undefined
                        }, 'role-action');
                    } else if (type === 'replica') {
                        this.debug(`Действия с репликами: ${action}`, {
                            total: stats.count,
                            details: stats.items.length > 0 ? stats.items : undefined
                        }, 'replica-action');
                    }
                }
            }
            this.groupOperationStats.clear();
        }
    }

    // Метод для контекстного логирования с автоматическим группированием
    logWithGroup(label, logFunction) {
        this.group(label);
        try {
            const result = logFunction(this);
            this.flushOperationStats(); // Сбрасываем статистику после операции
            return result;
        } finally {
            this.groupEnd();
        }
    }

    // Получение истории логов
    getLogHistory() {
        return this.logHistory;
    }

    // Получение буфера DEBUG логов
    getDebugBuffer() {
        return this.debugBuffer;
    }

    // Очистка истории логов
    clearLogHistory() {
        this.logHistory = [];
        this.debugBuffer = [];
        this.groupOperationStats.clear();
        this.info('История логов очищена');
    }

    // Установка уровня логирования
    setLogLevel(level) {
        if (['debug', 'info', 'warn', 'error', 'trace'].includes(level)) {
            const oldLevel = this.logLevel;
            this.logLevel = level;
            this.info(`Уровень логирования изменен: ${oldLevel} -> ${level}`);
            
            // Если включили DEBUG - выводим последние DEBUG логи
            if (level === 'debug' && oldLevel !== 'debug') {
                console.info('=== Последние DEBUG логи ===');
                this.debugBuffer.slice(-50).forEach(entry => {
                    this.outputToConsole('debug', entry.timestamp, entry.message, entry.data);
                });
                console.info('=== Конец DEBUG логов ===');
            }
        }
    }

    // Включение/выключение логирования
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.info('Логирование включено');
        }
    }

    // Получение статистики логов
    getLogStats() {
        return {
            totalLogs: this.logHistory.length,
            debugLogs: this.debugBuffer.length,
            traceLogs: this.logHistory.filter(log => log.level === 'trace').length,
            errorLogs: this.logHistory.filter(log => log.level === 'error').length,
            warnLogs: this.logHistory.filter(log => log.level === 'warn').length,
            infoLogs: this.logHistory.filter(log => log.level === 'info').length
        };
    }

    // Экспорт логов в строку с фильтрацией
    exportLogs(options = {}) {
        let filteredLogs = this.logHistory;
        
        if (options.fromDate) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(options.fromDate));
        }
        
        if (options.level) {
            filteredLogs = filteredLogs.filter(log => log.level === options.level);
        }
        
        if (options.category) {
            filteredLogs = filteredLogs.filter(log => log.category === options.category);
        }
        
        return JSON.stringify({
            logs: filteredLogs,
            stats: this.getLogStats(),
            exportTime: new Date().toISOString(),
            filters: options
        }, null, 2);
    }
}

// Глобальный экземпляр логгера
const logger = new Logger();
logger.info('Система логирования инициализирована');

// Экспорт для использования в модулях
window.logger = logger;
export { logger, Logger };
