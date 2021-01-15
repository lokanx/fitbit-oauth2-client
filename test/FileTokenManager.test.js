const FileTokenManager = require('../FileTokenManager');
const TestUtils = require('./utils/TestUtils');

const LOGGER = TestUtils.getLogger();

FileTokenManager.setLogger(LOGGER);

describe('FileTokenManager.read', () => {
    const filePath = '/tmp/FileTokenManager.read.json';
    let fileTokenManager;

    beforeEach(() => {
        fileTokenManager = new FileTokenManager(filePath);
    });

    afterEach((done) => {
        TestUtils.deleteFile(filePath, done);
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
        TestUtils.createFile(filePath, { test: 'test str', test2: 123 }).then(() => {
            fileTokenManager.read().then(() => {
                done();
            }).catch(error => {
                console.log("Error", error);
                done.fail('it should not reach here');
            });
        });
    });

    test('read - existing corrupt file', (done) => {
        TestUtils.createFile(filePath, "{\"test\": \"test str\", \"test2\": }").then(() => {
            fileTokenManager.read().then(() => {
                done.fail('it should not reach here');
            }).catch(error => {
                console.log("Error", error);
                done();
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
        TestUtils.deleteFile(filePath, done);
    });

    test('write - non existing path', (done) => {
        new FileTokenManager('/tmp/nonexistingfolder' + filePath).write({ "test": "test" })
            .then(() => {
                done.fail('it should not reach here');
            })
            .catch(error => {
                console.log("Error", error);
                done();
            });
    });

    test('write - file update', (done) => {
        try {
            TestUtils.createFile(filePath, { test: 'test str', test2: 123 }).then(() => {
                fileTokenManager.read().then((data) => {
                    expect(data.test).toBe('test str');
                    fileTokenManager.write({ test: 'test str 2' }).then(() => {
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

describe('FileTokenManager.setLogger', () => {
    const filePath = '/tmp/FileTokenManager.logger.json';
    let fileTokenManager;

    beforeEach(() => {
        FileTokenManager.setLogger(null);
        fileTokenManager = new FileTokenManager(filePath);
    });

    afterEach((done) => {
        TestUtils.deleteFile(filePath, done);
        FileTokenManager.setLogger(LOGGER);
    });

    test('no logger', (done) => {
        FileTokenManager.setLogger(null);
        fileTokenManager.read().then(() => {
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });
    });

    test('function logger', (done) => {
        let counter = 0;
        FileTokenManager.setLogger(() => { counter++; });
        fileTokenManager.read().then(() => {
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            expect(counter).not.toBe(0);
            done();
        });
    });

    test('function logger with data', (done) => {
        let counter = 0;
        FileTokenManager.setLogger(() => { counter++; });
        fileTokenManager.write({"aaa": "aaa"}).then(() => {
            expect(counter).not.toBe(0);
            done();            
        }).catch(error => {
            console.log("Error", error);
            done.fail('it should not reach here');
        });
    });

    test('console\'ish logger', (done) => {
        FileTokenManager.setLogger(LOGGER);
        fileTokenManager.read().then(() => {
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });        
    });    

    test('illegal logger', (done) => {
        FileTokenManager.setLogger({});
        fileTokenManager.read().then(() => {
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });        
    });   
});