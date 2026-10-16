/*
 * tiny hyperscript. no vdom, no diffing, you get real nodes back and you mutate them yourself.
 * if you want react, go use react.
 */

export type Child = Node | string | number | boolean | null | undefined | Child[];

type Listener = (ev: Event) => void;

export type Props = {
  class?: string | (string | false | null | undefined)[];
  style?: string | Partial<Record<string, string>>;
  dataset?: Record<string, string>;
  ref?: (el: HTMLElement) => void;
  [key: string]: unknown;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) applyProps(el, props);
  append(el, children);
  return el;
}

export function applyProps(el: HTMLElement, props: Props) {
  for (const [key, val] of Object.entries(props)) {
    if (val == null || val === false) continue;
    if (key === 'class') {
      el.className = Array.isArray(val) ? val.filter(Boolean).join(' ') : String(val);
    } else if (key === 'style') {
      if (typeof val === 'string') el.style.cssText = val;
      else
        for (const [p, v] of Object.entries(val as Record<string, string>)) {
          // setProperty so --custom-props work too
          el.style.setProperty(p.startsWith('--') ? p : kebab(p), v);
        }
    } else if (key === 'dataset') {
      Object.assign(el.dataset, val);
    } else if (key === 'ref') {
      (val as (e: HTMLElement) => void)(el);
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val as Listener);
    } else if (val === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(val));
    }
  }
}

export function append(parent: Node, children: Child[]) {
  for (const c of children.flat(Infinity as 1) as Child[]) {
    if (c == null || c === false || c === true) continue;
    parent.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** svg needs createElementNS, h() can't do it */
export function svg(tag: string, attrs: Record<string, string | number> = {}, ...kids: SVGElement[]) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  kids.forEach((k) => el.appendChild(k));
  return el;
}
