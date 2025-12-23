// Chatbot Manager - Renderer Process
// Handles UI interactions and communicates with main process

class ChatbotManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.stores = [];
        this.config = {};
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Chatbot Manager...');
        
        // Load configuration
        await this.loadConfig();
        
        // Load stores
        await this.loadStores();
        
        // Setup event listeners
        this.setupNavigation();
        this.setupModals();
        this.setupActions();
        
        // Listen for navigation from main process
        window.electronAPI.onNavigate((page) => {
            this.navigateTo(page);
        });
        
        // Update UI
        this.updateDashboard();
        
        console.log('✅ Chatbot Manager initialized');
    }

    async loadConfig() {
        try {
            this.config = await window.electronAPI.getConfig();
            console.log('✓ Config loaded');
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    async loadStores() {
        try {
            this.stores = await window.electronAPI.getStores();
            console.log(`✓ Loaded ${this.stores.length} stores`);
            this.updateStoreCount();
        } catch (error) {
            console.error('Failed to load stores:', error);
            this.stores = [];
        }
    }

    setupNavigation() {
        // Navigation menu items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        // Card actions and buttons with data-page
        document.querySelectorAll('[data-page]').forEach(item => {
            if (!item.classList.contains('nav-item')) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = item.dataset.page;
                    if (page) this.navigateTo(page);
                });
            }
        });

        // Quick connect button
        document.getElementById('quick-connect')?.addEventListener('click', () => {
            this.navigateTo('connect');
        });
    }

    setupModals() {
        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
            el.addEventListener('click', () => this.closeModal());
        });

        // Connect buttons for platforms
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                this.showConnectionModal(platform);
            });
        });

        // Start connection button in modal
        document.getElementById('start-connection')?.addEventListener('click', () => {
            this.startOAuthFlow('salla');
        });
    }

    setupActions() {
        // Settings save handlers would go here
    }

    navigateTo(page) {
        console.log(`📄 Navigating to: ${page}`);
        
        // Update nav menu
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update header
        this.updateHeader(page);
        
        // Store current page
        this.currentPage = page;

        // Page-specific actions
        if (page === 'stores') {
            this.renderStores();
        }
    }

    updateHeader(page) {
        const titles = {
            'dashboard': { title: 'Dashboard', subtitle: 'مرحباً بك في لوحة التحكم' },
            'stores': { title: 'المتاجر المتصلة', subtitle: 'إدارة متاجرك المتصلة' },
            'connect': { title: 'ربط متجر جديد', subtitle: 'اختر منصة التجارة الإلكترونية' },
            'chatbot': { title: 'إعدادات الشات بوت', subtitle: 'تخصيص مظهر وسلوك البوت' },
            'conversations': { title: 'المحادثات', subtitle: 'تتبع محادثات العملاء' },
            'settings': { title: 'الإعدادات', subtitle: 'إعدادات التطبيق والـ API' },
            'help': { title: 'المساعدة', subtitle: 'دليل الاستخدام والدعم الفني' }
        };

        const pageInfo = titles[page] || { title: page, subtitle: '' };
        
        document.getElementById('page-title').textContent = pageInfo.title;
        document.getElementById('page-subtitle').textContent = pageInfo.subtitle;
    }

    updateDashboard() {
        // Update stats
        document.getElementById('stat-stores').textContent = this.stores.length;
        document.getElementById('stat-conversations').textContent = '0';
        document.getElementById('stat-messages').textContent = '0';

        // Update recent stores
        this.renderRecentStores();
    }

    updateStoreCount() {
        const badge = document.getElementById('store-count');
        if (badge) {
            badge.textContent = this.stores.length;
            badge.style.display = this.stores.length > 0 ? 'block' : 'none';
        }
    }

    renderRecentStores() {
        const container = document.getElementById('recent-stores-list');
        if (!container) return;

        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🏪</span>
                    <p>لا توجد متاجر متصلة</p>
                    <button class="btn btn-secondary" data-page="connect">ربط متجر الآن</button>
                </div>
            `;
            // Rebind event listener
            container.querySelector('[data-page]')?.addEventListener('click', (e) => {
                this.navigateTo('connect');
            });
            return;
        }

        container.innerHTML = this.stores.slice(0, 3).map(store => `
            <div class="store-item">
                <div class="store-header">
                    <div class="store-icon">🏪</div>
                    <div class="store-info">
                        <h3>${store.name || 'متجر بدون اسم'}</h3>
                        <p>${store.platform || 'salla'} • ${store.domain || ''}</p>
                    </div>
                </div>
                <div class="store-status">
                    <span class="status-dot ${store.active ? 'active' : 'inactive'}"></span>
                    <span>${store.active ? 'نشط' : 'غير نشط'}</span>
                </div>
            </div>
        `).join('');
    }

    renderStores() {
        const container = document.getElementById('stores-container');
        if (!container) return;

        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="empty-state large" style="grid-column: 1 / -1;">
                    <span class="empty-icon">🏪</span>
                    <h3>لا توجد متاجر متصلة</h3>
                    <p>قم بربط متجرك الأول للبدء</p>
                    <button class="btn btn-primary" data-page="connect">➕ ربط متجر جديد</button>
                </div>
            `;
            container.querySelector('[data-page]')?.addEventListener('click', () => {
                this.navigateTo('connect');
            });
            return;
        }

        container.innerHTML = this.stores.map(store => `
            <div class="store-card" data-store-id="${store.id}">
                <div class="store-header">
                    <div class="store-icon">🏪</div>
                    <div class="store-info">
                        <h3>${store.name || 'متجر بدون اسم'}</h3>
                        <p>${store.domain || 'salla.sa'}</p>
                    </div>
                </div>
                <div class="store-meta">
                    <p><strong>المنصة:</strong> ${this.getPlatformName(store.platform)}</p>
                    <p><strong>تاريخ الربط:</strong> ${this.formatDate(store.connectedAt)}</p>
                </div>
                <div class="store-status">
                    <span class="status-dot ${store.active !== false ? 'active' : 'inactive'}"></span>
                    <span>${store.active !== false ? 'الويدجت نشط' : 'الويدجت غير نشط'}</span>
                </div>
                <div class="store-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="app.viewStore('${store.id}')">
                        👁️ عرض
                    </button>
                    <button class="btn btn-secondary" style="flex: 1; color: #dc3545;" onclick="app.removeStore('${store.id}')">
                        🗑️ حذف
                    </button>
                </div>
            </div>
        `).join('');
    }

    getPlatformName(platform) {
        const names = {
            'salla': 'سلة',
            'shopify': 'Shopify',
            'woocommerce': 'WooCommerce',
            'zid': 'زد'
        };
        return names[platform] || platform;
    }

    formatDate(dateStr) {
        if (!dateStr) return 'غير معروف';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-SA');
    }

    showConnectionModal(platform) {
        const modal = document.getElementById('connection-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async startOAuthFlow(platform) {
        console.log(`🔗 Starting OAuth flow for: ${platform}`);
        
        try {
            // Close modal
            this.closeModal();

            // Show loading state
            this.showNotification('جاري فتح صفحة تسجيل الدخول...', 'info');

            // Listen for OAuth callback
            window.electronAPI.onOAuthCallback(async (data) => {
                console.log('OAuth Callback:', data);
                
                if (data.success) {
                    this.showNotification('✅ تم التوصل بنجاح! جاري إضافة متجرك...', 'success');
                    
                    // Add test store after successful OAuth
                    await this.addTestStore();
                } else {
                    this.showNotification(`❌ فشل: ${data.error}`, 'error');
                }
            });

            // Start OAuth via main process
            const result = await window.electronAPI.startOAuth(platform);
            
            if (result.started) {
                console.log('✓ OAuth started');
                this.showNotification('تم فتح صفحة سلة. قم بتسجيل الدخول والموافقة على الصلاحيات.', 'success');
            } else {
                this.showNotification('حدث خطأ: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('OAuth error:', error);
            this.showNotification('حدث خطأ أثناء الاتصال', 'error');
        }
    }

    async addTestStore() {
        // This simulates a store being connected
        // In production, the webhook handles this
        const testStore = {
            id: 'store_' + Date.now(),
            name: 'متجر تجريبي',
            platform: 'salla',
            domain: 'test-store.salla.sa',
            active: true,
            connectedAt: new Date().toISOString()
        };

        this.stores = await window.electronAPI.saveStore(testStore);
        this.updateStoreCount();
        this.updateDashboard();
        
        this.showNotification('تم ربط المتجر بنجاح! 🎉', 'success');
    }

    async viewStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (store && store.domain) {
            window.electronAPI.openExternal(`https://${store.domain}`);
        }
    }

    async removeStore(storeId) {
        if (confirm('هل أنت متأكد من حذف هذا المتجر؟')) {
            this.stores = await window.electronAPI.removeStore(storeId);
            this.updateStoreCount();
            this.updateDashboard();
            this.renderStores();
            this.showNotification('تم حذف المتجر', 'info');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add styles if not exist
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 15px 25px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    z-index: 9999;
                    animation: slideDown 0.3s ease;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                }
                .notification button {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    opacity: 0.7;
                }
                .notification-success {
                    background: #28a745;
                    color: white;
                }
                .notification-error {
                    background: #dc3545;
                    color: white;
                }
                .notification-info {
                    background: #17a2b8;
                    color: white;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize app
const app = new ChatbotManager();

// Make app globally accessible
window.app = app;
