/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity_logs from "../activity_logs.js";
import type * as customers from "../customers.js";
import type * as departments from "../departments.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as sales from "../sales.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity_logs: typeof activity_logs;
  customers: typeof customers;
  departments: typeof departments;
  migration: typeof migration;
  notifications: typeof notifications;
  payments: typeof payments;
  profiles: typeof profiles;
  projects: typeof projects;
  sales: typeof sales;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
