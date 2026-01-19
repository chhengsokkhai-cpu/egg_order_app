const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for orders (use a database in production)
let orders = [];
let orderIdCounter = 1000;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for placing orders
app.post('/api/orders', (req, res) => {
    try {
        const orderData = req.body;
        
        // Validate order data
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order data: items are required'
            });
        }
        
        if (!orderData.total || orderData.total <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order data: total must be greater than 0'
            });
        }
        
        // Generate order ID
        const orderId = `EGG-${orderIdCounter++}`;
        
        // Create order object
        const order = {
            id: orderId,
            items: orderData.items,
            total: orderData.total,
            user: orderData.user || { id: 'anonymous', username: 'Unknown' },
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        // Save order
        orders.push(order);
        
        // Log order (in production, you might want to use a proper logging system)
        console.log('New order received:', {
            orderId: order.id,
            user: order.user.username || order.user.id,
            total: order.total,
            itemCount: order.items.length
        });
        
        // In a real application, you might:
        // 1. Save to database
        // 2. Send notification to restaurant/kitchen
        // 3. Send confirmation email/SMS
        // 4. Update inventory
        
        // Send notification to Telegram bot
        setTimeout(() => {
            notifyTelegramBot(order);
        }, 100);
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Order placed successfully',
            estimatedDelivery: '30-45 minutes'
        });
        
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint for getting order status
app.get('/api/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
    
    res.json({
        success: true,
        order: {
            id: order.id,
            status: order.status,
            total: order.total,
            timestamp: order.timestamp,
            items: order.items
        }
    });
});

// API endpoint for admin to view all orders
app.get('/api/admin/orders', (req, res) => {
    // In production, add authentication/authorization here
    res.json({
        success: true,
        orders: orders.map(order => ({
            id: order.id,
            user: order.user.username || order.user.id,
            total: order.total,
            itemCount: order.items.length,
            timestamp: order.timestamp,
            status: order.status
        }))
    });
});

// API endpoint for updating order status (admin)
app.patch('/api/admin/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
    
    if (!['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid status'
        });
    }
    
    order.status = status;
    
    res.json({
        success: true,
        message: `Order ${orderId} status updated to ${status}`
    });
});

// Test endpoint to send message to Telegram group
app.post('/api/test-telegram', async (req, res) => {
    try {
        const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
        const adminChatId = '-5203856050'; // Replace with your group chat ID (negative number for groups)
        
        const testMessage = `🧪 TEST MESSAGE\n\nThis is a test to verify Telegram bot can send to group.\nTime: ${new Date().toISOString()}\nChat ID: ${adminChatId}`;
        
        console.log('Sending test message to chat:', adminChatId);
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: adminChatId,
                text: testMessage
            })
        });
        
        const responseData = await response.json();
        console.log('Telegram API response:', response.status, responseData);
        
        if (response.ok) {
            res.json({ success: true, message: 'Test message sent to Telegram group', response: responseData });
        } else {
            res.status(500).json({ success: false, error: responseData });
        }
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        orders: orders.length
    });
});

// Endpoint to get chat updates (to find your chat ID)
app.get('/api/get-chat-id', async (req, res) => {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Function to notify Telegram bot
async function notifyTelegramBot(order) {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    const adminChatId = '-5203856050'; // Replace with your group chat ID (negative number for groups)
    
    const orderItems = order.items.map(item => 
        `• ${item.quantity}x ${item.name} - ${item.total}`
    ).join('\n');
    
    const message = `🥚 NEW ORDER RECEIVED!\n\n` +
        `Order ID: ${order.id}\n` +
        `Customer: ${order.user.username || order.user.first_name || 'Anonymous'}\n` +
        `User ID: ${order.user.id}\n\n` +
        `Items:\n${orderItems}\n\n` +
        `💰 Total: ${order.total}\n` +
        `⏰ Time: ${new Date(order.timestamp).toLocaleString()}`;
    
    try {
        // Send to admin group
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: adminChatId,
                text: message
            })
        });
        
        if (response.ok) {
            console.log('Telegram notification sent to admin group successfully');
        } else {
            const errorData = await response.json();
            console.error('Failed to send Telegram notification to admin:', errorData);
        }
        
        // Also send confirmation to customer
        const customerMessage = `✅ Your order has been placed!\n\nOrder ID: ${order.id}\nTotal: ${order.total}\n\nWe'll notify you when it's ready.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: order.user.id,
                text: customerMessage
            })
        });
        
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    const localIP = '192.168.1.11'; // Your local IP address
    console.log(`🥚 Egg Ordering Mini App Server running on port ${PORT}`);
    console.log(`📱 Access the app locally: http://localhost:${PORT}`);
    console.log(`🌐 Access from other devices: http://${localIP}:${PORT}`);
    console.log(`🔧 Admin orders: http://${localIP}:${PORT}/api/admin/orders`);
    console.log(`❤️  Health check: http://${localIP}:${PORT}/health`);
});
