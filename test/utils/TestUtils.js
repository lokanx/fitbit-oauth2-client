const fs = require('fs');
const FitbitApi = require('../../FitbitApi');

const IS_DEBUG_ENABLED = true;
const IS_ERROR_ENABLED = true;

const LOGGER = {
    debug: (...argv) => {
        if (!IS_DEBUG_ENABLED) {
            return;
        }
        console.log(argv);
    },
    info: (...argv) => {
        console.log(argv);
    },
    warn: (...argv) => {
        console.log(argv);
    },
    error: (...argv) => {
        if (!IS_ERROR_ENABLED) {
            return;
        }
        console.log(argv);
    }
};

const deleteFile = (filePath, done = null) => {
    if (!filePath.startsWith("/tmp")) {
        throw new Error("Limited scope to be safe, all files must be under /tmp");
    }
    fs.unlink(filePath, () => {
        if (done) {
            done();
        }
    });
};

const createFile = (filePath, fileContent) => {
    if (!filePath.startsWith("/tmp")) {
        throw new Error("Limited scope to be safe, all files must be under /tmp");
    }
    return new Promise((resolve, reject) => {
        fs.writeFile( filePath, (typeof(fileContent)==='string' ? fileContent : JSON.stringify( fileContent )), { encoding: 'utf8', flag: 'w' }, (error) => {
            if (error) {
                LOGGER.error("Failed create file: " + filePath, {error, fileContent});
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

const getProfile = (fitbit) => {
    return new FitbitApi(fitbit).getProfile().catch(error => {
        LOGGER.error(error);
        throw error;
    });
};

const getBodyFatURL = () => {
    return FitbitApi.getBodyFatUrl();
};

const getBodyFat = (fitbit) => {
    return new FitbitApi(fitbit).getBodyFat().catch(error => {
        LOGGER.error(error);
        throw error;
    });
};


const getLogger = () => LOGGER;

module.exports = {
    deleteFile,
    createFile,
    getLogger,
    getProfile,
    getBodyFat,
    getBodyFatURL
};