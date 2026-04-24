/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Simple JSX factory that creates HTMLElements.
 */
export function h(
  tag: string | ((props: any) => HTMLElement),
  props: Record<string, any> | null,
  ...children: (Node | string | number | boolean | null | undefined)[]
): HTMLElement {
  if (typeof tag === 'function') {
    return tag({ ...(props || {}), children });
  }

  const element = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        (element as any)[key] = value;
      }
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (Array.isArray(child)) {
      for (const c of child) {
        element.append(typeof c === 'object' ? c : String(c));
      }
    } else {
      element.append(typeof child === 'object' ? child : String(child));
    }
  }

  return element;
}

/**
 * Fragment placeholder for JSX.
 */
export function Fragment({ children }: { children?: any[] }) {
  const fragment = document.createDocumentFragment();
  if (children) {
    for (const child of children) {
      if (child !== null && child !== undefined && child !== false) {
        fragment.append(child);
      }
    }
  }
  return fragment;
}

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
