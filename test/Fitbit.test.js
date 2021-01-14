const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' ); 
const FileTokenManager = require( '../FileTokenManager' );
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
        fs.writeFile( filePath, JSON.stringify( fileContent ), { encoding: 'utf8', flag: 'w' }, (error) => {
            if (error) {
                LOGGER.error("Failed create file: " + filePath, {error, fileContent});
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

Fitbit.setLogger(LOGGER);
FileTokenManager.setLogger(LOGGER);

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

describe('FileTokenManager.read', () => {
    const filePath = '/tmp/FileTokenManager.read.json';
    let fileTokenManager;
    beforeEach(() => {
        fileTokenManager = new FileTokenManager(filePath);
    });

    afterEach((done) => {
        deleteFile(filePath, done);
    });

    test('read - no file', (done) => {      
        fileTokenManager.read().then(() => {
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });    
    });

    test('read - existing file', (done) => {      
        createFile(filePath, {test: 'test str', test2: 123}).then(() => {
            fileTokenManager.read().then(() => {
                done();                
            }).catch(error => {
                console.log("Error", error);
                done.fail('it should not reach here');
            });        
        });
    });
});

describe('FileTokenManager.write', () => {
    const filePath = '/tmp/FileTokenManager.write.json';
    let fileTokenManager;
    beforeEach(() => {
        fileTokenManager = new FileTokenManager(filePath);
    });

    afterEach((done) => {
        deleteFile(filePath, done);
    });

    test('write - file update', (done) => {
        try {
            createFile(filePath, {test: 'test str', test2: 123}).then(() => {
                fileTokenManager.read().then((data) => {
                    expect(data.test).toBe('test str');
                    fileTokenManager.write({test: 'test str 2'}).then(() => {
                        fileTokenManager.read().then((data2) => {
                            expect(data2.test).toBe('test str 2');
                            done();
                        });
                    });        
                });
            });
        } catch (error) {
            done.fail(error);
        }
    });
});

describe('Fitbit.request', () => {
    let fitbit;
    let fileTokenManager;

    beforeEach(() => {
        const fitbitConfig = appConfig.fitbit;
        fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
        fitbit = new Fitbit(fitbitConfig, fileTokenManager);    
    });

    test('getProfile - expired token', (done) => {      
        fileTokenManager.read().then(token => {
            if (token.expires_at) {
                delete token.expires_at;
            }
            fitbit._token = token;
            getProfile(fitbit).finally(() => {
                done();
            });                        
        });    
    });

    test('getProfile - no token', (done) => {        
        getProfile(fitbit).finally(() => {
            done();
        });        
    });

    test('getProfile - has token', (done) => {        
        fileTokenManager.read().then(token => {
            fitbit._token = token;
            getProfile(fitbit).finally(() => {
                done();
            });                        
        });    
    });
});