// Product data
const products = {
    'white-eggs': { name: 'White Eggs', price: 4.99, description: 'Farm fresh white eggs (12 pack)' },
    'brown-eggs': { name: 'Brown Eggs', price: 6.99, description: 'Organic brown eggs (12 pack)' },
    'duck-eggs': { name: 'Duck Eggs', price: 8.99, description: 'Premium duck eggs (6 pack)' },
    'quail-eggs': { name: 'Quail Eggs', price: 12.99, description: 'Delicate quail eggs (18 pack)' }
};

// Cart state
let cart = {};

// Telegram Web App initialization
let tg = window.Telegram?.WebApp || {
    // Fallback for testing outside Telegram
    ready: () => console.log('TG ready (fallback)'),
    expand: () => console.log('TG expand (fallback)'),
    MainButton: {
        setText: (text) => console.log('MainButton setText:', text),
        show: () => console.log('MainButton show'),
        hide: () => console.log('MainButton hide'),
        onClick: (callback) => console.log('MainButton onClick set'),
        showProgress: () => console.log('MainButton showProgress'),
        hideProgress: () => console.log('MainButton hideProgress')
    },
    BackButton: {
        show: () => console.log('BackButton show'),
        hide: () => console.log('BackButton hide'),
        onClick: (callback) => console.log('BackButton onClick set')
    },
    HapticFeedback: {
        impactOccurred: (type) => console.log('Haptic feedback:', type)
    },
    showAlert: (message) => alert(message),
    showConfirm: (message, callback) => {
        const result = confirm(message);
        callback(result);
    },
    close: () => console.log('TG close'),
    sendData: (data) => console.log('TG sendData:', data),
    onEvent: (event, callback) => console.log('TG onEvent:', event),
    colorScheme: 'light',
    themeParams: {},
    isExpanded: false,
    initDataUnsafe: { user: { id: 'test', username: 'test', first_name: 'Test' } }
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
    tg.MainButton.setText('PLACE ORDER');
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
    console.log('Setting up quantity buttons');
    
    // Get all quantity buttons
    const quantityButtons = document.querySelectorAll('.btn-quantity');
    
    quantityButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Button clicked:', this);
            
            // Extract product ID and change from the onclick attribute or data attributes
            const onclickAttr = this.getAttribute('onclick');
            if (onclickAttr) {
                const matches = onclickAttr.match(/updateQuantity\('([^']+)', ([+-]?\d+)\)/);
                if (matches) {
                    const productId = matches[1];
                    const change = parseInt(matches[2]);
                    console.log('Extracted:', productId, change);
                    updateQuantity(productId, change);
                }
            }
        });
    });
    
    console.log('Found', quantityButtons.length, 'quantity buttons');
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
        alert('Error updating quantity: ' + error.message);
    }
}

// Update quantity display for a specific product
function updateQuantityDisplay(productId) {
    const quantityElement = document.getElementById(`qty-${productId}`);
    if (quantityElement) {
        quantityElement.textContent = cart[productId] || 0;
    }
}

// Animate quantity changes
function animateQuantityChange(productId) {
    const quantityElement = document.getElementById(`qty-${productId}`);
    if (quantityElement) {
        quantityElement.classList.add('updated');
        setTimeout(() => {
            quantityElement.classList.remove('updated');
        }, 200);
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
        cartCountElement.textContent = `${cartCount} item${cartCount !== 1 ? 's' : ''}`;
    }
    
    if (cartTotalElement) {
        cartTotalElement.textContent = `$${cartTotal.toFixed(2)}`;
    }
    
    // Enable/disable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = cartCount === 0;
        
        if (cartCount > 0) {
            tg.MainButton.show();
            tg.MainButton.setText(`PLACE ORDER - $${cartTotal.toFixed(2)}`);
        } else {
            tg.MainButton.hide();
        }
    }
}

// Checkout function
function checkout() {
    if (Object.keys(cart).length === 0) {
        tg.showAlert('Your cart is empty!');
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
            tg.showAlert(`Order placed successfully! Order ID: ${data.orderId}`);
            
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
            tg.showAlert('Failed to place order. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        tg.MainButton.hideProgress();
        tg.showAlert('Network error. Please check your connection and try again.');
    });
}

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
        tg.showConfirm('Are you sure you want to leave? Your cart will be cleared.', function(confirmed) {
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
    tg.showAlert('You are offline. Please check your connection.');
});

window.addEventListener('online', function() {
    tg.showAlert('Connection restored.');
});

// Debug mode (remove in production)
if (tg.initDataUnsafe?.user?.username === 'debug') {
    console.log('Debug mode enabled');
    window.debugCart = cart;
    window.debugProducts = products;
    window.debugTg = tg;
}