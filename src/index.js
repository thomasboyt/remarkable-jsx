import util from 'util';
import React from 'react';
import {default as originalRules} from 'remarkable/lib/rules';

let blockTokenOpenCloseMap = {};
const OPEN_TOKEN_RE = /(.*)_open$/;

for (let rule of Object.keys(originalRules)) {
  const match = rule.match(OPEN_TOKEN_RE);

  if (match) {
    const name = match[1];
    blockTokenOpenCloseMap[rule] = name + '_close';
  }
}

const rules = {
  blockquote: 'blockquote',

  heading: (token, content) => {
    const tag = 'h' + token.hLevel;
    return React.createElement(tag, null, ...content);
  },

  bullet_list: 'ul',
  list_item: 'li',
  ordered_list: 'ol',
  paragraph: 'p',

  link: (token, content) => {
    const title = token.title || null;

    return (
      <a href={token.href} title={title}>
        {content}
      </a>
    );
  },

  // TODO: this is complicated and not a block so idk what it even looks like D:
  image: 'img',

  table: 'table',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  td: 'td',
  th: 'th',

  strong: 'strong',
  em: 'em',
  del: 'del',
  ins: 'ins',
  mark: 'mark',
  sup: 'sup',
  sub: 'sub',

  dl: 'dl',
  dt: 'dt',
  dd: 'dd'
};

function wrap(token, content) {
  const type = token.type.replace('_open', '');
  const rule = rules[type];

  if (typeof rule === 'string') {
    return React.createElement(rule, null, ...content);
  } else {
    return rule(token, content);
  }
}

/**
 * Parse tree:
 * [para_open, inline, para_close]
 *
 * should turn into:
 * [<p>{inline}</p>]
 */
function renderTokens([cur, ...rest], state, acc) {
  if (!cur) {
    // We're out of tokens! hurrah!
    return [acc, []];
  }

  if (cur.type in blockTokenOpenCloseMap) {
    let parsed;

    // New open tag, push next close tag into stack
    state.stack.push(blockTokenOpenCloseMap[cur.type]);

    [parsed, rest] = renderTokens(rest, state, []);
    const jsx = wrap(cur, parsed);
    acc.push(jsx);

    state.stack.pop();

  } else if (cur.type === state.stack.slice(-1)[0]) {
    return [acc, rest];

  } else if (cur.type === 'inline') {
    let [parsed, _] = renderTokens(cur.children, state, []);
    acc.push(parsed);

  } else {
    acc.push(cur.content);
  }

  return renderTokens(rest, state, acc);
}

function jsxRender(tokens, options, env) {
  let state = {
    stack: []
  };

  const [result, rest] = renderTokens(tokens, state, []);

  return result;
}

export default function(md) {
  md.renderer.render = jsxRender.bind(md.renderer);
}
