// PraxisJS Phase 3 Store Examples

import { defineStore, reactive, computed, ref, watchEffect } from '../src/praxis.js';
import { createAsyncAction, createResource, createQuery } from '../src/store/async-actions.js';

// 1. Basic Store Definition
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
    displayName: (state, getters) => `${state.name}: ${getters.doubleCount}`
  },
  
  actions: {
    increment() {
      this.$state.count++;
    },
    
    decrement() {
      this.$state.count--;
    },
    
    async incrementAsync() {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.increment();
    }
  }
});

// 2. User Management Store with Async Actions
export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as User[],
    currentUser: null as User | null,
    loading: false,
    error: null as string | null
  }),
  
  getters: {
    userCount: (state) => state.users.length,
    hasUsers: (state, getters) => getters.userCount > 0,
    isLoggedIn: (state) => state.currentUser !== null
  },
  
  actions: {
    async fetchUsers() {
      this.$state.loading = true;
      this.$state.error = null;
      
      try {
        const response = await fetch('/api/users');
        const users = await response.json();
        this.$state.users = users;
      } catch (error) {
        this.$state.error = error.message;
      } finally {
        this.$state.loading = false;
      }
    },
    
    async loginUser(credentials: LoginCredentials) {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        const user = await response.json();
        this.$state.currentUser = user;
      } else {
        throw new Error('Login failed');
      }
    },
    
    logoutUser() {
      this.$state.currentUser = null;
    }
  }
});

interface User {
  id: number;
  name: string;
  email: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// 3. Shopping Cart Store with Complex State Management
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    discounts: [] as Discount[],
    shippingMethod: 'standard' as ShippingMethod
  }),
  
  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    
    subtotal: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    
    discountAmount: (state, getters) => {
      return state.discounts.reduce((total, discount) => {
        if (discount.type === 'percentage') {
          return total + (getters.subtotal * discount.value / 100);
        } else {
          return total + discount.value;
        }
      }, 0);
    },
    
    shippingCost: (state) => {
      const costs = { standard: 5.99, express: 12.99, overnight: 24.99 };
      return costs[state.shippingMethod];
    },
    
    total: (state, getters) => {
      return Math.max(0, getters.subtotal - getters.discountAmount + getters.shippingCost);
    }
  },
  
  actions: {
    addItem(product: Product) {
      const existingItem = this.$state.items.find(item => item.productId === product.id);
      
      if (existingItem) {
        existingItem.quantity++;
      } else {
        this.$state.items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        });
      }
    },
    
    removeItem(productId: number) {
      const index = this.$state.items.findIndex(item => item.productId === productId);
      if (index > -1) {
        this.$state.items.splice(index, 1);
      }
    },
    
    updateQuantity(productId: number, quantity: number) {
      const item = this.$state.items.find(item => item.productId === productId);
      if (item) {
        if (quantity <= 0) {
          this.removeItem(productId);
        } else {
          item.quantity = quantity;
        }
      }
    },
    
    applyDiscount(discount: Discount) {
      this.$state.discounts.push(discount);
    },
    
    clearCart() {
      this.$state.items = [];
      this.$state.discounts = [];
    }
  }
});

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  code?: string;
}

type ShippingMethod = 'standard' | 'express' | 'overnight';

// 4. Store with Modules
export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as Theme,
    sidebarOpen: false,
    notifications: [] as Notification[]
  }),
  
  getters: {
    unreadNotifications: (state) => state.notifications.filter(n => !n.read),
    notificationCount: (state, getters) => getters.unreadNotifications.length
  },
  
  actions: {
    toggleTheme() {
      this.$state.theme = this.$state.theme === 'light' ? 'dark' : 'light';
    },
    
    toggleSidebar() {
      this.$state.sidebarOpen = !this.$state.sidebarOpen;
    },
    
    addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
      this.$state.notifications.push({
        ...notification,
        id: Date.now(),
        timestamp: new Date(),
        read: false
      });
    },
    
    markNotificationRead(id: number) {
      const notification = this.$state.notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
      }
    }
  },
  
  modules: {
    auth: {
      state: () => ({
        token: null as string | null,
        refreshToken: null as string | null
      }),
      
      actions: {
        setTokens(tokens: { token: string; refreshToken: string }) {
          this.$state.token = tokens.token;
          this.$state.refreshToken = tokens.refreshToken;
        },
        
        clearTokens() {
          this.$state.token = null;
          this.$state.refreshToken = null;
        }
      }
    }
  }
});

type Theme = 'light' | 'dark';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

// 5. Store with Advanced Async Patterns
export const usePostsStore = defineStore('posts', {
  state: () => ({
    posts: [] as Post[],
    currentPost: null as Post | null
  }),
  
  getters: {
    publishedPosts: (state) => state.posts.filter(post => post.published),
    postsByCategory: (state) => (category: string) => 
      state.posts.filter(post => post.category === category)
  },
  
  actions: {
    // Using async actions with loading states
    async fetchPosts() {
      const fetchAction = createAsyncAction(
        async () => {
          const response = await fetch('/api/posts');
          return response.json();
        },
        { 
          debounce: 300,
          retry: { attempts: 3, delay: 1000, backoff: 'exponential' }
        }
      );
      
      const result = await fetchAction.execute();
      if (result) {
        this.$state.posts = result;
      }
      
      return fetchAction;
    },
    
    // Using resource pattern
    createPostResource() {
      return createResource(
        () => fetch('/api/posts').then(r => r.json()),
        { keepPreviousData: true }
      );
    },
    
    // Using query pattern
    createPostQuery() {
      return createQuery(
        async (id: number) => {
          const response = await fetch(`/api/posts/${id}`);
          return response.json();
        },
        { timeout: 5000 }
      );
    }
  }
});

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  published: boolean;
  createdAt: Date;
}

// 6. Composable Store Usage Example
export function useComposableCounter() {
  const counterStore = useCounterStore();
  
  // Create reactive refs from store state
  const count = ref(0);
  const name = ref('');
  
  // Sync with store
  watchEffect(() => {
    count.value = counterStore?.state.count || 0;
    name.value = counterStore?.state.name || '';
  });
  
  // Actions
  const increment = () => counterStore?.actions.increment();
  const decrement = () => counterStore?.actions.decrement();
  const incrementAsync = () => counterStore?.actions.incrementAsync();
  
  // Computed values
  const doubleCount = computed(() => count.value * 2);
  const displayName = computed(() => `${name.value}: ${doubleCount.value}`);
  
  return {
    // State
    count: readonly(count),
    name: readonly(name),
    
    // Actions
    increment,
    decrement,
    incrementAsync,
    
    // Computed
    doubleCount: readonly(doubleCount),
    displayName: readonly(displayName)
  };
}

// 7. Cross-component Store Communication
export function setupStoreWatchers() {
  const userStore = useUserStore();
  const cartStore = useCartStore();
  const appStore = useAppStore();
  
  // Clear cart when user logs out
  watchEffect(() => {
    if (userStore && !userStore.getters.isLoggedIn) {
      cartStore?.actions.clearCart();
    }
  });
  
  // Show notification when cart total changes
  watchEffect(() => {
    const total = cartStore?.getters.total;
    if (total && total > 100) {
      appStore?.actions.addNotification({
        title: 'Free Shipping!',
        message: 'Your order qualifies for free shipping.',
        type: 'success'
      });
    }
  });
  
  // Auto-save cart to localStorage
  watchEffect(() => {
    if (cartStore) {
      localStorage.setItem('cart', JSON.stringify(cartStore.state.items));
    }
  });
}