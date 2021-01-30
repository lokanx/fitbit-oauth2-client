const DEFAULT_JSON_IDENT = 3;

class Logger {

    constructor(logger = null, jsonIdent = DEFAULT_JSON_IDENT) {
        this._logger = logger;
        this._jsonIdent = jsonIdent;
    }

    log(level, msg, data) {
        if (!this._logger) {
            return;
        }

        if (typeof(this._logger) === 'function') {
            data ? this._logger(msg, JSON.stringify(data, undefined, this._jsonIdent)) : this._logger(msg);
            return;
        }

        if (this._logger[level]) {
            data ? this._logger[level](msg, JSON.stringify(data, undefined, this._jsonIdent)) : this._logger[level](msg);
            return;
        }

        if (level === 'trace' && this._logger['silly']) {
            data ? this._logger['silly'](msg, JSON.stringify(data, undefined, this._jsonIdent)) : this._logger['silly'](msg);
            return;
        }
    }

    trace(msg, data) {
        this.log('trace', msg, data);
    }

    debug(msg, data) {
        this.log('debug', msg, data);
    }

    info(msg, data) {
        this.log('info', msg, data);
    }

    warn(msg, data) {
        this.log('warn', msg, data);
    }

    error(msg, data) {
        this.log('error', msg, data);
    }
}

class LogManager {
    static getLogger(logger = null) {
        return new Logger(logger);
    }
}

module.exports = LogManager;