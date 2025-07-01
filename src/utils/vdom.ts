export interface VirtualNode {
  type: string;
  key?: string | number;
  props: Record<string, any>;
  children: (VirtualNode | string)[];
  element?: Element;
}

export interface DiffResult {
  type: 'create' | 'update' | 'move' | 'remove';
  node?: VirtualNode;
  oldNode?: VirtualNode;
  index?: number;
  newIndex?: number;
}

export class VirtualDOM {
  static diff(oldNodes: VirtualNode[], newNodes: VirtualNode[]): DiffResult[] {
    const results: DiffResult[] = [];
    const oldKeyed = new Map<string | number, { node: VirtualNode; index: number }>();
    const newKeyed = new Map<string | number, { node: VirtualNode; index: number }>();
    
    // Index nodes by key
    oldNodes.forEach((node, index) => {
      if (node.key !== undefined) {
        oldKeyed.set(node.key, { node, index });
      }
    });
    
    newNodes.forEach((node, index) => {
      if (node.key !== undefined) {
        newKeyed.set(node.key, { node, index });
      }
    });
    
    const usedOldIndices = new Set<number>();
    
    // Process new nodes
    newNodes.forEach((newNode, newIndex) => {
      if (newNode.key !== undefined) {
        const oldEntry = oldKeyed.get(newNode.key);
        if (oldEntry) {
          // Node exists, check if it moved
          if (oldEntry.index !== newIndex) {
            results.push({
              type: 'move',
              node: newNode,
              oldNode: oldEntry.node,
              index: oldEntry.index,
              newIndex
            });
          } else {
            // Check if node needs update
            if (!this.areNodesEqual(oldEntry.node, newNode)) {
              results.push({
                type: 'update',
                node: newNode,
                oldNode: oldEntry.node,
                index: newIndex
              });
            }
          }
          usedOldIndices.add(oldEntry.index);
        } else {
          // New node
          results.push({
            type: 'create',
            node: newNode,
            index: newIndex
          });
        }
      } else {
        // No key, try to match by position
        const oldNode = oldNodes[newIndex];
        if (oldNode && !usedOldIndices.has(newIndex)) {
          if (!this.areNodesEqual(oldNode, newNode)) {
            results.push({
              type: 'update',
              node: newNode,
              oldNode,
              index: newIndex
            });
          }
          usedOldIndices.add(newIndex);
        } else {
          results.push({
            type: 'create',
            node: newNode,
            index: newIndex
          });
        }
      }
    });
    
    // Find removed nodes
    oldNodes.forEach((oldNode, index) => {
      if (!usedOldIndices.has(index)) {
        results.push({
          type: 'remove',
          oldNode,
          index
        });
      }
    });
    
    return results;
  }
  
  static areNodesEqual(a: VirtualNode, b: VirtualNode): boolean {
    if (a.type !== b.type || a.key !== b.key) {
      return false;
    }
    
    // Compare props
    const aProps = Object.keys(a.props);
    const bProps = Object.keys(b.props);
    
    if (aProps.length !== bProps.length) {
      return false;
    }
    
    for (const key of aProps) {
      if (a.props[key] !== b.props[key]) {
        return false;
      }
    }
    
    return true;
  }
  
  static createElement(vnode: VirtualNode): Element {
    const element = document.createElement(vnode.type);
    
    // Set props
    Object.entries(vnode.props).forEach(([key, value]) => {
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, String(value));
      }
    });
    
    vnode.element = element;
    return element;
  }
  
  static updateElement(element: Element, oldVNode: VirtualNode, newVNode: VirtualNode): void {
    // Update props
    const oldProps = oldVNode.props;
    const newProps = newVNode.props;
    
    // Remove old props
    Object.keys(oldProps).forEach(key => {
      if (!(key in newProps)) {
        if (key.startsWith('on')) {
          // Remove event listener (simplified)
          const eventName = key.slice(2).toLowerCase();
          element.removeEventListener(eventName, oldProps[key]);
        } else if (key === 'className') {
          element.className = '';
        } else if (key === 'textContent') {
          element.textContent = '';
        } else {
          element.removeAttribute(key);
        }
      }
    });
    
    // Add/update new props
    Object.entries(newProps).forEach(([key, value]) => {
      if (oldProps[key] !== value) {
        if (key.startsWith('on') && typeof value === 'function') {
          const eventName = key.slice(2).toLowerCase();
          if (oldProps[key]) {
            element.removeEventListener(eventName, oldProps[key]);
          }
          element.addEventListener(eventName, value);
        } else if (key === 'className') {
          element.className = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else {
          element.setAttribute(key, String(value));
        }
      }
    });
    
    newVNode.element = element;
  }
}