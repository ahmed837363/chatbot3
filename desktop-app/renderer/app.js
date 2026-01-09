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

        // Connect buttons for platforms - go directly to OAuth
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                if (platform === 'salla') {
                    // Go directly to OAuth, no modal needed
                    this.startOAuthFlow('salla');
                } else {
                    this.showConnectionModal(platform);
                }
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
            this.showNotification('جاري اتصالك بـ Salla...', 'info');

            // Listen for OAuth callback
            window.electronAPI.onOAuthCallback(async (data) => {
                console.log('OAuth Callback:', data);
                
                if (data.success && data.store) {
                    // Real store connected!
                    this.showNotification(`✅ تم ربط متجر "${data.store.name}" بنجاح!`, 'success');
                    
                    // Reload stores from storage
                    await this.loadStores();
                    this.updateDashboard();
                    this.navigateTo('stores');
                } else if (data.success) {
                    this.showNotification('✅ تم الاتصال بنجاح!', 'success');
                    await this.loadStores();
                    this.updateDashboard();
                } else {
                    this.showNotification(`❌ فشل الاتصال: ${data.error}`, 'error');
                }
            });

            // Start OAuth via main process
            const result = await window.electronAPI.startOAuth(platform);
            
            if (result.started) {
                console.log('✓ OAuth started');
                // Show installation guide with refresh button
                this.showInstallationGuide();
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

    showInstallationPrompt() {
        // Use the new installation guide instead
        this.showInstallationGuide();
    }

    showInstallationGuide() {
        // Remove any existing guide
        document.querySelector('.installation-guide')?.remove();
        
        const guide = document.createElement('div');
        guide.className = 'installation-guide';
        guide.innerHTML = `
            <div class="guide-content">
                <button class="guide-close" id="close-guide-btn">&times;</button>
                <div class="guide-header">
                    <div class="guide-icon">📱</div>
                    <h2>كيفية ربط متجر سلة</h2>
                </div>
                <div class="guide-steps">
                    <div class="guide-step">
                        <span class="step-number">1</span>
                        <div class="step-content">
                            <h4>تثبيت التطبيق</h4>
                            <p>من لوحة تحكم سلة، اذهب إلى "متجر التطبيقات" وابحث عن تطبيقك</p>
                            <p class="step-alt">أو من لوحة الشركاء → التطبيقات → اختبار التطبيق</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="step-number">2</span>
                        <div class="step-content">
                            <h4>الموافقة على الصلاحيات</h4>
                            <p>اضغط "تثبيت" ووافق على صلاحيات التطبيق</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="step-number">3</span>
                        <div class="step-content">
                            <h4>تحديث القائمة</h4>
                            <p>بعد التثبيت، اضغط الزر أدناه لرؤية متجرك</p>
                        </div>
                    </div>
                </div>
                <div class="guide-actions">
                    <button class="btn btn-primary btn-large" id="refresh-stores-btn">
                        🔄 تحديث قائمة المتاجر
                    </button>
                </div>
                <div class="guide-note">
                    <strong>💡 ملاحظة:</strong> بعد تثبيت التطبيق على متجرك، سيظهر الشات بوت تلقائياً للزوار
                </div>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('guide-styles')) {
            const style = document.createElement('style');
            style.id = 'guide-styles';
            style.textContent = `
                .installation-guide {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }
                .guide-content {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 500px;
                    width: 90%;
                    position: relative;
                    animation: slideUp 0.4s ease;
                    text-align: right;
                }
                .guide-close {
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #999;
                }
                .guide-close:hover { color: #333; }
                .guide-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .guide-icon {
                    font-size: 50px;
                    margin-bottom: 10px;
                }
                .guide-header h2 {
                    margin: 0;
                    color: #333;
                    font-size: 24px;
                }
                .guide-steps {
                    margin-bottom: 25px;
                }
                .guide-step {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                    align-items: flex-start;
                }
                .step-number {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    flex-shrink: 0;
                }
                .step-content h4 {
                    margin: 0 0 5px 0;
                    color: #333;
                    font-size: 16px;
                }
                .step-content p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .step-alt {
                    color: #999 !important;
                    font-size: 12px !important;
                    margin-top: 5px !important;
                }
                .guide-actions {
                    text-align: center;
                    margin: 25px 0;
                }
                .btn-large {
                    padding: 15px 40px !important;
                    font-size: 18px !important;
                }
                .guide-note {
                    background: #f0f7ff;
                    padding: 15px;
                    border-radius: 10px;
                    font-size: 13px;
                    color: #555;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(guide);
        
        // Refresh button handler
        document.getElementById('refresh-stores-btn').addEventListener('click', async () => {
            const btn = document.getElementById('refresh-stores-btn');
            btn.innerHTML = '⏳ جاري التحديث...';
            btn.disabled = true;
            
            const previousCount = this.stores.length;
            await this.loadStores();
            this.updateDashboard();
            
            if (this.stores.length > previousCount) {
                guide.remove();
                this.showNotification(`✅ تم العثور على ${this.stores.length - previousCount} متجر جديد!`, 'success');
                this.navigateTo('stores');
            } else if (this.stores.length > 0) {
                guide.remove();
                this.showNotification(`لديك ${this.stores.length} متجر متصل`, 'info');
                this.navigateTo('stores');
            } else {
                btn.innerHTML = '🔄 تحديث قائمة المتاجر';
                btn.disabled = false;
                this.showNotification('لم يتم العثور على متاجر جديدة. تأكد من إكمال التثبيت في سلة.', 'info');
            }
        });
        
        // Close button handler
        document.getElementById('close-guide-btn').addEventListener('click', () => {
            guide.remove();
        });
        
        // Close on backdrop click
        guide.addEventListener('click', (e) => {
            if (e.target === guide) guide.remove();
        });
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
            if (notification.parentElement) notification.remove();
        }, 5000);
    }
}

// Initialize app
const app = new ChatbotManager();

// Make app globally accessible
window.app = app;
