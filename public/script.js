// Ultra simple script for testing
console.log('Script loading...');

// Simple cart object
let cart = {};

// Product data
const products = {
    'white-eggs': { name: 'White Eggs', price: 4.99 },
    'brown-eggs': { name: 'Brown Eggs', price: 6.99 },
    'duck-eggs': { name: 'Duck Eggs', price: 8.99 },
    'quail-eggs': { name: 'Quail Eggs', price: 12.99 }
};

// Main function that buttons call
function updateQuantity(productId, change) {
    console.log('updateQuantity called with:', productId, change);
    
    // Initialize if not exists
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    
    // Update quantity
    cart[productId] += change;
    
    // Don't allow negative
    if (cart[productId] < 0) {
        cart[productId] = 0;
    }
    
    // Remove if zero
    if (cart[productId] === 0) {
        delete cart[productId];
    }
    
    console.log('Cart is now:', cart);
    
    // Update display
    const qtyElement = document.getElementById(`qty-${productId}`);
    if (qtyElement) {
        qtyElement.textContent = cart[productId] || 0;
        console.log('Updated display for', productId, 'to', cart[productId] || 0);
    } else {
        console.error('Could not find element with id:', `qty-${productId}`);
    }
    
    // Update totals
    updateCartDisplay();
}

// Update cart totals
function updateCartDisplay() {
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const totalPrice = Object.entries(cart).reduce((sum, [productId, qty]) => {
        return sum + (products[productId].price * qty);
    }, 0);
    
    console.log('Cart totals:', totalItems, 'items, $' + totalPrice.toFixed(2));
    
    // Update display elements
    const countEl = document.querySelector('.cart-count');
    const totalEl = document.querySelector('.cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (countEl) countEl.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    if (totalEl) totalEl.textContent = `$${totalPrice.toFixed(2)}`;
    if (checkoutBtn) checkoutBtn.disabled = totalItems === 0;
}

// Checkout function
function checkout() {
    console.log('Checkout called');
    alert('Checkout! Cart: ' + JSON.stringify(cart));
}

// Make functions global
window.updateQuantity = updateQuantity;
window.checkout = checkout;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded! Functions available:');
    console.log('updateQuantity:', typeof window.updateQuantity);
    console.log('checkout:', typeof window.checkout);
    
    updateCartDisplay();
});

console.log('Script loaded successfully');