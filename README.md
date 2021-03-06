# vue-auth0

This is a wrapper around `@auth0/auth0-spa-js` meant to ease its usage into Vue3 projects.
This is heavily inspired by the [snippet](https://auth0.com/docs/quickstart/spa/vuejs#create-an-authentication-wrapper) into Auth0 official documentation, but with a couple more helpers.

This wrapper supports both JS and TS codebases.

## Install

```sh
yarn add @dreamonkey/vue-auth0
```

Initialize the singleton instance

```ts
import { Auth0Instance, initAuth0 } from '@dreamonkey/vue-auth0';
// NEVER HARDCODE AND/OR COMMIT YOUR SECRETS
import { domain, clientId } from './env.json';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: Auth0Instance;
  }
}

// Vue CLI/Vite project
import { createApp } from 'vue';

const app = createApp({});

app.config.globalProperties.$auth = initAuth0({
  client_id: clientId,
  domain,
});

// Quasar CLI project (using boot files)
export default boot(({ app }) => {
  app.config.globalProperties.$auth = initAuth0({
    client_id: clientId,
    domain,
  });
});
```

Check out [`@auth0/auth0-spa-js` documentation](https://github.com/auth0/auth0-spa-js#documentation) to learn about initialization options, as `initAuth0` accepts all options from original `createAuth0Client` method.

You can then access the Auth0 singleton instance via `useAuth0` composable

```ts
import { useAuth0 } from '@dreamonkey/vue-auth0';

const { user /*, ... other stuff */ } = useAuth0();
```

or, in templates or Option API, via the `$auth` global property

```ts
<button @click="$auth.loginWithRedirect()">Login</button>
```

## Options

`initAuth0` accepts a couple of custom options in addition to those of `createAuth0Client` method.

### redirectUri (default: `window.location.origin`)

Overwrites native `redirect_uri` option setting a sensible default for it.
If your redirect login flow starts from a page with URL `http://my-domain.com/landing`, the user will be redirected to `http://my-domain.com` when the flow completes.

**Remember you need to add whichever URL is provided with `redirectUri` to "Allowed Callback URLs" list into your Auth0 configuration.**

### onRedirectCallback

When redirect login flow completes, this callback is called with any previously stored state as param.
If not specified, it replaces the current browser history entry with current `window.location.pathname`.
This can be used to redirect the user to the originally requested page after login took place (see Recipes section).

## Reactive refs

These refs has been added for your ease, to consume Auth0 SDK in the "Vue way"

### `user` (default: `undefined`)

The original `getUser()` async method served as a reactive reference.
It updates when either a login or logout action is performed.
The content after login depends on your Auth0 configuration.

```ts
const { user } = useAuth0();
// Before login
console.log(user.value); // undefined
// After login
console.log(user.value); // { ... }
```

Its type is [`User`](https://auth0.github.io/auth0-spa-js/classes/user.html) by default, you can augment `Auth0User` type to specify custom properties or to remove optionality from existing keys.

```ts
import '@dreamonkey/vue-auth0';

declare module '@dreamonkey/vue-auth0' {
  interface Auth0User {
    twitter_handle: string; // <--- Specify a custom property which doesn't exist into User by default
    name: string; // <--- Override User property, it won't be shown as optional anymore
  }
}
```

### `isAuthenticated` (default: `false`)

The original `isAuthenticated()` async method served as a reactive reference.
`true` if the user is authenticated, `false` otherwise.
Helpful to change the behaviour of your app depending on the user authentication status, eg. adding an header to all outgoing requests only when the user is authenticated

```ts
const { isAuthenticated } = useAuth0();
// Before login
console.log(isAuthenticated.value); // false
// After login
console.log(isAuthenticated.value); // true
```

### `loading` (default: `true`)

`true` if Auth0 client initialization is still taking place, `false` when initialization completes.

### `popupOpen` (default: `false`)

`true` if the login popup related to `loginWithPopup()` method is open, `false` otherwise.

### `error` (default: `undefined`)

Contains the error generated by the underlying library in case something goes wrong.

### `auth0Client` (default: `undefined`)

Reference to the underlying Auth0 client created with original `createAuth0Client()` method.

## Methods

### `getTokenSilently`

Original `getTokenSilently` method with `detailedResponse` forced to `false`.
This is how the method behaved before version 1.19.0.

### `getTokenSilentlyVerbose`

Original `getTokenSilently` method with `detailedResponse` forced to `true`.
Splitting the original method was required to support proper types, as wrapping a function and trying to infer its return type won't work if the original function has an overloaded signature.

### `initializationCompleted`

Returns a Promise resolving when initialization completes.
Use this when you need to be sure initialization is completed and you cannot use `onInitializationCompleted` hook.

```ts
const { initializationCompleted } = useAuth0();

async function doStuff() {
  // business ah-ah
  await initializationCompleted();
  // profit!
}
```

## Hooks

Some common events hooks have been created, ensuring your code will be executed only after a given trigger condition is met.
Since they're based on internal state refs rather than an event system, if the trigger condition is valid when the hook is registered (eg. login already happened) the callback will be executed immediately.

### `onInitializationCompleted`

Trigger: Auth0 client initialization completes.
Use case: run code using Auth0 only after the client is initialized.

`initializationCompleted` method could be used to achieve the same result, but with a different syntax.

```ts
const { onInitializationCompleted } = useAuth0();

onInitializationCompleted(() => {
  // unless initialization errors occurred, auth0Client will always be defined here
});
```

### `onLogin`

Trigger: login process completes successfully.
Use case: run code once the user logs in.
User data object is provided as a parameter for convenience.

Examples:

- initialize analytics only for authenticated users;
- establish a websocket connection once the user is authenticated;
- add an inactivity timeout.

```ts
const { onLogin } = useAuth0();

onLogin((user) => {
  console.log(user); // { .. user data .. }
});
```

### `onLogout`

Trigger: logout process completes.
Use case: run code once the user logs out.

Examples:

- cleanup user-related data;
- interrupt a websocket connection reserved to authenticated users.

```ts
const { onLogout } = useAuth0();

onLogout(() => {
  localStorage.removeItem('user-data');
});
```

## Vue Router Guards

If you're using Vue Router, you'll often need to guard some routes depending on the user authentication status.
This package provides you some helpers to deal with common scenarios.

### `authGuard`

Use this helper to create guards relying on the user authentication status.
The first param your callback receives is a boolean representing the authentication status, while the second and third params are the deprecated `to` and `from` Vue Router guards params.
The returned guard is async as it awaits for the Auth0 client to be initialized before proceeding.

```ts
export const redirectIfAuthenticatedGuard = authGuard((isAuthenticated) => {
  if (isAuthenticated) {
    return { name: 'home' };
  }
});
```

### `redirectToLoginGuard`

Triggers `loginWithRedirect` if the user isn't authenticated, storing into `appState.targetUrl` the URL the user tried to access.
You can then access it into `onRedirectCallback` to redirect the user to the page he initially requested.

## Recipes

Here are some common use cases you may need in your projects.
We'll gladly accept PRs adding new recipes if the use case is common enough.

### Add access token as Authorization header using Axios

```ts
import { useAuth0 } from '@dreamonkey/vue-auth0';
import axios, { AxiosRequestConfig } from 'axios';

async function addAuthToken(config: AxiosRequestConfig) {
  const { getTokenSilently } = useAuth0();
  const token = await getTokenSilently();
  addHeader(config, 'Authorization', `Bearer ${token}`);
  return config;
}

axios.interceptors.request.use(addAuthToken);
```

### Redirect to requested page after login

```ts
import { initAuth0 } from '@dreamonkey/vue-auth0';
import { useRouter } from 'vue-router';
import { domain, clientId } from './env.json';

const router = useRouter();

initAuth0<{ targetUrl?: string }>({
  client_id: clientId,
  domain,
  onRedirectCallback: (appState) =>
    router.push(appState?.targetUrl ?? window.location.pathname),
});
```

```ts
import { RouteRecordRaw } from 'vue-router';
import { redirectToLoginGuard } from '@dreamonkey/vue-auth0';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/authenticated.vue'),
    beforeEnter: redirectToLoginGuard,
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('pages/home.vue'),
      },
    ],
  },
];
```

### Guard guest and authenticated pages

```ts
import { RouteRecordRaw } from 'vue-router';
import { authGuard } from '@dreamonkey/vue-auth0';

export const redirectIfAuthenticatedGuard = authGuard((isAuthenticated) => {
  if (isAuthenticated) {
    return { name: 'home' };
  }
});

export const redirectIfGuestGuard = authGuard((isAuthenticated) => {
  if (!isAuthenticated) {
    return { name: 'landing' };
  }
});

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => ({ name: 'landing' }),
  },
  {
    path: '/',
    name: 'guest',
    component: () => import('layouts/guest.vue'),
    beforeEnter: redirectIfAuthenticatedGuard,
    children: [
      {
        path: 'landing',
        name: 'landing',
        component: () => import('pages/landing.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/authenticated.vue'),
    beforeEnter: redirectIfGuestGuard,
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('pages/home.vue'),
      },
    ],
  },
];
```

### Render a different page depending on authentication status

```ts
import { RouteRecordRaw } from 'vue-router';
import { useAuth0 } from '@dreamonkey/vue-auth0';

const routes: RouteRecordRaw[] = [
  {
    path: '/home',
    component: async () => {
      const { user, initializationCompleted } = useAuth0();
      await initializationCompleted();

      if (!user.value) {
        return import('pages/landing.vue');
      }

      switch (user.value.role) {
        case 'admin':
          return import('pages/home/admin.vue');
        case 'manager':
          return import('pages/home/manager.vue');
        default:
          return import('pages/home/user.vue');
      }
    },
  },
];
```
