import React from 'react';
import {default as originalRules} from 'remarkable/lib/rules';


/*
 * This is a map of token types that open blocks to token types that close blocks,
 * always of the form `{name_open: name_close}`
 *
 * It's used to check whether a token type opens a block, as well as to quickly get the
 * close type name.
 *
 * The map is computed from the token types in Remarkable's list of rules, since it was faster
 * than copy-pasting all the open/close types :V
 */
let blockTokenOpenCloseMap = {};

const OPEN_TOKEN_RE = /(.*)_open$/;

for (let rule of Object.keys(originalRules)) {
  const match = rule.match(OPEN_TOKEN_RE);

  if (match) {
    const name = match[1];
    blockTokenOpenCloseMap[rule] = name + '_close';
  }
}


/*
 * These rules determine what the renderer should do for each token type.
 *
 * If rule's value is a string, it'll just make a tag with that string with the token's
 * content. If it's a function, it'll use that to get the JSX it should render for that token.
 *
 * TODO:
 *   - `code`: inline *and* block code snippets
 *     https://github.com/jonschlinkert/remarkable/blob/dev/lib/rules.js#L34-L39
 *   - `fence`: fenced code blocks
 *     https://github.com/jonschlinkert/remarkable/blob/dev/lib/rules.js#L45-L83
 *   - `htmlblock`, `htmltag`
 *     https://github.com/jonschlinkert/remarkable/blob/dev/lib/rules.js#L311-L316
 *   - footnotes, I guess? they look super complicated
 *     https://github.com/jonschlinkert/remarkable/blob/dev/lib/rules.js#L330
 */
const rules = {
  heading: (token, content) => {
    const tag = 'h' + token.hLevel;
    return React.createElement(tag, null, ...content);
  },

  link: (token, content) => {
    const title = token.title || null;

    return (
      <a href={token.href} title={title}>
        {content}
      </a>
    );
  },

  image: (token) => {
    const src = token.src || null;
    const title = token.title || null;
    const alt = token.alt || null;

    return (
      <img title={title} alt={alt} src={src} />
    );
  },

  abbr: (token, content) => {
    const title = token.title || null;

    return (
      <abbr title={title}>
        {content}
      </abbr>
    );
  },

  paragraph: 'p',
  blockquote: 'blockquote',

  bullet_list: 'ul',
  ordered_list: 'ol',
  list_item: 'li',

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
  dd: 'dd',

  hr: 'hr',
  hardbreak: 'br',
  softbreak: 'br'
};


function renderRule(token, content) {
  const type = token.type.replace('_open', '');
  const rule = rules[type];

  if (typeof rule === 'string') {
    return React.createElement(rule, null, ...content);
  } else {
    return rule(token, content);
  }
}

/**
 * This is the core rendering function, which reduces over a list of tokens.
 *
 * It's really ugly and probably doesn't work in a lot of cases yet!
 */
function renderTokens([cur, ...rest], state, acc) {
  if (!cur) {
    // We're out of tokens! hurrah!
    return [acc, []];
  }

  if (cur.type in blockTokenOpenCloseMap) {
    // We got a new open block tag, so we render the full block and push it into the
    // accumulator
    state.stack.push(blockTokenOpenCloseMap[cur.type]);

    let parsed;
    [parsed, rest] = renderTokens(rest, state, []);
    const jsx = renderRule(cur, parsed);
    acc.push(jsx);

    state.stack.pop();

  } else if (cur.type === state.stack.slice(-1)[0]) {
    // The end of the current block. We return all of the tokens we've accumulated, which
    // represent the block.
    return [acc, rest];

  } else if (cur.type === 'inline') {
    // An "inline" token in Remarkable currently is just a list of tokens inside a block-level
    // element (e.g. a paragraph).
    let [parsed] = renderTokens(cur.children, state, []);
    acc.push(parsed);

  } else if (cur.type === 'text') {
    // A text token is just pushed in with the rest of the tokens
    acc.push(cur.content);

  } else {
    // Use a rule for a token if it exists
    if (rules[cur.type]) {
      acc.push(renderRule(cur));
    } else {
      throw new Error(`Encountered unhandled token type ${cur.type}`);
    }
  }

  return renderTokens(rest, state, acc);
}

function jsxRender(tokens/*, options, env*/) {
  let state = {
    stack: []
  };

  const [result] = renderTokens(tokens, state, []);

  return result;
}

// Remarkable's plugin architecture is just a specified way to monkey-patch a Remarkable instance
export default function(md) {
  md.renderer.render = jsxRender.bind(md.renderer);
}
