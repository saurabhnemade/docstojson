/*jshint esnext: true */
module.exports = {
  getCommentSections: function(contents) {
    var sections = [];
    var parts = contents.split(/\/\*\*/g);
    for (var i=0; i<parts.length; i++) {
      var endCommentLocation = parts[i].indexOf("*/");
      if (endCommentLocation > -1) {
        sections.push(parts[i].substring(0, endCommentLocation));
      }
    }
    return sections;
  },
  clean: function(line) {
    return line.replace(/\s\*\s/gm, "").trim();
  },
  parseLinks: function(line) {
    var rgx = /\{@link ([^\s\}]+){1}( [^\}]+)?\}/gm; // parse @link directives
    return line.replace(rgx, function(match, href, content) {
      var target = href.startsWith('#') ? '_self' : '_blank',
          text = (content || href).trim();
      return '<a href="' + href + '" target="' + target + '"">' + text + '</a>';
    });
  },
  addClassCore: function(cls, comment, filename) {
    var rgx = /[\s\S]*@class ([a-zA-Z0-9\.]+)[\s\S]*@extends ([a-zA-Z\.]+)([\s\S]*)@example([\s\S]*)/gm;
    var props = rgx.exec(comment);
    if (props && props.length === 5) {
      cls.name = this.clean(props[1]);
      cls.ext = this.clean(props[2]);
      cls.comments = this.parseLinks(this.clean(props[3]));
      cls.example = this.clean(props[4]);
    } else {
      process.stderr.write(filename + " : couldn't find all core properties @class, @extends, @example... missing something?\n");
    }
    return cls;
  },
  addClassProp: function(cls, comment, filename) {
    var rgx = /@prop \{([^\}]*)\} ([^\s]*) \[(.*)\]([\s\S]*)/gm;
    var props = rgx.exec(comment);
    if (props && props.length === 5) {
      if (!cls.properties) {
        cls.properties = [];
      }
      cls.properties.push({
        type: this.clean(props[1]),
        name: this.clean(props[2]),
        def: this.clean(props[3]),
        comments: this.parseLinks(this.clean(props[4]))
      });
    }
    return cls;
  },
  addClassFunction: function(cls, comment, filename) {
    var rgx = /@function ([^\s]*)\s*?([\s\S]*)/gm;
    var func = rgx.exec(comment);
    if (func && func.length === 3) {
      if (!cls.functions) {
        cls.functions = [];
      }
      var parsedComments = this.parseFunctionComments(func[2], filename);
      cls.functions.push({
        name: this.clean(func[1]),
        comments: this.parseLinks(parsedComments.comments),
        params: parsedComments.params
      });
    }
    return cls;
  },
  parseFunctionComments: function(comments, filename) {
    var rgx = /@param \{([^\}]*)\} ([^\s]*)\s*?([^\*]*)/gm;
    var matches = comments.match(rgx);
    var params = [];
    for (var i = 0; i < matches.length; i++) {
      var param = rgx.exec(matches[i]);
      if (param) {
        params.push({
          type: param[1],
          name: param[2],
          comments: this.clean(param[3])
        });
      } else {
        process.stderr.write(filename + " : unable to parse params from @function doc comment. Please check comment syntax.\n    " + matches[i]);
      }
      rgx.lastIndex = 0;
      comments = comments.replace(matches[i], '');
    }
    return { comments: comments.replace(/\*\s/gm, ''), params: params };
  },
  parse: function(contents, filename) {
    if (contents.indexOf("@class") < 0) return undefined;
    var comments = this.getCommentSections(contents);
    var cls = {};
    for (var i=0; i<comments.length; i++) {
      var comment = comments[i];
      if (comment.indexOf("@class") > -1) {
        cls = this.addClassCore(cls, comment, filename);
      } else if (comment.indexOf("@prop") > -1) {
        cls = this.addClassProp(cls, comment, filename);
      } else if (comment.indexOf("@function") > -1) {
        cls = this.addClassFunction(cls, comment, filename);
      }
    }
    return cls;
  }

};
