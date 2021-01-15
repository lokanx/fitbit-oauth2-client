const fs = require('fs');

const LOGGER = {
    debug: (...argv) => {
        console.log(argv);
    },
    info: (...argv) => {
        console.log(argv);
    },
    warn: (...argv) => {
        console.log(argv);
    },
    error: (...argv) => {
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

const request = (fitbit, options) => {
    LOGGER.debug("Making request:", options);

    // Make an API call
    return fitbit.request(options).then(response => {
        LOGGER.debug('Received response:', {response});
        return response;
    }).catch(error => {
        LOGGER.error(error);
        LOGGER.error(`Request ${options.url} failed: ` + error.messsage||'', {error});
        throw error;
    });  
};

const getProfile = (fitbit) => {
    return request(fitbit, {
        url: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }).then(response => {
        LOGGER.debug("Received profile Data:", response.data);
        return response.data;
    }).catch(error => {
        LOGGER.error(error);
        throw error;
    });
};


const getLogger = () => LOGGER;

module.exports = {
    deleteFile,
    createFile,
    getLogger,
    request,
    getProfile
};