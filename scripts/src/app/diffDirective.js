app.directive("diff", function() {

  /**
   * Update the diff view.
   */
  function update(scope, element, attributes) {
    if (scope.original === undefined || scope.modified === undefined) {
      return;
    }
    // Perform Diff //
    // get the baseText and newText values from the two textboxes, and split them into lines
    var newtxt = difflib.stringAsLines(scope.original);
    var base = difflib.stringAsLines(scope.modified);

    var sm = new difflib.SequenceMatcher(base, newtxt);

    // get the opcodes from the SequenceMatcher instance
    // opcodes is a list of 3-tuples describing what changes should be made to the base text
    // in order to yield the new text
    var opcodes = sm.get_opcodes();

    var vc = element;
    vc.empty();

    // build the diff view and add it to the current DOM
    vc.append(diffview.buildView({
        baseTextLines: base,
        newTextLines: newtxt,
        opcodes: opcodes,
        // set the display titles for each resource
        baseTextName: "Base Text",
        newTextName: "New Text",
        contextSize: null,
        viewType: 1
    }));

    // Add syntax Highlighting //
    element.each(function(i, block) {
      hljs.highlightBlock(block);
    }, true);

  }

  return {
    scope: {
      original: "=",
      modified: "="
    },
    transclude: true,
    link: function (scope, element, attributes) {

      scope.$watch(function() { return [scope.original, scope.modified]; },
      function() {
        update(scope, element, attributes);
      }, true);
    }
  };

});

