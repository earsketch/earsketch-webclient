# Droplet Python mode
#
# Copyright (c) 2015 Anthony Bau
# MIT License

helper = require '../helper.coffee'
model = require '../model.coffee'
parser = require '../parser.coffee'
treewalk = require '../treewalk.coffee'

skulpt = require '../../vendor/skulpt'

PYTHON_KEYWORDS = ['and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'print', 'raise', 'return', 'try', 'while', 'with', 'yield']

PYTHON_BUILTIN = ['type', 'object', 'hashCount', 'none', 'NotImplemented', 'pyCheckArgs', 'pyCheckType', 'checkSequence', 'checkIterable', 'checkCallable', 'checkNumber', 'checkComplex', 'checkInt', 'checkFloat', 'checkString', 'checkClass', 'checkBool', 'checkNone', 'checkFunction', 'func', 'range', 'asnum$', 'assk$', 'asnum$nofloat', 'round', 'len', 'min', 'max', 'any', 'all', 'sum', 'zip', 'abs', 'ord', 'chr', 'int2str_', 'hex', 'oct', 'bin', 'dir', 'repr', 'open', 'isinstance', 'hash', 'getattr', 'setattr', 'raw_input', 'input', 'jseval', 'jsmillis', 'superbi', 'eval_', 'map', 'reduce', 'filter', 'hasattr', 'pow', 'quit', 'issubclass', 'globals', 'divmod', 'format', 'bytearray', 'callable', 'delattr', 'execfile', 'frozenset', 'help', 'iter', 'locals', 'memoryview', 'next_', 'property', 'reload', 'reversed', 'unichr', 'vars', 'xrange', 'apply_', 'buffer', 'coerce', 'intern', 'BaseException', 'Exception', 'StandardError', 'AssertionError', 'AttributeError', 'ImportError', 'IndentationError', 'IndexError', 'KeyError', 'NameError', 'UnboundLocalError', 'OverflowError', 'ParseError', 'RuntimeError', 'SuspensionError', 'SystemExit', 'SyntaxError', 'TokenError', 'TypeError', 'ValueError', 'ZeroDivisionError', 'TimeLimitError', 'IOError', 'NotImplementedError', 'NegativePowerError', 'ExternalError', 'OperationError', 'SystemError', 'method', 'seqtype', 'list', 'interned', 'str', 'tuple', 'dict', 'numtype', 'biginteger', 'int_', 'bool', 'float_', 'nmber', 'lng', 'complex', 'slice', 'slice$start', 'slice$stop', 'slice$step', 'set', 'print', 'module', 'structseq_types', 'make_structseq', 'generator', 'makeGenerator', 'file', 'enumerate', '__import__', 'timSort', 'listSlice', 'sorted']

PYTHON_RANDOM = ['seed', 'random', 'randint', 'randrange', 'uniform', 'triangular', 'gauss', 'normalvariate', 'lognormvariate', 'expovariate', 'choice', 'shuffle', 'sample']

PYTHON_MATH = ['pi', 'e', 'fabs', 'asin', 'acos', 'atan', 'atan2', 'sin', 'cos', 'tan', 'asinh', 'acosh', 'atanh', 'sinh', 'cosh', 'tanh', 'ceil', 'copysign', 'floor', 'sqrt', 'trunc', 'log', 'log10', 'isnan', 'exp', 'pow', 'radians', 'degrees', 'hypot', 'factorial']

#ES_KEYWORDS = ['init', 'setTempo', 'finish', 'fitMedia', 'makeBeat', 'setEffect', 'selectRandomFile', 'insertMedia', 'analyze', 'analyzeForTime', 'analyzeTrack', 'analyzeTrackForTime', 'dur', 'importImage', 'importFile', 'insertMediaSection', 'makeBeatSlice', 'readInput', 'replaceListElement', 'replaceString', 'reverseList', 'reverseString', 'rhythmEffects', 'shuffleList', 'shuffleString']

PYTHON_KEYWORDS = PYTHON_KEYWORDS.concat(PYTHON_BUILTIN, PYTHON_RANDOM, PYTHON_MATH)
#PYTHON_KEYWORDS = PYTHON_KEYWORDS.concat(PYTHON_BUILTIN)
PYTHON_KEYWORDS = PYTHON_KEYWORDS.filter((v, i) -> return PYTHON_KEYWORDS.indexOf(v) == i) # remove possible duplicates

# PARSER SECTION
parse = (context, text) ->
  result = transform skulpt.parser.parse('file.py', text, context), text.split('\n')
  return result

getBounds = (node, lines) ->
  bounds = {
    start: {
      line: node.lineno - 1
      column: node.col_offset
    }
  }
  if node.children? and node.children.length > 0
    if skulpt.tables.ParseTables.number2symbol[node.type] is 'suite'
      # Avoid including DEDENT in the indent.
      bounds.end = getBounds(node.children[node.children.length - 2], lines).end
    else
      bounds.end = getBounds(node.children[node.children.length - 1], lines).end
  else
    bounds.end = {
      line: node.line_end - 1
      column: node.col_end
    }
  return bounds

getFunctionName = (node) ->
  if node.type is 'trailer'
    # parent should have a subtree containing T_KEYWORD node
    siblingNode = node.parent?.children[0]?.children?[0]
  else if node.type is 'power' and node.children.some((n) -> n.type is 'trailer')
    siblingNode = node.children[0].children?[0]

  if siblingNode?.type in ['T_KEYWORD', 'T_NAME']
    return siblingNode.meta.value

  if node.parent? then getFunctionName(node.parent)

getArgNum = (node) ->
  if node.parent?
    if node.type is 'argument'
      # parent should have an arglist node containing arg, T_COMMA, arg, T_COMMA, etc.
      index = node.parent.children.indexOf(node)
      if index > -1
        return Math.floor(index/2) # to skip commas (even indices)
    else if node.parent.children.length > 1
      return null
    else
      return getArgNum(node.parent)

getDropdown = (opts, node) ->
  argNum = getArgNum(node)
  funcName = getFunctionName(node)

  if argNum? and funcName?
    return opts.functions?[funcName]?.dropdown?[argNum] ? null

getColor = (opts, node) ->
  if getArgNum(node) is null
    return opts.functions?[getFunctionName(node)]?.color ? null

insertButton = (opts, node) ->
  if node.type is 'if_stmt'
    return {addButton: true}
  else
    return null

handelButton = (text, button, oldBlocks) ->
  checkElif = (node) ->
    res = 'init'
    if node.type is 'if_stmt'
      node.children?.forEach((c) -> if c.type is 'T_KEYWORD' then res = c.meta.value)
    else
      node.children?.forEach((c) -> res = checkElif(c))
    return res

  if button is 'add-button' and 'if_stmt' in oldBlocks.classes
    node = parse({}, text).children[0]
    elif = checkElif(node)

    if elif is 'if' or elif is 'elif'
      text += '''\nelse:\n  print \'hi\''''
    else if elif is 'else'
      text = text.replace('else:', 'elif a == b:')
      text += '''\nelse:\n  print \'hi\''''

  return text


transform = (node, lines, parent = null) ->
  type = skulpt.tables.ParseTables.number2symbol[node.type] ? skulpt.Tokenizer.tokenNames[node.type] ? node.type

  if type is 'T_NAME'
    if node.value in PYTHON_KEYWORDS
      type = 'T_KEYWORD'

  result = {
    type: type
    bounds: getBounds(node, lines)
    parent: parent
    meta: {
      value: node.value ? null
    } # language-specific meta-data
  }

  result.children = if node.children?
      node.children.map ((x) -> transform(x, lines, result))
    else []

  return result

# CONFIG SECTION
config = {
  INDENTS: ['suite']
  SKIPS: [
    'file_input'
    'parameters'
    'compound_stmt'
    'small_stmt'
    'simple_stmt'
    'trailer'
    'arglist'
    'testlist_comp'
    'with_item'
    'listmaker'
    'list_for'
  ]
  PARENS : [
    'stmt'
  ]
  SOCKET_TOKENS : [
    'T_NAME', 'T_NUMBER', 'T_STRING'
  ]
  COLORS_FORWARD : {
    'term': 'value'
    'funcdef': 'control'
    'for_stmt': 'control'
    'while_stmt': 'control'
    'with_stmt': 'control'
    'if_stmt': 'control'
    'try_stmt': 'control'
    'import_stmt': 'command'
    'print_stmt': 'command'
    'expr_stmt': 'command'
    'return_stmt': 'return'
    'testlist': 'value'
    'comparison': 'value'
    'test': 'value'
    'expr': 'value'
  }
  COLORS_BACKWARD : {}
  BLOCK_TOKENS: [], PLAIN_SOCKETS: [], VALUE_TYPES: [], BLOCK_TYPES: []
  DROPDOWN_CB: getDropdown
  COLOR_CB: getColor
  BUTTON_CB: insertButton
  HANDLE_BUTTON_CB: handelButton
}

result = treewalk.createTreewalkParser parse, config
result.canParse = (node) ->
  return ('stmt' in node.classes) or
         ('small_stmt' in node.classes)
module.exports = parser.wrapParser result