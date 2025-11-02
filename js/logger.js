class Logger {
    constructor() {
        this.enabled = true;
        this.logLevel = 'info';
        this.logHistory = [];
    }

    log(level, message, data = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            userAgent: navigator.userAgent
        };

        this.logHistory.push(logEntry);

        // Ограничение истории до 100 записей
        if (this.logHistory.length > 1000) {
            this.logHistory = this.logHistory.slice(-1000);
        }

        // Вывод в консоль
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }

        // Вывод в зависимости от уровня логирования
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'debug':
                if (this.logLevel === 'debug') {
                    console.debug(logMessage, data);
                }
                break;
            default:
                console.log(logMessage, data);
        }
    }

    debug(message, data = null) {
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

    // Методы для логирования действий пользователя
    logUserAction(action, details = null) {
        this.info(`Пользовательское действие: ${action}`, details);
    }

    logRoleAction(action, roleName, details = null) {
        this.info(`Действие с ролью: ${action}`, {
            roleName,
            ...details
        });
    }

    logReplicaAction(action, replicaId, details = null) {
        this.info(`Действие с репликой: ${action}`, {
            replicaId,
            ...details
        });
    }

    logFileOperation(operation, fileName, details = null) {
        this.info(`Файловая операция: ${operation}`, {
            fileName,
            ...details
        });
    }

    logCalculation(calculation, result, details = null) {
        this.info(`Расчет: ${calculation}`, {
            result,
            ...details
        });
    }

    // Получение истории логов
    getLogHistory() {
        return this.logHistory;
    }

    // Очистка истории логов
    clearLogHistory() {
        this.logHistory = [];
        this.info('История логов очищена');
    }

    // Установка уровня логирования
    setLogLevel(level) {
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            this.logLevel = level;
            this.info(`Уровень логирования установлен: ${level}`);
        }
    }

    // Включение/выключение логирования
    setEnabled(enabled) {
        this.enabled = enabled;
        this.info(`Логирование ${enabled ? 'включено' : 'выключено'}`);
    }
}

// Глобальный экземпляр логгера
const logger = new Logger();
logger.info('Система логирования инициализирована');
