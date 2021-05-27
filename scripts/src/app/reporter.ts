/**
 * Reporter service sends data to Google Analytics for analysis. We don't name
 * this file 'analytics.js' in case an ad-blocker blocks it and breaks EarSketch.
 *
 * @author Creston Bunch
 */
import * as reader from "./reader"


var PAGE_LOADED = false;

/**
 * Record a user login action.
 */
export function login(username: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'user',
    eventAction: 'login',
  });
}

/**
 * Record a user logout action.
 */
export function logout(username: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'user',
    eventAction: 'logout',
  });
}

/**
 * Record an exception that happens.
 */
export function exception(msg: string) {
  ga('send', {
    hitType: 'exception',
    exDescription: msg
  });
}

export function readererror(msg: string) {
    ga('send', {
        hitType: 'event',
        eventCategory: 'reader',
        eventAction: 'error',
        eventLabel: msg
    });
}


export function createScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'createScript',
  });
}


export function deleteScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'deleteScript',
  });
}


export function openScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'openScript',
  });
}


export function openSharedScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'openSharedScript',
  });
}


export function renameScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'renameScript',
  });
}


export function renameSharedScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'renameSharedScript',
  });
}


export function openHistory() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'user',
    eventAction: 'openHistory',
  });
}


export function sidebarTogglesClicked() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'user',
    eventAction: 'sidebarTogglesClicked',
  });
}


export function toggleColorTheme() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'user',
    eventAction: 'toggleColorTheme',
  });
}


export function revertScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'revertScript',
  });
}


export function saveScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'saveScript',
  });
}


export function saveSharedScript() {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'saveSharedScript',
  });
}

export function recommendationSelected(rec: string, folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'sound',
    eventAction: 'recommendationSelected',
    eventLabel: rec + " " + folder,
  });
}

export function recommendationFavorited(rec: string, folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'sound',
    eventAction: 'recommendationFavorited',
    eventLabel: rec + "(" + folder + ")",
  });
}

export function recommendationPasted(rec: string, folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'sound',
    eventAction: 'recommendationPasted',
    eventLabel: rec + "(" + folder + ")",
  });
}

export function recommendationPreviewed(rec: string, folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'sound',
    eventAction: 'recommendationPreviewed',
    eventLabel: rec + "(" + folder + ")",
  });
}

export function recommendedSound(rec: string, folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'sound',
    eventAction: 'recommendedSound',
    eventLabel: rec + "(" + folder + ")",
  });
}

export function recommendationFolder(folder: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'folder',
    eventAction: 'recommendationFolder',
    eventLabel: folder,
  });
}

/**
 * Record a script compilation and result.
 *
 * @param language {string} The language python or JavaScript
 * @param success {boolean} Whether or not the compilation succeeded.
 * @param errorType {string} The type of error
 * @param duration {integer} How long the compilation took (milliseconds).
 */
export function compile(language: string, success: boolean, errorType: string, duration: number) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'script',
    eventAction: 'compile',
    eventLabel: language,
  });

  if (!success) {
    ga('send', {
      hitType: 'event',
      eventCategory: 'script',
      eventAction: 'error',
      eventLabel: errorType,
    });
  }

  ga('send', {
    hitType: 'timing',
    timingCategory: 'script',
    timingVar: 'compile',
    timingValue: duration,
  });
}

/**
 * Record the time it took the page to load from start to when the sounds
 * browser is populated. Only do it once per page load.
 */
export function loadTime() {
  if (PAGE_LOADED == false) {
    var duration = window.performance.now();
    ga('send', {
      hitType: 'timing',
      timingCategory: 'load',
      timingVar: 'page',
      timingValue: duration,
    });
    PAGE_LOADED = true;
  }
}

/**
 * Report the complexity score of a script.
 *
 * @param language {string} The language python or javascript
 * @param script {string} The script source code
 */
export function complexity(language: string, script: string) {
  if (language == "python") {
    var complexity = reader.analyzePython(script);
    var total = reader.total(complexity);
  } else if (language == "javascript") {
    var complexity = reader.analyzeJavascript(script);
    var total = reader.total(complexity);
  } else {
    return;
  }

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'userFunc',
    eventLabel: complexity.userFunc,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'booleanConditionals',
    eventLabel: complexity.booleanConditionals,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'conditionals',
    eventLabel: complexity.conditionals,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'loops',
    eventLabel: complexity.loops,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'lists',
    eventLabel: complexity.lists,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'listOps',
    eventLabel: complexity.listOps,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'strOps',
    eventLabel: complexity.strOps,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'complexity',
    eventAction: 'total',
    eventLabel: total,
    eventValue: total,
  });
}

/**
 * Report a shared script.
 *
 * @param method {string} The sharing method: link, people, or soundcloud
 * @param license {string} The license used
 */
export function share(method: string, license: string) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'share',
    eventAction: 'method',
    eventLabel: method,
  });

  ga('send', {
    hitType: 'event',
    eventCategory: 'share',
    eventAction: 'license',
    eventLabel: license,
  });
}

if (true) {
//if (window.location.hostname === 'earsketch.gatech.edu') {
  (function(i:any,s,o,g,r:any,a?:any,m?:any){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*(new Date() as any);a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-33307046-2', 'auto');
  ga('send', 'pageview');
}

declare var ga: (action: string, data: any, mysterious_third_argument?: string) => void