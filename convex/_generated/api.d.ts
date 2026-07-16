/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as combatCatalog from "../combatCatalog.js";
import type * as cosmetics from "../cosmetics.js";
import type * as patchNotes from "../patchNotes.js";
import type * as persistentItems from "../persistentItems.js";
import type * as progression from "../progression.js";
import type * as season from "../season.js";
import type * as stats from "../stats.js";
import type * as v3Constants from "../v3Constants.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  combatCatalog: typeof combatCatalog;
  cosmetics: typeof cosmetics;
  patchNotes: typeof patchNotes;
  persistentItems: typeof persistentItems;
  progression: typeof progression;
  season: typeof season;
  stats: typeof stats;
  v3Constants: typeof v3Constants;
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
