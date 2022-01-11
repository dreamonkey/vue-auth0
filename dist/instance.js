import createAuth0Client from '@auth0/auth0-spa-js';
import { invoke, until } from '@vueuse/core';
import { reactive, toRefs } from 'vue';
/** Define a default action to perform after authentication */
const DEFAULT_REDIRECT_CALLBACK = () => window.history.replaceState({}, document.title, window.location.pathname);
let _instance;
/** Returns the current instance of the SDK */
export function useAuth0() {
    if (!_instance) {
        throw new Error('Auth0 instance has not been initialized yet, but sure to call initAuth0 first');
    }
    return _instance;
}
/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
export function initAuth0({ onRedirectCallback = DEFAULT_REDIRECT_CALLBACK, redirectUri = window.location.origin, ...options }) {
    if (_instance) {
        return _instance;
    }
    const state = reactive({
        // `auth0Client` should be optional as it's initialized into the IIFE,
        // but it'll always be defined when called via the instance,
        // setting it optional would mean dealing with a lot of linting false positives
        auth0Client: undefined,
        loading: true,
        isAuthenticated: false,
        user: undefined,
        popupOpen: false,
        error: undefined,
    });
    /** Instantiate the SDK client */
    void (async () => {
        // Create a new instance of the SDK client using members of the given options object
        state.auth0Client = await createAuth0Client({
            ...options,
            client_id: options.client_id,
            redirect_uri: redirectUri,
        });
        try {
            // If the user is returning to the app after authentication..
            if (window.location.search.includes('code=') &&
                window.location.search.includes('state=')) {
                // handle the redirect and retrieve tokens
                const result = await state.auth0Client.handleRedirectCallback();
                state.error = undefined;
                // Notify subscribers that the redirect callback has happened, passing the appState
                // (useful for retrieving any pre-authentication state)
                onRedirectCallback(result.appState);
            }
        }
        catch (e) {
            state.error = e;
        }
        finally {
            // Initialize our internal authentication state
            state.isAuthenticated = await state.auth0Client.isAuthenticated();
            state.user = await state.auth0Client.getUser();
            state.loading = false;
        }
    })();
    /** Authenticates the user using a popup window */
    const loginWithPopup = async (options, config) => {
        state.popupOpen = true;
        try {
            await state.auth0Client.loginWithPopup(options, config);
            state.user = await state.auth0Client.getUser();
            state.isAuthenticated = await state.auth0Client.isAuthenticated();
            state.error = undefined;
        }
        catch (e) {
            state.error = e;
            console.error(e);
        }
        finally {
            state.popupOpen = false;
        }
        state.user = await state.auth0Client.getUser();
        state.isAuthenticated = true;
    };
    /** Handles the callback when logging in using a redirect */
    const handleRedirectCallback = async () => {
        state.loading = true;
        try {
            const result = await state.auth0Client.handleRedirectCallback();
            state.user = await state.auth0Client.getUser();
            state.isAuthenticated = true;
            state.error = undefined;
            return result;
        }
        catch (e) {
            state.error = e;
            // Won't be compliant with `Auth0Client['handleRedirectCallback']` without a returned object
            return {};
        }
        finally {
            state.loading = false;
        }
    };
    /** Authenticates the user using the redirect method */
    const loginWithRedirect = (options) => {
        return state.auth0Client.loginWithRedirect(options);
    };
    /** Returns all the claims present in the ID token */
    const getIdTokenClaims = (options) => {
        return state.auth0Client.getIdTokenClaims(options);
    };
    /** Returns the access token. If the token is invalid or missing, a new one is retrieved */
    const getTokenSilently = (options = {}) => {
        return state.auth0Client.getTokenSilently({
            ...options,
            detailedResponse: false,
        });
    };
    /** Fetches a new access token and returns the response from the /oauth/token endpoint, omitting the refresh token */
    const getTokenSilentlyVerbose = (options = {}) => {
        return state.auth0Client.getTokenSilently({
            ...options,
            detailedResponse: true,
        });
    };
    /** Gets the access token using a popup window */
    const getTokenWithPopup = (options) => {
        return state.auth0Client.getTokenWithPopup(options);
    };
    /** Logs the user out and removes their session on the authorization server */
    const logout = async (options) => {
        await state.auth0Client.logout(options);
        state.isAuthenticated = false;
        state.user = undefined;
        return;
    };
    const onInitializationCompleted = (callback) => {
        void invoke(async () => {
            await until(() => state.loading).toBe(false);
            await callback();
        });
    };
    const onLogin = (callback) => {
        void invoke(async () => {
            await until(() => state.isAuthenticated && !!state.user).toBe(true);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await callback(state.user);
        });
    };
    // We leverage onLogin hook to make sure the logout took place after a login
    const onLogout = (callback) => {
        onLogin(async () => {
            await until(() => !state.isAuthenticated && !state.user).toBe(true);
            await callback();
        });
    };
    const initializationCompleted = () => new Promise((resolve) => {
        onInitializationCompleted(() => resolve());
    });
    _instance = {
        loginWithPopup,
        handleRedirectCallback,
        loginWithRedirect,
        getIdTokenClaims,
        getTokenSilently,
        getTokenSilentlyVerbose,
        getTokenWithPopup,
        logout,
        onInitializationCompleted,
        initializationCompleted,
        onLogin,
        onLogout,
        ...toRefs(state),
    };
    return _instance;
}
//# sourceMappingURL=instance.js.map