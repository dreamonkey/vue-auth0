import { useAuth0 } from './instance';
export function authGuard(callback) {
    return async (to, from) => {
        const { isAuthenticated, initializationCompleted } = useAuth0();
        await initializationCompleted();
        return callback(isAuthenticated.value, to, from);
    };
}
export const redirectToLoginGuard = authGuard(async (isAuthenticated, to) => {
    const { loginWithRedirect } = useAuth0();
    // If the user is authenticated, continue with the route
    if (isAuthenticated) {
        return;
    }
    // Otherwise, log in
    await loginWithRedirect({ appState: { targetUrl: to.fullPath } });
});
//# sourceMappingURL=guard.js.map