import type { NavigationGuard } from 'vue-router';
export declare function authGuard(callback: (isAuthenticated: boolean, to: Parameters<NavigationGuard>[0], from: Parameters<NavigationGuard>[1]) => ReturnType<NavigationGuard>): NavigationGuard;
export declare const redirectToLoginGuard: NavigationGuard;
