/**
 * Help center drawing: the article list and the open article. Preact: same DOM the createElement /
 * innerHTML code in help-content.mjs made. Which articles match, selection and keys stay there.
 * Article bodies are trusted HTML strings from the help data, drawn as nodes by simple-html-nodes.jsx.
 */
import { render } from 'preact';
import { HtmlNodes } from './simple-html-nodes.jsx';

export function HelpList({ articles, query, currentId, onSelect }) {
  if (!articles.length) return <div class="help-empty">{'Sin resultados para “' + query + '”.'}</div>;
  return articles.map((a) => (
    <button
      key={a.id}
      type="button"
      class={a.id === currentId ? 'help-article-item active' : 'help-article-item'}
      data-article-id={a.id}
      role="option"
      tabIndex={0}
      onClick={(e) => { onSelect(a.id); e.currentTarget.focus(); }}
    >{a.title}</button>
  ));
}

export function HelpArticle({ article }) {
  return (
    <>
      <h4>{article.title}</h4>
      <HtmlNodes html={article.html} />
    </>
  );
}

export const drawHelpList = (host, props) => render(<HelpList {...props} />, host);
export const drawHelpArticle = (host, article) => render(<HelpArticle article={article} />, host);
