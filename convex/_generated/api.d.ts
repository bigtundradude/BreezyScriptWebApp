/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiSettings from "../aiSettings.js";
import type * as auth from "../auth.js";
import type * as bankAudience from "../bankAudience.js";
import type * as bankDrafts from "../bankDrafts.js";
import type * as bankPersonalize from "../bankPersonalize.js";
import type * as bankPersonas from "../bankPersonas.js";
import type * as bankQuestions from "../bankQuestions.js";
import type * as bankSnippets from "../bankSnippets.js";
import type * as bankStructures from "../bankStructures.js";
import type * as bankThumbnails from "../bankThumbnails.js";
import type * as bankTitles from "../bankTitles.js";
import type * as channels from "../channels.js";
import type * as feedbackFns from "../feedbackFns.js";
import type * as foundationAssets from "../foundationAssets.js";
import type * as http from "../http.js";
import type * as ideaBank from "../ideaBank.js";
import type * as ideas from "../ideas.js";
import type * as lib_builtinTitleShapes from "../lib/builtinTitleShapes.js";
import type * as lib_defaultStructures from "../lib/defaultStructures.js";
import type * as lib_owner from "../lib/owner.js";
import type * as library from "../library.js";
import type * as llm_anthropic from "../llm/anthropic.js";
import type * as llm_index from "../llm/index.js";
import type * as llm_openaiCompat from "../llm/openaiCompat.js";
import type * as llm_types from "../llm/types.js";
import type * as notes from "../notes.js";
import type * as productions from "../productions.js";
import type * as scripts from "../scripts.js";
import type * as seed from "../seed.js";
import type * as seedIdeaBank from "../seedIdeaBank.js";
import type * as titles from "../titles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiSettings: typeof aiSettings;
  auth: typeof auth;
  bankAudience: typeof bankAudience;
  bankDrafts: typeof bankDrafts;
  bankPersonalize: typeof bankPersonalize;
  bankPersonas: typeof bankPersonas;
  bankQuestions: typeof bankQuestions;
  bankSnippets: typeof bankSnippets;
  bankStructures: typeof bankStructures;
  bankThumbnails: typeof bankThumbnails;
  bankTitles: typeof bankTitles;
  channels: typeof channels;
  feedbackFns: typeof feedbackFns;
  foundationAssets: typeof foundationAssets;
  http: typeof http;
  ideaBank: typeof ideaBank;
  ideas: typeof ideas;
  "lib/builtinTitleShapes": typeof lib_builtinTitleShapes;
  "lib/defaultStructures": typeof lib_defaultStructures;
  "lib/owner": typeof lib_owner;
  library: typeof library;
  "llm/anthropic": typeof llm_anthropic;
  "llm/index": typeof llm_index;
  "llm/openaiCompat": typeof llm_openaiCompat;
  "llm/types": typeof llm_types;
  notes: typeof notes;
  productions: typeof productions;
  scripts: typeof scripts;
  seed: typeof seed;
  seedIdeaBank: typeof seedIdeaBank;
  titles: typeof titles;
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
