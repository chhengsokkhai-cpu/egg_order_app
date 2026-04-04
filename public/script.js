// Product data
const products = {
    'a10': { name: 'លេខ ០', price: 400 },
    'a11': { name: 'លេខ ១', price: 360 },
    'a12': { name: 'លេខ ២', price: 340 },
    'a13': { name: 'លេខ ៣', price: 320 },
    'a14': { name: 'លេខ ៤', price: 300 },
    'a15': { name: 'លេខ ៥', price: 280 }
};

// Cart state
let cart = {};
function formatCurrency(amount) {
    return `${amount}៛`;
}


// Update quantity display for a specific product
function updateQuantityDisplay(productId) {
    const quantityElement = document.getElementById(productId);
    if (quantityElement) {
        quantityElement.textContent = cart[productId] || 0;
    }
}

// Animate quantity changes
function animateQuantityChange(productId) {
    const quantityElement = document.getElementById(productId);
    if (quantityElement) {
        quantityElement.classList.add('updated');
        setTimeout(() => {
            quantityElement.classList.remove('updated');
        }, 300);
    }
}

// Telegram Web App initialization
let tg = window.Telegram?.WebApp || {
    HapticFeedback: { impactOccurred: () => {} },
    showAlert: alert,
    initDataUnsafe: { user: { id: 'test', username: 'test' } }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Telegram Web App
    tg.ready();
    
    // Set the app theme
    setTheme();
    
    // Expand the app to full height
    tg.expand();
    
    // Show the main button when cart has items
    tg.MainButton.setText('កុម្ម៉ង់');
    tg.MainButton.hide();
    
    // Handle main button click
    tg.MainButton.onClick(function() {
        checkout();
    });
    
    // Initialize cart display
    updateCartDisplay();
    
    // Add event listeners for quantity buttons as fallback
    setupQuantityButtons();
    
    console.log('Telegram Mini App initialized');
});

// Setup quantity buttons with event listeners
function setupQuantityButtons() {
    console.log('Using inline handlers for quantity buttons');
}

// Set theme based on Telegram's theme
function setTheme() {
    const root = document.documentElement;
    
    if (tg.colorScheme === 'dark') {
        root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#212121');
        root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
        root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#707579');
        root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#8774E1');
        root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
        root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#181818');
    }
}

// Update quantity of a product
function updateQuantity(productId, change) {
    try {
        console.log('updateQuantity called:', productId, change);
        
        if (!cart[productId]) {
            cart[productId] = 0;
        }
        
        cart[productId] += change;
        
        // Don't allow negative quantities
        if (cart[productId] < 0) {
            cart[productId] = 0;
        }
        
        // Remove from cart if quantity is 0
        if (cart[productId] === 0) {
            delete cart[productId];
        }
        
        console.log('Cart after update:', cart);
        
        // Update the display
        updateQuantityDisplay(productId);
        updateCartDisplay();
        
        // Add animation
        animateQuantityChange(productId);
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } catch (error) {
        console.error('Error in updateQuantity:', error);
        alert('មានបញ្ហាក្នុងការកែចំនួន: ' + error.message);
    }
}

// Update cart display in footer
function updateCartDisplay() {
    const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const cartTotal = Object.entries(cart).reduce((sum, [productId, qty]) => {
        return sum + (products[productId].price * qty);
    }, 0);
    
    // Update cart info
    const cartCountElement = document.querySelector('.cart-count');
    const cartTotalElement = document.querySelector('.cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (cartCountElement) {
        cartCountElement.textContent = `${cartCount} មុខទំនិញ`;
    }
    
    if (cartTotalElement) {
        cartTotalElement.textContent = formatCurrency(cartTotal);
    }
    
    // Enable/disable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = cartCount === 0;
        
        if (cartCount > 0) {
            checkoutBtn.textContent = `កុម្ម៉ង់ ${formatCurrency(cartTotal)}`;
            tg.MainButton.show();
            tg.MainButton.setText(`កុម្ម៉ង់ ${formatCurrency(cartTotal)}`);
        } else {
            checkoutBtn.textContent = 'កុម្ម៉ង់';
            tg.MainButton.hide();
        }
    }
}

// Checkout function
function checkout() {
    if (Object.keys(cart).length === 0) {
        tg.showAlert('កន្ត្រករបស់អ្នកនៅទទេ!');
        return;
    }
    
    // Prepare order data
    const orderData = {
        items: Object.entries(cart).map(([productId, quantity]) => ({
            id: productId,
            name: products[productId].name,
            price: products[productId].price,
            quantity: quantity,
            total: products[productId].price * quantity
        })),
        total: Object.entries(cart).reduce((sum, [productId, qty]) => {
            return sum + (products[productId].price * qty);
        }, 0),
        user: {
            id: tg.initDataUnsafe?.user?.id || 'anonymous',
            username: tg.initDataUnsafe?.user?.username || 'Unknown',
            first_name: tg.initDataUnsafe?.user?.first_name || 'User'
        },
        timestamp: new Date().toISOString()
    };
    
    // Show loading state
    tg.MainButton.showProgress();
    
    // Send order to server
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        tg.MainButton.hideProgress();
        
        if (data.success) {
            // Show success message
            tg.showAlert(`កុម្ម៉ង់បានជោគជ័យ! លេខកុម្ម៉ង់៖ ${data.orderId}`);
            
            // Clear cart
            cart = {};
            updateAllQuantityDisplays();
            updateCartDisplay();
            
            // Add success animation
            document.querySelector('.container').classList.add('success-animation');
            setTimeout(() => {
                document.querySelector('.container').classList.remove('success-animation');
            }, 300);
            
            // Send data back to bot (optional)
            tg.sendData(JSON.stringify({
                action: 'order_placed',
                orderId: data.orderId,
                total: orderData.total
            }));
        } else {
            tg.showAlert('ការកុម្ម៉ង់បរាជ័យ។ សូមព្យាយាមម្តងទៀត។');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        tg.MainButton.hideProgress();
        tg.showAlert('បណ្ដាញមានបញ្ហា។ សូមពិនិត្យការតភ្ជាប់ ហើយព្យាយាមម្តងទៀត។');
    });
}

// Make functions globally available for inline onclick handlers
window.updateQuantity = updateQuantity;
window.checkout = checkout;

// Update all quantity displays
function updateAllQuantityDisplays() {
    Object.keys(products).forEach(productId => {
        updateQuantityDisplay(productId);
    });
}

// Handle theme changes
tg.onEvent('themeChanged', function() {
    setTheme();
});

// Handle viewport changes
tg.onEvent('viewportChanged', function() {
    if (tg.isExpanded) {
        document.body.classList.add('expanded');
    } else {
        document.body.classList.remove('expanded');
    }
});

// Handle back button
tg.BackButton.onClick(function() {
    if (Object.keys(cart).length > 0) {
        tg.showConfirm('តើអ្នកពិតជាចង់ចាកចេញមែនទេ? កន្ត្រករបស់អ្នកនឹងត្រូវលុប។', function(confirmed) {
            if (confirmed) {
                cart = {};
                updateAllQuantityDisplays();
                updateCartDisplay();
                tg.close();
            }
        });
    } else {
        tg.close();
    }
});

// Show back button if cart has items
function updateBackButton() {
    if (Object.keys(cart).length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Update back button visibility when cart changes
const originalUpdateCartDisplay = updateCartDisplay;
updateCartDisplay = function() {
    originalUpdateCartDisplay();
    updateBackButton();
};

// Error handling for network issues
window.addEventListener('offline', function() {
    tg.showAlert('អ្នកកំពុងក្រៅបណ្ដាញ។ សូមពិនិត្យការតភ្ជាប់របស់អ្នក។');
});

window.addEventListener('online', function() {
    tg.showAlert('ការតភ្ជាប់ត្រូវបានស្តារឡើងវិញ។');
});

// Debug mode (remove in production)
if (tg.initDataUnsafe?.user?.username === 'debug') {
    console.log('Debug mode enabled');
    window.debugCart = cart;
    window.debugProducts = products;
    window.debugTg = tg;
}