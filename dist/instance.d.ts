import { Auth0Client as Auth0ClientClass, Auth0ClientOptions, GetTokenSilentlyOptions, GetTokenSilentlyVerboseResponse, User } from '@auth0/auth0-spa-js';
import { ToRefs } from 'vue';
export interface Auth0User extends User {
    name: string;
    nickname: string;
    org_id: string;
    email: string;
    email_verified: true;
    picture: string;
    updated_at: string;
    sub: string;
}
declare type Auth0Client = Pick<Auth0ClientClass, keyof Auth0ClientClass>;
interface Auth0State {
    auth0Client: Auth0Client;
    loading: boolean;
    isAuthenticated: boolean;
    user: Auth0User | undefined;
    popupOpen: boolean;
    error?: any;
}
declare type InitializationCompletedHookCallback = (callback: () => void | Promise<void>) => void;
declare type InitializationCompleted = () => Promise<void>;
declare type LoginHookCallback = (callback: (user: Auth0User) => void | Promise<void>) => void;
declare type LogoutHookCallback = (callback: () => void | Promise<void>) => void;
export interface Auth0Instance extends ToRefs<Auth0State>, Pick<Auth0Client, 'loginWithPopup' | 'handleRedirectCallback' | 'loginWithRedirect' | 'getIdTokenClaims' | 'getTokenWithPopup' | 'logout'> {
    getTokenSilently: (options?: GetTokenSilentlyOptions) => Promise<string>;
    getTokenSilentlyVerbose: (options?: GetTokenSilentlyOptions) => Promise<GetTokenSilentlyVerboseResponse>;
    onInitializationCompleted: InitializationCompletedHookCallback;
    initializationCompleted: InitializationCompleted;
    onLogin: LoginHookCallback;
    onLogout: LogoutHookCallback;
}
declare type RedirectCallback<T = any> = (appState?: T) => void;
interface Auth0InitConfig<AppStateType> extends Auth0ClientOptions {
    onRedirectCallback?: RedirectCallback<AppStateType>;
    redirectUri?: string;
}
/** Returns the current instance of the SDK */
export declare function useAuth0(): Auth0Instance;
/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
export declare function initAuth0<AppStateType>({ onRedirectCallback, redirectUri, ...options }: Auth0InitConfig<AppStateType>): Auth0Instance;
export {};
