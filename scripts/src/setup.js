// get the current site directory (e.g. /earsketch2 or /earsketchdev)
// console.log('Using site base uri: ' + SITE_BASE_URI, ['SETUP']);

// Soundcloud initialization
(function () {
    // TODO: Make them environment variables.
    var sites = {
        'earsketch.gatech.edu': '595113847a0edfd82dcfadeed2051dca',
        'earsketch-dev.lmc.gatech.edu': '0d5850bd5b161fa72864477f71de2317',
        'localhost:9090': '63b0323e190f967594cdaf5f8151ccf0',
        'localhost/': 'cc046c69568c6aa15f4468e5b327b134'
    };

    Object.keys(sites).forEach(function (v) {
        if (SITE_BASE_URI.indexOf(v) > -1) {
            SC.initialize({
                client_id: sites[v],
                redirect_uri: SITE_BASE_URI + '/sc.html'
            });
            return null;
        }
    });
})();

var myLayout, innerLayout;

function resizeNavigationWidth(override, size){
    if(override){
        $("#curriculum div.navigation").width(0);
    }
    else if(size != null){
      $("#curriculum div.navigation").width(size);
    }
    else{
    // Update navigation size
        $("#curriculum div.navigation").width($("#curriculum").width() - 5);
    }
}

function toggleSlidePane(lessonUrl){
   var scope = angular.element('#curriculum').scope();
   scope.toggleSlides();
   scope.loadLesson(lessonUrl);
   scope.$apply();
}


// TODO: rogue jquary code doing bad things here (Dec 11, 2017)
// $(function() {
//     $("#sidenav-workstation").click(function(){
//         if ($("#viz").is(":visible")) {
//             $("#zoom-container").show();
//             $("#viz").hide();
//             return null;
//         }
//     });
//
//     $("#sidenav-canvas").click(function(){
//         var scope = angular.element('#daw-container').scope();
//
//         if (scope.result !== null) {
//             if ($("#viz").is(":visible")) {
//                 $("#zoom-container").show();
//                 $("#viz").hide();
//
//             } else {
//                 $("#zoom-container").hide();
//                 $("#viz").show();
//             }
//         }
//     });
// });

//app.config(function($provide, $uibTooltipProvider) {
//    // for Safari ui.bootstrap tooltip-trigger="focus" not working
//    $uibTooltipProvider.setTriggers({
//        'click focus': 'mouseleave blur'
//    });
//});
