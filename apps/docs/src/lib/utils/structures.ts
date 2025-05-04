type DocAttributes = {
  title: string;
  description?: string;
  slug: string;
  framework?: string;
  section?: string;
  order?: number;
  icon?: string;
};

type DocItem = {
  filename: string;
  attributes: DocAttributes;
  slug: string;
};

export type NestedDocEntry = {
  name: string;
  children?: NestedDocEntry[];
  isOpen?: boolean;
} & DocItem;

export function nestDocsAsSortedArrays(docs: DocItem[]): NestedDocEntry[] {
  const basePath = '/src/content/docs/';
  const root: any = {};

  // Step 1: Build a nested tree with __items arrays
  for (const doc of docs) {
    const relativePath = doc.filename.replace(basePath, '');
    const parts = relativePath.split('/');

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/\.[^.]+$/, '');

      if (i === parts.length - 1) {
        if (!Array.isArray(current.__items)) {
          current.__items = [];
        }
        current.__items.push({ ...doc, name: part });
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }

  // Step 2: Recursively convert to sorted array format
  function treeToArray(node: any): NestedDocEntry[] {
    const items: NestedDocEntry[] = [];

    if (node.__items) {
      node.__items.sort((a: DocItem, b: DocItem) => {
        const orderA = a.attributes.order ?? Infinity;
        const orderB = b.attributes.order ?? Infinity;
        return orderA - orderB;
      });
      items.push(...node.__items);
    }

    for (const key of Object.keys(node)) {
      if (key === '__items') continue;

      const children = treeToArray(node[key]);
      items.push({
        name: key,
        filename: '',
        attributes: {
          title: key,
          description: '',
          slug: key,
        },
        slug: key,
        children,
      });
    }

    return items.sort((a, b) => {
      const orderA = a.attributes.order ?? Infinity;
      const orderB = b.attributes.order ?? Infinity;
      return orderA - orderB;
    });
  }

  let array = treeToArray(root);

  const recursiveMap = (items: NestedDocEntry[]) => {
    return items.map((item) => {
      let children = item.children;
      let indexItem: NestedDocEntry | undefined;
      if (children) {
        children.map((child) => {
          if (
            child.filename.endsWith('index.md') ||
            child.filename.endsWith('index.agx')
          ) {
            indexItem = child;
            return;
          }
          return child;
        });
      }
      if (indexItem) {
        item.filename = indexItem.filename;
        item.attributes = indexItem.attributes;
        item.slug = indexItem.slug;
      }
      if (children?.length === 0) {
        delete item.children;
      }
      if (children) {
        item.children = recursiveMap(children);
      }
      return item;
    });
  };

  array = recursiveMap(array);

  return array;
}
