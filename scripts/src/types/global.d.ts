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
declare var ESCurr_Pages: number[][];
declare var ESCurr_SearchDoc: {
    title: string
    id: string
    text: string
}[];

declare var app: any;
declare var hljs: any;
declare var Hilitor: any;
declare var lamejs: any;
// NOTE: It looks like bringing in d3 types would require upgrading past d3 v3,
// which is a nontrivial undertaking because of significant API changes.
// (I spent some time of this and decided against it; we might just drop the d3 dependency anyway.)
declare var d3: any;

declare module 'angular' {
    var element: any
    interface IScope {
        [key: string]: any;
    }
    interface IRootScopeService {
        [key: string]: any;
    }
}