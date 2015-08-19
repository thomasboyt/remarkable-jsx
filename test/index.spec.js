/* global it, describe, beforeEach */

import expect from 'expect';

import Markdown from 'remarkable';
import React from 'react';

import remarkableJsx from '../src';

function trim(str) {
  str = str.trim();
  let acc = [];

  for (let line of str.split('\n')) {
    acc.push(line.trim());
  }

  return acc.join('\n');
}

describe('remarkableJsx', () => {
  let md;

  beforeEach(() => {
    md = new Markdown();
    md.use(remarkableJsx);
  });

  it('correctly renders top-level paragraphs', () => {
    const source = trim(`
      foo

      bar
    `);

    const result = md.render(source);

    const rendered = React.renderToStaticMarkup(<span>{result}</span>);
    expect(rendered).toBe('<span><p>foo</p><p>bar</p></span>');
  });

  it('transforms ems/strongs', () => {
    const source = '*foo* **bar** _baz_';

    const result = md.render(source);

    const rendered = React.renderToStaticMarkup(<span>{result}</span>);
    expect(rendered).toBe('<span><p><em>foo</em> <strong>bar</strong> <em>baz</em></p></span>');
  });

  it('transforms links', () => {
    const source = 'hello [world](http://google.com)';

    const result = md.render(source);

    const rendered = React.renderToStaticMarkup(<span>{result}</span>);
    expect(rendered).toBe('<span><p>hello <a href="http://google.com">world</a></p></span>');
  });

  it('transforms images', () => {
    const source = `![a kitty](/path/to/kitty.jpg)`;

    const result = md.render(source);

    const rendered = React.renderToStaticMarkup(<span>{result}</span>);
    expect(rendered).toBe('<span><p><img alt="a kitty" src="/path/to/kitty.jpg"></p></span>');
  });
});
