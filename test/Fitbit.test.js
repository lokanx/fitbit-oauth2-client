const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' );
const FileTokenManager = require( '../FileTokenManager' );
const TestUtils = require( './utils/TestUtils' );
const axios = require('axios');
const AxiosMockAdapter = require( 'axios-mock-adapter' );

const LOGGER = TestUtils.getLogger();
const HTTP_RESPONSE_500 = 500;
const HTTP_RESPONSE_400 = 400;
const MOCK_PROFILE = {
        user: {
          age: 999,
          ambassador: false,
          averageDailySteps: 0,
          challengesBeta: true,
          clockTimeDisplayFormat: '24hour',
          corporate: false,
          corporateAdmin: false,
          country: 'SE',
          dateOfBirth: '1793-01-01',
          displayName: 'John Doe',
          displayNameSetting: 'name',
          distanceUnit: 'METRIC',
          encodedId: 'xxxxxx',
          firstName: 'John',
          foodsLocale: 'sv_SE',
          fullName: 'John Doe',
          gender: 'MALE',
          glucoseUnit: 'METRIC',
          height: 175,
          heightUnit: 'METRIC',
          isBugReportEnabled: false,
          isChild: false,
          isCoach: false,
          languageLocale: 'sv_SE',
          lastName: 'Doe',
          legalTermsAcceptRequired: false,
          locale: 'sv_SE',
          memberSince: '1922-01-01',
          mfaEnabled: false,
          offsetFromUTCMillis: 3600000,
          sdkDeveloper: true,
          sleepTracking: 'Normal',
          startDayOfWeek: 'MONDAY',
          strideLengthRunning: 999.9,
          strideLengthRunningType: 'manual',
          strideLengthWalking: 111.1,
          strideLengthWalkingType: 'manual',
          swimUnit: 'METRIC',
          temperatureUnit: 'METRIC',
          timezone: 'Europe/Stockholm',
          topBadges: [],
          waterUnit: 'METRIC',
          waterUnitName: 'ml',
          weight: 12.8,
          weightUnit: 'METRIC'
        }
};

FileTokenManager.setLogger(LOGGER);
Fitbit.setLogger(LOGGER);

describe('Fitbit.constructor', () => {
    const fitbitConfig = appConfig.fitbit;

    beforeEach(() => {
    });

    test('constructor - no config', () => {
        try {
            new Fitbit();
            fail('it should not reach here');
        } catch (error) {
            console.log("Error", error);
        }
    });

    test('constructor - no token manager', () => {
        try {
            new Fitbit(fitbitConfig);
        } catch (error) {
            console.log("Error", error);
            fail('it should not reach here');
        }
    });

    test('constructor - faulty token manager', () => {
        try {
            new Fitbit(fitbitConfig, {});
            fail('it should not reach here');
        } catch (error) {
            console.log("Error", error);
        }
    });

    test('constructor - faulty token manager<2>', () => {
        try {
            new Fitbit(fitbitConfig, {read: () => {}});
            fail('it should not reach here');
        } catch (error) {
            console.log("Error", error);
        }
    });

    test('constructor', () => {
        try {
            new Fitbit(fitbitConfig, {read: () => {}, write: () => {}});
        } catch (error) {
            console.log("Error", error);
            fail('it should not reach here');
        }
    });

    test('constructor - default timeout', () => {
        try {
            const altFitbitConfig = {...fitbitConfig};
            delete altFitbitConfig.timeout;
            new Fitbit(altFitbitConfig, {read: () => {}, write: () => {}});
        } catch (error) {
            console.log("Error", error);
            fail('it should not reach here');
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
            TestUtils.getProfile(fitbit).finally(() => {
                done();
            });
        });
    });

    test('getProfile - no token', (done) => {
        TestUtils.getProfile(fitbit).finally(() => {
            done();
        });
    });

    test('getProfile - has token', (done) => {
        fileTokenManager.read().then(token => {
            fitbit._token = token;
            TestUtils.getProfile(fitbit).finally(() => {
                done();
            });
        });
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

    test('getProfile - faulty config', (done) => {
        fileTokenManager.read().then(token => {
            delete token.access_token;
            fitbit._token = token;
            TestUtils.getProfile(fitbit).then((response) => {
                console.log("Test response:", response);
                done.fail('it should not reach here');
            })
            .catch(error => {
                console.log("Error", error);
                done();
            });
        });
    });
});

describe('Fitbit.request (http failures)', () => {
    let fitbit;
    let fileTokenManager;
    let axiosMock;

    beforeEach(() => {
        const fitbitConfig = appConfig.fitbit;
        fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
        fitbit = new Fitbit(fitbitConfig, fileTokenManager);
        axiosMock = new AxiosMockAdapter(axios);
    });

    afterEach(() => {
        axiosMock.restore();
    });

    test('getProfile - response error', (done) => {
        axiosMock.onGet('https://api.fitbit.com/1/user/-/profile.json').reply(HTTP_RESPONSE_500, {});
        TestUtils.getProfile(fitbit).then((response) => {
            console.log("Test response:", response);
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });
    });

    test('getProfile - response error', (done) => {
        axiosMock.onGet('https://api.fitbit.com/1/user/-/profile.json').reply(HTTP_RESPONSE_400, MOCK_PROFILE);
        TestUtils.getProfile(fitbit).then((response) => {
            console.log("Test response:", response);
            done.fail('it should not reach here');
        }).catch(error => {
            console.log("Error", error);
            done();
        });
    });

});

describe('Fitbit.createData', () => {
    const data = {a: 'a'};
    expect(Fitbit.createData(data)).toBe("a=a");
});

describe('Fitbit.createData (more complex)', () => {
    const data = {a: 'a', b: 33};
    expect(Fitbit.createData(data)).toBe("a=a&b=33");
});


describe('Fitbit.setLogger', () => {
    let fileTokenManager;
    let fitbit;

    beforeEach(() => {
        Fitbit.setLogger(null);
        const fitbitConfig = appConfig.fitbit;
        fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
        fitbit = new Fitbit(fitbitConfig, fileTokenManager);
    });

    afterEach(() => {
        Fitbit.setLogger(LOGGER);
    });

    test('no logger', (done) => {
        Fitbit.setLogger(null);
        TestUtils.getProfile(fitbit).finally(() => {
            done();
        });
    });

    test('function logger', (done) => {
        let counter = 0;
        Fitbit.setLogger(() => { counter++; });
        TestUtils.getProfile(fitbit).then(()=>{
            expect(counter).not.toBe(0);
        }).finally(() => {
            done();
        });
    });

    test('function logger with data', (done) => {
        let counter = 0;
        Fitbit.setLogger(() => { counter++; });
        TestUtils.getProfile(fitbit).then(()=>{
            expect(counter).not.toBe(0);
        }).finally(() => {
            done();
        });
    });

    test('illegal logger', (done) => {
        Fitbit.setLogger({});
        TestUtils.getProfile(fitbit).finally(() => {
            done();
        });
    });
});