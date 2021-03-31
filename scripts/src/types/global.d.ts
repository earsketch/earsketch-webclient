/**
 * A temporary global space for defining types and structs used in our .js files.
 * The types here are not checked by the TypeScript compiler, so use them with caution.
 * Also, they should be moved to more appropriate locations in .ts files as part of the JS->TS migration.
 **/

declare var URL_DOMAIN: string;
declare var SITE_BASE_URI: string;
declare var BUILD_NUM: string;
declare var FLAGS: any;
declare var ESApiDoc: any;
declare var ESCurr_TOC: any;
declare var ESCurr_Pages: any;
declare var ESCurr_SearchDoc: any;

declare var app: any;
declare var esconsole: any;
declare var userNotification: any;
declare var hljs: any;
declare var Hilitor: any;
declare var lunr: any;

declare module 'angular' {
    var element: any
    interface IScope {
        [key: string]: any;
    }
    interface IRootScopeService {
        [key: string]: any;
    }
}